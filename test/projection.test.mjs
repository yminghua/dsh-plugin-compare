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
