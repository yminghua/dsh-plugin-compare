import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { projectSession } from '../lib/core/index.js'

const fixtures = JSON.parse(await readFile(new URL('./fixtures/sessions.json', import.meta.url), 'utf8'))

test('projects measured session facts without inventing task success', () => {
  const run = projectSession(fixtures.baseline)
  assert.equal(run.metrics.outcome, 'unknown')
  assert.equal(run.metrics.execution, 'completed')
  assert.equal(run.metrics.durationMs, 1000)
  assert.equal(run.metrics.turns, 1)
  assert.equal(run.metrics.steps, 1)
  assert.equal(run.metrics.toolCalls, 1)
  assert.equal(run.metrics.failedToolCalls, 1)
  assert.equal(run.metrics.retries, 1)
  assert.equal(run.metrics.changedFiles, 1)
  assert.deepEqual(run.metrics.tokens, { input: 1000, output: 200, cacheRead: 100, cacheWrite: 50 })
  assert.equal(run.provider, 'deepseek')
  assert.equal(run.model, 'v4')
})

test('projects structured pre-response errors as startup failures', () => {
  const run = projectSession({
    id: 'failed', title: 'Failed run', createdAt: 1000,
    events: [
      { seq: 0, type: 'turn/start', time: 1000, data: { turn: 1 } },
      { seq: 1, type: 'step/start', time: 1010, data: { turn: 1, step: 1 } },
      { seq: 2, type: 'turn/end', time: 1040, data: { turn: 1, reason: { kind: 'error', error: { code: 'NO_MODEL', message: 'has no provider/model' } } } },
    ],
  })
  assert.equal(run.metrics.execution, 'failed')
  assert.deepEqual(run.failure, { phase: 'startup', code: 'NO_MODEL', message: 'has no provider/model' })
})
