import React from 'react'
import type { Context } from '@deepseek-ai/cordis'
import type { CompareSessionsResult, ControlledRunResult, ControlledProgress, ModelProviderItem, PresetListItem, SessionListItem } from '../shared/protocol.ts'
import { createComparisonReport, renderComparisonHtml, renderComparisonSvg, sanitizeComparisonReport, serializeComparisonReport, type ComparisonEvidence, type ExperimentSummary, type PairedDeltaSummary, type RunComparison, type RunEvidence } from '../core/index.ts'
import './types.ts'
import '../shared/cordis.ts'
import { injectStyles } from './styles.ts'
import { requestComparisonPanel, subscribeComparisonPanel } from './ui-state.ts'
import { loadComparisonOptions, rpc } from './options.ts'
import { RunProgressView, watchProgress } from './progress.ts'
import { ReportOverview } from './report-overview.ts'

export const inject = ['connection', 'slots']

export function apply(ctx: Context): void {
  injectStyles()
  ctx.slots.inject('conversation.session.header.actions', () => ctx.slots.register(
    { name: 'conversation.session.header.actions', id: 'dsh-plugin-compare', order: 40 },
    (props: { sessionId?: string }) => React.createElement(ComparisonAction, props),
  ))
  ctx.slots.inject('shell.overlay', () => ctx.slots.register(
    { name: 'shell.overlay', id: 'dsh-plugin-compare', order: 40 },
    () => React.createElement(ComparisonPanel, { ctx }),
  ))
}

function ComparisonAction(props: { sessionId?: string }): React.ReactElement {
  return React.createElement('button', {
    type: 'button',
    className: 'dcompare-button',
    onClick: () => requestComparisonPanel(props.sessionId),
  }, 'Compare')
}

