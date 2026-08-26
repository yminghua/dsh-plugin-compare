import type { ExecutionStatus, ProofRun, TokenUsage } from './types.ts'

export interface ProofEvent {
  seq: number
  type: string
  time: number
  data?: unknown
}

export interface SessionProjectionInput {
  id: string
  title: string
  createdAt: number
  cwd?: string
  events: readonly ProofEvent[]
}

interface UsageLike {
  inputTokens?: unknown
  outputTokens?: unknown
  cacheReadTokens?: unknown
  cacheWriteTokens?: unknown
}

function finiteNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : 0
}

function executionFromReason(reason: unknown): ExecutionStatus {
  if (!reason || typeof reason !== 'object') return 'unknown'
  const kind = (reason as Record<string, unknown>).kind
  if (kind === 'completed') return 'completed'
  if (kind === 'aborted' || kind === 'interrupted') return 'aborted'
  if (kind === 'blocked') return 'blocked'
  if (kind === 'error' || kind === 'max-tokens') return 'failed'
  return 'unknown'
}

function textField(value: unknown): string | undefined {
  return typeof value === 'string' && value !== '' ? value : undefined
}

export function projectSession(input: SessionProjectionInput): ProofRun {
  let turns = 0
  let steps = 0
  let toolCalls = 0
  let failedToolCalls = 0
  let retries = 0
  let minTime: number | undefined
  let maxTime: number | undefined
  let activeTurnStart: number | undefined
  let activeDurationMs = 0
  let execution: ExecutionStatus = 'unknown'
  let model: string | undefined
  let provider: string | undefined
  const tokens: TokenUsage = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }

  for (const event of input.events) {
    if (Number.isFinite(event.time)) {
      minTime = minTime === undefined ? event.time : Math.min(minTime, event.time)
      maxTime = maxTime === undefined ? event.time : Math.max(maxTime, event.time)
    }
    const data = event.data && typeof event.data === 'object'
      ? event.data as Record<string, unknown>
      : undefined

    switch (event.type) {
      case 'turn/start':
        turns += 1
        activeTurnStart = event.time
        execution = 'running'
        break
      case 'turn/end':
        if (activeTurnStart !== undefined && event.time >= activeTurnStart) activeDurationMs += event.time - activeTurnStart
        activeTurnStart = undefined
        execution = executionFromReason(data?.reason)
        break
      case 'step/start':
        steps += 1
        break
      case 'tool/call':
        toolCalls += 1
        break
      case 'tool/result':
        if (data?.error !== undefined) failedToolCalls += 1
        break
      case 'llm/retry':
        retries += 1
        break
      case 'assistant/message': {
        const usage = data?.usage as UsageLike | undefined
        if (usage !== undefined) {
          tokens.input += finiteNumber(usage.inputTokens)
          tokens.output += finiteNumber(usage.outputTokens)
          tokens.cacheRead += finiteNumber(usage.cacheReadTokens)
          tokens.cacheWrite += finiteNumber(usage.cacheWriteTokens)
        }
        break
      }
      case 'request/header': {
        const header = data?.header as { config?: { model?: unknown; provider?: unknown } } | undefined
        model = textField(header?.config?.model) ?? model
        provider = textField(header?.config?.provider) ?? provider
        break
      }
      case 'request/context':
        model = textField(data?.model) ?? model
        provider = textField(data?.provider) ?? provider
        break
      default:
        break
    }
  }

  if (activeTurnStart !== undefined && maxTime !== undefined && maxTime >= activeTurnStart) activeDurationMs += maxTime - activeTurnStart
  const wallDurationMs = minTime !== undefined && maxTime !== undefined ? Math.max(0, maxTime - minTime) : 0

  return {
    id: input.id,
    label: input.title,
    sessionId: input.id,
    capturedAt: new Date(input.createdAt).toISOString(),
    ...(input.cwd !== undefined ? { cwd: input.cwd } : {}),
    ...(model !== undefined ? { model } : {}),
    ...(provider !== undefined ? { provider } : {}),
    metrics: {
      outcome: 'unknown',
      execution,
      durationMs: activeDurationMs > 0 ? activeDurationMs : wallDurationMs,
      turns,
      steps,
      toolCalls,
      failedToolCalls,
      retries,
      tokens,
    },
  }
}
