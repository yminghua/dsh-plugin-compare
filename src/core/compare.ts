import type {
  NumericDelta,
  ProofComparison,
  ProofRun,
  RunMetrics,
  TokenUsage,
} from './types.ts'

export function totalTokens(tokens: TokenUsage): number {
  return tokens.input + tokens.output + tokens.cacheRead + tokens.cacheWrite
}

export function numericDelta(baseline: number, candidate: number): NumericDelta {
  const absolute = candidate - baseline
  return {
    baseline,
    candidate,
    absolute,
    percent: baseline === 0 ? null : (absolute / baseline) * 100,
  }
}

function outcomeRank(outcome: RunMetrics['outcome']): number {
  if (outcome === 'pass') return 2
  if (outcome === 'unknown') return 1
  return 0
}

function chooseWinner(baseline: ProofRun, candidate: ProofRun): ProofComparison['winner'] {
  const baselineRank = outcomeRank(baseline.metrics.outcome)
  const candidateRank = outcomeRank(candidate.metrics.outcome)
  if (baselineRank !== candidateRank) return candidateRank > baselineRank ? 'candidate' : 'baseline'
  if (baseline.metrics.outcome === 'unknown') return 'undetermined'

  const baselineTokens = totalTokens(baseline.metrics.tokens)
  const candidateTokens = totalTokens(candidate.metrics.tokens)
  const baselineScore = baseline.metrics.durationMs + baselineTokens
  const candidateScore = candidate.metrics.durationMs + candidateTokens
  if (baselineScore === candidateScore) return 'tie'
  return candidateScore < baselineScore ? 'candidate' : 'baseline'
}

export function compareRuns(baseline: ProofRun, candidate: ProofRun): ProofComparison {
  const comparison: ProofComparison = {
    baseline,
    candidate,
    winner: chooseWinner(baseline, candidate),
    deltas: {
      durationMs: numericDelta(baseline.metrics.durationMs, candidate.metrics.durationMs),
      totalTokens: numericDelta(totalTokens(baseline.metrics.tokens), totalTokens(candidate.metrics.tokens)),
      steps: numericDelta(baseline.metrics.steps, candidate.metrics.steps),
      toolCalls: numericDelta(baseline.metrics.toolCalls, candidate.metrics.toolCalls),
      failedToolCalls: numericDelta(baseline.metrics.failedToolCalls, candidate.metrics.failedToolCalls),
      retries: numericDelta(baseline.metrics.retries, candidate.metrics.retries),
    },
  }

  if (baseline.metrics.changedFiles !== undefined && candidate.metrics.changedFiles !== undefined) {
    comparison.deltas.changedFiles = numericDelta(baseline.metrics.changedFiles, candidate.metrics.changedFiles)
  }
  if (baseline.metrics.costUsd !== undefined && candidate.metrics.costUsd !== undefined) {
    comparison.deltas.costUsd = numericDelta(baseline.metrics.costUsd, candidate.metrics.costUsd)
  }
  return comparison
}
