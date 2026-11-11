/* MintWeb OS — Web Browser and web-app runner (iframe based) */
(() => {
  const START = `<!doctype html><meta charset=utf-8><style>body{font-family:system-ui,sans-serif;margin:0;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;background:linear-gradient(160deg,#10261c,#1d4d36);color:#fff}h1{font-weight:300}form{display:flex;gap:8px;width:min(560px,90vw)}input{flex:1;padding:12px 16px;border-radius:24px;border:none;font-size:16px}button{padding:0 18px;border-radius:24px;border:none;background:#35a854;color:#fff;font-size:15px;cursor:pointer}.g{display:grid;grid-template-columns:repeat(auto-fill,120px);gap:12px;justify-content:center;margin-top:28px;width:min(640px,90vw)}a{display:block;padding:14px 8px;border-radius:12px;background:rgba(255,255,255,.1);color:#fff;text-decoration:none;text-align:center;font-size:13px}a:hover{background:rgba(255,255,255,.2)}small{opacity:.6;margin-top:24px;max-width:520px;text-align:center}</style>
<h1>Start Page</h1><form onsubmit="parent.postMessage({mwNav:this.q.value},'*');return false"><input name=q placeholder="Search Wikipedia or type a URL"><button>Go</button></form>
<div class=g><a href="https://en.wikipedia.org/wiki/Linux_Mint">Wikipedia</a><a href="https://www.openstreetmap.org/export/embed.html?bbox=-30,25,50,65&layer=mapnik">OpenStreetMap</a><a href="https://excalidraw.com">Excalidraw</a><a href="https://jspaint.app">JS Paint</a><a href="https://gchq.github.io/CyberChef/">CyberChef</a><a href="https://copy.sh/v86/">v86 (real Linux VM)</a></div>
<small>Some websites refuse to be shown inside other pages. If a page stays blank, use the ↗ button to open it in a real browser tab.</small>`;

  function toUrl(q) {
    q = q.trim();
    if (!q) return 'about:start';
    if (/^(https?:|about:|data:)/i.test(q)) return q;
    if (/^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(q) && !/\s/.test(q)) return 'https://' + q;
    return 'https://en.wikipedia.org/w/index.php?search=' + encodeURIComponent(q);
  }

  function launch(win, args) {
    const frame = h('iframe', { referrerpolicy: 'no-referrer', allow: 'fullscreen; clipboard-write; autoplay', });
    const url = h('input', { class: 'input urlbar', placeholder: 'Search or enter address', spellcheck: 'false' });
    const hist = []; let hi = -1;
    const btn = (i, t, fn) => h('button', { class: 'btn icon', title: t, 'aria-label': t, html: Icons.ui(i, 16), onclick: fn });
    const back = btn('back', 'Back', () => { if (hi > 0) { hi--; show(hist[hi]); } });
    const fwd = btn('fwd', 'Forward', () => { if (hi < hist.length - 1) { hi++; show(hist[hi]); } });
    const note = h('div', { class: 'b-note' }, h('span', {}, 'Tip: if a site stays blank it blocks embedding — open it in a real tab with ↗.'), h('a', { href: '#', onclick: e => { e.preventDefault(); note.remove(); } }, 'Dismiss'));
    const bar = h('div', { class: 'toolbar' }, back, fwd, btn('reload', 'Reload', () => show(hist[hi])), btn('homeS', 'Home', () => nav('about:start')), url,
      btn('sparkle', 'Ask Mint AI about this page', () => OS.launch('assistant', { prompt: `Tell me about this web page: ${hist[hi]}` })),
      btn('ext', 'Open in a real browser tab', () => { const u = hist[hi]; if (/^https?:/.test(u)) window.open(u, '_blank', 'noopener'); }));
    win.body.append(h('div', { class: 'browser' }, args.app ? null : bar, args.app ? null : note, frame));
    if (args.app) win.body.prepend(h('div', { class: 'toolbar' }, h('span', { html: Icons.app('webapp', 16) }), h('small', { style: { color: 'var(--muted)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, args.url), btn('reload', 'Reload', () => { frame.src = args.url; }), btn('ext', 'Open in a real browser tab', () => window.open(args.url, '_blank', 'noopener'))));

    const SANDBOX = 'allow-scripts allow-forms allow-popups allow-modals allow-downloads allow-pointer-lock';
    function show(u) {
      frame.setAttribute('sandbox', /^about:/.test(u) ? SANDBOX : SANDBOX + ' allow-same-origin');
      url.value = u === 'about:start' ? '' : u;
      back.disabled = hi <= 0; fwd.disabled = hi >= hist.length - 1;
      if (u === 'about:start') { frame.removeAttribute('src'); frame.srcdoc = START; win.setTitle('Start Page - Web Browser'); }
      else if (u.startsWith('about:html')) { frame.removeAttribute('src'); frame.srcdoc = args.html || ''; }
      else { frame.removeAttribute('srcdoc'); frame.src = u; win.setTitle((args.app ? args.title : u.replace(/^https?:\/\//, '').split('/')[0] + ' - Web Browser')); }
    }
    function nav(u) { u = toUrl(u); hist.splice(hi + 1); hist.push(u); hi = hist.length - 1; show(u); }
    url.addEventListener('keydown', e => { if (e.key === 'Enter') { nav(url.value); frame.focus(); } });
    url.addEventListener('focus', () => url.select());
    const onMsg = e => { if (e.source === frame.contentWindow && e.data && typeof e.data.mwNav === 'string') nav(e.data.mwNav); };
    addEventListener('message', onMsg); win.onClose(() => removeEventListener('message', onMsg));
    frame.addEventListener('load', () => { try { const t = frame.contentDocument && frame.contentDocument.title; if (t && !args.app) win.setTitle(t + ' - Web Browser'); } catch { /* cross-origin */ } });
    if (args.html != null) { hist.push('about:html'); hi = 0; show('about:html'); win.setTitle((args.title || 'Document') + ' - Web Browser'); }
    else nav(args.url || 'about:start');
  }

  OS.register({ id: 'browser', name: 'Web Browser', icon: 'browser', category: 'Internet', description: 'Browse the web', keywords: ['firefox', 'internet', 'web', 'chrome', 'browser'], window: { width: 980, height: 640 }, launch });
  OS.register({ id: 'webapp', name: 'Web App', icon: 'webapp', hidden: true, window: { width: 1000, height: 660 }, launch(win, a) {
    if (a.embed === false) { window.open(a.url, '_blank', 'noopener'); win.close(true); OS.notify(`${a.name} opened in a new browser tab (it cannot run inside a window).`); return; }
    win.setTitle(a.name); launch(win, { url: a.url, app: true, title: a.name });
  } });
})();
