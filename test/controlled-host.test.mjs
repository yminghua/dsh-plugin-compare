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
  const agentTargets = []
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
    llm: {
      listProviders() { return [{ id: 'deepseek', name: 'DeepSeek' }] },
      async listModels() { return [{ provider: 'deepseek', id: 'deepseek-chat', name: 'DeepSeek Chat' }] },
    },
    agentDefaultModel: { currentSelection() { return { provider: 'deepseek', model: 'deepseek-chat' } } },
    agents: {
      async create(options) {
        workspaces.push(options.meta.cwd)
        executionOrder.push(options.meta.agentPreset)
        agentTargets.push(options.agentOptions)
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
      model: { provider: 'deepseek', model: 'deepseek-chat' },
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
    assert.deepEqual(agentTargets, Array(4).fill({ provider: 'deepseek', model: 'deepseek-chat' }))
    assert.deepEqual(result.value.design.model, { provider: 'deepseek', model: 'deepseek-chat' })
    assert.notEqual(workspaces[0], workspaces[1])
    assert.equal(existsSync(workspaces[0]), false)
    assert.equal(existsSync(workspaces[1]), false)
    assert.equal(existsSync(workspaces[2]), false)
    assert.equal(existsSync(workspaces[3]), false)
    assert.equal(existsSync(join(source, 'generated.txt')), false)

    await symlink(outside, join(source, 'escape'))
    const refused = await rpcHandler('controlled-run', {
      sourceDir: source, prompt: 'same task',
      model: { provider: 'deepseek', model: 'deepseek-chat' },
      baseline: { presetId: 'base', presetName: 'Base' },
      candidate: { presetId: 'candidate', presetName: 'Candidate' },
    }, new AbortController().signal)
    assert.equal(refused.ok, false)
    assert.match(refused.error.message, /symlink escapes sourceDir/)

    const models = await rpcHandler('models', {}, new AbortController().signal)
    assert.equal(models.ok, true)
    assert.equal(models.value.providers[0].models[0].id, 'deepseek-chat')
    assert.deepEqual(models.value.defaultSelection, { provider: 'deepseek', model: 'deepseek-chat' })
  } finally {
    await rm(source, { recursive: true, force: true })
    await rm(outside, { recursive: true, force: true })
  }
})

test('controlled RPC reports startup failures and skips success checks', async () => {
  const source = await mkdtemp(join(tmpdir(), 'dsh-proof-failure-source-'))
  await writeFile(join(source, 'input.txt'), 'original')
  let rpcHandler
  const ctx = {
    connection: { rpc: { handle(_channel, handler) { rpcHandler = handler; return async () => {} } } },
    sessionQuery: { async listSessions() { return [] }, async readSession() { return { events: [] } }, async readTitleSnapshots() { return [] } },
    agentPresets: {
      async list() { return [{ id: 'base', name: 'Base', trust: 'system' }] },
      async resolve(id) { return { id, name: id, trust: 'system' } },
      async mount() {},
    },
    llm: { listProviders() { return [] }, async listModels() { return [] } },
    agents: {
      async create(options) {
        await options.setup({})
        const events = [
          { seq: 0, type: 'turn/start', time: 1000, data: { turn: 1 } },
          { seq: 1, type: 'step/start', time: 1010, data: { turn: 1, step: 1 } },
          { seq: 2, type: 'turn/end', time: 1042, data: { turn: 1, reason: { kind: 'error', error: { code: 'UNKNOWN', message: 'prompt variable "{{model}}" has no value' } } } },
        ]
        const session = { id: options.sessionId, header: { id: options.sessionId, createdAt: 1000, cwd: options.meta.cwd }, events }
        return { agent: { session, status: 'idle', followup() {}, async whenIdle() {}, cancel() {} }, async dispose() {} }
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
      model: { provider: 'deepseek', model: 'deepseek-chat' },
      baseline: { presetId: 'base', presetName: 'Base' },
      candidate: { presetId: 'base', presetName: 'Base' },
      successCommand: 'touch should-not-run',
      trials: 1,
    }, new AbortController().signal)
    assert.equal(result.ok, true)
    assert.equal(result.value.comparison.baseline.failure.phase, 'startup')
    assert.match(result.value.comparison.baseline.failure.message, /prompt variable/)
    assert.equal(result.value.comparison.baseline.check.status, 'not-run')
    assert.equal(result.value.comparison.baseline.metrics.outcome, 'unknown')
    assert.match(result.value.design.caveat, /Invalid comparison/)
    assert.equal(result.value.evidence.baseline.timeline.at(-1).label, 'Turn ended · prompt variable "{{model}}" has no value')
  } finally {
    await rm(source, { recursive: true, force: true })
  }
})
