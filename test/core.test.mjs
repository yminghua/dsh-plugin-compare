import test from 'node:test'
import assert from 'node:assert/strict'
import { compareRuns, ComparisonCollector, redactSecrets } from '../lib/core/index.js'

function run(id, outcome, durationMs, input, output) {
  return {
    id,
    label: id,
    capturedAt: '2026-08-26T00:00:00.000Z',
    metrics: {
      outcome,
      execution: 'completed',
      durationMs,
      turns: 1,
      steps: 3,
      toolCalls: 4,
      failedToolCalls: 0,
      retries: 0,
      tokens: { input, output, cacheRead: 0, cacheWrite: 0 },
    },
  }
}

test('a passing candidate beats a failing baseline', () => {
  const result = compareRuns(run('before', 'fail', 100, 100, 20), run('after', 'pass', 200, 200, 40))
  assert.equal(result.winner, 'candidate')
  assert.equal(result.deltas.totalTokens.absolute, 120)
})

test('one noisy passing pair does not produce a winner', () => {
  const result = compareRuns(run('before', 'pass', 500, 500, 100), run('after', 'pass', 100, 100, 20))
  assert.equal(result.winner, 'undetermined')
  assert.equal(result.deltas.durationMs.absolute, -400)
})

test('collector folds structural session events', () => {
  const collector = new ComparisonCollector()
  collector.record('s1', { type: 'turn/start' })
  collector.record('s1', { type: 'step/start' })
  collector.record('s1', { type: 'tool/call' })
  collector.record('s1', { type: 'tool/result', data: { error: { name: 'Error', code: 'EXIT_1' } } })
  assert.deepEqual(collector.snapshot('s1'), {
    events: 4,
    turns: 1,
    steps: 1,
    toolCalls: 1,
    failedToolCalls: 1,
  })
})

test('redactor removes common credentials', () => {
  const result = redactSecrets('Authorization: Bearer abcdefghijklmnopqrstuvwxyz')
  assert.equal(result.text, 'Authorization: [REDACTED:bearer_token]')
  assert.equal(result.matches, 1)
})

test('redactor covers provider tokens, named secrets, and credential URLs', () => {
  const samples = [
    ['github_pat_11AA22BB33CC44DD55EE66FF', 'github_token'],
    ['glpat-11AA22BB33CC44DD55EE66FF', 'gitlab_token'],
    ['npm_11AA22BB33CC44DD55EE66FF', 'npm_token'],
    ['xoxb-11AA22BB33CC44DD55EE66FF', 'slack_token'],
    ['SG.11AA22BB33CC44DD.55EE66FF77GG88HH', 'sendgrid_key'],
    [`AIza${'A'.repeat(35)}`, 'google_api_key'],
    [`AKIA${'A1'.repeat(8)}`, 'aws_access_key'],
    ['sk-proj-11AA22BB33CC44DD55EE66FF', 'secret_key'],
    ['api_key=11AA22BB33CC44DD55EE66FF', 'named_credential'],
    ['"clientSecret": "11AA22BB33CC44DD55EE66FF"', 'named_credential'],
    ['postgres://demo:11AA22BB33CC44DD@db.example/app', 'credential_url'],
  ]
  for (const [value, label] of samples) {
    const result = redactSecrets(value)
    assert.equal(result.matches, 1, value)
    assert.doesNotMatch(result.text, /11AA22BB|AAAAAA/, value)
    assert.match(result.text, new RegExp(`REDACTED:${label}`), value)
  }
})
