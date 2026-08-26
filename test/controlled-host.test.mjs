import test from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { existsSync, writeFileSync } from 'node:fs'
import { mkdtemp, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { apply } from '../lib/index.js'

test('controlled RPC runs variants in disposable isolated copies', async () => {
  const source = await mkdtemp(join(tmpdir(), 'dsh-proof-source-'))
  const outside = await mkdtemp(join(tmpdir(), 'dsh-proof-outside-'))
  await writeFile(join(source, 'input.txt'), 'original')
  execFileSync('git', ['init', source])
  execFileSync('git', ['-C', source, 'add', 'input.txt'])
  execFileSync('git', ['-C', source, '-c', 'user.name=DSH Proof', '-c', 'user.email=proof@example.invalid', 'commit', '-m', 'fixture'])
  let rpcHandler
  const workspaces = []
  const executionOrder = []
  const ctx = {
    connection: { rpc: { handle(_channel, handler) { rpcHandler = handler; return async () => {} } } },
    sessionQuery: {
      async listSessions() { return [] }, async readSession() { return { events: [] } }, async readTitleSnapshots() { return [] },
    },
    agentPresets: {
      async list() { return [{ id: 'base', name: 'Base', trust: 'system' }, { id: 'candidate', name: 'Candidate', trust: 'user' }] },
      async resolve(id) { return { id, name: id, trust: 'system' } },
      async mount() {},
    },
    agents: {
      async create(options) {
        workspaces.push(options.meta.cwd)
        executionOrder.push(options.meta.agentPreset)
        await options.setup({})
        const events = [
          { seq: 0, type: 'turn/start', time: 1000, data: { turn: 1 } },
          { seq: 1, type: 'turn/end', time: 1100, data: { turn: 1, reason: { kind: 'completed' } } },
        ]
        const session = { id: options.sessionId, header: { id: options.sessionId, createdAt: 1000, cwd: options.meta.cwd }, events }
        const agent = {
          session, status: 'idle',
          followup() { writeFileSync(join(options.meta.cwd, 'generated.txt'), options.meta.agentPreset) },
          async whenIdle() {}, cancel() {},
        }
        return { agent, async dispose() {} }
      },
    },
    sessions: { async flush() { return true } },
    on() { return () => {} },
    effect(register) { register(); return () => {} },
  }

  try {
    apply(ctx, { runTimeoutMs: 1000, checkTimeoutMs: 1000 })
    const result = await rpcHandler('controlled-run', {
      sourceDir: source,
      prompt: 'same task',
      baseline: { presetId: 'base', presetName: 'Base' },
      candidate: { presetId: 'candidate', presetName: 'Candidate' },
      successCommand: 'test -f generated.txt',
      trials: 2,
    }, new AbortController().signal)
    assert.equal(result.ok, true)
    assert.equal(result.value.comparison.baseline.metrics.outcome, 'pass')
    assert.equal(result.value.comparison.candidate.metrics.outcome, 'pass')
    assert.equal(result.value.design.isolation, 'filesystem-copy')
    assert.equal(result.value.design.order, 'alternating')
    assert.equal(result.value.summary.trials, 2)
    assert.equal(result.value.trialComparisons.length, 2)
    assert.equal(result.value.evidence.baseline.git.available, true)
    assert.equal(result.value.evidence.baseline.git.changedFiles, 1)
    assert.match(result.value.evidence.baseline.git.status, /generated\.txt/)
    assert.equal(workspaces.length, 4)
    assert.deepEqual(executionOrder, ['base', 'candidate', 'candidate', 'base'])
    assert.notEqual(workspaces[0], workspaces[1])
    assert.equal(existsSync(workspaces[0]), false)
    assert.equal(existsSync(workspaces[1]), false)
    assert.equal(existsSync(workspaces[2]), false)
    assert.equal(existsSync(workspaces[3]), false)
    assert.equal(existsSync(join(source, 'generated.txt')), false)

    await symlink(outside, join(source, 'escape'))
    const refused = await rpcHandler('controlled-run', {
      sourceDir: source, prompt: 'same task',
      baseline: { presetId: 'base', presetName: 'Base' },
      candidate: { presetId: 'candidate', presetName: 'Candidate' },
    }, new AbortController().signal)
    assert.equal(refused.ok, false)
    assert.match(refused.error.message, /symlink escapes sourceDir/)
  } finally {
    await rm(source, { recursive: true, force: true })
    await rm(outside, { recursive: true, force: true })
  }
})
