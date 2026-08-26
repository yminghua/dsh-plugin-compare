import type { ComparisonEvidence, FileDiffEvidence, ProofComparison } from './types.ts'
import { redactSecrets } from './redact.ts'

export interface ExportManifest {
  source: 'canonical-session-log'
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
  exportManifest: ExportManifest
}

export function createProofReport(comparison: ProofComparison, evidence?: ComparisonEvidence, generatedAt = new Date().toISOString()): ProofReport {
  return {
    schemaVersion: 2,
    generatedAt,
    disclaimer: 'Measured execution facts are not a task-success judgment. Repeated controlled trials may be required.',
    comparison,
    ...(evidence ? { evidence } : {}),
    exportManifest: {
      source: 'canonical-session-log',
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
    ['Tokens', integer(deltas.totalTokens.baseline), integer(deltas.totalTokens.candidate)],
    ['Active time', duration(deltas.durationMs.baseline), duration(deltas.durationMs.candidate)],
    ['Steps', integer(deltas.steps.baseline), integer(deltas.steps.candidate)],
    ['Tool calls', integer(deltas.toolCalls.baseline), integer(deltas.toolCalls.candidate)],
    ['Tool failures', integer(deltas.failedToolCalls.baseline), integer(deltas.failedToolCalls.candidate)],
    ['Retries', integer(deltas.retries.baseline), integer(deltas.retries.candidate)],
  ]
  const body = rows.map(([label, before, after]) => `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(before)}</td><td>${escapeHtml(after)}</td></tr>`).join('')
  const evidence = safe.evidence ? `<section class="evidence"><h2>Recorded file evidence</h2>${renderDiffColumn('Baseline', safe.evidence.baseline.fileDiffs)}${renderGit('Baseline Git snapshot', safe.evidence.baseline.git)}${renderDiffColumn('Candidate', safe.evidence.candidate.fileDiffs)}${renderGit('Candidate Git snapshot', safe.evidence.candidate.git)}</section>` : ''
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>DSH Proof · ${escapeHtml(baseline.label)} vs ${escapeHtml(candidate.label)}</title>
<style>body{margin:0;background:#0b1020;color:#e8ecf7;font:15px/1.5 ui-sans-serif,system-ui,sans-serif}.wrap{max-width:900px;margin:48px auto;padding:0 20px}.card{border:1px solid #29324d;border-radius:18px;background:#121a2e;overflow:hidden;box-shadow:0 24px 80px #0008}.head{padding:24px;border-bottom:1px solid #29324d}.eyebrow{color:#8fa5d9;font-size:12px;text-transform:uppercase;letter-spacing:.12em}h1{margin:6px 0 0;font-size:25px}.note{margin:18px 0;padding:12px 14px;border-radius:10px;background:#1a2542;color:#b8c3df;font-size:13px}table{width:100%;border-collapse:collapse}th,td{padding:12px 18px;border-top:1px solid #29324d;text-align:right}th:first-child{text-align:left;color:#aeb9d3;font-weight:500}thead th{border-top:0;background:#17213a;color:#8fa5d9;font-size:12px}.evidence{padding:20px 24px;border-top:1px solid #29324d}.evidence h2{font-size:16px}.diff{margin:12px 0;padding:12px;border-radius:10px;background:#0b1020;overflow:auto}.diff h3{margin:0 0 8px;color:#8fa5d9;font-size:12px}.diff strong{display:block;margin:10px 0 4px;font-size:12px}.diff pre{margin:0;white-space:pre-wrap;font:11px/1.45 ui-monospace,monospace;color:#b8c3df}footer{padding:16px 24px;color:#7784a5;font-size:12px}</style></head>
<body><main class="wrap"><section class="card"><header class="head"><div class="eyebrow">DSH Proof · measured facts</div><h1>${escapeHtml(baseline.label)} <span aria-hidden="true">→</span> ${escapeHtml(candidate.label)}</h1><p class="note">${escapeHtml(safe.disclaimer)}</p></header><table><thead><tr><th>Metric</th><th>Baseline</th><th>Candidate</th></tr></thead><tbody>${body}</tbody></table>${evidence}<footer>Generated ${escapeHtml(safe.generatedAt)} · Schema v${safe.schemaVersion} · ${safe.exportManifest.redaction.matches} secret-like value(s) redacted</footer></section></main></body></html>`
}

export function renderProofSvg(report: ProofReport): string {
  const safe = sanitizeProofReport(report)
  const { baseline, candidate, deltas } = safe.comparison
  const labels = ['Tokens', 'Active time', 'Tool failures', 'Retries']
  const values = [
    [integer(deltas.totalTokens.baseline), integer(deltas.totalTokens.candidate)],
    [duration(deltas.durationMs.baseline), duration(deltas.durationMs.candidate)],
    [integer(deltas.failedToolCalls.baseline), integer(deltas.failedToolCalls.candidate)],
    [integer(deltas.retries.baseline), integer(deltas.retries.candidate)],
  ]
  const rows = labels.map((label, index) => {
    const y = 164 + index * 38
    return `<text x="32" y="${y}" class="label">${label}</text><text x="430" y="${y}" class="value">${values[index]?.[0]}</text><text x="688" y="${y}" class="value">${values[index]?.[1]}</text>`
  }).join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="340" viewBox="0 0 720 340" role="img" aria-label="DSH Proof comparison card"><style>.title{font:700 24px system-ui;fill:#eef2ff}.small{font:12px system-ui;fill:#8fa5d9}.label{font:13px system-ui;fill:#aeb9d3}.value{font:600 13px ui-monospace,monospace;fill:#eef2ff;text-anchor:end}</style><rect width="720" height="340" rx="20" fill="#121a2e"/><rect x="1" y="1" width="718" height="338" rx="19" fill="none" stroke="#29324d"/><text x="32" y="42" class="small">DSH PROOF · MEASURED FACTS</text><text x="32" y="76" class="title">${escapeHtml(shorten(baseline.label, 24))} → ${escapeHtml(shorten(candidate.label, 24))}</text><text x="430" y="120" class="small" text-anchor="end">BASELINE</text><text x="688" y="120" class="small" text-anchor="end">CANDIDATE</text>${rows}<text x="32" y="316" class="small">Explicit outcome: ${baseline.metrics.outcome} → ${candidate.metrics.outcome} · winner: ${safe.comparison.winner}</text></svg>`
}

function renderDiffColumn(label: string, diffs: FileDiffEvidence[]): string {
  if (diffs.length === 0) return `<div class="diff"><h3>${label}</h3><pre>No recorded write/edit diff evidence.</pre></div>`
  return `<div class="diff"><h3>${label}</h3>${diffs.map((diff) => `<strong>${escapeHtml(diff.path)}</strong><pre>- ${escapeHtml(diff.oldText ?? '(new file)')}\n+ ${escapeHtml(diff.newText)}</pre>`).join('')}</div>`
}

function renderGit(label: string, git: ComparisonEvidence['baseline']['git']): string {
  if (!git?.available) return ''
  return `<div class="diff"><h3>${escapeHtml(label)}</h3><strong>Status</strong><pre>${escapeHtml(git.status || '(clean)')}</pre><strong>Tracked diff</strong><pre>${escapeHtml(git.diff || '(none)')}</pre></div>`
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] ?? char)
}

function integer(value: number): string { return new Intl.NumberFormat('en-US').format(value) }
function duration(value: number): string { return value < 1000 ? `${Math.round(value)} ms` : `${(value / 1000).toFixed(1)} s` }
function shorten(value: string, limit: number): string { return value.length <= limit ? value : `${value.slice(0, limit - 1)}…` }
