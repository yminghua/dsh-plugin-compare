import type { ProofComparison, ProofRun } from './types.ts'

export function runIdentity(run: ProofRun) {
  return {
    name: run.plugin ?? run.presetName ?? run.label,
    version: run.pluginVersion ?? '',
    preset: run.presetName ?? run.label,
    presetId: run.presetId ?? '',
    source: run.pluginSource === 'package-manifest' ? 'Package manifest'
      : run.pluginSource === 'preset-registration' ? 'Preset registration · declared metadata'
      : run.pluginSource === 'report-label' ? 'Report label · added after execution'
      : run.plugin ? 'Recorded plugin label' : 'Plugin identity not recorded · showing preset/session',
  }
}

export function reportHeadline(comparison: ProofComparison): string {
  const runs = [comparison.baseline, comparison.candidate]
  if (runs.some((run) => run.failure?.phase === 'startup')) return 'Invalid comparison · Agent startup failed'
  if (runs.every((run) => run.check?.status === 'pass')) return 'Both variants passed the success check'
  if (runs.some((run) => run.check?.status === 'fail' || run.check?.status === 'error')) return 'At least one success check did not pass'
  return 'Execution recorded · task success not fully verified'
}

export function percentChange(value: number | null): string {
  return value === null ? 'No baseline for %' : `${value > 0 ? '+' : ''}${value.toFixed(1)}%`
}

export function reportMetricCards(comparison: ProofComparison) {
  return [
    { label: 'Agent time', before: `${(comparison.deltas.durationMs.baseline / 1000).toFixed(1)} s`, after: `${(comparison.deltas.durationMs.candidate / 1000).toFixed(1)} s`, change: percentChange(comparison.deltas.durationMs.percent) },
    { label: 'Tool calls', before: String(comparison.deltas.toolCalls.baseline), after: String(comparison.deltas.toolCalls.candidate), change: percentChange(comparison.deltas.toolCalls.percent) },
    { label: 'Recorded tokens', before: comparison.deltas.totalTokens.baseline.toLocaleString('en-US'), after: comparison.deltas.totalTokens.candidate.toLocaleString('en-US'), change: percentChange(comparison.deltas.totalTokens.percent) },
  ]
}
