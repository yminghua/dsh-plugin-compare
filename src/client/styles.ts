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
.dproof-close { appearance:none; border:0; background:none; color:var(--dsw-alias-label-tertiary); font-size:20px; cursor:pointer; }
.dproof-body { padding:18px; display:grid; gap:14px; }
.dproof-empty { border:1px dashed var(--dsw-alias-border-l2); border-radius:12px; padding:24px; text-align:center; color:var(--dsw-alias-label-tertiary); font-size:13px; line-height:1.6; }
.dproof-columns { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
.dproof-run { border:1px solid var(--dsw-alias-border-l2); border-radius:10px; padding:12px; }
.dproof-run strong { display:block; margin-bottom:4px; font-size:12px; }
.dproof-run span { color:var(--dsw-alias-label-tertiary); font-size:12px; }
`
  document.head.appendChild(style)
}
