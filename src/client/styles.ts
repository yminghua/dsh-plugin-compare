export const proofStyles = `
.dproof-button { appearance:none; border:1px solid var(--dsw-alias-border-l2); background:none; color:var(--dsw-alias-label-secondary); border-radius:8px; padding:5px 10px; font:inherit; font-size:12px; cursor:pointer; }
.dproof-button:hover { background:var(--dsw-alias-bg-layer-2); color:var(--dsw-alias-label-primary); }
.dproof-panel { position:fixed; inset:72px 24px 24px auto; width:min(820px,calc(100vw - 48px)); z-index:100; pointer-events:auto; display:flex; flex-direction:column; border:1px solid var(--dsw-alias-border-l2); border-radius:16px; background:var(--dsw-alias-bg-layer-3); color:var(--dsw-alias-label-primary); box-shadow:0 18px 60px rgba(0,0,0,.22); overflow:hidden; }
.dproof-head { display:flex; align-items:center; gap:12px; padding:16px 18px; border-bottom:1px solid var(--dsw-alias-border-l2); }
.dproof-title { flex:1; font-size:15px; font-weight:650; }
.dproof-fact { color:var(--dsw-alias-label-tertiary); font-size:11px; }
.dproof-close { appearance:none; border:0; background:none; color:var(--dsw-alias-label-tertiary); font-size:20px; cursor:pointer; }
.dproof-body { padding:18px; display:grid; gap:14px; overflow:auto; }
.dproof-empty { border:1px dashed var(--dsw-alias-border-l2); border-radius:12px; padding:24px; text-align:center; color:var(--dsw-alias-label-tertiary); font-size:13px; line-height:1.6; }
.dproof-columns { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
.dproof-run { display:grid; gap:7px; border:1px solid var(--dsw-alias-border-l2); border-radius:10px; padding:12px; }
.dproof-run strong { display:block; margin-bottom:4px; font-size:12px; }
.dproof-run span { color:var(--dsw-alias-label-tertiary); font-size:12px; }
.dproof-run select { width:100%; min-width:0; border:1px solid var(--dsw-alias-border-l2); border-radius:7px; padding:7px 8px; background:var(--dsw-alias-bg-layer-2); color:var(--dsw-alias-label-primary); font:inherit; font-size:12px; }
.dproof-compare { appearance:none; border:0; border-radius:9px; padding:9px 14px; background:var(--dsw-alias-brand-primary); color:white; font:inherit; font-size:13px; font-weight:600; cursor:pointer; }
.dproof-compare:disabled { opacity:.45; cursor:default; }
.dproof-error { border-radius:9px; padding:10px 12px; background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 12%,transparent); color:var(--dsw-alias-state-error-primary); font-size:12px; }
.dproof-results { display:grid; gap:12px; }
.dproof-overview { display:grid; gap:16px; padding:20px; border:1px solid var(--dsw-alias-border-l2); border-radius:12px; }
.dproof-overview h2 { margin:0; font-size:22px; line-height:1.35; letter-spacing:-.02em; overflow-wrap:anywhere; }
.dproof-overview p { margin:0; line-height:1.6; }
.dproof-eyebrow { font-size:10px; font-weight:650; letter-spacing:.1em; color:var(--dsw-alias-label-tertiary); }
.dproof-identities { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1fr); gap:12px; }
.dproof-identity { display:grid; align-content:start; gap:8px; padding:15px; border:1px solid var(--dsw-alias-border-l2); border-top:3px solid #8599a4; border-radius:9px; min-width:0; overflow-wrap:anywhere; }
.dproof-identity:nth-child(2) { border-top-color:#328c85; }
.dproof-identity>strong { font-size:19px; letter-spacing:-.015em; }
.dproof-identity>span:not(.dproof-eyebrow),.dproof-identity small { font-size:11px; color:var(--dsw-alias-label-secondary); }
.dproof-version { justify-self:start; padding:2px 5px; border:1px solid var(--dsw-alias-border-l2); border-radius:4px; font-family:ui-monospace,monospace; }
.dproof-check-badge { border-top:1px solid var(--dsw-alias-border-l2); padding-top:9px; font-size:11px; line-height:1.5; }
.dproof-kpis { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:10px; }
.dproof-kpi { display:grid; gap:7px; min-width:0; padding:13px; background:var(--dsw-alias-bg-layer-2); border-radius:8px; font-variant-numeric:tabular-nums; }
.dproof-kpi>span,.dproof-kpi>small { font-size:10px; color:var(--dsw-alias-label-secondary); }
.dproof-kpi>strong { font-size:25px; letter-spacing:-.03em; overflow-wrap:anywhere; }
.dproof-kpi>b { font-size:11px; font-weight:550; }
.dproof-verdict { display:grid; gap:3px; border-radius:10px; padding:12px; background:var(--dsw-alias-bg-module-platform); }
.dproof-verdict strong { font-size:13px; }
.dproof-verdict span { color:var(--dsw-alias-label-tertiary); font-size:11px; }
.dproof-table { display:grid; border:1px solid var(--dsw-alias-border-l2); border-radius:10px; overflow:hidden; }
.dproof-row { display:grid; grid-template-columns:1.4fr 1fr 1fr; gap:8px; padding:8px 10px; font-size:12px; }
.dproof-row + .dproof-row { border-top:1px solid var(--dsw-alias-border-l2); }
.dproof-row span:not(:first-child) { text-align:right; font-variant-numeric:tabular-nums; }
.dproof-row-head { color:var(--dsw-alias-label-tertiary); background:var(--dsw-alias-bg-layer-2); font-size:11px; }
.dproof-export { display:flex; justify-content:flex-end; flex-wrap:wrap; gap:8px; }
.dproof-configuration summary { padding:10px 0; font-size:12px; color:var(--dsw-alias-label-secondary); cursor:pointer; }
.dproof-tabs { display:flex; gap:4px; padding:3px; border-radius:9px; background:var(--dsw-alias-bg-layer-2); }
.dproof-tab { flex:1; appearance:none; border:0; border-radius:7px; padding:7px; background:transparent; color:var(--dsw-alias-label-tertiary); font:inherit; font-size:12px; cursor:pointer; }
.dproof-tab.is-active { background:var(--dsw-alias-bg-layer-3); color:var(--dsw-alias-label-primary); box-shadow:0 1px 4px rgba(0,0,0,.12); }
.dproof-controlled { display:grid; gap:10px; border:0; padding:0; margin:0; min-width:0; }
.dproof-progress { display:grid; gap:9px; padding:14px; border:1px solid var(--dsw-alias-border-l2); border-radius:10px; background:var(--dsw-alias-bg-layer-2); font-size:12px; font-variant-numeric:tabular-nums; }
.dproof-progress progress { width:100%; height:7px; accent-color:var(--dsw-alias-brand-primary); }
.dproof-tab:disabled { cursor:default; }
.dproof-field { display:grid; gap:5px; color:var(--dsw-alias-label-secondary); font-size:11px; }
.dproof-field input,.dproof-field textarea,.dproof-field select { box-sizing:border-box; width:100%; border:1px solid var(--dsw-alias-border-l2); border-radius:7px; padding:7px 8px; background:var(--dsw-alias-bg-layer-2); color:var(--dsw-alias-label-primary); font:inherit; font-size:12px; resize:vertical; }
.dproof-warning { padding:9px 10px; border-radius:8px; background:var(--dsw-alias-bg-module-platform); color:var(--dsw-alias-label-tertiary); font-size:10px; }
.dproof-outcomes { display:grid; gap:3px; color:var(--dsw-alias-label-secondary); font-size:11px; }
.dproof-section { display:grid; gap:9px; border:1px solid var(--dsw-alias-border-l2); border-radius:10px; padding:12px; }
.dproof-section-head { display:flex; justify-content:space-between; gap:12px; font-size:12px; }
.dproof-section-head span,.dproof-muted { color:var(--dsw-alias-label-tertiary); font-size:11px; }
.dproof-scrubber { width:100%; accent-color:var(--dsw-alias-brand-primary); }
.dproof-timelines,.dproof-diffs { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
.dproof-timeline,.dproof-diff-list { min-width:0; display:grid; align-content:start; gap:5px; border-radius:8px; background:var(--dsw-alias-bg-layer-2); padding:9px; }
.dproof-timeline>b,.dproof-diff-list>b { margin-bottom:3px; font-size:11px; color:var(--dsw-alias-label-secondary); }
.dproof-event { display:grid; grid-template-columns:52px 1fr; gap:6px; align-items:center; border-left:2px solid var(--dsw-alias-border-l2); padding:3px 6px; opacity:.72; }
.dproof-event.is-current { opacity:1; background:var(--dsw-alias-bg-layer-3); }
.dproof-event-failed { border-left-color:var(--dsw-alias-state-error-primary); }
.dproof-event-retry { border-left-color:var(--dsw-alias-state-warning-primary); }
.dproof-event span { color:var(--dsw-alias-label-tertiary); font:10px ui-monospace,monospace; }
.dproof-event strong { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:11px; font-weight:500; }
.dproof-diff-list details { min-width:0; font-size:11px; }
.dproof-diff-list summary { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; cursor:pointer; }
.dproof-diff-list pre { max-height:140px; overflow:auto; white-space:pre-wrap; font:10px/1.4 ui-monospace,monospace; }
.dproof-failure { border:1px solid color-mix(in srgb,var(--dsw-alias-state-error-primary) 35%,transparent); }
.dproof-failure>b { color:var(--dsw-alias-state-error-primary); }
.dproof-manifest { color:var(--dsw-alias-label-tertiary); font-size:10px; }
@media (max-width:700px) { .dproof-columns,.dproof-timelines,.dproof-diffs,.dproof-identities { grid-template-columns:1fr; } .dproof-kpis { grid-template-columns:1fr; } .dproof-kpi { grid-template-columns:1fr auto; } }
`
let injected = false
export function injectStyles(): void {
  if (injected) return
  injected = true
  const style = document.createElement('style')
  style.dataset.plugin = 'dsh-plugin-compare'
  style.dataset.pluginCss = 'dsh-plugin-compare/panel'
  style.textContent = proofStyles
  document.head.appendChild(style)
}
