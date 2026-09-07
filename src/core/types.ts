export type RunOutcome = 'pass' | 'fail' | 'unknown'
export type ExecutionStatus = 'completed' | 'failed' | 'aborted' | 'blocked' | 'running' | 'unknown'

export interface TokenUsage {
  input: number
  output: number
  cacheRead: number
  cacheWrite: number
}

export interface RunMetrics {
  outcome: RunOutcome
  execution: ExecutionStatus
  durationMs: number
  turns: number
  steps: number
  toolCalls: number
  failedToolCalls: number
  retries: number
  changedFiles?: number
  tokens: TokenUsage
  costUsd?: number
}

export interface ComparisonRun {
  id: string
  label: string
  sessionId?: string
  plugin?: string
  pluginVersion?: string
  pluginSource?: 'package-manifest' | 'preset-registration' | 'report-label'
  presetId?: string
  presetName?: string
  cwd?: string
  model?: string
  provider?: string
  failure?: RunFailure
  capturedAt: string
  metrics: RunMetrics
  check?: ExplicitCheckResult
}

export interface RunFailure {
  phase: 'startup' | 'execution'
  message: string
  code?: string
}

export interface ExplicitCheckResult {
  command: string
  status: 'pass' | 'fail' | 'error' | 'not-run'
  exitCode: number | null
  durationMs: number
  output: string
}

export type TimelineLane = 'turn' | 'model' | 'tool' | 'system'
export type TimelineStatus = 'start' | 'complete' | 'failed' | 'retry' | 'info'

export interface TimelineEntry {
  seq: number
  time: number
  elapsedMs: number
  type: string
  lane: TimelineLane
  status: TimelineStatus
  label: string
}

export interface FileDiffEvidence {
  seq: number
  path: string
  oldText: string | null
  newText: string
}

export interface RunEvidence {
  sessionId: string
  timeline: TimelineEntry[]
  fileDiffs: FileDiffEvidence[]
  git?: GitSnapshotEvidence
}

export interface GitSnapshotEvidence {
  available: boolean
  head?: string
  status: string
  diff: string
  changedFiles: number
}

export interface ComparisonEvidence {
  baseline: RunEvidence
  candidate: RunEvidence
}

export interface NumericDelta {
  baseline: number
  candidate: number
  absolute: number
  percent: number | null
}

export interface RunComparison {
  baseline: ComparisonRun
  candidate: ComparisonRun
  winner: 'baseline' | 'candidate' | 'tie' | 'undetermined'
  deltas: {
    durationMs: NumericDelta
    totalTokens: NumericDelta
    steps: NumericDelta
    toolCalls: NumericDelta
    failedToolCalls: NumericDelta
    retries: NumericDelta
    changedFiles?: NumericDelta
    costUsd?: NumericDelta
  }
}
