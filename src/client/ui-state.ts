const OPEN_EVENT = 'dsh-proof:open'

export interface ProofPanelRequest { sessionId?: string }

export function requestProofPanel(sessionId?: string): void {
  window.dispatchEvent(new CustomEvent<ProofPanelRequest>(OPEN_EVENT, {
    detail: sessionId === undefined ? {} : { sessionId },
  }))
}

export function subscribeProofPanel(listener: (request: ProofPanelRequest) => void): () => void {
  const handle = (event: Event) => listener((event as CustomEvent<ProofPanelRequest>).detail ?? {})
  window.addEventListener(OPEN_EVENT, handle)
  return () => window.removeEventListener(OPEN_EVENT, handle)
}
