import test from 'node:test'
import assert from 'node:assert/strict'
import { applyControlledFacts, compareRuns, summarizeExperiment, validateControlledRunInput } from '../lib/core/index.js'

const run = {
  id: 'run', label: 'Run', capturedAt: '2026-08-27T00:00:00.000Z',
  metrics: {
    outcome: 'unknown', execution: 'completed', durationMs: 1, turns: 1, steps: 1,
    toolCalls: 0, failedToolCalls: 0, retries: 0,
    tokens: { input: 1, output: 1, cacheRead: 0, cacheWrite: 0 },
  },
}

test('controlled facts keep execution and explicit success judgment separate', () => {
  const check = { command: 'pnpm test', status: 'fail', exitCode: 1, durationMs: 20, output: 'failed' }
  const result = applyControlledFacts(run, check, { available: true, head: 'abc', status: ' M a.ts', diff: 'diff', changedFiles: 1 })
  assert.equal(result.metrics.execution, 'completed')
  assert.equal(result.metrics.outcome, 'fail')
  assert.equal(result.metrics.changedFiles, 1)
  assert.equal(result.check, check)
})

test('validates bounded controlled-run requests', () => {
  const result = validateControlledRunInput({
    sourceDir: '/tmp/project', prompt: 'Fix it',
    model: { provider: 'deepseek', model: 'deepseek-chat' },
    baseline: { presetId: 'base', presetName: 'Base' },
    candidate: { presetId: 'plugin', presetName: 'Plugin' },
    successCommand: 'pnpm test',
  })
  assert.equal(result.candidate.presetId, 'plugin')
  assert.equal(result.trials, 1)
  assert.throws(() => validateControlledRunInput({}), /Missing sourceDir/)
  assert.throws(() => validateControlledRunInput({
    sourceDir: '/tmp/project', prompt: 'Fix it', trials: 11,
    model: { provider: 'deepseek', model: 'deepseek-chat' },
    baseline: { presetId: 'base', presetName: 'Base' }, candidate: { presetId: 'plugin', presetName: 'Plugin' },
  }), /trials must be an integer/)
  assert.throws(() => validateControlledRunInput({
    sourceDir: '/tmp/project', prompt: 'Fix it',
    baseline: { presetId: 'base', presetName: 'Base' }, candidate: { presetId: 'plugin', presetName: 'Plugin' },
  }), /Invalid model/)
})

test('summarizes paired trials with uncertainty instead of choosing a winner', () => {
  const trial = (index, baselineDuration, candidateDuration, baselineTokens, candidateTokens) => compareRuns(
    { ...run, id: `b${index}`, metrics: { ...run.metrics, outcome: 'pass', durationMs: baselineDuration, tokens: { ...run.metrics.tokens, input: baselineTokens, output: 0 } } },
    { ...run, id: `c${index}`, metrics: { ...run.metrics, outcome: 'pass', durationMs: candidateDuration, tokens: { ...run.metrics.tokens, input: candidateTokens, output: 0 } } },
  )
  const summary = summarizeExperiment([
    trial(1, 100, 80, 100, 90),
    trial(2, 200, 250, 100, 90),
    trial(3, 300, 250, 100, 90),
  ])
  assert.equal(summary.trials, 3)
  assert.equal(summary.outcomes.baseline.pass, 3)
  assert.equal(summary.observations.length, 3)
  assert.equal(summary.observations[1].durationDeltaMs, 50)
  assert.equal(summary.durationMs.medianDelta, -20)
  assert.ok(summary.durationMs.ci95[0] < 0)
  assert.ok(summary.durationMs.ci95[1] > 0)
  assert.deepEqual(summary.totalTokens.ci95, [-10, -10])
  assert.equal(summarizeExperiment([trial(1, 100, 80, 100, 90)]).durationMs.ci95, null)
})
