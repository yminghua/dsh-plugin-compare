import React from 'react'
import type { Context } from '@deepseek-ai/cordis'
import type { CompareSessionsResult, ControlledRunResult, ListPresetsResult, ListSessionsResult, PresetListItem, SessionListItem } from '../shared/protocol.ts'
import { createProofReport, renderProofHtml, renderProofSvg, sanitizeProofReport, serializeProofReport, type ComparisonEvidence, type ExperimentSummary, type PairedDeltaSummary, type ProofComparison, type RunEvidence } from '../core/index.ts'
import './types.ts'
import '../shared/cordis.ts'
import { injectStyles } from './styles.ts'
import { requestProofPanel, subscribeProofPanel } from './ui-state.ts'

export const inject = ['connection', 'slots']

export function apply(ctx: Context): void {
  injectStyles()
  ctx.slots.inject('conversation.session.header.actions', () => ctx.slots.register(
    { name: 'conversation.session.header.actions', id: 'dsh-proof', order: 40 },
    (props: { sessionId?: string }) => React.createElement(ProofAction, props),
  ))
  ctx.slots.inject('shell.overlay', () => ctx.slots.register(
    { name: 'shell.overlay', id: 'dsh-proof', order: 40 },
    () => React.createElement(ProofPanel, { ctx }),
  ))
}

function ProofAction(props: { sessionId?: string }): React.ReactElement {
  return React.createElement('button', {
    type: 'button',
    className: 'dproof-button',
    onClick: () => requestProofPanel(props.sessionId),
  }, 'Proof')
}

async function rpc<T>(ctx: Context, endpoint: string, payload: unknown): Promise<T> {
  const response = await ctx.connection.rpc.call('/dsh-proof', endpoint, payload)
  if (!response.ok) throw new Error(response.error.message ?? 'DSH Proof request failed')
  return response.value as T
}

