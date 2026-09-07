import type { ExperimentSummary } from './statistics.ts'
import type { ComparisonEvidence, FileDiffEvidence, ProofComparison } from './types.ts'
import { redactSecrets } from './redact.ts'
import { reportHeadline, reportMetricCards, runIdentity } from './report-view.ts'
import { reportStyles } from './report-styles.ts'

export interface ExportManifest {
  source: 'canonical-session-log' | 'session-log-and-controlled-run'
  sessionIds: [string, string]
  timelineEntries: number
  fileDiffs: number
  gitSnapshots: number
  redaction: { applied: true; matches: number }
}

export interface ProofReport {
  schemaVersion: 2
  generatedAt: string
  disclaimer: string
  comparison: ProofComparison
  evidence?: ComparisonEvidence
  experiment?: ExperimentSummary
  exportManifest: ExportManifest
}

export function createProofReport(comparison: ProofComparison, evidence?: ComparisonEvidence, generatedAt = new Date().toISOString(), experiment?: ExperimentSummary): ProofReport {
  const controlled = experiment !== undefined || comparison.baseline.check !== undefined || comparison.candidate.check !== undefined
  const startupFailed = comparison.baseline.failure?.phase === 'startup' || comparison.candidate.failure?.phase === 'startup'
  return {
    schemaVersion: 2,
    generatedAt,
    disclaimer: startupFailed
      ? 'Invalid comparison: at least one Agent failed before task execution. Fix the startup error and rerun before evaluating presets.'
      : 'Measured execution facts are not a task-success judgment. Repeated controlled trials may be required.',
    comparison,
    ...(evidence ? { evidence } : {}),
    ...(experiment ? { experiment } : {}),
    exportManifest: {
      source: controlled ? 'session-log-and-controlled-run' : 'canonical-session-log',
      sessionIds: [comparison.baseline.sessionId ?? comparison.baseline.id, comparison.candidate.sessionId ?? comparison.candidate.id],
      timelineEntries: evidence ? evidence.baseline.timeline.length + evidence.candidate.timeline.length : 0,
      fileDiffs: evidence ? evidence.baseline.fileDiffs.length + evidence.candidate.fileDiffs.length : 0,
      gitSnapshots: evidence ? Number(evidence.baseline.git?.available === true) + Number(evidence.candidate.git?.available === true) : 0,
      redaction: { applied: true, matches: 0 },
    },
  }
}

export function sanitizeProofReport(report: ProofReport): ProofReport {
  const redacted = redactSecrets(JSON.stringify(report))
  const safe = JSON.parse(redacted.text) as ProofReport
  safe.exportManifest.redaction.matches = redacted.matches
  return safe
}

export function serializeProofReport(report: ProofReport): string {
  return JSON.stringify(sanitizeProofReport(report), null, 2)
}

