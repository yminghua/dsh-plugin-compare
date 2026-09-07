import { execFile } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { cp, lstat, mkdtemp, realpath, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, sep } from 'node:path'
import { promisify } from 'node:util'
import { createUserMessage } from '@deepseek-ai/dsh-llm'
import type { Agent } from '@deepseek-ai/dsh-agent'
import { SessionId } from '@deepseek-ai/dsh-session'
import {
  applyControlledFacts,
  compareRuns,
  comparisonEvidence,
  projectSession,
  projectSessionEvidence,
  summarizeExperiment,
  validateControlledRunInput,
  type ExplicitCheckResult,
  type GitSnapshotEvidence,
  type ProofComparison,
  type RunEvidence,
  type RunFailure,
} from '../core/index.ts'
import type { ControlledRunResult, ListModelsResult, ModelSelection, PresetListItem, ProgressUpdate } from '../shared/protocol.ts'
import type { HostContext } from './services.ts'

const execFileAsync = promisify(execFile)
const MAX_COMMAND_OUTPUT = 200_000

export interface ControlledRunConfig {
  runTimeoutMs: number
  checkTimeoutMs: number
  maxTrials: number
}

interface VariantResult { run: ProofComparison['baseline']; evidence: RunEvidence }

export async function listUsablePresets(ctx: HostContext): Promise<PresetListItem[]> {
  return (await ctx.agentPresets.list()).map((preset) => ({
    id: preset.id,
    name: preset.name ?? preset.id,
    trust: preset.trust,
    ...(preset.description ? { description: preset.description } : {}),
    ...(preset.broken ? { broken: preset.broken } : {}),
  }))
}

export async function listAvailableModels(ctx: HostContext): Promise<ListModelsResult> {
  const providers = await Promise.all(ctx.llm.listProviders().map(async (provider) => ({
    id: provider.id,
    name: provider.name,
    models: (await ctx.llm.listModels(provider.id)).map((model) => ({
      id: model.id,
      name: model.name,
      ...(model.description ? { description: model.description } : {}),
    })),
  })))
  // Optional services must use Cordis get(): property access requires injection
  // and throws even when followed by optional chaining.
  const service = ctx.get('agentDefaultModel') as {
    currentSelection(): ModelSelection | undefined
  } | undefined
  const defaultSelection = service?.currentSelection()
  return { providers, ...(defaultSelection ? { defaultSelection } : {}) }
}