function ComparisonPanel({ ctx }: { ctx: Context }): React.ReactElement | null {
  const [open, setOpen] = React.useState(false)
  const [sessions, setSessions] = React.useState<SessionListItem[]>([])
  const [presets, setPresets] = React.useState<PresetListItem[]>([])
  const [modelProviders, setModelProviders] = React.useState<ModelProviderItem[]>([])
  const [modelProvider, setModelProvider] = React.useState('')
  const [modelId, setModelId] = React.useState('')
  const [mode, setMode] = React.useState<'sessions' | 'controlled'>('sessions')
  const [baselineId, setBaselineId] = React.useState('')
  const [candidateId, setCandidateId] = React.useState('')
  const [comparison, setComparison] = React.useState<RunComparison | null>(null)
  const [evidence, setEvidence] = React.useState<ComparisonEvidence | null>(null)
  const [sourceDir, setSourceDir] = React.useState('')
  const [prompt, setPrompt] = React.useState('')
  const [baselinePreset, setBaselinePreset] = React.useState('')
  const [candidatePreset, setCandidatePreset] = React.useState('')
  const [successCommand, setSuccessCommand] = React.useState('')
  const [designCaveat, setDesignCaveat] = React.useState('')
  const [trials, setTrials] = React.useState(3)
  const [experiment, setExperiment] = React.useState<ExperimentSummary | null>(null)
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState('')
  const [runProgress, setRunProgress] = React.useState<ControlledProgress | null>(null)
  const [runStartedAt, setRunStartedAt] = React.useState(0)
  const [progressReceivedAt, setProgressReceivedAt] = React.useState(0)
  const [progressIssue, setProgressIssue] = React.useState('')
  const activeRun = React.useRef(false)
  const stopProgress = React.useRef<(() => void) | null>(null)
  React.useEffect(() => () => stopProgress.current?.(), [])

  const loadSessions = React.useCallback(async (preferred?: string) => {
    setBusy(true)
    setError('')
    try {
      const loaded = await loadComparisonOptions(ctx)
      // A failed resource must not discard successful resources or retain stale choices.
      const result = loaded.sessions.status === 'fulfilled' ? loaded.sessions.value : { sessions: [] }
      const presetResult = loaded.presets.status === 'fulfilled' ? loaded.presets.value : { presets: [] }
      const modelResult = loaded.models.status === 'fulfilled' ? loaded.models.value : { providers: [], defaultSelection: undefined }
      setError(loaded.errors.join('\n'))
      setSessions(result.sessions)
      setPresets(presetResult.presets)
      setModelProviders(modelResult.providers)
      const candidate = preferred && result.sessions.some((item) => item.sessionId === preferred)
        ? preferred
        : result.sessions[0]?.sessionId ?? ''
      const baseline = result.sessions.find((item) => item.sessionId !== candidate)?.sessionId ?? ''
      setCandidateId(candidate)
      setBaselineId(baseline)
      setSourceDir(result.sessions.find((item) => item.sessionId === candidate)?.cwd ?? '')
      const usable = presetResult.presets.filter((item) => !item.broken)
      setBaselinePreset(usable[0]?.id ?? '')
      setCandidatePreset(usable[1]?.id ?? usable[0]?.id ?? '')
      const selectedProvider = modelResult.providers.find((item) => item.id === modelResult.defaultSelection?.provider) ?? modelResult.providers[0]
      setModelProvider(selectedProvider?.id ?? '')
      setModelId(selectedProvider
        ? selectedProvider.id === modelResult.defaultSelection?.provider
          ? modelResult.defaultSelection?.model ?? selectedProvider.models[0]?.id ?? ''
          : selectedProvider.models[0]?.id ?? ''
        : '')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      setBusy(false)
    }
  }, [ctx])

  React.useEffect(() => subscribeComparisonPanel((request) => {
    setOpen(true)
    if (activeRun.current) return
    setRunStartedAt(0)
    setComparison(null)
    setEvidence(null)
    setDesignCaveat('')
    setExperiment(null)
    void loadSessions(request.sessionId)
  }), [loadSessions])

  const compare = React.useCallback(async () => {
    if (!baselineId || !candidateId) return
    setBusy(true)
    setError('')
    try {
      const result = await rpc<CompareSessionsResult>(ctx, 'compare', { baselineId, candidateId })
      setComparison(result.comparison)
      setEvidence(result.evidence)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      setBusy(false)
    }
  }, [baselineId, candidateId, ctx])

  const runControlled = React.useCallback(async () => {
    if (activeRun.current || !sourceDir || !prompt || !modelProvider || !modelId || !baselinePreset || !candidatePreset) return
    activeRun.current = true
    const runId = crypto.randomUUID()
    setRunStartedAt(Date.now())
    setProgressReceivedAt(Date.now())
    setRunProgress(null)
    setProgressIssue('')
    stopProgress.current = watchProgress(ctx, runId, (value) => {
      setRunProgress(value)
      setProgressReceivedAt(Date.now())
    }, setProgressIssue)
    setBusy(true)
    setError('')
    setComparison(null)
    setEvidence(null)
    setExperiment(null)
    try {
      const name = (id: string) => presets.find((item) => item.id === id)?.name ?? id
      const result = await rpc<ControlledRunResult>(ctx, 'controlled-run', {
        runId,
        sourceDir,
        prompt,
        model: { provider: modelProvider, model: modelId },
        baseline: { presetId: baselinePreset, presetName: name(baselinePreset) },
        candidate: { presetId: candidatePreset, presetName: name(candidatePreset) },
        trials,
        ...(successCommand.trim() ? { successCommand } : {}),
      })
      setComparison(result.comparison)
      setEvidence(result.evidence)
      setDesignCaveat(result.design.caveat)
      setExperiment(result.summary)
      setRunStartedAt(0)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      activeRun.current = false
      stopProgress.current?.()
      stopProgress.current = null
      setRunStartedAt(0)
      setBusy(false)
    }
  }, [baselinePreset, candidatePreset, ctx, modelId, modelProvider, presets, prompt, sourceDir, successCommand, trials])

  if (!open) return null
  return React.createElement('section', { className: 'dcompare-panel', 'aria-label': 'DSH Plugin Compare' },
    React.createElement('header', { className: 'dcompare-head' },
      React.createElement('span', { className: 'dcompare-title' }, 'DSH Plugin Compare'),
      React.createElement('span', { className: 'dcompare-fact' }, 'Measured facts only'),
      React.createElement('button', { type: 'button', className: 'dcompare-close', onClick: () => setOpen(false), 'aria-label': 'Close' }, '×'),
    ),
    React.createElement('div', { className: 'dcompare-body' },
      React.createElement('div', { className: 'dcompare-tabs' },
        tab('Existing sessions', mode === 'sessions', () => { setMode('sessions'); setComparison(null); setEvidence(null); setExperiment(null) }, busy),
        tab('Controlled A/B', mode === 'controlled', () => { setMode('controlled'); setComparison(null); setEvidence(null); setExperiment(null) }, busy),
      ),
      runStartedAt ? React.createElement(RunProgressView, { progress: runProgress, startedAt: runStartedAt, receivedAt: progressReceivedAt, issue: progressIssue }) : null,
      mode === 'sessions' ? React.createElement(React.Fragment, null,
        React.createElement('div', { className: 'dcompare-columns' },
          sessionPicker('Baseline', baselineId, sessions, setBaselineId),
          sessionPicker('Candidate', candidateId, sessions, setCandidateId),
        ),
        React.createElement('button', {
          type: 'button', className: 'dcompare-compare',
          disabled: busy || !baselineId || !candidateId || baselineId === candidateId,
          onClick: () => void compare(),
        }, busy ? 'Reading evidence…' : 'Compare sessions'),
      ) : React.createElement(comparison ? 'details' : 'div', { className: 'dcompare-configuration' },
      comparison ? React.createElement('summary', null, 'Experiment configuration · expand to run again') : null,
      React.createElement(ControlledForm, {
        presets, sourceDir, setSourceDir, prompt, setPrompt, baselinePreset, setBaselinePreset,
        candidatePreset, setCandidatePreset, successCommand, setSuccessCommand, busy,
        modelProviders, modelProvider, setModelProvider, modelId, setModelId,
        trials, setTrials,
        onRun: () => void runControlled(),
      })),
      error ? React.createElement('div', { className: 'dcompare-error', role: 'alert' }, error) : null,
      comparison && evidence ? React.createElement(ComparisonView, { comparison, evidence, caveat: designCaveat, ...(experiment ? { experiment } : {}) }) : React.createElement(
        'div',
        { className: 'dcompare-empty' },
        mode === 'controlled'
          ? 'Both variants receive the same prompt in separate temporary workspace copies. Running may use model tokens and execute the optional check command.'
          : sessions.length < 2 ? 'At least two sessions are needed for a comparison.' : 'Choose two sessions to compare their recorded execution facts.',
      ),
    ),
  )
}

