/* MintWeb OS — core services: app registry, settings, dialogs, notifications, AI actions */
const OS = (() => {
  const registry = new Map();
  const ACCENTS = { green: '#35a854', aqua: '#1fa0c8', blue: '#4a7fe0', brown: '#a9805c', grey: '#858c94', orange: '#e5853b', pink: '#d9559d', purple: '#8f64d8', red: '#d9534f', sand: '#c9a74f', teal: '#2aa198' };

  const svg = s => `url("data:image/svg+xml,${encodeURIComponent(s)}")`;
  const waves = (bg1, bg2, layers) => svg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" preserveAspectRatio="none"><defs><linearGradient id="b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${bg1}"/><stop offset="1" stop-color="${bg2}"/></linearGradient></defs><rect width="1600" height="900" fill="url(#b)"/>${layers.map(([d, c, o]) => `<path d="${d}" fill="${c}" opacity="${o}"/>`).join('')}</svg>`);
  const W1 = 'M0 560C260 470 520 650 820 560S1340 430 1600 520V900H0Z', W2 = 'M0 660C300 590 620 760 960 660S1420 600 1600 640V900H0Z', W3 = 'M0 770C380 700 760 860 1120 770S1480 740 1600 760V900H0Z';
  const WALLPAPERS = {
    zena:     { name: 'Zena', css: waves('#0f2a1f', '#1d4d36', [[W1, '#2e7d4f', .45], [W2, '#35a854', .35], [W3, '#0b1f17', .6]]) },
    aurora:   { name: 'Aurora', css: 'radial-gradient(ellipse at 15% 85%, rgba(53,168,84,.55), transparent 55%), radial-gradient(ellipse at 75% 20%, rgba(31,160,200,.5), transparent 50%), radial-gradient(ellipse at 90% 90%, rgba(143,100,216,.45), transparent 50%), linear-gradient(160deg, #0b1220, #101c2c)' },
    dusk:     { name: 'Dusk', css: waves('#2b1a3d', '#c4604a', [[W1, '#7a3b69', .55], [W2, '#3d1f4f', .6], [W3, '#1a0f26', .8]]) },
    ocean:    { name: 'Ocean', css: waves('#0a2540', '#1d6fa5', [[W1, '#1fa0c8', .35], [W2, '#0e4a7a', .55], [W3, '#06182b', .75]]) },
    forest:   { name: 'Forest', css: 'radial-gradient(circle at 30% 30%, rgba(129,199,132,.35), transparent 40%), radial-gradient(circle at 70% 80%, rgba(46,125,50,.6), transparent 50%), linear-gradient(180deg, #13261a, #0a140e)' },
    graphite: { name: 'Graphite', css: 'radial-gradient(ellipse at 50% 0%, #4a4f55, transparent 60%), linear-gradient(180deg, #2d3035, #17191c)' },
    sunrise:  { name: 'Sunrise', css: waves('#ffb56b', '#f0697a', [[W1, '#ffd29b', .5], [W2, '#e8505b', .45], [W3, '#6b2d5c', .6]]) },
  };
  const DEFAULTS = { theme: 'dark', accent: 'green', wallpaper: 'zena', customWallpaper: '', desktopIcons: true, webapps: [], favorites: ['browser', 'files', 'terminal', 'assistant', 'editor', 'settings', 'software'], launchers: ['menu-sep', 'browser', 'files', 'terminal', 'assistant'] };

  let settings = Object.assign({}, DEFAULTS, store.get('settings', {}));
  const settingsListeners = new Set();

  function setSetting(patch) {
    settings = Object.assign({}, settings, patch);
    store.set('settings', settings);
    applySettings();
    settingsListeners.forEach(fn => fn(settings));
  }
  function applySettings() {
    const root = document.documentElement;
    root.dataset.theme = settings.theme;
    root.style.setProperty('--accent', ACCENTS[settings.accent] || settings.accent || ACCENTS.green);
    const d = $('#desktop');
    if (d) {
      d.style.background = settings.wallpaper === 'custom' && settings.customWallpaper
        ? `center / cover no-repeat url("${settings.customWallpaper.replace(/"/g, '%22')}"), #222`
        : (WALLPAPERS[settings.wallpaper] || WALLPAPERS.zena).css;
      d.style.backgroundSize = 'cover';
    }
    const di = $('#desktop-icons'); if (di) di.style.display = settings.desktopIcons ? '' : 'none';
  }

  function register(app) { registry.set(app.id, app); }
  function webapps() {
    return (settings.webapps || []).map(w => ({ id: 'web:' + w.id, name: w.name, icon: w.icon || 'webapp', category: 'Web Apps', description: w.desc, keywords: [w.id], webapp: w }));
  }
  const apps = () => [...registry.values()].filter(a => !a.hidden).concat(webapps());
  const getApp = id => registry.get(id) || webapps().find(a => a.id === id);

  function launch(id, args = {}) {
    const app = getApp(id);
    if (!app) { notify(`Application "${id}" not found`, { type: 'error' }); return null; }
    if (app.webapp) return launch('webapp', { ...app.webapp });
    if (app.singleton) {
      const ex = WM.byApp(id)[0];
      if (ex) { ex.focus(); if (app.reopen) app.reopen(ex, args); return ex; }
    }
    const win = WM.create(Object.assign({ app: id, title: args.title || app.name, icon: app.icon }, app.window || {}));
    try { app.launch(win, args); } catch (e) { console.error(e); notify(`${app.name} failed to start: ${e.message}`, { type: 'error' }); win.close(true); return null; }
    return win;
  }

  function openPath(path) {
    path = VFS.norm(path);
    const st = VFS.stat(path);
    if (!st) { notify(`${VFS.pretty(path)} does not exist`, { type: 'error' }); return; }
    if (st.type === 'dir') return launch('files', { path });
    const content = VFS.read(path);
    const ext = VFS.ext(path);
    if (/^data:image\//.test(content) || (['svg'].includes(ext) && content.trim().startsWith('<svg'))) return launch('viewer', { path });
    if (ext === 'html' || ext === 'htm') return launch('browser', { html: content, title: VFS.basename(path) });
    if (/^data:/.test(content)) { download(VFS.basename(path), content); return; }
    return launch('editor', { path });
  }

  function download(name, content) {
    const a = document.createElement('a');
    a.href = /^data:/.test(content) ? content : URL.createObjectURL(new Blob([content], { type: 'text/plain' }));
    a.download = name; document.body.append(a); a.click(); a.remove();
    setTimeout(() => { if (a.href.startsWith('blob:')) URL.revokeObjectURL(a.href); }, 1000);
  }

  /* ---------- notifications ---------- */
  function notify(text, { title = '', type = 'info', icon = 'ai', timeout = 4500 } = {}) {
    const t = h('div', { class: 'toast toast-' + type, role: 'status' },
      h('span', { class: 'toast-ico', html: Icons.app(type === 'error' ? 'monitor' : icon, 28) }),
      h('div', { class: 'toast-txt' }, title ? h('strong', {}, title) : null, h('span', {}, text)),
      h('button', { class: 'toast-x', 'aria-label': 'Dismiss', html: Icons.ui('close', 12), onclick: () => t.remove() }));
    $('#toasts').append(t);
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 300); }, timeout);
  }

  /* ---------- context menu ---------- */
  function contextMenu(x, y, items) {
    const m = $('#ctx'); m.innerHTML = '';
    for (const it of items) {
      if (it.sep) { m.append(h('div', { class: 'ctx-sep' })); continue; }
      m.append(h('button', { class: 'ctx-item', role: 'menuitem', disabled: it.disabled, onclick: () => { hideContext(); it.action && it.action(); } },
        h('span', { class: 'ctx-ico', html: it.icon ? Icons.ui(it.icon, 14) : '' }), h('span', {}, it.label), it.hint ? h('span', { class: 'ctx-hint' }, it.hint) : null));
    }
    m.classList.remove('hidden');
    const r = m.getBoundingClientRect();
    m.style.left = Math.min(x, innerWidth - r.width - 4) + 'px';
    m.style.top = Math.min(y, innerHeight - r.height - 4) + 'px';
  }
  function hideContext() { $('#ctx').classList.add('hidden'); }

  /* ---------- modal dialogs ---------- */
  function modal(title, bodyEl, buttons) {
    return new Promise(resolve => {
      const bg = h('div', { class: 'modal-bg' });
      const btns = h('div', { class: 'modal-btns' });
      const box = h('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true' }, h('div', { class: 'modal-title' }, title), bodyEl, btns);
      const done = v => { bg.remove(); document.removeEventListener('keydown', key, true); resolve(v); };
      for (const b of buttons) btns.append(h('button', { class: 'btn' + (b.primary ? ' primary' : '') + (b.danger ? ' danger' : ''), onclick: () => done(b.value()) }, b.label));
      const key = e => {
        if (e.key === 'Escape') { e.preventDefault(); done(null); }
        if (e.key === 'Enter' && !(e.target.tagName === 'TEXTAREA')) { const p = buttons.find(b => b.primary); if (p) { e.preventDefault(); done(p.value()); } }
      };
      document.addEventListener('keydown', key, true);
      bg.append(box); document.body.append(bg);
      setTimeout(() => { const f = box.querySelector('input,textarea,.btn.primary'); f && f.focus(); f && f.select && f.select(); }, 20);
    });
  }
  function prompt(title, value = '', { label = '' } = {}) {
    const input = h('input', { class: 'input', value });
    return modal(title, h('div', { class: 'modal-body' }, label ? h('label', {}, label) : null, input), [
      { label: 'Cancel', value: () => null }, { label: 'OK', primary: true, value: () => input.value },
    ]);
  }
  function confirm(title, text, { okLabel = 'OK', danger = false } = {}) {
    return modal(title, h('div', { class: 'modal-body' }, h('p', {}, text)), [
      { label: 'Cancel', value: () => false }, { label: okLabel, primary: true, danger, value: () => true },
    ]).then(v => !!v);
  }
  function fileDialog({ mode = 'open', dir = VFS.HOME + '/Documents', name = 'Untitled.txt' } = {}) {
    let cur = VFS.isDir(dir) ? dir : VFS.HOME;
    const pathEl = h('div', { class: 'fd-path' });
    const listEl = h('div', { class: 'fd-list' });
    const nameEl = h('input', { class: 'input', value: mode === 'save' ? name : '', placeholder: 'File name' });
    const render = () => {
      pathEl.innerHTML = '';
      pathEl.append(h('button', { class: 'btn sm', html: Icons.ui('up', 14), title: 'Up', onclick: () => { cur = VFS.split(cur)[0]; render(); } }), h('span', {}, VFS.pretty(cur)));
      listEl.innerHTML = '';
      for (const e of VFS.list(cur, { hidden: false })) {
        const row = h('div', { class: 'fd-row', tabindex: 0 }, h('span', { html: e.type === 'dir' ? Icons.folder(18) : Icons.file(18, VFS.ext(e.name)) }), h('span', {}, e.name));
        row.addEventListener('click', () => { if (e.type === 'file') { nameEl.value = e.name; $$('.fd-row', listEl).forEach(r => r.classList.remove('sel')); row.classList.add('sel'); } });
        row.addEventListener('dblclick', () => { if (e.type === 'dir') { cur = e.path; render(); } else okBtn.click(); });
        listEl.append(row);
      }
    };
    const body = h('div', { class: 'modal-body fd' }, pathEl, listEl, h('div', { class: 'fd-name' }, h('label', {}, mode === 'save' ? 'Save as:' : 'File:'), nameEl));
    let okBtn;
    const p = modal(mode === 'save' ? 'Save File' : 'Open File', body, [
      { label: 'Cancel', value: () => null },
      { label: mode === 'save' ? 'Save' : 'Open', primary: true, value: () => (nameEl.value.trim() ? VFS.norm(nameEl.value.trim(), cur) : null) },
    ]);
    render();
    okBtn = body.parentElement.querySelector('.btn.primary');
    return p;
  }

  /* ---------- AI desktop actions ---------- */
  function runAction(a) {
    if (!a || typeof a !== 'object') return null;
    switch (a.action) {
      case 'open_app': {
        const q = String(a.app || '').toLowerCase();
        const app = getApp(q) || apps().find(x => x.name.toLowerCase() === q || x.name.toLowerCase().includes(q) || (x.keywords || []).includes(q));
        if (!app) throw new Error(`No app "${a.app}"`);
        launch(app.id); return `Opened ${app.name}`;
      }
      case 'open_url': launch('browser', { url: String(a.url) }); return `Opened ${a.url}`;
      case 'create_file': {
        const p = VFS.norm(a.path || '~/Documents/untitled.txt');
        const d = VFS.split(p)[0]; if (!VFS.isDir(d)) VFS.mkdir(d, { parents: true });
        VFS.write(p, a.content || ''); return `Created ${VFS.pretty(p)}`;
      }
      case 'open_file': openPath(a.path); return `Opened ${a.path}`;
      case 'set_theme': {
        const patch = {};
        if (a.mode === 'dark' || a.mode === 'light') patch.theme = a.mode;
        if (a.accent && ACCENTS[a.accent]) patch.accent = a.accent;
        setSetting(patch); return `Theme updated${patch.theme ? ' (' + patch.theme + ')' : ''}${patch.accent ? ' accent ' + patch.accent : ''}`;
      }
      case 'set_wallpaper': if (!WALLPAPERS[a.id]) throw new Error(`No wallpaper "${a.id}"`); setSetting({ wallpaper: a.id }); return `Wallpaper: ${WALLPAPERS[a.id].name}`;
      case 'run_command': launch('terminal', { run: String(a.command) }); return `Ran \`${a.command}\``;
      case 'notify': notify(String(a.text || ''), { title: 'Mint AI' }); return 'Notification shown';
      default: throw new Error(`Unknown action "${a.action}"`);
    }
  }

  return {
    ACCENTS, WALLPAPERS,
    get settings() { return settings; }, setSetting, applySettings, onSettings: fn => settingsListeners.add(fn),
    register, apps, getApp, launch, openPath, download,
    notify, contextMenu, hideContext, modal, prompt, confirm, fileDialog, runAction,
  };
})();
