let injected = false

export function injectStyles(): void {
  if (injected) return
  injected = true
  const style = document.createElement('style')
  style.dataset.plugin = 'dsh-proof'
  style.dataset.pluginCss = 'dsh-proof/panel'
  style.textContent = `
.dproof-button { appearance:none; border:1px solid var(--dsw-alias-border-l2); background:none; color:var(--dsw-alias-label-secondary); border-radius:8px; padding:5px 10px; font:inherit; font-size:12px; cursor:pointer; }
.dproof-button:hover { background:var(--dsw-alias-bg-layer-2); color:var(--dsw-alias-label-primary); }
.dproof-panel { position:fixed; inset:72px 24px 24px auto; width:min(520px,calc(100vw - 48px)); z-index:100; pointer-events:auto; display:flex; flex-direction:column; border:1px solid var(--dsw-alias-border-l2); border-radius:16px; background:var(--dsw-alias-bg-layer-3); color:var(--dsw-alias-label-primary); box-shadow:0 18px 60px rgba(0,0,0,.22); overflow:hidden; }
.dproof-head { display:flex; align-items:center; gap:12px; padding:16px 18px; border-bottom:1px solid var(--dsw-alias-border-l2); }
.dproof-title { flex:1; font-size:15px; font-weight:650; }
.dproof-fact { color:var(--dsw-alias-label-tertiary); font-size:11px; }
.dproof-close { appearance:none; border:0; background:none; color:var(--dsw-alias-label-tertiary); font-size:20px; cursor:pointer; }
.dproof-body { padding:18px; display:grid; gap:14px; }
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
.dproof-verdict { display:grid; gap:3px; border-radius:10px; padding:12px; background:var(--dsw-alias-bg-module-platform); }
.dproof-verdict strong { font-size:13px; }
.dproof-verdict span { color:var(--dsw-alias-label-tertiary); font-size:11px; }
.dproof-table { display:grid; border:1px solid var(--dsw-alias-border-l2); border-radius:10px; overflow:hidden; }
.dproof-row { display:grid; grid-template-columns:1.4fr 1fr 1fr; gap:8px; padding:8px 10px; font-size:12px; }
.dproof-row + .dproof-row { border-top:1px solid var(--dsw-alias-border-l2); }
.dproof-row span:not(:first-child) { text-align:right; font-variant-numeric:tabular-nums; }
.dproof-row-head { color:var(--dsw-alias-label-tertiary); background:var(--dsw-alias-bg-layer-2); font-size:11px; }
.dproof-export { display:flex; justify-content:flex-end; gap:8px; }
`
  document.head.appendChild(style)
}
