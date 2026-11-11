/* MintWeb OS — desktop shell: panel, menu, desktop icons, power, shortcuts */
(function () {
  const bootTime = Date.now();
  window.OS_BOOT = bootTime;
  OS.applySettings();
  $('.boot-logo').innerHTML = Icons.logo(84);

  /* ---------- panel ---------- */
  $('#menu-btn').innerHTML = Icons.logo(26);
  $('#tray-ai').innerHTML = Icons.ui('sparkle', 18);
  $('#tray-vol').innerHTML = Icons.ui('vol', 18);
  const net = () => { $('#tray-net').innerHTML = Icons.ui(navigator.onLine ? 'net' : 'netOff', 18); $('#tray-net').title = navigator.onLine ? 'Connected' : 'Offline'; };
  net(); addEventListener('online', net); addEventListener('offline', () => { net(); OS.notify('You are offline. MintWeb OS keeps working; online AI and websites are unavailable.', { title: 'Network' }); });
  $$('.menu-power button').forEach(b => { b.innerHTML = Icons.ui({ lock: 'lock', logout: 'logout', shutdown: 'power' }[b.dataset.power], 20); b.onclick = () => { closeMenu(); power(b.dataset.power); }; });
  $('#tray-ai').onclick = () => OS.launch('assistant');
  $('#show-desktop').onclick = () => WM.showDesktop();

  function renderLaunchers() {
    const el = $('#launchers'); el.innerHTML = '';
    for (const id of OS.settings.launchers) {
      const a = OS.getApp(id); if (!a) continue;
      el.append(h('button', { class: 'panel-btn', title: a.name, 'aria-label': a.name, html: Icons.app(a.icon, 22), onclick: () => OS.launch(a.id),
        oncontextmenu: e => { e.preventDefault(); OS.contextMenu(e.clientX, e.clientY, [{ label: 'Open', action: () => OS.launch(a.id) }, { label: 'Remove from panel', icon: 'close', action: () => OS.setSetting({ launchers: OS.settings.launchers.filter(x => x !== id) }) }]); } }));
    }
  }

  function tick() {
    const d = new Date();
    $('#clock').textContent = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    $('#clock').title = d.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const lt = $('.lock-time'); if (lt) { lt.textContent = $('#clock').textContent; $('.lock-date').textContent = $('#clock').title; }
  }
  tick(); setInterval(tick, 1000);

  let calMonth = null;
  function renderCalendar() {
    const now = new Date();
    const m = calMonth || new Date(now.getFullYear(), now.getMonth(), 1);
    const c = $('#calendar'); c.innerHTML = '';
    const first = new Date(m.getFullYear(), m.getMonth(), 1);
    const start = new Date(first); start.setDate(1 - ((first.getDay() + 6) % 7));
    const grid = h('div', { class: 'cal-grid' });
    ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].forEach(d => grid.append(h('div', { class: 'dow' }, d)));
    for (let i = 0; i < 42; i++) {
      const d = new Date(start); d.setDate(start.getDate() + i);
      const cls = 'd' + (d.getMonth() !== m.getMonth() ? ' other' : '') + (d.toDateString() === now.toDateString() ? ' today' : '');
      grid.append(h('div', { class: cls }, d.getDate()));
    }
    const nav = dd => () => { calMonth = new Date(m.getFullYear(), m.getMonth() + dd, 1); renderCalendar(); };
    c.append(
      h('div', { class: 'cal-big' }, now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })),
      h('div', { class: 'cal-date' }, now.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })),
      h('div', { class: 'cal-head' }, h('button', { class: 'btn icon', html: Icons.ui('back', 14), onclick: nav(-1) }), h('strong', {}, m.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })), h('button', { class: 'btn icon', html: Icons.ui('fwd', 14), onclick: nav(1) })),
      grid);
  }
  $('#clock').onclick = () => { const c = $('#calendar'); const show = c.classList.contains('hidden'); closeMenu(); if (show) { calMonth = null; renderCalendar(); } c.classList.toggle('hidden', !show); $('#clock').classList.toggle('open', show); };

  /* ---------- menu ---------- */
  const CAT_ORDER = ['Accessories', 'Graphics', 'Internet', 'Office', 'Web Apps', 'Preferences', 'System Tools', 'Administration'];
  let curCat = 'All', focusIdx = -1;
  const menu = $('#menu'), search = $('#menu-search');
  function openMenu() {
    $('#calendar').classList.add('hidden'); $('#clock').classList.remove('open');
    menu.classList.remove('hidden'); $('#menu-btn').classList.add('open');
    search.value = ''; curCat = 'All'; renderMenu(); setTimeout(() => search.focus(), 10);
  }
  function closeMenu() { menu.classList.add('hidden'); $('#menu-btn').classList.remove('open'); }
  const toggleMenu = () => (menu.classList.contains('hidden') ? openMenu() : closeMenu());
  $('#menu-btn').onclick = toggleMenu;

  function appButton(a, extra) {
    return h('button', { class: 'm-app', onclick: () => { closeMenu(); (extra && extra.run ? extra.run() : OS.launch(a.id)); },
      oncontextmenu: e => {
        if (extra) return; e.preventDefault();
        const fav = OS.settings.favorites.includes(a.id), pin = OS.settings.launchers.includes(a.id);
        OS.contextMenu(e.clientX, e.clientY, [
          { label: 'Open', action: () => { closeMenu(); OS.launch(a.id); } },
          { label: fav ? 'Remove from favorites' : 'Add to favorites', icon: 'star', action: () => { OS.setSetting({ favorites: fav ? OS.settings.favorites.filter(x => x !== a.id) : [...OS.settings.favorites, a.id] }); renderMenu(); } },
          { label: pin ? 'Remove from panel' : 'Add to panel', icon: 'plus', action: () => OS.setSetting({ launchers: pin ? OS.settings.launchers.filter(x => x !== a.id) : [...OS.settings.launchers, a.id] }) },
        ]);
      } },
      h('span', { html: extra && extra.iconHtml ? extra.iconHtml : Icons.app(a.icon, 28) }),
      h('span', { class: 'm-txt' }, h('span', {}, a.name), h('small', {}, a.description || '')));
  }

  function renderMenu() {
    const apps = OS.apps();
    const favs = $('#menu-favs'); favs.innerHTML = '';
    OS.settings.favorites.map(OS.getApp).filter(Boolean).forEach(a => favs.append(h('button', { title: a.name, html: Icons.app(a.icon, 28), onclick: () => { closeMenu(); OS.launch(a.id); } })));
    const cats = $('#menu-cats'); cats.innerHTML = '';
    const present = CAT_ORDER.filter(c => apps.some(a => a.category === c));
    ['All', 'Favorites', ...present].forEach(c => cats.append(h('button', { class: 'm-cat' + (c === curCat && !search.value ? ' on' : ''), onmouseenter: () => { if (!search.value && curCat !== c) { curCat = c; renderMenu(); } }, onclick: () => { search.value = ''; curCat = c; renderMenu(); } }, c === 'All' ? 'All Applications' : c)));
    const list = $('#menu-apps'); list.innerHTML = ''; focusIdx = -1;
    const q = search.value.trim().toLowerCase();
    if (!q) {
      const shown = curCat === 'All' ? apps : curCat === 'Favorites' ? OS.settings.favorites.map(OS.getApp).filter(Boolean) : apps.filter(a => a.category === curCat);
      shown.slice().sort((a, b) => (curCat === 'Favorites' ? 0 : a.name.localeCompare(b.name))).forEach(a => list.append(appButton(a)));
      return;
    }
    const hits = apps.filter(a => [a.name, a.description, a.id, ...(a.keywords || [])].join(' ').toLowerCase().includes(q));
    hits.forEach(a => list.append(appButton(a)));
    try {
      if (/[+\-*/^%]/.test(q) && /\d/.test(q)) { const r = safeMath(q); list.prepend(appButton({ name: `= ${r}`, description: 'Click to copy result', icon: 'calculator' }, { run: () => navigator.clipboard && navigator.clipboard.writeText(String(r)) })); }
    } catch { /* not math */ }
    const files = [];
    try { VFS.walk(VFS.HOME, e => { if (files.length < 8 && !e.path.includes('/.') && e.name.toLowerCase().includes(q)) files.push(e); }); } catch { /* ignore */ }
    if (files.length) {
      list.append(h('div', { class: 'm-head' }, 'Files'));
      files.forEach(f => list.append(appButton({ name: f.name, description: VFS.pretty(f.path) }, { iconHtml: f.type === 'dir' ? Icons.folder(28) : Icons.file(28, VFS.ext(f.name)), run: () => OS.openPath(f.path) })));
    }
    list.append(h('div', { class: 'm-head' }, 'Mint AI'));
    list.append(appButton({ name: `Ask Mint AI: “${search.value.trim()}”`, description: 'Get an answer or let AI do it for you', icon: 'ai' }, { run: () => OS.launch('assistant', { prompt: search.value.trim() }) }));
    if (!hits.length && !files.length) focusIdx = $$('.m-app', list).length - 1;
    else focusIdx = 0;
    highlight();
  }
  function highlight() { $$('.m-app', $('#menu-apps')).forEach((b, i) => b.classList.toggle('focus', i === focusIdx)); }
  search.addEventListener('input', renderMenu);
  search.addEventListener('keydown', e => {
    const items = $$('.m-app', $('#menu-apps'));
    if (e.key === 'ArrowDown') { e.preventDefault(); focusIdx = Math.min(items.length - 1, focusIdx + 1); highlight(); items[focusIdx] && items[focusIdx].scrollIntoView({ block: 'nearest' }); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); focusIdx = Math.max(0, focusIdx - 1); highlight(); items[focusIdx] && items[focusIdx].scrollIntoView({ block: 'nearest' }); }
    else if (e.key === 'Enter') { e.preventDefault(); (items[focusIdx] || items[0]) && (items[focusIdx] || items[0]).click(); }
    else if (e.key === 'Escape') closeMenu();
  });

  /* ---------- desktop icons ---------- */
  const DESKTOP = VFS.HOME + '/Desktop';
  function renderDesktop() {
    const box = $('#desktop-icons'); box.innerHTML = '';
    const items = [
      { name: 'Computer', html: Icons.app('computer', 48), open: () => OS.launch('files', { path: '/' }) },
      { name: 'Home', html: Icons.app('home', 48), open: () => OS.launch('files', { path: VFS.HOME }) },
      { name: 'Trash', html: Icons.app('trash', 48), open: () => OS.launch('files', { path: VFS.TRASH }), ctx: [{ label: 'Empty Trash', icon: 'del', action: emptyTrash }] },
    ];
    if (VFS.isDir(DESKTOP)) for (const e of VFS.list(DESKTOP, { hidden: false })) {
      items.push({ name: e.name, path: e.path, html: e.type === 'dir' ? Icons.folder(48) : Icons.file(48, VFS.ext(e.name)), open: () => OS.openPath(e.path) });
    }
    for (const it of items) {
      const b = h('button', { class: 'd-icon', title: it.name, html: it.html, draggable: it.path ? 'true' : null }, h('span', {}, it.name));
      b.addEventListener('click', e => { $$('.d-icon').forEach(x => x.classList.remove('sel')); b.classList.add('sel'); if (e.pointerType === 'touch') it.open(); });
      b.addEventListener('dblclick', it.open);
      b.addEventListener('keydown', e => { if (e.key === 'Enter') it.open(); if (e.key === 'Delete' && it.path) VFS.trash(it.path); });
      if (it.path) b.addEventListener('dragstart', e => e.dataTransfer.setData('text/x-mintweb-path', it.path));
      b.addEventListener('contextmenu', e => {
        e.preventDefault(); e.stopPropagation();
        OS.contextMenu(e.clientX, e.clientY, [{ label: 'Open', action: it.open }, ...(it.ctx || []),
          ...(it.path ? [
            { label: 'Rename…', icon: 'rename', action: async () => { const n = await OS.prompt('Rename', it.name); if (n && n !== it.name) try { VFS.mv(it.path, VFS.join(DESKTOP, n)); } catch (er) { OS.notify(er.message, { type: 'error' }); } } },
            { label: 'Move to Trash', icon: 'del', action: () => VFS.trash(it.path) },
          ] : [])]);
      });
      box.append(b);
    }
  }
  async function emptyTrash() { if (await OS.confirm('Empty Trash?', 'All items in the Trash will be permanently deleted.', { okLabel: 'Empty Trash', danger: true })) VFS.emptyTrash(); }
  VFS.onChange(renderDesktop);

  async function newItem(dir, type) {
    const name = await OS.prompt(type === 'dir' ? 'New Folder' : 'New Document', VFS.uniqueName(dir, type === 'dir' ? 'New Folder' : 'Untitled Document.txt'));
    if (!name) return;
    try { const p = VFS.join(dir, name); type === 'dir' ? VFS.mkdir(p) : VFS.write(p, ''); } catch (e) { OS.notify(e.message, { type: 'error' }); }
  }
  window.ShellUI = { newItem, emptyTrash, openMenu, closeMenu };

  $('#desktop').addEventListener('contextmenu', e => {
    if (e.target.closest('.window') || e.target.closest('.toast')) return;
    e.preventDefault();
    OS.contextMenu(e.clientX, e.clientY, [
      { label: 'New Folder', icon: 'newfolder', action: () => newItem(DESKTOP, 'dir') },
      { label: 'New Document', icon: 'newfile', action: () => newItem(DESKTOP, 'file') },
      { sep: true },
      { label: 'Open in Terminal', icon: 'play', action: () => OS.launch('terminal', { cwd: DESKTOP }) },
      { label: 'Ask Mint AI…', icon: 'sparkle', action: () => OS.launch('assistant') },
      { sep: true },
      { label: 'Change Desktop Background', icon: 'gear', action: () => OS.launch('settings', { page: 'backgrounds' }) },
      { label: OS.settings.desktopIcons ? 'Hide Desktop Icons' : 'Show Desktop Icons', action: () => OS.setSetting({ desktopIcons: !OS.settings.desktopIcons }) },
    ]);
  });
  $('#desktop').addEventListener('pointerdown', e => { if (e.target === $('#desktop') || e.target === $('#desktop-icons')) $$('.d-icon').forEach(x => x.classList.remove('sel')); });
  $('#desktop').addEventListener('dragover', e => { if (!e.target.closest('.window')) e.preventDefault(); });
  $('#desktop').addEventListener('drop', e => {
    if (e.target.closest('.window')) return;
    e.preventDefault();
    const p = e.dataTransfer.getData('text/x-mintweb-path');
    if (p && VFS.split(p)[0] !== DESKTOP) { try { VFS.mv(p, DESKTOP); } catch (er) { OS.notify(er.message, { type: 'error' }); } }
    else if (e.dataTransfer.files.length && typeof FilesApp !== 'undefined') FilesApp.upload(e.dataTransfer.files, DESKTOP);
  });

  /* ---------- global click-away ---------- */
  document.addEventListener('pointerdown', e => {
    if (!e.target.closest('#ctx')) OS.hideContext();
    if (!e.target.closest('#menu') && !e.target.closest('#menu-btn')) closeMenu();
    if (!e.target.closest('#calendar') && !e.target.closest('#clock')) { $('#calendar').classList.add('hidden'); $('#clock').classList.remove('open'); }
  });
  addEventListener('blur', () => OS.hideContext());

  /* ---------- power ---------- */
  const ov = $('#overlay');
  function boot(cb) {
    const b = $('#boot'); b.classList.remove('done'); b.style.display = '';
    setTimeout(() => { b.classList.add('done'); cb && cb(); }, 1100);
  }
  async function power(kind) {
    if (kind === 'lock') {
      ov.className = 'lock'; ov.innerHTML = '';
      ov.append(h('div', { class: 'lock-time' }), h('div', { class: 'lock-date' }),
        h('div', { class: 'lock-user' }, h('div', { class: 'avatar' }, 'M'), h('div', {}, 'mint'), h('small', { style: { opacity: .7 } }, 'Click or press any key to unlock')));
      tick();
      const unlock = () => { ov.className = 'hidden'; ov.innerHTML = ''; document.removeEventListener('keydown', unlock, true); };
      ov.onclick = unlock; setTimeout(() => document.addEventListener('keydown', unlock, true), 300);
      return;
    }
    const isOff = kind === 'shutdown';
    const ok = await OS.confirm(isOff ? 'Quit MintWeb OS?' : 'Log out?', isOff ? 'All open windows will be closed. Your files and settings are saved in this browser.' : 'All open windows will be closed.', { okLabel: isOff ? 'Shut Down' : 'Log Out' });
    if (!ok) return;
    for (const w of WM.list()) await w.close(true);
    if (!isOff) { boot(); return; }
    ov.className = 'off'; ov.innerHTML = ''; ov.onclick = null;
    ov.append(h('div', { html: Icons.logo(64) }), h('div', { style: { fontSize: '20px', fontWeight: 300 } }, 'MintWeb OS has shut down.'), h('small', { style: { opacity: .6 } }, 'It is now safe to close this tab.'),
      h('button', { class: 'btn primary', style: { marginTop: '18px' }, html: Icons.ui('power', 16) + ' Power on', onclick: () => { ov.className = 'hidden'; ov.innerHTML = ''; boot(); } }));
  }
  window.ShellUI.power = power;

  /* ---------- keyboard shortcuts ---------- */
  let metaAlone = false;
  document.addEventListener('keydown', e => {
    metaAlone = e.key === 'Meta' || e.key === 'OS';
    const k = e.key.toLowerCase();
    if ((e.altKey && e.key === 'F1') || (e.ctrlKey && e.key === 'Escape')) { e.preventDefault(); toggleMenu(); }
    else if (e.ctrlKey && e.altKey && k === 't') { e.preventDefault(); OS.launch('terminal'); }
    else if (e.ctrlKey && e.altKey && k === 'a') { e.preventDefault(); OS.launch('assistant'); }
    else if (e.ctrlKey && e.altKey && k === 'd') { e.preventDefault(); WM.showDesktop(); }
    else if (e.ctrlKey && e.altKey && k === 'e') { e.preventDefault(); OS.launch('files'); }
    else if (e.ctrlKey && e.altKey && k === 'l') { e.preventDefault(); power('lock'); }
    else if (e.ctrlKey && e.altKey && (k === 'q' || k === 'w')) { e.preventDefault(); const w = WM.active(); w && w.close(); }
    else if (e.key === 'Escape') { OS.hideContext(); if (!menu.classList.contains('hidden')) closeMenu(); }
  });
  document.addEventListener('keyup', e => { if ((e.key === 'Meta' || e.key === 'OS') && metaAlone) toggleMenu(); metaAlone = false; });

  /* ---------- start ---------- */
  OS.onSettings(() => { renderLaunchers(); });
  renderLaunchers(); renderDesktop();
  boot(() => {
    const params = new URLSearchParams(location.search);
    const open = params.get('open');
    if (open && OS.getApp(open)) OS.launch(open);
    else if (store.get('showWelcome', true)) OS.launch('welcome');
  });

  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(e => console.warn('SW', e)));
  }
  let installEvt = null;
  addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; });
  window.ShellUI.install = async () => {
    if (installEvt) { installEvt.prompt(); await installEvt.userChoice; installEvt = null; return true; }
    return false;
  };
  window.ShellUI.canInstall = () => !!installEvt;
})();
