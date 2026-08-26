const OPEN_EVENT = 'dsh-proof:open'

export function requestProofPanel(): void {
  window.dispatchEvent(new CustomEvent(OPEN_EVENT))
}

export function subscribeProofPanel(listener: () => void): () => void {
  window.addEventListener(OPEN_EVENT, listener)
  return () => window.removeEventListener(OPEN_EVENT, listener)
}
