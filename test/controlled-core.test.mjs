import test from 'node:test'
import assert from 'node:assert/strict'
import { applyControlledFacts, validateControlledRunInput } from '../lib/core/index.js'

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
    baseline: { presetId: 'base', presetName: 'Base' },
    candidate: { presetId: 'plugin', presetName: 'Plugin' },
    successCommand: 'pnpm test',
  })
  assert.equal(result.candidate.presetId, 'plugin')
  assert.throws(() => validateControlledRunInput({}), /Missing sourceDir/)
})