function tab(label: string, active: boolean, onClick: () => void, disabled: boolean): React.ReactElement {
  return React.createElement('button', { type: 'button', className: `dcompare-tab${active ? ' is-active' : ''}`, onClick, disabled }, label)
}

interface ControlledFormProps {
  presets: PresetListItem[]
  sourceDir: string; setSourceDir: (value: string) => void
  prompt: string; setPrompt: (value: string) => void
  baselinePreset: string; setBaselinePreset: (value: string) => void
  candidatePreset: string; setCandidatePreset: (value: string) => void
  modelProviders: ModelProviderItem[]
  modelProvider: string; setModelProvider: (value: string) => void
  modelId: string; setModelId: (value: string) => void
  successCommand: string; setSuccessCommand: (value: string) => void
  trials: number; setTrials: (value: number) => void
  busy: boolean; onRun: () => void
}

function ControlledForm(props: ControlledFormProps): React.ReactElement {
  const preset = (label: string, value: string, onChange: (value: string) => void) => React.createElement('label', { className: 'dcompare-field' },
    React.createElement('span', null, label),
    React.createElement('select', { value, onChange: (event: React.ChangeEvent<HTMLSelectElement>) => onChange(event.target.value) },
      React.createElement('option', { value: '' }, 'Select preset'),
      ...props.presets.map((item) => React.createElement('option', { key: item.id, value: item.id, disabled: Boolean(item.broken) }, `${item.plugin ? `${item.plugin}${item.pluginVersion ? ` v${item.pluginVersion}` : ''} / ` : ''}${item.name}${item.broken ? ' · broken' : ''}`)),
    ),
  )
  const models = props.modelProviders.find((item) => item.id === props.modelProvider)?.models ?? []
  const selectProvider = (provider: string) => {
    props.setModelProvider(provider)
    props.setModelId(props.modelProviders.find((item) => item.id === provider)?.models[0]?.id ?? '')
  }
  return React.createElement('fieldset', { className: 'dcompare-controlled', disabled: props.busy },
    React.createElement('label', { className: 'dcompare-field' }, React.createElement('span', null, 'Source workspace'), React.createElement('input', { value: props.sourceDir, onChange: (event: React.ChangeEvent<HTMLInputElement>) => props.setSourceDir(event.target.value), placeholder: '/absolute/project/path' })),
    React.createElement('label', { className: 'dcompare-field' }, React.createElement('span', null, 'Same prompt for both variants'), React.createElement('textarea', { value: props.prompt, onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => props.setPrompt(event.target.value), rows: 4 })),
    React.createElement('div', { className: 'dcompare-columns' },
      React.createElement('label', { className: 'dcompare-field' }, React.createElement('span', null, 'Model provider'), React.createElement('select', { value: props.modelProvider, onChange: (event: React.ChangeEvent<HTMLSelectElement>) => selectProvider(event.target.value) },
        React.createElement('option', { value: '' }, 'Select provider'),
        ...props.modelProviders.map((item) => React.createElement('option', { key: item.id, value: item.id }, item.name)),
      )),
      React.createElement('label', { className: 'dcompare-field' }, React.createElement('span', null, 'Model'),
        React.createElement('input', { list: 'dcompare-model-options', value: props.modelId, onChange: (event: React.ChangeEvent<HTMLInputElement>) => props.setModelId(event.target.value), placeholder: 'Model id' }),
        React.createElement('datalist', { id: 'dcompare-model-options' }, ...models.map((item) => React.createElement('option', { key: item.id, value: item.id }, item.name))),
      ),
    ),
    React.createElement('div', { className: 'dcompare-columns' }, preset('Baseline preset', props.baselinePreset, props.setBaselinePreset), preset('Candidate preset', props.candidatePreset, props.setCandidatePreset)),
    React.createElement('label', { className: 'dcompare-field' }, React.createElement('span', null, 'Success check command · optional'), React.createElement('input', { value: props.successCommand, onChange: (event: React.ChangeEvent<HTMLInputElement>) => props.setSuccessCommand(event.target.value), placeholder: 'pnpm test' })),
    React.createElement('label', { className: 'dcompare-field' }, React.createElement('span', null, 'Paired trials · 1–10'), React.createElement('input', { type: 'number', min: 1, max: 10, value: props.trials, onChange: (event: React.ChangeEvent<HTMLInputElement>) => props.setTrials(Math.min(10, Math.max(1, Number(event.target.value) || 1))) })),
    React.createElement('div', { className: 'dcompare-warning' }, `This explicitly runs ${props.trials * 2} agent session(s), creates fresh copies for every pair, and may consume model tokens. Pair order alternates.`),
    React.createElement('button', { type: 'button', className: 'dcompare-compare', disabled: props.busy || !props.sourceDir || !props.prompt || !props.modelProvider || !props.modelId || !props.baselinePreset || !props.candidatePreset, onClick: props.onRun }, props.busy ? `Running ${props.trials} paired trial(s)…` : 'Run controlled A/B'),
  )
}

