import test from 'node:test'
import assert from 'node:assert/strict'
import { compareRuns, createProofReport, renderProofHtml, renderProofSvg, serializeProofReport, summarizeExperiment } from '../lib/core/index.js'

function run(id, label) {
  return {
    id,
    label,
    capturedAt: '2026-08-26T00:00:00.000Z',
    metrics: {
      outcome: 'unknown', execution: 'completed', durationMs: 1200, turns: 1, steps: 2,
      toolCalls: 1, failedToolCalls: 0, retries: 0,
      tokens: { input: 100, output: 20, cacheRead: 0, cacheWrite: 0 },
    },
  }
}

test('exports redacted JSON and escaped standalone HTML', () => {
  const baseline = run('before', '<script>alert(1)</script> Bearer abcdefghijklmnopqrstuvwxyz')
  const candidate = run('after', 'Candidate')
  const evidence = {
    baseline: { sessionId: 'before', timeline: [], fileDiffs: [{ seq: 1, path: 'config.ts', oldText: null, newText: 'Bearer abcdefghijklmnopqrstuvwxyz' }] },
    candidate: { sessionId: 'after', timeline: [], fileDiffs: [] },
  }
  const comparison = compareRuns(baseline, candidate)
  const report = createProofReport(comparison, evidence, '2026-08-26T00:00:00.000Z', summarizeExperiment([comparison]))
  const json = serializeProofReport(report)
  assert.doesNotMatch(json, /abcdefghijklmnopqrstuvwxyz/)
  assert.match(json, /REDACTED:bearer_token/)
  assert.equal(JSON.parse(json).exportManifest.redaction.matches, 2)
  assert.equal(JSON.parse(json).experiment.observations.length, 1)
  assert.equal(JSON.parse(json).exportManifest.source, 'session-log-and-controlled-run')
  const html = renderProofHtml(report)
  assert.match(html, /^<!doctype html>/)
  assert.doesNotMatch(html, /<script>alert/)
  assert.match(html, /&lt;script&gt;alert/)
  assert.match(html, /Recorded file evidence/)
  assert.match(html, /1 paired trial/)
  const svg = renderProofSvg(report)
  assert.match(svg, /^<svg /)
  assert.doesNotMatch(svg, /abcdefghijklmnopqrstuvwxyz/)
  assert.match(svg, /winner: undetermined/)
  assert.match(svg, /1 paired trials/)
})

test('exports startup failures as an invalid comparison', () => {
  const baseline = { ...run('before', 'Before'), failure: { phase: 'startup', code: 'NO_MODEL', message: 'has no provider/model' }, metrics: { ...run('before', 'Before').metrics, execution: 'failed' } }
  const comparison = compareRuns(baseline, run('after', 'After'))
  const report = createProofReport(comparison)
  assert.match(report.disclaimer, /Invalid comparison/)
  assert.match(renderProofHtml(report), /Agent failures/)
  assert.match(renderProofHtml(report), /has no provider\/model/)
  assert.match(renderProofSvg(report), /AGENT STARTUP FAILED/)
})