export function renderProofHtml(report: ProofReport): string {
  const safe = sanitizeProofReport(report)
  const { baseline, candidate, deltas } = safe.comparison
  const rows: Array<[string, string, string]> = [
    ['Execution', baseline.metrics.execution, candidate.metrics.execution],
    ['Task outcome', baseline.metrics.outcome, candidate.metrics.outcome],
    ['Recorded tokens · including cache', integer(deltas.totalTokens.baseline), integer(deltas.totalTokens.candidate)],
    ['Input tokens', integer(baseline.metrics.tokens.input), integer(candidate.metrics.tokens.input)],
    ['Output tokens', integer(baseline.metrics.tokens.output), integer(candidate.metrics.tokens.output)],
    ['Cache read tokens', integer(baseline.metrics.tokens.cacheRead), integer(candidate.metrics.tokens.cacheRead)],
    ['Cache write tokens', integer(baseline.metrics.tokens.cacheWrite), integer(candidate.metrics.tokens.cacheWrite)],
    ['Active time', duration(deltas.durationMs.baseline), duration(deltas.durationMs.candidate)],
    ['Steps', integer(deltas.steps.baseline), integer(deltas.steps.candidate)],
    ['Tool calls', integer(deltas.toolCalls.baseline), integer(deltas.toolCalls.candidate)],
    ['Tool failures', integer(deltas.failedToolCalls.baseline), integer(deltas.failedToolCalls.candidate)],
    ['Retries', integer(deltas.retries.baseline), integer(deltas.retries.candidate)],
    ['Changed files', baseline.metrics.changedFiles === undefined ? 'Not recorded' : integer(baseline.metrics.changedFiles), candidate.metrics.changedFiles === undefined ? 'Not recorded' : integer(candidate.metrics.changedFiles)],
  ]
  const body = rows.map(([label, before, after]) => `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(before)}</td><td>${escapeHtml(after)}</td></tr>`).join('')
  const failures = baseline.failure || candidate.failure ? `<section class="evidence"><h2>Agent failures</h2>${renderFailure('Baseline', baseline.failure)}${renderFailure('Candidate', candidate.failure)}</section>` : ''
  const evidence = safe.evidence ? `<section class="evidence"><h2>Recorded file evidence</h2><p class="subtle">Git snapshots show final workspace changes. Missing write/edit metadata does not mean no files were changed.</p><div class="identities"><div>${renderGit('A · Baseline Git snapshot', safe.evidence.baseline.git)}${renderDiffColumn('A · Tool-recorded edits', safe.evidence.baseline.fileDiffs)}</div><div>${renderGit('B · Candidate Git snapshot', safe.evidence.candidate.git)}${renderDiffColumn('B · Tool-recorded edits', safe.evidence.candidate.fileDiffs)}</div></div></section>` : ''
  const experiment = safe.experiment ? renderExperiment(safe.experiment) : ''
  const identities = `<div class="identities">${renderIdentity('A · Baseline', baseline)}${renderIdentity('B · Candidate', candidate)}</div>`
  const metrics = `<div class="kpis">${reportMetricCards(safe.comparison).map((metric) => `<article><span>${metric.label}</span><strong>${metric.after}</strong><small>A ${metric.before} → B ${metric.after}</small><b>${metric.change} vs A</b></article>`).join('')}</div>`
  const sample = safe.experiment ? `${safe.experiment.trials} paired trial(s) · ${safe.experiment.trials === 1 ? 'Single observation, not a stable plugin ranking.' : 'Cards and detail table show the first pair; repeated-trial statistics appear below.'}` : 'Recorded session comparison · uncontrolled differences may affect results.'
  const checks = `<section class="evidence"><h2>Success checks</h2><p class="subtle">These checks verify their covered cases, not every possible requirement.</p><div class="identities">${renderCheck('A · Baseline', baseline.check)}${renderCheck('B · Candidate', candidate.check)}</div></section>`
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>DSH Plugin Compare · ${escapeHtml(runIdentity(baseline).name)} vs ${escapeHtml(runIdentity(candidate).name)}</title>
<style>${reportStyles}</style></head>
<body><main class="wrap"><header class="masthead"><b>DSH / PLUGIN COMPARE</b><span>Plugin comparison report</span></header><section class="card"><header class="head"><div class="eyebrow">MEASURED EVIDENCE / NOT A LEADERBOARD</div><h1>${escapeHtml(runIdentity(baseline).name)} <span>vs</span> ${escapeHtml(runIdentity(candidate).name)}</h1>${identities}<div class="verdict"><strong>${escapeHtml(reportHeadline(safe.comparison))}</strong><span>${escapeHtml(sample)}</span></div>${metrics}<p class="subtle">Token totals include input, output, cache reads and cache writes. Token change is not a cost saving.</p></header><section class="evidence"><h2>Metric details <small>A → B${safe.experiment && safe.experiment.trials > 1 ? ' · first pair' : ''}</small></h2><div class="table-scroll"><table><thead><tr><th>Metric</th><th>A · Baseline</th><th>B · Candidate</th></tr></thead><tbody>${body}</tbody></table></div></section>${failures}${experiment}${checks}${evidence}<footer><p>${escapeHtml(safe.disclaimer)}</p><span>Generated ${escapeHtml(safe.generatedAt)} · Schema v${safe.schemaVersion} · ${safe.exportManifest.redaction.matches} secret-like value(s) redacted</span></footer></section></main></body></html>`
}

function renderIdentity(role: string, run: ProofComparison['baseline']): string {
  const identity = runIdentity(run)
  return `<article class="identity"><span class="eyebrow">${role}</span><h2>${escapeHtml(identity.name)}</h2>${identity.version ? `<b class="version">v${escapeHtml(identity.version)}</b>` : ''}<p>Preset: ${escapeHtml(identity.preset)}${identity.presetId ? ` · <code>${escapeHtml(identity.presetId)}</code>` : ''}</p><p>${escapeHtml(run.provider ?? 'Provider not recorded')} / ${escapeHtml(run.model ?? 'Model not recorded')}</p><small>${escapeHtml(identity.source)}</small><div class="badge">Execution: ${escapeHtml(run.metrics.execution)} · Check: ${escapeHtml(run.check?.status ?? 'not configured')}</div></article>`
}

function renderCheck(role: string, check: ProofComparison['baseline']['check']): string {
  if (!check) return `<article class="diff"><h3>${role}</h3><p>Not configured</p></article>`
  return `<article class="diff"><h3>${role} · ${escapeHtml(check.status)}</h3><code>${escapeHtml(check.command)}</code><p>Exit code: ${check.exitCode ?? 'not available'} · ${duration(check.durationMs)}</p><details><summary>Test output</summary><pre>${escapeHtml(check.output || '(no output)')}</pre></details></article>`
}

export function renderProofSvg(report: ProofReport): string {
  const safe = sanitizeProofReport(report)
  const { baseline, candidate, deltas } = safe.comparison
  const labels = ['Recorded tokens (incl. cache)', 'Agent time', 'Tool calls', 'Tool failures']
  const values = [
    [integer(deltas.totalTokens.baseline), integer(deltas.totalTokens.candidate)],
    [duration(deltas.durationMs.baseline), duration(deltas.durationMs.candidate)],
    [integer(deltas.toolCalls.baseline), integer(deltas.toolCalls.candidate)],
    [integer(deltas.failedToolCalls.baseline), integer(deltas.failedToolCalls.candidate)],
  ]
  const rows = labels.map((label, index) => {
    const y = 336 + index * 32
    return `<line x1="32" y1="${y + 12}" x2="928" y2="${y + 12}" stroke="#e0e8ec"/><text x="32" y="${y}" class="label">${label}</text><text x="620" y="${y}" class="value">${values[index]?.[0]}</text><text x="906" y="${y}" class="value">${values[index]?.[1]}</text>`
  }).join('')
  const trialLabel = safe.experiment ? ` · ${safe.experiment.trials} paired trials` : ''
  const footer = baseline.failure?.phase === 'startup' || candidate.failure?.phase === 'startup'
    ? 'INVALID COMPARISON · AGENT STARTUP FAILED'
    : `Explicit outcome: ${baseline.metrics.outcome} → ${candidate.metrics.outcome} · winner: ${safe.comparison.winner}${trialLabel}`
  const identities = [baseline, candidate].map((run, index) => {
    const identity = runIdentity(run)
    const x = 32 + index * 456
    return `<g><title>${escapeHtml(identity.name)} · ${escapeHtml(identity.preset)}</title><rect x="${x}" y="92" width="440" height="147" rx="10" fill="${index ? '#f0f7f5' : '#f4f7f8'}"/><text x="${x + 16}" y="116" class="small">${index ? 'B · CANDIDATE' : 'A · BASELINE'}</text><text x="${x + 16}" y="150" class="name">${escapeHtml(shorten(identity.name, 24))}</text><text x="${x + 16}" y="176" class="small">${escapeHtml(shorten(`${identity.version ? `v${identity.version} · ` : ''}Preset: ${identity.preset}`, 42))}</text><text x="${x + 16}" y="200" class="small">${escapeHtml(shorten(run.model ?? 'Model not recorded', 48))}</text><text x="${x + 16}" y="222" class="small">Check: ${escapeHtml(run.check?.status ?? 'not configured')}</text></g>`
  }).join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540" role="img" aria-label="DSH Plugin Compare plugin comparison card"><style>.title{font:650 24px system-ui;fill:#18333f}.name{font:650 20px system-ui;fill:#18333f}.small{font:11px system-ui;fill:#59717e}.label{font:13px system-ui;fill:#496370}.value{font:600 14px ui-monospace,monospace;fill:#18333f;text-anchor:end}</style><rect width="960" height="540" rx="20" fill="#fff"/><rect x="1" y="1" width="958" height="538" rx="19" fill="none" stroke="#dce6ea"/><text x="32" y="32" class="small">DSH / PLUGIN COMPARE · PLUGIN COMPARISON</text><text x="32" y="66" class="title">${escapeHtml(reportHeadline(safe.comparison))}</text>${identities}<text x="32" y="272" class="small">${safe.experiment && safe.experiment.trials > 1 ? 'FIRST PAIR · see HTML for aggregate statistics' : 'SINGLE COMPARISON · not a stable plugin ranking'}</text><text x="620" y="302" class="small" text-anchor="end">A · BASELINE</text><text x="906" y="302" class="small" text-anchor="end">B · CANDIDATE</text>${rows}<text x="32" y="476" class="small">${escapeHtml(footer)}</text><text x="32" y="502" class="small">Token totals include cache activity, not monetary cost. Tests cover only their asserted cases.</text><text x="32" y="522" class="small">${escapeHtml(shorten(`${runIdentity(baseline).source} / ${runIdentity(candidate).source}`, 130))}</text></svg>`
}