function sessionPicker(label: string, value: string, sessions: SessionListItem[], onChange: (value: string) => void): React.ReactElement {
  return React.createElement('label', { className: 'dcompare-run' },
    React.createElement('strong', null, label),
    React.createElement('select', {
      value,
      onChange: (event: React.ChangeEvent<HTMLSelectElement>) => onChange(event.target.value),
    },
    React.createElement('option', { value: '' }, 'Select a session'),
    ...sessions.map((session) => React.createElement(
      'option',
      { key: session.sessionId, value: session.sessionId },
      `${session.title} · ${new Date(session.createdAt).toLocaleString()}`,
    ))),
  )
}

export function ComparisonView({ comparison, evidence, caveat, experiment }: { comparison: RunComparison; evidence: ComparisonEvidence; caveat?: string; experiment?: ExperimentSummary }): React.ReactElement {
  const [progress, setProgress] = React.useState(1)
  const report = React.useMemo(() => createComparisonReport(comparison, evidence, undefined, experiment), [comparison, evidence, experiment])
  const safe = React.useMemo(() => sanitizeComparisonReport(report), [report])
  const rows: Array<[string, number, number, (value: number) => string]> = [
    ['Recorded tokens (incl. cache)', comparison.deltas.totalTokens.baseline, comparison.deltas.totalTokens.candidate, compact],
    ['Input tokens', comparison.baseline.metrics.tokens.input, comparison.candidate.metrics.tokens.input, compact],
    ['Output tokens', comparison.baseline.metrics.tokens.output, comparison.candidate.metrics.tokens.output, compact],
    ['Cache read tokens', comparison.baseline.metrics.tokens.cacheRead, comparison.candidate.metrics.tokens.cacheRead, compact],
    ['Cache write tokens', comparison.baseline.metrics.tokens.cacheWrite, comparison.candidate.metrics.tokens.cacheWrite, compact],
    ['Active time', comparison.deltas.durationMs.baseline, comparison.deltas.durationMs.candidate, duration],
    ['Steps', comparison.deltas.steps.baseline, comparison.deltas.steps.candidate, compact],
    ['Tool calls', comparison.deltas.toolCalls.baseline, comparison.deltas.toolCalls.candidate, compact],
    ['Tool failures', comparison.deltas.failedToolCalls.baseline, comparison.deltas.failedToolCalls.candidate, compact],
    ['Retries', comparison.deltas.retries.baseline, comparison.deltas.retries.candidate, compact],
  ]
  return React.createElement('div', { className: 'dcompare-results' },
    React.createElement(ReportOverview, { report: safe }),
    React.createElement(ReportActions, { report }),
    caveat ? React.createElement('div', { className: 'dcompare-muted' }, caveat) : null,
    comparison.baseline.failure || comparison.candidate.failure ? React.createElement('section', { className: 'dcompare-section' },
      React.createElement('div', { className: 'dcompare-section-head' }, React.createElement('strong', null, 'Agent failures')),
      React.createElement('div', { className: 'dcompare-diffs' },
        React.createElement(FailureView, { label: 'Baseline', failure: safe.comparison.baseline.failure }),
        React.createElement(FailureView, { label: 'Candidate', failure: safe.comparison.candidate.failure }),
      ),
    ) : null,
    experiment ? React.createElement(ExperimentView, { summary: experiment }) : null,
    React.createElement('div', { className: 'dcompare-table' },
      React.createElement('div', { className: 'dcompare-row dcompare-row-head' },
        React.createElement('span', null, 'Metric'),
        React.createElement('span', null, 'Baseline'),
        React.createElement('span', null, 'Candidate'),
      ),
      ...rows.map(([label, baseline, candidate, format]) => React.createElement('div', { className: 'dcompare-row', key: label },
        React.createElement('span', null, label),
        React.createElement('span', null, format(baseline)),
        React.createElement('span', null, format(candidate)),
      )),
    ),
    comparison.baseline.check || comparison.candidate.check ? React.createElement('section', { className: 'dcompare-section' },
      React.createElement('div', { className: 'dcompare-section-head' }, React.createElement('strong', null, 'Explicit success checks')),
      React.createElement('div', { className: 'dcompare-diffs' },
        React.createElement(CheckView, { label: 'Baseline', check: safe.comparison.baseline.check }),
        React.createElement(CheckView, { label: 'Candidate', check: safe.comparison.candidate.check }),
      ),
    ) : null,
    React.createElement('section', { className: 'dcompare-section' },
      React.createElement('div', { className: 'dcompare-section-head' },
        React.createElement('strong', null, 'Synchronized timeline'),
        React.createElement('span', null, `${Math.round(progress * 100)}%`),
      ),
      React.createElement('input', {
        className: 'dcompare-scrubber', type: 'range', min: 0, max: 100, value: Math.round(progress * 100),
        onChange: (event: React.ChangeEvent<HTMLInputElement>) => setProgress(Number(event.target.value) / 100),
        'aria-label': 'Timeline progress',
      }),
      React.createElement('div', { className: 'dcompare-timelines' },
        React.createElement(Timeline, { label: 'Baseline', evidence: safe.evidence?.baseline ?? evidence.baseline, progress }),
        React.createElement(Timeline, { label: 'Candidate', evidence: safe.evidence?.candidate ?? evidence.candidate, progress }),
      ),
    ),
    React.createElement('section', { className: 'dcompare-section' },
      React.createElement('div', { className: 'dcompare-section-head' },
        React.createElement('strong', null, 'Recorded file evidence'),
        React.createElement('span', null, `${safe.exportManifest.fileDiffs} diff(s)`),
      ),
      React.createElement('div', { className: 'dcompare-diffs' },
        React.createElement(DiffList, { label: 'Baseline', evidence: safe.evidence?.baseline ?? evidence.baseline }),
        React.createElement(DiffList, { label: 'Candidate', evidence: safe.evidence?.candidate ?? evidence.candidate }),
      ),
      React.createElement('div', { className: 'dcompare-manifest' },
        `Preview redaction applied · ${safe.exportManifest.redaction.matches} secret-like value(s) hidden · source: canonical session log`,
      ),
    ),
  )
}

