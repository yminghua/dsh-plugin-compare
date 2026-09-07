import React from 'react'
import type { Context } from '@deepseek-ai/cordis'
import type { ControlledProgress, RunPhase } from '../shared/protocol.ts'
import { rpc } from './options.ts'

export function watchProgress(ctx: Context, runId: string, update: (value: ControlledProgress) => void, issue: (message: string) => void): () => void {
  let stopped = false
  let timer: ReturnType<typeof setTimeout>
  const poll = async () => {
    try {
      const value = await rpc<ControlledProgress | null>(ctx, 'controlled-progress', { runId })
      if (stopped) return
      if (value) { update(value); issue('') }
      else issue('Waiting for the server to register this run…')
    } catch (error) {
      if (!stopped) issue(`Progress unavailable: ${error instanceof Error ? error.message : String(error)}. The run may still be executing; do not start another run.`)
    }
    if (!stopped) timer = setTimeout(() => void poll(), 1000)
  }
  timer = setTimeout(() => void poll(), 500)
  return () => { stopped = true; clearTimeout(timer) }
}

const labels: Record<RunPhase, string> = {
  preparing: 'Preparing experiment', copying: 'Copying isolated workspaces', starting: 'Starting Agent',
  running: 'Agent executing', checking: 'Running success check', collecting: 'Collecting evidence',
  cleanup: 'Cleaning temporary workspaces', completed: 'Execution finished', failed: 'Execution stopped',
}

export function elapsedLabel(ms: number): string {
  const seconds = Math.max(0, Math.floor(ms / 1000))
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
}

export function remainingLabel(progress: ControlledProgress, now: number): string {
  if (progress.phase === 'failed') return 'Stopped — see the error below.'
  if (progress.phase === 'completed') return 'Execution finished.'
  if (progress.completedVariants === progress.totalVariants) return 'Final cleanup and report preparation…'
  if (!progress.completedVariants) return 'Remaining time unknown until the first Agent run finishes.'
  const remaining = progress.completedDurationMs / progress.completedVariants * (progress.totalVariants - progress.completedVariants)
  const spent = Math.max(0, now - progress.startedAt - progress.completedDurationMs)
  if (spent >= remaining * 1.5) return 'Taking longer than the earlier runs; remaining time is uncertain.'
  return `Rough remaining: ${elapsedLabel(Math.max(0, remaining * 0.5 - spent))}–${elapsedLabel(remaining * 1.5 - spent)} · based on completed runs, not a guarantee.`
}

export function RunProgressView({ progress, startedAt, receivedAt, issue }: {
  progress: ControlledProgress | null; startedAt: number; receivedAt: number; issue: string
}): React.ReactElement {
  const [now, setNow] = React.useState(Date.now)
  React.useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])
  const stale = now - receivedAt > 10_000 && progress?.phase !== 'completed' && progress?.phase !== 'failed'
  return React.createElement('section', { className: 'dproof-progress', 'aria-label': 'Controlled run progress' },
    React.createElement('div', { className: 'dproof-section-head' },
      React.createElement('strong', { role: 'status' }, progress ? labels[progress.phase] : 'Submitting experiment…'),
      React.createElement('span', null, `Elapsed ${elapsedLabel(now - (progress?.startedAt ?? startedAt))}`),
    ),
    progress ? React.createElement(React.Fragment, null,
      React.createElement('div', null, `Pair ${progress.trial || 1}/${progress.trials}${progress.variant ? ` · ${progress.variant === 'baseline' ? 'A · Baseline' : 'B · Candidate'} · ${progress.presetName}` : ''}`),
      React.createElement('progress', { max: progress.totalVariants, value: progress.completedVariants, 'aria-label': 'Finished Agent runs (not elapsed time)' }),
      React.createElement('div', { className: 'dproof-muted' }, `${progress.completedVariants}/${progress.totalVariants} Agent runs finished · Current stage ${elapsedLabel(now - progress.phaseStartedAt)}`),
      React.createElement('div', { className: 'dproof-muted' }, remainingLabel(progress, now)),
      progress.phase === 'running' ? React.createElement('div', { className: 'dproof-muted' }, `${progress.events} recorded events · ${progress.lastActivityAt ? `Latest activity ${elapsedLabel(now - progress.lastActivityAt)} ago` : 'Waiting for first recorded activity'} · Agent timeout ${elapsedLabel(progress.runTimeoutMs)}`) : null,
      progress.phase === 'checking' ? React.createElement('div', { className: 'dproof-muted' }, `Success-check timeout ${elapsedLabel(progress.checkTimeoutMs)}`) : null,
    ) : React.createElement('div', { className: 'dproof-muted' }, 'Waiting for server progress. Model response times vary.'),
    issue || stale ? React.createElement('div', { className: 'dproof-warning', role: 'status' }, issue || 'Progress updates are delayed. The last known state is shown; this does not mean the run has stopped.') : null,
  )
}
