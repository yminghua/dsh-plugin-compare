const OPEN_EVENT = 'dsh-plugin-compare:open'

export interface ComparisonPanelRequest { sessionId?: string }

export function requestComparisonPanel(sessionId?: string): void {
  window.dispatchEvent(new CustomEvent<ComparisonPanelRequest>(OPEN_EVENT, {
    detail: sessionId === undefined ? {} : { sessionId },
  }))
}

export function subscribeComparisonPanel(listener: (request: ComparisonPanelRequest) => void): () => void {
  const handle = (event: Event) => listener((event as CustomEvent<ComparisonPanelRequest>).detail ?? {})
  window.addEventListener(OPEN_EVENT, handle)
  return () => window.removeEventListener(OPEN_EVENT, handle)
}