export async function runControlledComparison(
  ctx: HostContext,
  payload: unknown,
  config: ControlledRunConfig,
  signal?: AbortSignal,
  progress?: (update: ProgressUpdate) => void,
): Promise<ControlledRunResult> {
  const input = validateControlledRunInput(payload, config.maxTrials)
  const sourceDir = await realpath(input.sourceDir)
  if (!(await stat(sourceDir)).isDirectory()) throw new Error('sourceDir must be a directory')
  signal?.throwIfAborted()

  const root = await mkdtemp(join(tmpdir(), 'dsh-proof-run-'))
  try {
    const comparisons: ProofComparison[] = []
    let firstEvidence: ReturnType<typeof comparisonEvidence> | undefined
    for (let index = 0; index < input.trials; index += 1) {
      const trialRoot = join(root, `trial-${index + 1}`)
      const baselineDir = join(trialRoot, 'baseline')
      const candidateDir = join(trialRoot, 'candidate')
      try {
        progress?.({ phase: 'copying', trial: index + 1, variant: null, presetName: '', events: 0, lastActivityAt: null })
        await copyPair(sourceDir, baselineDir, candidateDir)
        signal?.throwIfAborted()
        let baseline: VariantResult
        let candidate: VariantResult
        let finished = index * 2
        const run = async (variant: 'baseline' | 'candidate', cwd: string) => {
          const preset = input[variant]
          progress?.({ phase: 'starting', variant, presetName: preset.presetName, events: 0, lastActivityAt: null })
          const result = await runVariant(ctx, cwd, input.prompt, input.model, preset.presetId, preset.presetName, input.successCommand, config, signal, progress)
          progress?.({ completedVariants: ++finished })
          return result
        }
        if (index % 2 === 0) {
          baseline = await run('baseline', baselineDir)
          candidate = await run('candidate', candidateDir)
        } else {
          candidate = await run('candidate', candidateDir)
          baseline = await run('baseline', baselineDir)
        }
        comparisons.push(compareRuns(baseline.run, candidate.run))
        firstEvidence ??= comparisonEvidence(baseline.evidence, candidate.evidence)
      } finally {
        progress?.({ phase: 'cleanup' })
        await rm(trialRoot, { recursive: true, force: true })
      }
    }
    const comparison = comparisons[0]
    if (!comparison || !firstEvidence) throw new Error('Controlled run produced no trials')
    const hasStartupFailure = comparisons.some((trial) => trial.baseline.failure?.phase === 'startup' || trial.candidate.failure?.phase === 'startup')
    return {
      comparison,
      evidence: firstEvidence,
      trialComparisons: comparisons,
      summary: summarizeExperiment(comparisons),
      design: {
        sourceDir,
        isolation: 'filesystem-copy',
        order: 'alternating',
        trials: input.trials,
        model: input.model,
        caveat: hasStartupFailure
          ? 'Invalid comparison: at least one Agent failed before task execution. Fix the reported startup error before evaluating presets.'
          : input.trials < 2
          ? 'A single sequential pair is measured evidence, not a statistically reliable ranking.'
          : 'Execution order alternates by pair. Intervals quantify observed variation but do not establish causality.',
      },
    }
  } finally {
    progress?.({ phase: 'cleanup' })
    await rm(root, { recursive: true, force: true })
  }
}

async function copyPair(sourceDir: string, baselineDir: string, candidateDir: string): Promise<void> {
  const results = await Promise.allSettled([copyWorkspace(sourceDir, baselineDir), copyWorkspace(sourceDir, candidateDir)])
  const failure = results.find((result): result is PromiseRejectedResult => result.status === 'rejected')
  if (failure) throw failure.reason
}

async function copyWorkspace(sourceDir: string, destination: string): Promise<void> {
  const gitDirectory = await lstat(join(sourceDir, '.git')).then((entry) => entry.isDirectory(), () => false)
  await cp(sourceDir, destination, {
    recursive: true,
    errorOnExist: true,
    force: false,
    dereference: true,
    filter: async (source) => {
      if (source === sourceDir) return true
      const relative = source.slice(sourceDir.length + (sourceDir.endsWith(sep) ? 0 : 1))
      const first = relative.split(sep)[0]
      if (first === 'node_modules' || first === '.pnpm-store' || first === '.dsh-proof-runs') return false
      if (first === '.git' && !gitDirectory) return false
      const entry = await lstat(source)
      if (entry.isSymbolicLink()) {
        const target = await realpath(source)
        if (target !== sourceDir && !target.startsWith(`${sourceDir}${sep}`)) {
          throw new Error(`Workspace symlink escapes sourceDir: ${relative}`)
        }
      }
      return true
    },
  })
}

