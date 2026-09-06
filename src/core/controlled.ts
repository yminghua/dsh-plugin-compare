import type { ExplicitCheckResult, GitSnapshotEvidence, ProofRun } from './types.ts'

export interface ControlledVariantInput {
  presetId: string
  presetName: string
}

export interface ControlledRunInput {
  sourceDir: string
  prompt: string
  model: { provider: string; model: string }
  baseline: ControlledVariantInput
  candidate: ControlledVariantInput
  successCommand?: string
  trials: number
}

export function applyControlledFacts(run: ProofRun, check: ExplicitCheckResult | undefined, git: GitSnapshotEvidence): ProofRun {
  return {
    ...run,
    metrics: {
      ...run.metrics,
      outcome: check?.status === 'pass' ? 'pass' : check?.status === 'fail' || check?.status === 'error' ? 'fail' : 'unknown',
      ...(git.available ? { changedFiles: git.changedFiles } : {}),
    },
    ...(check ? { check } : {}),
  }
}

export function validateControlledRunInput(value: unknown, maxTrials = 10): ControlledRunInput {
  const input = record(value, 'request')
  const sourceDir = boundedString(input.sourceDir, 'sourceDir', 4096)
  const prompt = boundedString(input.prompt, 'prompt', 100_000)
  const model = modelTarget(input.model)
  const baseline = variant(input.baseline, 'baseline')
  const candidate = variant(input.candidate, 'candidate')
  const successCommand = optionalBoundedString(input.successCommand, 'successCommand', 20_000)
  const trials = positiveInteger(input.trials, 'trials', 1, maxTrials)
  return { sourceDir, prompt, model, baseline, candidate, trials, ...(successCommand ? { successCommand } : {}) }
}

function modelTarget(value: unknown): ControlledRunInput['model'] {
  const input = record(value, 'model')
  return {
    provider: boundedString(input.provider, 'model.provider', 200),
    model: boundedString(input.model, 'model.model', 500),
  }
}

function variant(value: unknown, field: string): ControlledVariantInput {
  const input = record(value, field)
  return {
    presetId: boundedString(input.presetId, `${field}.presetId`, 200),
    presetName: boundedString(input.presetName, `${field}.presetName`, 500),
  }
}

function record(value: unknown, field: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`Invalid ${field}`)
  return value as Record<string, unknown>
}

function boundedString(value: unknown, field: string, max: number): string {
  if (typeof value !== 'string' || value.trim() === '') throw new Error(`Missing ${field}`)
  if (value.length > max) throw new Error(`${field} exceeds ${max} characters`)
  return value
}

function optionalBoundedString(value: unknown, field: string, max: number): string | undefined {
  if (value === undefined || value === '') return undefined
  return boundedString(value, field, max)
}

function positiveInteger(value: unknown, field: string, fallback: number, max: number): number {
  if (value === undefined) return fallback
  if (!Number.isInteger(value) || typeof value !== 'number' || value < 1 || value > max) throw new Error(`${field} must be an integer from 1 to ${max}`)
  return value
}