function ReportActions({ report }: { report: ReturnType<typeof createComparisonReport> }): React.ReactElement {
  return React.createElement(React.Fragment, null,
    React.createElement('div', { className: 'dcompare-warning', role: 'note' }, 'Privacy check required before sharing: automatic redaction is best-effort, not a privacy clearance. Review prompts, paths, code, command output, account data, private URLs, and Session ids.'),
    React.createElement('div', { className: 'dcompare-export' },
      React.createElement('button', { type: 'button', className: 'dcompare-button', onClick: () => downloadReport(report, 'html') }, 'Download report · HTML'),
      React.createElement('button', { type: 'button', className: 'dcompare-button', onClick: () => downloadReport(report, 'json') }, 'Evidence · JSON'),
      React.createElement('button', { type: 'button', className: 'dcompare-button', onClick: () => downloadReport(report, 'svg') }, 'SVG card'),
      React.createElement('button', { type: 'button', className: 'dcompare-button', onClick: () => void downloadPng(report) }, 'PNG card'),
    ),
  )
}

function ExperimentView({ summary }: { summary: ExperimentSummary }): React.ReactElement {
  return React.createElement('section', { className: 'dcompare-section' },
    React.createElement('div', { className: 'dcompare-section-head' },
      React.createElement('strong', null, `${summary.trials} paired trial(s)`),
      React.createElement('span', null, 'Candidate − baseline'),
    ),
    React.createElement('div', { className: 'dcompare-outcomes' },
      React.createElement('span', null, `Baseline checks: ${summary.outcomes.baseline.pass} pass · ${summary.outcomes.baseline.fail} fail · ${summary.outcomes.baseline.unknown} unknown`),
      React.createElement('span', null, `Candidate checks: ${summary.outcomes.candidate.pass} pass · ${summary.outcomes.candidate.fail} fail · ${summary.outcomes.candidate.unknown} unknown`),
    ),
    React.createElement('div', { className: 'dcompare-table' },
      experimentMetric('Active time', summary.durationMs, duration),
      experimentMetric('Tokens', summary.totalTokens, compact),
    ),
    React.createElement('div', { className: 'dcompare-manifest' }, summary.interpretation),
  )
}

