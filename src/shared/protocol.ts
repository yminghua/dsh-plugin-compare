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
  plugin?: string
  pluginVersion?: string
  pluginSource?: 'package-manifest' | 'preset-registration'
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

export type RunPhase = 'preparing' | 'copying' | 'starting' | 'running' | 'checking' | 'collecting' | 'cleanup' | 'completed' | 'failed'
export interface ControlledProgress {
  runId: string
  phase: RunPhase
  startedAt: number
  phaseStartedAt: number
  updatedAt: number
  trial: number
  trials: number
  variant: 'baseline' | 'candidate' | null
  presetName: string
  completedVariants: number
  completedDurationMs: number
  totalVariants: number
  events: number
  lastActivityAt: number | null
  runTimeoutMs: number
  checkTimeoutMs: number
}
export type ProgressUpdate = Partial<Pick<ControlledProgress, 'phase' | 'trial' | 'variant' | 'presetName' | 'completedVariants' | 'events' | 'lastActivityAt'>>

// The subset of the DSH transport error contract emitted by this plugin.
export type RpcError = { code: 'internal'; message: string; details: Record<string, never> }
export type RpcResult<T> = { ok: true; value: T } | { ok: false; error: RpcError }