function renderFailure(label: string, failure: ProofComparison['baseline']['failure']): string {
  if (!failure) return `<div class="diff"><h3>${label}</h3><pre>No Agent failure recorded.</pre></div>`
  const code = failure.code ? ` · ${failure.code}` : ''
  return `<div class="diff"><h3>${escapeHtml(`${label} · ${failure.phase} failure${code}`)}</h3><pre>${escapeHtml(failure.message)}</pre></div>`
}

function renderDiffColumn(label: string, diffs: FileDiffEvidence[]): string {
  if (diffs.length === 0) return `<div class="diff"><h3>${label}</h3><p class="subtle">No tool-recorded edit metadata. Check the Git snapshot for final changes.</p></div>`
  return `<details class="diff"><summary>${label} · ${diffs.length} record(s)</summary>${diffs.map((diff) => `<strong>${escapeHtml(diff.path)}</strong><pre>- ${escapeHtml(diff.oldText ?? '(new file)')}\n+ ${escapeHtml(diff.newText)}</pre>`).join('')}</details>`
}

function renderGit(label: string, git: ComparisonEvidence['baseline']['git']): string {
  if (!git?.available) return ''
  return `<details class="diff"><summary>${escapeHtml(label)} · ${git.changedFiles} changed file(s)</summary><strong>Status</strong><pre>${escapeHtml(git.status || '(clean)')}</pre><strong>Tracked diff</strong><pre>${escapeHtml(git.diff || '(none)')}</pre></details>`
}

