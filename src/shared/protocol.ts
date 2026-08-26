import type { ComparisonEvidence, ProofComparison, ProofRun } from '../core/index.ts'

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
  evidence: ComparisonEvidence
}

export interface PresetListItem {
  id: string
  name: string
  trust: 'system' | 'user'
  description?: string
  broken?: string
}

export interface ListPresetsResult { presets: PresetListItem[] }

export interface ControlledRunDesign {
  sourceDir: string
  isolation: 'filesystem-copy'
  order: ['baseline', 'candidate']
  trials: 1
  caveat: string
}

export interface ControlledRunResult extends CompareSessionsResult {
  design: ControlledRunDesign
}

export type RpcError = { code: string; message: string }
export type RpcResult<T> = { ok: true; value: T } | { ok: false; error: RpcError }