function experimentMetric(label: string, metric: PairedDeltaSummary, format: (value: number) => string): React.ReactElement {
  const interval = metric.ci95 ? `${signed(metric.ci95[0], format)} to ${signed(metric.ci95[1], format)}` : 'not estimable'
  return React.createElement('div', { className: 'dcompare-row', key: label },
    React.createElement('span', null, label),
    React.createElement('span', null, `Δ ${signed(metric.meanDelta, format)}`),
    React.createElement('span', null, `95% ${interval}`),
  )
}

function signed(value: number, format: (value: number) => string): string {
  return `${value > 0 ? '+' : ''}${format(value)}`
}

function Timeline({ label, evidence, progress }: { label: string; evidence: RunEvidence; progress: number }): React.ReactElement {
  const end = evidence.timeline.length === 0 ? -1 : Math.round(progress * (evidence.timeline.length - 1))
  const start = Math.max(0, end - 5)
  return React.createElement('div', { className: 'dcompare-timeline' },
    React.createElement('b', null, label),
    ...evidence.timeline.slice(start, end + 1).map((entry, index, visible) => React.createElement('div', {
      key: entry.seq, className: `dcompare-event dcompare-event-${entry.status}${index === visible.length - 1 ? ' is-current' : ''}`,
    }, React.createElement('span', null, duration(entry.elapsedMs)), React.createElement('strong', null, entry.label))),
    end < 0 ? React.createElement('span', { className: 'dcompare-muted' }, 'No timeline events') : null,
  )
}

