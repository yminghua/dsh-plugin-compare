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

export interface ProofRun {
  id: string
  label: string
  sessionId?: string
  plugin?: string
  cwd?: string
  model?: string
  provider?: string
  capturedAt: string
  metrics: RunMetrics
}

export interface NumericDelta {
  baseline: number
  candidate: number
  absolute: number
  percent: number | null
}

export interface ProofComparison {
  baseline: ProofRun
  candidate: ProofRun
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