async function runVariant(
  ctx: HostContext,
  cwd: string,
  prompt: string,
  model: ModelSelection,
  presetId: string,
  presetName: string,
  successCommand: string | undefined,
  config: ControlledRunConfig,
  signal?: AbortSignal,
  progress?: (update: ProgressUpdate) => void,
): Promise<VariantResult> {
  signal?.throwIfAborted()
  const preset = await ctx.agentPresets.resolve(presetId)
  if (preset.broken) throw new Error(`Preset "${presetId}" is broken: ${preset.broken}`)
  const sessionId = SessionId(`dsh-proof-${randomUUID()}`)
  const started = Date.now()
  let handle: Awaited<ReturnType<HostContext['agents']['create']>>
  try {
    handle = await ctx.agents.create({
      sessionId,
      meta: { cwd, agentPreset: preset.id },
      agentOptions: model,
      setup: async (agentCtx) => { await ctx.agentPresets.mount(agentCtx, preset.id) },
      ...(signal ? { signal } : {}),
    })
  } catch (error) {
    return startupFailureResult(sessionId, cwd, presetName, model, successCommand, error, started, await captureGit(cwd, config.checkTimeoutMs))
  }
  let activityTimer: ReturnType<typeof setInterval> | undefined
  try {
    progress?.({ phase: 'running' })
    let lastCount = -1
    const activity = () => {
      const count = handle.agent.session.events.length
      if (count !== lastCount) {
        lastCount = count
        progress?.({ events: count, ...(count ? { lastActivityAt: Date.now() } : {}) })
      }
    }
    if (progress) activityTimer = setInterval(activity, 1000)
    handle.agent.followup(createUserMessage({ content: [{ type: 'text', text: prompt }], source: { kind: 'user' } }))
    activity()
    const timedOut = await waitForIdle(handle.agent, config.runTimeoutMs, signal)
    if (activityTimer) clearInterval(activityTimer)
    activity()
    progress?.({ phase: 'collecting' })
    await ctx.sessions.flush(handle.agent.session)
    const git = await captureGit(cwd, config.checkTimeoutMs)
    const projected = projectSession({
      id: sessionId,
      title: `${presetName} · controlled`,
      createdAt: handle.agent.session.header.createdAt,
      cwd,
      events: handle.agent.session.events,
    })
    const routed = {
      ...projected,
      provider: projected.provider ?? model.provider,
      model: projected.model ?? model.model,
    }
    if (!timedOut && routed.metrics.execution === 'completed' && successCommand) progress?.({ phase: 'checking' })
    const check = timedOut
      ? timeoutCheck(successCommand)
      : routed.metrics.execution !== 'completed'
        ? skippedCheck(successCommand, routed.failure)
        : successCommand ? await runCheck(cwd, successCommand, config.checkTimeoutMs) : undefined
    const run = applyControlledFacts(routed, check, git)
    const evidence: RunEvidence = { ...projectSessionEvidence(sessionId, handle.agent.session.events), git }
    return { run, evidence }
  } finally {
    if (activityTimer) clearInterval(activityTimer)
    progress?.({ phase: 'collecting' })
    await handle.dispose()
  }
}

function startupFailureResult(
  sessionId: ReturnType<typeof SessionId>,
  cwd: string,
  presetName: string,
  model: ModelSelection,
  successCommand: string | undefined,
  error: unknown,
  started: number,
  git: GitSnapshotEvidence,
): VariantResult {
  const failure = failureDetails(error)
  const run = applyControlledFacts({
    id: sessionId,
    label: `${presetName} · controlled`,
    sessionId,
    cwd,
    provider: model.provider,
    model: model.model,
    capturedAt: new Date(started).toISOString(),
    failure,
    metrics: {
      outcome: 'unknown', execution: 'failed', durationMs: Math.max(0, Date.now() - started), turns: 0, steps: 0,
      toolCalls: 0, failedToolCalls: 0, retries: 0, tokens: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    },
  }, skippedCheck(successCommand, failure), git)
  const evidence: RunEvidence = {
    sessionId,
    timeline: [{ seq: 0, time: started, elapsedMs: 0, type: 'agent/startup-error', lane: 'system', status: 'failed', label: `Startup failed · ${failure.message}` }],
    fileDiffs: [],
    git,
  }
  return { run, evidence }
}

function failureDetails(error: unknown): RunFailure {
  if (error instanceof Error) {
    const candidate = error as Error & { code?: unknown }
    const code = typeof candidate.code === 'string' ? candidate.code : undefined
    return { phase: 'startup', message: error.message, ...(code ? { code } : {}) }
  }
  return { phase: 'startup', message: String(error) }
}

