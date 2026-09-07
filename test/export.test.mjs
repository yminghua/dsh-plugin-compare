import test from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { ComparisonView } from '../src/client/index.ts'
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

test('web, HTML, SVG and JSON preserve plugin identity separately from the preset', () => {
  const baseline = run('before', 'Standard')
  const candidate = { ...run('after', '专家模式'), plugin: 'dsh-expert-mode', pluginVersion: '0.9.2', pluginSource: 'preset-registration', presetId: 'expert-mode', presetName: '专家模式 v0.9.2' }
  const comparison = compareRuns(baseline, candidate)
  const evidence = { baseline: { sessionId: 'before', timeline: [], fileDiffs: [] }, candidate: { sessionId: 'after', timeline: [], fileDiffs: [] } }
  const report = createProofReport(comparison, evidence, undefined, summarizeExperiment([comparison]))
  for (const output of [renderProofHtml(report), renderProofSvg(report), renderToStaticMarkup(React.createElement(ComparisonView, { comparison, evidence, experiment: report.experiment }))]) {
    assert.match(output, /dsh-expert-mode/)
    assert.match(output, /0\.9\.2/)
    assert.match(output, /专家模式/)
    assert.match(output, /not a (?:stable plugin ranking|cost saving)|not monetary cost/)
  }
  const html = renderProofHtml(report)
  assert.match(html, /Plugin identity not recorded/)
  assert.match(html, /Cache read tokens/)
  assert.match(html, /Success checks/)
  assert.match(html, /Check the Git snapshot/)
  assert.equal(JSON.parse(serializeProofReport(report)).comparison.candidate.presetId, 'expert-mode')
})

test('plugin metadata is escaped and old reports do not fabricate ownership', () => {
  const comparison = compareRuns(run('a', 'Standard'), { ...run('b', 'Expert'), plugin: '<img src=x onerror=alert(1)>', pluginVersion: '<script>bad</script>', pluginSource: 'report-label' })
  const report = createProofReport(comparison)
  for (const output of [renderProofHtml(report), renderProofSvg(report)]) {
    assert.doesNotMatch(output, /<img src|<script>/)
    assert.match(output, /&lt;img/)
    assert.match(output, /added after execution/)
  }
  const legacy = renderProofHtml(createProofReport(compareRuns(run('a', 'Standard'), run('b', '专家模式'))))
  assert.doesNotMatch(legacy, /dsh-expert-mode/)
  assert.match(legacy, /Plugin identity not recorded/)
})