function ProofPanel({ ctx }: { ctx: Context }): React.ReactElement | null {
  const [open, setOpen] = React.useState(false)
  const [sessions, setSessions] = React.useState<SessionListItem[]>([])
  const [presets, setPresets] = React.useState<PresetListItem[]>([])
  const [mode, setMode] = React.useState<'sessions' | 'controlled'>('sessions')
  const [baselineId, setBaselineId] = React.useState('')
  const [candidateId, setCandidateId] = React.useState('')
  const [comparison, setComparison] = React.useState<ProofComparison | null>(null)
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

  const loadSessions = React.useCallback(async (preferred?: string) => {
    setBusy(true)
    setError('')
    try {
      const [result, presetResult] = await Promise.all([
        rpc<ListSessionsResult>(ctx, 'list', { limit: 100 }),
        rpc<ListPresetsResult>(ctx, 'presets', {}),
      ])
      setSessions(result.sessions)
      setPresets(presetResult.presets)
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
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      setBusy(false)
    }
  }, [ctx])

  React.useEffect(() => subscribeProofPanel((request) => {
    setOpen(true)
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
    if (!sourceDir || !prompt || !baselinePreset || !candidatePreset) return
    setBusy(true)
    setError('')
    setComparison(null)
    setEvidence(null)
    setExperiment(null)
    try {
      const name = (id: string) => presets.find((item) => item.id === id)?.name ?? id
      const result = await rpc<ControlledRunResult>(ctx, 'controlled-run', {
        sourceDir,
        prompt,
        baseline: { presetId: baselinePreset, presetName: name(baselinePreset) },
        candidate: { presetId: candidatePreset, presetName: name(candidatePreset) },
        trials,
        ...(successCommand.trim() ? { successCommand } : {}),
      })
      setComparison(result.comparison)
      setEvidence(result.evidence)
      setDesignCaveat(result.design.caveat)
      setExperiment(result.summary)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      setBusy(false)
    }
  }, [baselinePreset, candidatePreset, ctx, presets, prompt, sourceDir, successCommand, trials])

  if (!open) return null
  return React.createElement('section', { className: 'dproof-panel', 'aria-label': 'DSH Proof comparison' },
    React.createElement('header', { className: 'dproof-head' },
      React.createElement('span', { className: 'dproof-title' }, 'DSH Proof'),
      React.createElement('span', { className: 'dproof-fact' }, 'Measured facts only'),
      React.createElement('button', { type: 'button', className: 'dproof-close', onClick: () => setOpen(false), 'aria-label': 'Close' }, '×'),
    ),
    React.createElement('div', { className: 'dproof-body' },
      React.createElement('div', { className: 'dproof-tabs' },
        tab('Existing sessions', mode === 'sessions', () => { setMode('sessions'); setComparison(null); setEvidence(null); setExperiment(null) }),
        tab('Controlled A/B', mode === 'controlled', () => { setMode('controlled'); setComparison(null); setEvidence(null); setExperiment(null) }),
      ),
      mode === 'sessions' ? React.createElement(React.Fragment, null,
        React.createElement('div', { className: 'dproof-columns' },
          sessionPicker('Baseline', baselineId, sessions, setBaselineId),
          sessionPicker('Candidate', candidateId, sessions, setCandidateId),
        ),
        React.createElement('button', {
          type: 'button', className: 'dproof-compare',
          disabled: busy || !baselineId || !candidateId || baselineId === candidateId,
          onClick: () => void compare(),
        }, busy ? 'Reading evidence…' : 'Compare sessions'),
      ) : React.createElement(ControlledForm, {
        presets, sourceDir, setSourceDir, prompt, setPrompt, baselinePreset, setBaselinePreset,
        candidatePreset, setCandidatePreset, successCommand, setSuccessCommand, busy,
        trials, setTrials,
        onRun: () => void runControlled(),
      }),
      error ? React.createElement('div', { className: 'dproof-error', role: 'alert' }, error) : null,
      comparison && evidence ? React.createElement(ComparisonView, { comparison, evidence, caveat: designCaveat, ...(experiment ? { experiment } : {}) }) : React.createElement(
        'div',
        { className: 'dproof-empty' },
        mode === 'controlled'
          ? 'Both variants receive the same prompt in separate temporary workspace copies. Running may use model tokens and execute the optional check command.'
          : sessions.length < 2 ? 'At least two sessions are needed for a comparison.' : 'Choose two sessions to compare their recorded execution facts.',
      ),
    ),
  )
}

function tab(label: string, active: boolean, onClick: () => void): React.ReactElement {
  return React.createElement('button', { type: 'button', className: `dproof-tab${active ? ' is-active' : ''}`, onClick }, label)
}

interface ControlledFormProps {
  presets: PresetListItem[]
  sourceDir: string; setSourceDir: (value: string) => void
  prompt: string; setPrompt: (value: string) => void
  baselinePreset: string; setBaselinePreset: (value: string) => void
  candidatePreset: string; setCandidatePreset: (value: string) => void
  successCommand: string; setSuccessCommand: (value: string) => void
  trials: number; setTrials: (value: number) => void
  busy: boolean; onRun: () => void
}

function ControlledForm(props: ControlledFormProps): React.ReactElement {
  const preset = (label: string, value: string, onChange: (value: string) => void) => React.createElement('label', { className: 'dproof-field' },
    React.createElement('span', null, label),
    React.createElement('select', { value, onChange: (event: React.ChangeEvent<HTMLSelectElement>) => onChange(event.target.value) },
      React.createElement('option', { value: '' }, 'Select preset'),
      ...props.presets.map((item) => React.createElement('option', { key: item.id, value: item.id, disabled: Boolean(item.broken) }, `${item.name}${item.broken ? ' · broken' : ''}`)),
    ),
  )
  return React.createElement('section', { className: 'dproof-controlled' },
    React.createElement('label', { className: 'dproof-field' }, React.createElement('span', null, 'Source workspace'), React.createElement('input', { value: props.sourceDir, onChange: (event: React.ChangeEvent<HTMLInputElement>) => props.setSourceDir(event.target.value), placeholder: '/absolute/project/path' })),
    React.createElement('label', { className: 'dproof-field' }, React.createElement('span', null, 'Same prompt for both variants'), React.createElement('textarea', { value: props.prompt, onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => props.setPrompt(event.target.value), rows: 4 })),
    React.createElement('div', { className: 'dproof-columns' }, preset('Baseline preset', props.baselinePreset, props.setBaselinePreset), preset('Candidate preset', props.candidatePreset, props.setCandidatePreset)),
    React.createElement('label', { className: 'dproof-field' }, React.createElement('span', null, 'Success check command · optional'), React.createElement('input', { value: props.successCommand, onChange: (event: React.ChangeEvent<HTMLInputElement>) => props.setSuccessCommand(event.target.value), placeholder: 'pnpm test' })),
    React.createElement('label', { className: 'dproof-field' }, React.createElement('span', null, 'Paired trials · 1–10'), React.createElement('input', { type: 'number', min: 1, max: 10, value: props.trials, onChange: (event: React.ChangeEvent<HTMLInputElement>) => props.setTrials(Math.min(10, Math.max(1, Number(event.target.value) || 1))) })),
    React.createElement('div', { className: 'dproof-warning' }, `This explicitly runs ${props.trials * 2} agent session(s), creates fresh copies for every pair, and may consume model tokens. Pair order alternates.`),
    React.createElement('button', { type: 'button', className: 'dproof-compare', disabled: props.busy || !props.sourceDir || !props.prompt || !props.baselinePreset || !props.candidatePreset, onClick: props.onRun }, props.busy ? `Running ${props.trials} paired trial(s)…` : 'Run controlled A/B'),
  )
}

function sessionPicker(label: string, value: string, sessions: SessionListItem[], onChange: (value: string) => void): React.ReactElement {
  return React.createElement('label', { className: 'dproof-run' },
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

function ComparisonView({ comparison, evidence, caveat, experiment }: { comparison: ProofComparison; evidence: ComparisonEvidence; caveat?: string; experiment?: ExperimentSummary }): React.ReactElement {
  const [progress, setProgress] = React.useState(1)
  const report = React.useMemo(() => createProofReport(comparison, evidence, undefined, experiment), [comparison, evidence, experiment])
  const safe = React.useMemo(() => sanitizeProofReport(report), [report])
  const rows: Array<[string, number, number, (value: number) => string]> = [
    ['Tokens', comparison.deltas.totalTokens.baseline, comparison.deltas.totalTokens.candidate, compact],
    ['Active time', comparison.deltas.durationMs.baseline, comparison.deltas.durationMs.candidate, duration],
    ['Steps', comparison.deltas.steps.baseline, comparison.deltas.steps.candidate, compact],
    ['Tool calls', comparison.deltas.toolCalls.baseline, comparison.deltas.toolCalls.candidate, compact],
    ['Tool failures', comparison.deltas.failedToolCalls.baseline, comparison.deltas.failedToolCalls.candidate, compact],
    ['Retries', comparison.deltas.retries.baseline, comparison.deltas.retries.candidate, compact],
  ]
  return React.createElement('div', { className: 'dproof-results' },
    React.createElement('div', { className: 'dproof-verdict' },
      React.createElement('strong', null, comparison.baseline.metrics.outcome === 'unknown' && comparison.candidate.metrics.outcome === 'unknown' ? 'Task outcome: undetermined' : `Explicit check: ${comparison.baseline.metrics.outcome} → ${comparison.candidate.metrics.outcome}`),
      React.createElement('span', null, caveat || 'A completed run is not proof that the task succeeded.'),
    ),
    experiment ? React.createElement(ExperimentView, { summary: experiment }) : null,
    React.createElement('div', { className: 'dproof-table' },
      React.createElement('div', { className: 'dproof-row dproof-row-head' },
        React.createElement('span', null, 'Metric'),
        React.createElement('span', null, 'Baseline'),
        React.createElement('span', null, 'Candidate'),
      ),
      ...rows.map(([label, baseline, candidate, format]) => React.createElement('div', { className: 'dproof-row', key: label },
        React.createElement('span', null, label),
        React.createElement('span', null, format(baseline)),
        React.createElement('span', null, format(candidate)),
      )),
    ),
    comparison.baseline.check || comparison.candidate.check ? React.createElement('section', { className: 'dproof-section' },
      React.createElement('div', { className: 'dproof-section-head' }, React.createElement('strong', null, 'Explicit success checks')),
      React.createElement('div', { className: 'dproof-diffs' },
        React.createElement(CheckView, { label: 'Baseline', check: safe.comparison.baseline.check }),
        React.createElement(CheckView, { label: 'Candidate', check: safe.comparison.candidate.check }),
      ),
    ) : null,
    React.createElement('section', { className: 'dproof-section' },
      React.createElement('div', { className: 'dproof-section-head' },
        React.createElement('strong', null, 'Synchronized timeline'),
        React.createElement('span', null, `${Math.round(progress * 100)}%`),
      ),
      React.createElement('input', {
        className: 'dproof-scrubber', type: 'range', min: 0, max: 100, value: Math.round(progress * 100),
        onChange: (event: React.ChangeEvent<HTMLInputElement>) => setProgress(Number(event.target.value) / 100),
        'aria-label': 'Timeline progress',
      }),
      React.createElement('div', { className: 'dproof-timelines' },
        React.createElement(Timeline, { label: 'Baseline', evidence: safe.evidence?.baseline ?? evidence.baseline, progress }),
        React.createElement(Timeline, { label: 'Candidate', evidence: safe.evidence?.candidate ?? evidence.candidate, progress }),
      ),
    ),
    React.createElement('section', { className: 'dproof-section' },
      React.createElement('div', { className: 'dproof-section-head' },
        React.createElement('strong', null, 'Recorded file evidence'),
        React.createElement('span', null, `${safe.exportManifest.fileDiffs} diff(s)`),
      ),
      React.createElement('div', { className: 'dproof-diffs' },
        React.createElement(DiffList, { label: 'Baseline', evidence: safe.evidence?.baseline ?? evidence.baseline }),
        React.createElement(DiffList, { label: 'Candidate', evidence: safe.evidence?.candidate ?? evidence.candidate }),
      ),
      React.createElement('div', { className: 'dproof-manifest' },
        `Preview redaction applied · ${safe.exportManifest.redaction.matches} secret-like value(s) hidden · source: canonical session log`,
      ),
    ),
    React.createElement('div', { className: 'dproof-export' },
      React.createElement('button', { type: 'button', className: 'dproof-button', onClick: () => downloadReport(report, 'json') }, 'JSON'),
      React.createElement('button', { type: 'button', className: 'dproof-button', onClick: () => downloadReport(report, 'html') }, 'HTML'),
      React.createElement('button', { type: 'button', className: 'dproof-button', onClick: () => downloadReport(report, 'svg') }, 'SVG card'),
      React.createElement('button', { type: 'button', className: 'dproof-button', onClick: () => void downloadPng(report) }, 'PNG card'),
    ),
  )
}

function ExperimentView({ summary }: { summary: ExperimentSummary }): React.ReactElement {
  return React.createElement('section', { className: 'dproof-section' },
    React.createElement('div', { className: 'dproof-section-head' },
      React.createElement('strong', null, `${summary.trials} paired trial(s)`),
      React.createElement('span', null, 'Candidate − baseline'),
    ),
    React.createElement('div', { className: 'dproof-outcomes' },
      React.createElement('span', null, `Baseline checks: ${summary.outcomes.baseline.pass} pass · ${summary.outcomes.baseline.fail} fail · ${summary.outcomes.baseline.unknown} unknown`),
      React.createElement('span', null, `Candidate checks: ${summary.outcomes.candidate.pass} pass · ${summary.outcomes.candidate.fail} fail · ${summary.outcomes.candidate.unknown} unknown`),
    ),
    React.createElement('div', { className: 'dproof-table' },
      experimentMetric('Active time', summary.durationMs, duration),
      experimentMetric('Tokens', summary.totalTokens, compact),
    ),
    React.createElement('div', { className: 'dproof-manifest' }, summary.interpretation),
  )
}

function experimentMetric(label: string, metric: PairedDeltaSummary, format: (value: number) => string): React.ReactElement {
  const interval = metric.ci95 ? `${signed(metric.ci95[0], format)} to ${signed(metric.ci95[1], format)}` : 'not estimable'
  return React.createElement('div', { className: 'dproof-row', key: label },
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
  return React.createElement('div', { className: 'dproof-timeline' },
    React.createElement('b', null, label),
    ...evidence.timeline.slice(start, end + 1).map((entry, index, visible) => React.createElement('div', {
      key: entry.seq, className: `dproof-event dproof-event-${entry.status}${index === visible.length - 1 ? ' is-current' : ''}`,
    }, React.createElement('span', null, duration(entry.elapsedMs)), React.createElement('strong', null, entry.label))),
    end < 0 ? React.createElement('span', { className: 'dproof-muted' }, 'No timeline events') : null,
  )
}

function DiffList({ label, evidence }: { label: string; evidence: RunEvidence }): React.ReactElement {
  return React.createElement('div', { className: 'dproof-diff-list' },
    React.createElement('b', null, label),
    ...evidence.fileDiffs.slice(0, 4).map((diff, index) => React.createElement('details', { key: `${diff.seq}-${diff.path}-${index}` },
      React.createElement('summary', null, diff.path),
      React.createElement('pre', null, `- ${diff.oldText ?? '(new file)'}\n+ ${diff.newText}`),
    )),
    evidence.git?.available ? React.createElement('details', null,
      React.createElement('summary', null, `Git snapshot · ${evidence.git.changedFiles} changed file(s)`),
      React.createElement('pre', null, `${evidence.git.status || '(clean)'}\n\n${evidence.git.diff || '(no tracked diff)'}`),
    ) : null,
    evidence.fileDiffs.length === 0 ? React.createElement('span', { className: 'dproof-muted' }, 'No write/edit diff metadata recorded') : null,
  )
}

function CheckView({ label, check }: { label: string; check: ProofComparison['baseline']['check'] }): React.ReactElement {
  if (!check) return React.createElement('div', { className: 'dproof-diff-list' }, React.createElement('b', null, label), React.createElement('span', { className: 'dproof-muted' }, 'Not configured'))
  return React.createElement('div', { className: 'dproof-diff-list' },
    React.createElement('b', null, `${label} · ${check.status}`),
    React.createElement('code', null, check.command),
    check.output ? React.createElement('pre', null, check.output) : null,
  )
}

function downloadReport(report: ReturnType<typeof createProofReport>, format: 'json' | 'html' | 'svg'): void {
  const content = format === 'json' ? serializeProofReport(report) : format === 'html' ? renderProofHtml(report) : renderProofSvg(report)
  const mime = format === 'json' ? 'application/json' : format === 'html' ? 'text/html' : 'image/svg+xml'
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `dsh-proof-${Date.now()}.${format}`
  link.click()
  URL.revokeObjectURL(url)
}

async function downloadPng(report: ReturnType<typeof createProofReport>): Promise<void> {
  const svg = renderProofSvg(report)
  const source = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
  try {
    const image = new Image()
    image.src = source
    await image.decode()
    const canvas = document.createElement('canvas')
    canvas.width = 1440
    canvas.height = 680
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Canvas is unavailable')
    context.scale(2, 2)
    context.drawImage(image, 0, 0, 720, 340)
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error('PNG export failed')), 'image/png'))
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `dsh-proof-${Date.now()}.png`
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
