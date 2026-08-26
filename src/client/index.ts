import React from 'react'
import type { Context } from '@deepseek-ai/cordis'
import type { CompareSessionsResult, ListSessionsResult, SessionListItem } from '../shared/protocol.ts'
import { createProofReport, renderProofHtml, serializeProofReport, type ProofComparison } from '../core/index.ts'
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
  const [baselineId, setBaselineId] = React.useState('')
  const [candidateId, setCandidateId] = React.useState('')
  const [comparison, setComparison] = React.useState<ProofComparison | null>(null)
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState('')

  const loadSessions = React.useCallback(async (preferred?: string) => {
    setBusy(true)
    setError('')
    try {
      const result = await rpc<ListSessionsResult>(ctx, 'list', { limit: 100 })
      setSessions(result.sessions)
      const candidate = preferred && result.sessions.some((item) => item.sessionId === preferred)
        ? preferred
        : result.sessions[0]?.sessionId ?? ''
      const baseline = result.sessions.find((item) => item.sessionId !== candidate)?.sessionId ?? ''
      setCandidateId(candidate)
      setBaselineId(baseline)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      setBusy(false)
    }
  }, [ctx])

  React.useEffect(() => subscribeProofPanel((request) => {
    setOpen(true)
    setComparison(null)
    void loadSessions(request.sessionId)
  }), [loadSessions])

  const compare = React.useCallback(async () => {
    if (!baselineId || !candidateId) return
    setBusy(true)
    setError('')
    try {
      const result = await rpc<CompareSessionsResult>(ctx, 'compare', { baselineId, candidateId })
      setComparison(result.comparison)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      setBusy(false)
    }
  }, [baselineId, candidateId, ctx])

  if (!open) return null
  return React.createElement('section', { className: 'dproof-panel', 'aria-label': 'DSH Proof comparison' },
    React.createElement('header', { className: 'dproof-head' },
      React.createElement('span', { className: 'dproof-title' }, 'DSH Proof'),
      React.createElement('span', { className: 'dproof-fact' }, 'Measured facts only'),
      React.createElement('button', { type: 'button', className: 'dproof-close', onClick: () => setOpen(false), 'aria-label': 'Close' }, '×'),
    ),
    React.createElement('div', { className: 'dproof-body' },
      React.createElement('div', { className: 'dproof-columns' },
        sessionPicker('Baseline', baselineId, sessions, setBaselineId),
        sessionPicker('Candidate', candidateId, sessions, setCandidateId),
      ),
      React.createElement('button', {
        type: 'button',
        className: 'dproof-compare',
        disabled: busy || !baselineId || !candidateId || baselineId === candidateId,
        onClick: () => void compare(),
      }, busy ? 'Reading evidence…' : 'Compare sessions'),
      error ? React.createElement('div', { className: 'dproof-error', role: 'alert' }, error) : null,
      comparison ? React.createElement(ComparisonView, { comparison }) : React.createElement(
        'div',
        { className: 'dproof-empty' },
        sessions.length < 2 ? 'At least two sessions are needed for a comparison.' : 'Choose two sessions to compare their recorded execution facts.',
      ),
    ),
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

function ComparisonView({ comparison }: { comparison: ProofComparison }): React.ReactElement {
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
      React.createElement('strong', null, 'Task outcome: undetermined'),
      React.createElement('span', null, 'A completed run is not proof that the task succeeded.'),
    ),
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
    React.createElement('div', { className: 'dproof-export' },
      React.createElement('button', { type: 'button', className: 'dproof-button', onClick: () => downloadReport(comparison, 'json') }, 'Download JSON'),
      React.createElement('button', { type: 'button', className: 'dproof-button', onClick: () => downloadReport(comparison, 'html') }, 'Download HTML'),
    ),
  )
}

function downloadReport(comparison: ProofComparison, format: 'json' | 'html'): void {
  const report = createProofReport(comparison)
  const content = format === 'json' ? serializeProofReport(report) : renderProofHtml(report)
  const blob = new Blob([content], { type: format === 'json' ? 'application/json' : 'text/html' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `dsh-proof-${Date.now()}.${format}`
  link.click()
  URL.revokeObjectURL(url)
}

function compact(value: number): string {
  return new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(value)
}

function duration(value: number): string {
  if (value < 1000) return `${Math.round(value)} ms`
  return `${(value / 1000).toFixed(1)} s`
}
