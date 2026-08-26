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
} from '../core/index.ts'
import type { ControlledRunResult, PresetListItem } from '../shared/protocol.ts'
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

export async function runControlledComparison(
  ctx: HostContext,
  payload: unknown,
  config: ControlledRunConfig,
  signal?: AbortSignal,
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
        await copyPair(sourceDir, baselineDir, candidateDir)
        signal?.throwIfAborted()
        let baseline: VariantResult
        let candidate: VariantResult
        if (index % 2 === 0) {
          baseline = await runVariant(ctx, baselineDir, input.prompt, input.baseline.presetId, input.baseline.presetName, input.successCommand, config, signal)
          candidate = await runVariant(ctx, candidateDir, input.prompt, input.candidate.presetId, input.candidate.presetName, input.successCommand, config, signal)
        } else {
          candidate = await runVariant(ctx, candidateDir, input.prompt, input.candidate.presetId, input.candidate.presetName, input.successCommand, config, signal)
          baseline = await runVariant(ctx, baselineDir, input.prompt, input.baseline.presetId, input.baseline.presetName, input.successCommand, config, signal)
        }
        comparisons.push(compareRuns(baseline.run, candidate.run))
        firstEvidence ??= comparisonEvidence(baseline.evidence, candidate.evidence)
      } finally {
        await rm(trialRoot, { recursive: true, force: true })
      }
    }
    const comparison = comparisons[0]
    if (!comparison || !firstEvidence) throw new Error('Controlled run produced no trials')
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
        caveat: input.trials < 2
          ? 'A single sequential pair is measured evidence, not a statistically reliable ranking.'
          : 'Execution order alternates by pair. Intervals quantify observed variation but do not establish causality.',
      },
    }
  } finally {
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
  presetId: string,
  presetName: string,
  successCommand: string | undefined,
  config: ControlledRunConfig,
  signal?: AbortSignal,
): Promise<VariantResult> {
  signal?.throwIfAborted()
  const preset = await ctx.agentPresets.resolve(presetId)
  if (preset.broken) throw new Error(`Preset "${presetId}" is broken: ${preset.broken}`)
  const sessionId = SessionId(`dsh-proof-${randomUUID()}`)
  const handle = await ctx.agents.create({
    sessionId,
    meta: { cwd, agentPreset: preset.id },
    setup: async (agentCtx) => { await ctx.agentPresets.mount(agentCtx, preset.id) },
    ...(signal ? { signal } : {}),
  })
  try {
    handle.agent.followup(createUserMessage({ content: [{ type: 'text', text: prompt }], source: { kind: 'user' } }))
    const timedOut = await waitForIdle(handle.agent, config.runTimeoutMs, signal)
    await ctx.sessions.flush(handle.agent.session)
    const git = await captureGit(cwd, config.checkTimeoutMs)
    const check = timedOut
      ? timeoutCheck(successCommand)
      : successCommand ? await runCheck(cwd, successCommand, config.checkTimeoutMs) : undefined
    const projected = projectSession({
      id: sessionId,
      title: `${presetName} · controlled`,
      createdAt: handle.agent.session.header.createdAt,
      cwd,
      events: handle.agent.session.events,
    })
    const run = applyControlledFacts(projected, check, git)
    const evidence: RunEvidence = { ...projectSessionEvidence(sessionId, handle.agent.session.events), git }
    return { run, evidence }
  } finally {
    await handle.dispose()
  }
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
