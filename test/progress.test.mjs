import test from 'node:test'
import assert from 'node:assert/strict'
import { ProgressStore } from '../src/host/progress.ts'
import { elapsedLabel, remainingLabel, watchProgress } from '../src/client/progress.ts'

const limits = { runTimeoutMs: 900_000, checkTimeoutMs: 300_000 }

test('progress tracks phase timing, completion samples and terminal expiry', () => {
  let now = 1000
  const store = new ProgressStore(() => now)
  const update = store.start('test-run-1', 2, limits)
  assert.equal(store.read('missing-run'), null)
  assert.throws(() => store.start('test-run-1', 2, limits), /Duplicate/)
  assert.throws(() => store.start('bad id', 2, limits), /Invalid/)
  now = 2000
  update({ phase: 'running', variant: 'baseline', trial: 1 })
  now = 3000
  update({ events: 5, lastActivityAt: now })
  assert.equal(store.read('test-run-1').phaseStartedAt, 2000)
  assert.equal(store.read('test-run-1').events, 5)
  now = 61_000
  update({ completedVariants: 1 })
  assert.equal(store.read('test-run-1').completedDurationMs, 60_000)
  assert.match(remainingLabel(store.read('test-run-1'), now), /Rough remaining: 1m 30s–4m 30s/)
  assert.match(remainingLabel(store.read('test-run-1'), now + 300_000), /Taking longer/)
  now += 700_000
  assert.notEqual(store.read('test-run-1'), null, 'active runs must not expire')
  update({ phase: 'failed' })
  now += 600_001
  assert.equal(store.read('test-run-1'), null)
})

test('remaining time does not invent progress before samples or during cleanup', () => {
  const store = new ProgressStore(() => 1000)
  const update = store.start('test-run-2', 1, limits)
  assert.match(remainingLabel(store.read('test-run-2'), 1000), /unknown/)
  update({ completedVariants: 2, phase: 'cleanup' })
  assert.match(remainingLabel(store.read('test-run-2'), 1000), /cleanup/)
  update({ phase: 'completed' })
  assert.equal(remainingLabel(store.read('test-run-2'), 1000), 'Execution finished.')
  assert.equal(elapsedLabel(-1000), '0m 0s')
})

test('progress storage is bounded', () => {
  const store = new ProgressStore()
  for (let index = 0; index < 32; index++) store.start(`test-run-${index}`, 1, limits)
  assert.throws(() => store.start('test-run-overflow', 1, limits), /Too many/)
})

test('polling never overlaps and ignores responses after disposal', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  let resolve
  let calls = 0
  const updates = []
  const stop = watchProgress({ connection: { rpc: { call() {
    calls++
    return new Promise((done) => { resolve = done })
  } } } }, 'test-run-1', (value) => updates.push(value), (message) => updates.push(message))
  t.mock.timers.tick(500)
  assert.equal(calls, 1)
  t.mock.timers.tick(10_000)
  assert.equal(calls, 1)
  stop()
  resolve({ ok: true, value: { runId: 'test-run-1' } })
  await new Promise(setImmediate)
  t.mock.timers.tick(10_000)
  assert.deepEqual(updates, [])
  assert.equal(calls, 1)
})

test('polling recovers after a transient error without restarting the run', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  let calls = 0
  const issues = []
  const updates = []
  const stop = watchProgress({ connection: { rpc: { async call(_channel, endpoint) {
    assert.equal(endpoint, 'controlled-progress')
    if (++calls === 1) throw new Error('offline')
    return { ok: true, value: { runId: 'test-run-1' } }
  } } } }, 'test-run-1', (value) => updates.push(value), (message) => issues.push(message))
  t.mock.timers.tick(500)
  await new Promise(setImmediate)
  assert.match(issues[0], /offline/)
  t.mock.timers.tick(1000)
  await new Promise(setImmediate)
  assert.equal(updates.length, 1)
  assert.equal(issues.at(-1), '')
  stop()
})