function renderExperiment(summary: ExperimentSummary): string {
  const row = (label: string, meanDelta: number, ci95: [number, number] | null, format: (value: number) => string) => `<tr><th>${label}</th><td colspan="2">mean paired Δ ${signed(meanDelta, format)} · 95% CI ${ci95 ? `${signed(ci95[0], format)} to ${signed(ci95[1], format)}` : 'not estimable'}</td></tr>`
  return `<section class="evidence"><h2>${summary.trials} paired trial(s)</h2><p class="note">${escapeHtml(summary.interpretation)}</p><table><tbody>${row('Active time', summary.durationMs.meanDelta, summary.durationMs.ci95, duration)}${row('Tokens', summary.totalTokens.meanDelta, summary.totalTokens.ci95, integer)}</tbody></table></section>`
}

function signed(value: number, format: (value: number) => string): string { return `${value > 0 ? '+' : ''}${format(value)}` }

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] ?? char)
}

function integer(value: number): string { return new Intl.NumberFormat('en-US').format(value) }
function duration(value: number): string { return Math.abs(value) < 1000 ? `${Math.round(value)} ms` : `${(value / 1000).toFixed(1)} s` }
function shorten(value: string, limit: number): string { return value.length <= limit ? value : `${value.slice(0, limit - 1)}…` }
