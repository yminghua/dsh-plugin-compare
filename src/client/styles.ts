export const comparisonStyles = `
.dcompare-button { appearance:none; border:1px solid var(--dsw-alias-border-l2); background:none; color:var(--dsw-alias-label-secondary); border-radius:8px; padding:5px 10px; font:inherit; font-size:12px; cursor:pointer; }
.dcompare-button:hover { background:var(--dsw-alias-bg-layer-2); color:var(--dsw-alias-label-primary); }
.dcompare-panel { position:fixed; inset:72px 24px 24px auto; width:min(820px,calc(100vw - 48px)); z-index:100; pointer-events:auto; display:flex; flex-direction:column; border:1px solid var(--dsw-alias-border-l2); border-radius:16px; background:var(--dsw-alias-bg-layer-3); color:var(--dsw-alias-label-primary); box-shadow:0 18px 60px rgba(0,0,0,.22); overflow:hidden; }
.dcompare-head { display:flex; align-items:center; gap:12px; padding:16px 18px; border-bottom:1px solid var(--dsw-alias-border-l2); }
.dcompare-title { flex:1; font-size:15px; font-weight:650; }
.dcompare-fact { color:var(--dsw-alias-label-tertiary); font-size:11px; }
.dcompare-close { appearance:none; border:0; background:none; color:var(--dsw-alias-label-tertiary); font-size:20px; cursor:pointer; }
.dcompare-body { padding:18px; display:grid; gap:14px; overflow:auto; }
.dcompare-empty { border:1px dashed var(--dsw-alias-border-l2); border-radius:12px; padding:24px; text-align:center; color:var(--dsw-alias-label-tertiary); font-size:13px; line-height:1.6; }
.dcompare-columns { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
.dcompare-run { display:grid; gap:7px; border:1px solid var(--dsw-alias-border-l2); border-radius:10px; padding:12px; }
.dcompare-run strong { display:block; margin-bottom:4px; font-size:12px; }
.dcompare-run span { color:var(--dsw-alias-label-tertiary); font-size:12px; }
.dcompare-run select { width:100%; min-width:0; border:1px solid var(--dsw-alias-border-l2); border-radius:7px; padding:7px 8px; background:var(--dsw-alias-bg-layer-2); color:var(--dsw-alias-label-primary); font:inherit; font-size:12px; }
.dcompare-compare { appearance:none; border:0; border-radius:9px; padding:9px 14px; background:var(--dsw-alias-brand-primary); color:white; font:inherit; font-size:13px; font-weight:600; cursor:pointer; }
.dcompare-compare:disabled { opacity:.45; cursor:default; }
.dcompare-error { border-radius:9px; padding:10px 12px; background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 12%,transparent); color:var(--dsw-alias-state-error-primary); font-size:12px; }
.dcompare-results { display:grid; gap:12px; }
.dcompare-overview { display:grid; gap:16px; padding:20px; border:1px solid var(--dsw-alias-border-l2); border-radius:12px; }
.dcompare-overview h2 { margin:0; font-size:22px; line-height:1.35; letter-spacing:-.02em; overflow-wrap:anywhere; }
.dcompare-overview p { margin:0; line-height:1.6; }
.dcompare-eyebrow { font-size:10px; font-weight:650; letter-spacing:.1em; color:var(--dsw-alias-label-tertiary); }
.dcompare-identities { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1fr); gap:12px; }
.dcompare-identity { display:grid; align-content:start; gap:8px; padding:15px; border:1px solid var(--dsw-alias-border-l2); border-top:3px solid #8599a4; border-radius:9px; min-width:0; overflow-wrap:anywhere; }
.dcompare-identity:nth-child(2) { border-top-color:#328c85; }
.dcompare-identity>strong { font-size:19px; letter-spacing:-.015em; }
.dcompare-identity>span:not(.dcompare-eyebrow),.dcompare-identity small { font-size:11px; color:var(--dsw-alias-label-secondary); }
.dcompare-version { justify-self:start; padding:2px 5px; border:1px solid var(--dsw-alias-border-l2); border-radius:4px; font-family:ui-monospace,monospace; }
.dcompare-check-badge { border-top:1px solid var(--dsw-alias-border-l2); padding-top:9px; font-size:11px; line-height:1.5; }
.dcompare-kpis { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:10px; }
.dcompare-kpi { display:grid; gap:7px; min-width:0; padding:13px; background:var(--dsw-alias-bg-layer-2); border-radius:8px; font-variant-numeric:tabular-nums; }
.dcompare-kpi>span,.dcompare-kpi>small { font-size:10px; color:var(--dsw-alias-label-secondary); }
.dcompare-kpi>strong { font-size:25px; letter-spacing:-.03em; overflow-wrap:anywhere; }
.dcompare-kpi>b { font-size:11px; font-weight:550; }
.dcompare-verdict { display:grid; gap:3px; border-radius:10px; padding:12px; background:var(--dsw-alias-bg-module-platform); }
.dcompare-verdict strong { font-size:13px; }
.dcompare-verdict span { color:var(--dsw-alias-label-tertiary); font-size:11px; }
.dcompare-table { display:grid; border:1px solid var(--dsw-alias-border-l2); border-radius:10px; overflow:hidden; }
.dcompare-row { display:grid; grid-template-columns:1.4fr 1fr 1fr; gap:8px; padding:8px 10px; font-size:12px; }
.dcompare-row + .dcompare-row { border-top:1px solid var(--dsw-alias-border-l2); }
.dcompare-row span:not(:first-child) { text-align:right; font-variant-numeric:tabular-nums; }
.dcompare-row-head { color:var(--dsw-alias-label-tertiary); background:var(--dsw-alias-bg-layer-2); font-size:11px; }
.dcompare-export { display:flex; justify-content:flex-end; flex-wrap:wrap; gap:8px; }
.dcompare-configuration summary { padding:10px 0; font-size:12px; color:var(--dsw-alias-label-secondary); cursor:pointer; }
.dcompare-tabs { display:flex; gap:4px; padding:3px; border-radius:9px; background:var(--dsw-alias-bg-layer-2); }
.dcompare-tab { flex:1; appearance:none; border:0; border-radius:7px; padding:7px; background:transparent; color:var(--dsw-alias-label-tertiary); font:inherit; font-size:12px; cursor:pointer; }
.dcompare-tab.is-active { background:var(--dsw-alias-bg-layer-3); color:var(--dsw-alias-label-primary); box-shadow:0 1px 4px rgba(0,0,0,.12); }
.dcompare-controlled { display:grid; gap:10px; border:0; padding:0; margin:0; min-width:0; }
.dcompare-progress { display:grid; gap:9px; padding:14px; border:1px solid var(--dsw-alias-border-l2); border-radius:10px; background:var(--dsw-alias-bg-layer-2); font-size:12px; font-variant-numeric:tabular-nums; }
.dcompare-progress progress { width:100%; height:7px; accent-color:var(--dsw-alias-brand-primary); }
.dcompare-tab:disabled { cursor:default; }
.dcompare-field { display:grid; gap:5px; color:var(--dsw-alias-label-secondary); font-size:11px; }
.dcompare-field input,.dcompare-field textarea,.dcompare-field select { box-sizing:border-box; width:100%; border:1px solid var(--dsw-alias-border-l2); border-radius:7px; padding:7px 8px; background:var(--dsw-alias-bg-layer-2); color:var(--dsw-alias-label-primary); font:inherit; font-size:12px; resize:vertical; }
.dcompare-warning { padding:9px 10px; border-radius:8px; background:var(--dsw-alias-bg-module-platform); color:var(--dsw-alias-label-tertiary); font-size:10px; }
.dcompare-outcomes { display:grid; gap:3px; color:var(--dsw-alias-label-secondary); font-size:11px; }
.dcompare-section { display:grid; gap:9px; border:1px solid var(--dsw-alias-border-l2); border-radius:10px; padding:12px; }
.dcompare-section-head { display:flex; justify-content:space-between; gap:12px; font-size:12px; }
.dcompare-section-head span,.dcompare-muted { color:var(--dsw-alias-label-tertiary); font-size:11px; }
.dcompare-scrubber { width:100%; accent-color:var(--dsw-alias-brand-primary); }
.dcompare-timelines,.dcompare-diffs { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
.dcompare-timeline,.dcompare-diff-list { min-width:0; display:grid; align-content:start; gap:5px; border-radius:8px; background:var(--dsw-alias-bg-layer-2); padding:9px; }
.dcompare-timeline>b,.dcompare-diff-list>b { margin-bottom:3px; font-size:11px; color:var(--dsw-alias-label-secondary); }
.dcompare-event { display:grid; grid-template-columns:52px 1fr; gap:6px; align-items:center; border-left:2px solid var(--dsw-alias-border-l2); padding:3px 6px; opacity:.72; }
.dcompare-event.is-current { opacity:1; background:var(--dsw-alias-bg-layer-3); }
.dcompare-event-failed { border-left-color:var(--dsw-alias-state-error-primary); }
.dcompare-event-retry { border-left-color:var(--dsw-alias-state-warning-primary); }
.dcompare-event span { color:var(--dsw-alias-label-tertiary); font:10px ui-monospace,monospace; }
.dcompare-event strong { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:11px; font-weight:500; }
.dcompare-diff-list details { min-width:0; font-size:11px; }
.dcompare-diff-list summary { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; cursor:pointer; }
.dcompare-diff-list pre { max-height:140px; overflow:auto; white-space:pre-wrap; font:10px/1.4 ui-monospace,monospace; }
.dcompare-failure { border:1px solid color-mix(in srgb,var(--dsw-alias-state-error-primary) 35%,transparent); }
.dcompare-failure>b { color:var(--dsw-alias-state-error-primary); }
.dcompare-manifest { color:var(--dsw-alias-label-tertiary); font-size:10px; }
@media (max-width:700px) { .dcompare-columns,.dcompare-timelines,.dcompare-diffs,.dcompare-identities { grid-template-columns:1fr; } .dcompare-kpis { grid-template-columns:1fr; } .dcompare-kpi { grid-template-columns:1fr auto; } }
`
let injected = false
export function injectStyles(): void {
  if (injected) return
  injected = true
  const style = document.createElement('style')
  style.dataset.plugin = 'dsh-plugin-compare'
  style.dataset.pluginCss = 'dsh-plugin-compare/panel'
  style.textContent = comparisonStyles
  document.head.appendChild(style)
}
