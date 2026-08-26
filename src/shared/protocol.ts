import type { ProofComparison, ProofRun } from '../core/index.ts'

export interface SessionListItem {
  sessionId: string
  title: string
  cwd: string
  createdAt: string
  live: boolean
  persisted: boolean
}

export interface ListSessionsResult {
  sessions: SessionListItem[]
  total: number
}

export interface ReadSessionResult {
  run: ProofRun
}

export interface CompareSessionsResult {
  comparison: ProofComparison
}

export type RpcError = { code: string; message: string }
export type RpcResult<T> = { ok: true; value: T } | { ok: false; error: RpcError }
