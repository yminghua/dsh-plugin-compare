import type { ComparisonEvidence, ExperimentSummary, ProofComparison, ProofRun } from '../core/index.ts'

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

export interface ModelListItem {
  id: string
  name: string
  description?: string
}

export interface ModelProviderItem {
  id: string
  name: string
  models: ModelListItem[]
}

export interface ModelSelection { provider: string; model: string }

export interface ListModelsResult {
  providers: ModelProviderItem[]
  defaultSelection?: ModelSelection
}

export interface ControlledRunDesign {
  sourceDir: string
  isolation: 'filesystem-copy'
  order: 'alternating'
  trials: number
  caveat: string
  model: ModelSelection
}

export interface ControlledRunResult extends CompareSessionsResult {
  design: ControlledRunDesign
  trialComparisons: ProofComparison[]
  summary: ExperimentSummary
}

export type RpcError = { code: string; message: string }
export type RpcResult<T> = { ok: true; value: T } | { ok: false; error: RpcError }
