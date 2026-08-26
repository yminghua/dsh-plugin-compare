export interface CapturedEvent {
  type: string
  time?: number
  data?: unknown
}

export interface SessionCounters {
  events: number
  turns: number
  steps: number
  toolCalls: number
  failedToolCalls: number
}

export class ProofCollector {
  readonly #sessions = new Map<string, SessionCounters>()

  record(sessionId: string, event: CapturedEvent): void {
    const current = this.#sessions.get(sessionId) ?? {
      events: 0,
      turns: 0,
      steps: 0,
      toolCalls: 0,
      failedToolCalls: 0,
    }
    current.events += 1
    if (event.type === 'turn/start') current.turns += 1
    if (event.type === 'step/start') current.steps += 1
    if (event.type === 'tool/call') current.toolCalls += 1
    if (event.type === 'tool/result' && isFailedResult(event.data)) current.failedToolCalls += 1
    this.#sessions.set(sessionId, current)
  }

  snapshot(sessionId: string): SessionCounters | undefined {
    const value = this.#sessions.get(sessionId)
    return value ? { ...value } : undefined
  }
}

function isFailedResult(data: unknown): boolean {
  if (!data || typeof data !== 'object') return false
  const record = data as Record<string, unknown>
  return record.isError === true || record.status === 'error' || record.ok === false
}
