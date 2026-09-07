import { totalTokens } from './compare.ts'
import type { RunComparison } from './types.ts'

export interface DistributionSummary {
  mean: number
  median: number
}

export interface PairedDeltaSummary {
  samples: number
  baseline: DistributionSummary
  candidate: DistributionSummary
  meanDelta: number
  medianDelta: number
  ci95: [number, number] | null
  lowerIsBetter: true
}

export interface ExperimentSummary {
  trials: number
  observations: TrialObservation[]
  outcomes: {
    baseline: { pass: number; fail: number; unknown: number }
    candidate: { pass: number; fail: number; unknown: number }
  }
  durationMs: PairedDeltaSummary
  totalTokens: PairedDeltaSummary
  interpretation: string
}

export interface TrialObservation {
  trial: number
  baselineSessionId: string
  candidateSessionId: string
  baselineOutcome: RunComparison['baseline']['metrics']['outcome']
  candidateOutcome: RunComparison['candidate']['metrics']['outcome']
  durationDeltaMs: number
  totalTokensDelta: number
}

export function summarizeExperiment(comparisons: readonly RunComparison[]): ExperimentSummary {
  if (comparisons.length === 0) throw new Error('At least one trial is required')
  return {
    trials: comparisons.length,
    observations: comparisons.map((item, index) => ({
      trial: index + 1,
      baselineSessionId: item.baseline.sessionId ?? item.baseline.id,
      candidateSessionId: item.candidate.sessionId ?? item.candidate.id,
      baselineOutcome: item.baseline.metrics.outcome,
      candidateOutcome: item.candidate.metrics.outcome,
      durationDeltaMs: item.deltas.durationMs.absolute,
      totalTokensDelta: item.deltas.totalTokens.absolute,
    })),
    outcomes: {
      baseline: outcomeCounts(comparisons.map((item) => item.baseline.metrics.outcome)),
      candidate: outcomeCounts(comparisons.map((item) => item.candidate.metrics.outcome)),
    },
    durationMs: pairedSummary(
      comparisons.map((item) => item.baseline.metrics.durationMs),
      comparisons.map((item) => item.candidate.metrics.durationMs),
    ),
    totalTokens: pairedSummary(
      comparisons.map((item) => totalTokens(item.baseline.metrics.tokens)),
      comparisons.map((item) => totalTokens(item.candidate.metrics.tokens)),
    ),
    interpretation: comparisons.length < 2
      ? 'One pair cannot estimate run-to-run uncertainty.'
      : 'Paired 95% intervals describe observed variation; they do not by themselves prove that a preset caused the difference.',
  }
}

function outcomeCounts(values: readonly RunComparison['baseline']['metrics']['outcome'][]): { pass: number; fail: number; unknown: number } {
  return {
    pass: values.filter((value) => value === 'pass').length,
    fail: values.filter((value) => value === 'fail').length,
    unknown: values.filter((value) => value === 'unknown').length,
  }
}

function pairedSummary(baseline: readonly number[], candidate: readonly number[]): PairedDeltaSummary {
  if (baseline.length !== candidate.length || baseline.length === 0) throw new Error('Paired samples must be non-empty and equal in length')
  const deltas = candidate.map((value, index) => value - (baseline[index] ?? 0))
  return {
    samples: deltas.length,
    baseline: distribution(baseline),
    candidate: distribution(candidate),
    meanDelta: mean(deltas),
    medianDelta: median(deltas),
    ci95: confidenceInterval95(deltas),
    lowerIsBetter: true,
  }
}

function distribution(values: readonly number[]): DistributionSummary {
  return { mean: mean(values), median: median(values) }
}

function mean(values: readonly number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function median(values: readonly number[]): number {
  const sorted = [...values].sort((left, right) => left - right)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 1 ? sorted[middle] ?? 0 : ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2
}

function confidenceInterval95(values: readonly number[]): [number, number] | null {
  if (values.length < 2) return null
  const average = mean(values)
  const variance = values.reduce((sum, value) => sum + (value - average) ** 2, 0) / (values.length - 1)
  const standardError = Math.sqrt(variance / values.length)
  const margin = tCritical95(values.length - 1) * standardError
  return [average - margin, average + margin]
}

function tCritical95(degreesOfFreedom: number): number {
  const values = [12.706, 4.303, 3.182, 2.776, 2.571, 2.447, 2.365, 2.306, 2.262, 2.228]
  return values[degreesOfFreedom - 1] ?? 1.96
}
