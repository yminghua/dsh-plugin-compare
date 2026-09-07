import type { ComparisonEvidence, FileDiffEvidence, RunEvidence, TimelineEntry, TimelineLane, TimelineStatus } from './types.ts'
import type { ComparisonEvent } from './project.ts'

interface FileDiffLike { path: string; oldText: string | null; newText: string }

function object(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' ? value as Record<string, unknown> : undefined
}

function fileDiff(value: unknown): FileDiffLike | undefined {
  const candidate = object(value)
  if (!candidate || typeof candidate.path !== 'string' || typeof candidate.newText !== 'string') return undefined
  if (candidate.oldText !== null && typeof candidate.oldText !== 'string') return undefined
  return { path: candidate.path, oldText: candidate.oldText, newText: candidate.newText }
}

export function fileDiffsFromEvent(event: ComparisonEvent): FileDiffEvidence[] {
  if (event.type !== 'tool/result') return []
  const diffs = object(object(event.data)?.meta)?.diffs
  if (!Array.isArray(diffs)) return []
  return diffs.flatMap((value) => {
    const diff = fileDiff(value)
    return diff ? [{ seq: event.seq, ...diff }] : []
  })
}

function presentation(event: ComparisonEvent): { lane: TimelineLane; status: TimelineStatus; label: string } {
  const data = object(event.data)
  switch (event.type) {
    case 'turn/start': return { lane: 'turn', status: 'start', label: `Turn ${number(data?.turn) ?? ''} started`.replace('  ', ' ') }
    case 'turn/end': {
      const reason = object(data?.reason)
      const kind = reason?.kind
      const status: TimelineStatus = kind === 'completed' ? 'complete' : kind === 'error' || kind === 'max-tokens' ? 'failed' : 'info'
      const message = typeof object(reason?.error)?.message === 'string' ? object(reason?.error)?.message as string : undefined
      return { lane: 'turn', status, label: message ? `Turn ended · ${message}` : `Turn ended · ${typeof kind === 'string' ? kind : 'unknown'}` }
    }
    case 'step/start': return { lane: 'model', status: 'start', label: `Step ${number(data?.step) ?? ''} started`.replace('  ', ' ') }
    case 'step/end': return { lane: 'model', status: 'complete', label: `Step ${number(data?.step) ?? ''} completed`.replace('  ', ' ') }
    case 'assistant/message': return { lane: 'model', status: data?.interrupted === true ? 'failed' : 'complete', label: 'Assistant response' }
    case 'tool/call': return { lane: 'tool', status: 'start', label: `Tool · ${typeof data?.name === 'string' ? data.name : 'unknown'}` }
    case 'tool/result': return { lane: 'tool', status: data?.error === undefined ? 'complete' : 'failed', label: data?.error === undefined ? 'Tool result' : 'Tool failed' }
    case 'llm/retry': return { lane: 'model', status: 'retry', label: 'Model retry' }
    case 'request/header': return { lane: 'system', status: 'info', label: `Request · ${typeof data?.reason === 'string' ? data.reason : 'header'}` }
    case 'request/context': return { lane: 'system', status: 'info', label: 'Model route selected' }
    default: return { lane: 'system', status: 'info', label: event.type }
  }
}

function number(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

export function projectSessionEvidence(sessionId: string, events: readonly ComparisonEvent[]): RunEvidence {
  const origin = events.reduce<number | undefined>((minimum, event) => Number.isFinite(event.time)
    ? minimum === undefined ? event.time : Math.min(minimum, event.time)
    : minimum, undefined)
  const timeline: TimelineEntry[] = events.map((event) => ({
    seq: event.seq,
    time: event.time,
    elapsedMs: origin === undefined || !Number.isFinite(event.time) ? 0 : Math.max(0, event.time - origin),
    type: event.type,
    ...presentation(event),
  }))
  return { sessionId, timeline, fileDiffs: events.flatMap(fileDiffsFromEvent) }
}

export function comparisonEvidence(baseline: RunEvidence, candidate: RunEvidence): ComparisonEvidence {
  return { baseline, candidate }
}