function skippedCheck(command: string | undefined, failure?: RunFailure): ExplicitCheckResult | undefined {
  if (!command) return undefined
  const reason = failure ? `${failure.phase} failure: ${failure.message}` : 'the Agent did not complete successfully'
  return { command, status: 'not-run', exitCode: null, durationMs: 0, output: `Not run because of ${reason}.` }
}

async function waitForIdle(agent: Agent, timeoutMs: number, signal?: AbortSignal): Promise<boolean> {
  let timedOut = false
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<void>((resolve) => {
    timer = setTimeout(() => {
      timedOut = true
      agent.cancel({ kind: 'hook', reason: 'dsh-proof controlled-run timeout' })
      resolve()
    }, timeoutMs)
  })
  const onAbort = () => {
    agent.cancel({ kind: 'hook', reason: 'dsh-proof request aborted' })
    abortResolve?.()
  }
  let abortResolve: (() => void) | undefined
  const aborted = signal ? new Promise<void>((resolve) => {
    abortResolve = resolve
    signal.addEventListener('abort', onAbort, { once: true })
  }) : new Promise<void>(() => {})
  try {
    await Promise.race([agent.whenIdle(), timeout, aborted])
  } finally {
    if (timer) clearTimeout(timer)
    signal?.removeEventListener('abort', onAbort)
  }
  await agent.whenIdle()
  signal?.throwIfAborted()
  return timedOut
}

async function runCheck(cwd: string, command: string, timeoutMs: number): Promise<ExplicitCheckResult> {
  const started = Date.now()
  try {
    const result = await execFileAsync('/bin/sh', ['-lc', command], { cwd, timeout: timeoutMs, maxBuffer: MAX_COMMAND_OUTPUT })
    return { command, status: 'pass', exitCode: 0, durationMs: Date.now() - started, output: boundOutput(`${result.stdout}${result.stderr}`) }
  } catch (error) {
    const failure = error as { code?: unknown; stdout?: unknown; stderr?: unknown; killed?: unknown }
    const exitCode = typeof failure.code === 'number' ? failure.code : null
    return {
      command,
      status: exitCode === null ? 'error' : 'fail',
      exitCode,
      durationMs: Date.now() - started,
      output: boundOutput(`${typeof failure.stdout === 'string' ? failure.stdout : ''}${typeof failure.stderr === 'string' ? failure.stderr : ''}`),
    }
  }
}

function timeoutCheck(command: string | undefined): ExplicitCheckResult {
  return { command: command ?? '', status: 'error', exitCode: null, durationMs: 0, output: 'Agent run timed out before the success check.' }
}

async function captureGit(cwd: string, timeoutMs: number): Promise<GitSnapshotEvidence> {
  try {
    const [head, statusResult, diffResult] = await Promise.all([
      execFileAsync('git', ['rev-parse', 'HEAD'], { cwd, timeout: timeoutMs, maxBuffer: MAX_COMMAND_OUTPUT }),
      execFileAsync('git', ['status', '--porcelain=v1', '--untracked-files=all'], { cwd, timeout: timeoutMs, maxBuffer: MAX_COMMAND_OUTPUT }),
      execFileAsync('git', ['diff', '--binary', '--no-ext-diff', 'HEAD', '--', '.'], { cwd, timeout: timeoutMs, maxBuffer: MAX_COMMAND_OUTPUT }),
    ])
    const status = boundOutput(statusResult.stdout)
    return {
      available: true,
      head: head.stdout.trim(),
      status,
      diff: boundOutput(diffResult.stdout),
      changedFiles: status === '' ? 0 : status.trimEnd().split('\n').length,
    }
  } catch {
    return { available: false, status: '', diff: '', changedFiles: 0 }
  }
}

function boundOutput(value: string): string {
  return value.length <= MAX_COMMAND_OUTPUT ? value : `${value.slice(0, MAX_COMMAND_OUTPUT)}\n[truncated]`
}
