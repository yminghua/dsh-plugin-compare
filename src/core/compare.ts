import type {
  NumericDelta,
  ProofComparison,
  ProofRun,
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

function chooseWinner(baseline: ProofRun, candidate: ProofRun): ProofComparison['winner'] {
  if (baseline.metrics.outcome === 'pass' && candidate.metrics.outcome === 'fail') return 'baseline'
  if (candidate.metrics.outcome === 'pass' && baseline.metrics.outcome === 'fail') return 'candidate'
  return 'undetermined'
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