function DiffList({ label, evidence }: { label: string; evidence: RunEvidence }): React.ReactElement {
  return React.createElement('div', { className: 'dcompare-diff-list' },
    React.createElement('b', null, label),
    ...evidence.fileDiffs.slice(0, 4).map((diff, index) => React.createElement('details', { key: `${diff.seq}-${diff.path}-${index}` },
      React.createElement('summary', null, diff.path),
      React.createElement('pre', null, `- ${diff.oldText ?? '(new file)'}\n+ ${diff.newText}`),
    )),
    evidence.git?.available ? React.createElement('details', null,
      React.createElement('summary', null, `Git snapshot · ${evidence.git.changedFiles} changed file(s)`),
      React.createElement('pre', null, `${evidence.git.status || '(clean)'}\n\n${evidence.git.diff || '(no tracked diff)'}`),
    ) : null,
    evidence.fileDiffs.length === 0 ? React.createElement('span', { className: 'dcompare-muted' }, 'No tool-recorded edit metadata. Check the Git snapshot for final changes.') : null,
  )
}

function CheckView({ label, check }: { label: string; check: RunComparison['baseline']['check'] }): React.ReactElement {
  if (!check) return React.createElement('div', { className: 'dcompare-diff-list' }, React.createElement('b', null, label), React.createElement('span', { className: 'dcompare-muted' }, 'Not configured'))
  return React.createElement('div', { className: 'dcompare-diff-list' },
    React.createElement('b', null, `${label} · ${check.status}`),
    React.createElement('code', null, check.command),
    check.output ? React.createElement('pre', null, check.output) : null,
  )
}

function FailureView({ label, failure }: { label: string; failure: RunComparison['baseline']['failure'] }): React.ReactElement {
  if (!failure) return React.createElement('div', { className: 'dcompare-diff-list' }, React.createElement('b', null, label), React.createElement('span', { className: 'dcompare-muted' }, 'No Agent failure recorded'))
  return React.createElement('div', { className: 'dcompare-diff-list dcompare-failure' },
    React.createElement('b', null, `${label} · ${failure.phase} failure${failure.code ? ` · ${failure.code}` : ''}`),
    React.createElement('pre', null, failure.message),
  )
}

function downloadReport(report: ReturnType<typeof createComparisonReport>, format: 'json' | 'html' | 'svg'): void {
  const content = format === 'json' ? serializeComparisonReport(report) : format === 'html' ? renderComparisonHtml(report) : renderComparisonSvg(report)
  const mime = format === 'json' ? 'application/json' : format === 'html' ? 'text/html' : 'image/svg+xml'
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `dsh-plugin-compare-${Date.now()}.${format}`
  link.click()
  URL.revokeObjectURL(url)
}

async function downloadPng(report: ReturnType<typeof createComparisonReport>): Promise<void> {
  const svg = renderComparisonSvg(report)
  const source = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
  try {
    const image = new Image()
    image.src = source
    await image.decode()
    const canvas = document.createElement('canvas')
    canvas.width = image.naturalWidth * 2
    canvas.height = image.naturalHeight * 2
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Canvas is unavailable')
    context.scale(2, 2)
    context.drawImage(image, 0, 0)
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error('PNG export failed')), 'image/png'))
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `dsh-plugin-compare-${Date.now()}.png`
    link.click()
    URL.revokeObjectURL(url)
  } finally {
    URL.revokeObjectURL(source)
  }
}

function compact(value: number): string {
  return new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(value)
}

function duration(value: number): string {
  if (Math.abs(value) < 1000) return `${Math.round(value)} ms`
  return `${(value / 1000).toFixed(1)} s`
}
