/* MintWeb OS — window manager */
const WM = (() => {
  let z = 100, seq = 0, active = null, desktopShown = null;
  const wins = new Map();
  const layer = () => $('#windows');
  const panelH = () => ($('#panel') && $('#panel').offsetHeight) || 40;
  const area = () => ({ w: innerWidth, h: innerHeight - panelH() });
  let snapEl;

  function create({ app, title, icon, width = 760, height = 500, minWidth = 300, minHeight = 180, resizable = true, className = '' }) {
    const id = 'w' + (++seq);
    const titleEl = h('span', { class: 't-title' }, title);
    const btnMin = h('button', { class: 't-btn', title: 'Minimize', 'aria-label': 'Minimize', html: Icons.ui('min', 14) });
    const btnMax = h('button', { class: 't-btn', title: 'Maximize', 'aria-label': 'Maximize', html: Icons.ui('max', 14) });
    const btnClose = h('button', { class: 't-btn t-close', title: 'Close', 'aria-label': 'Close', html: Icons.ui('close', 14) });
    const bar = h('div', { class: 'titlebar' }, h('span', { class: 't-icon', html: Icons.app(icon, 16) }), titleEl, h('div', { class: 't-btns' }, btnMin, btnMax, btnClose));
    const body = h('div', { class: 'w-body' });
    const el = h('div', { class: 'window opening ' + className, role: 'dialog', 'aria-label': title, 'data-app': app }, bar, body);
    if (resizable) ['n', 'e', 's', 'w', 'ne', 'nw', 'se', 'sw'].forEach(d => el.append(h('div', { class: 'rz rz-' + d, 'data-dir': d })));
    else btnMax.remove();

    const a = area();
    width = Math.min(width, a.w - 16); height = Math.min(height, a.h - 16);
    const off = (wins.size % 8) * 26;
    const x = Math.max(8, Math.round((a.w - width) / 2) - 80 + off);
    const y = Math.max(8, Math.round((a.h - height) / 2) - 50 + off);
    Object.assign(el.style, { left: x + 'px', top: y + 'px', width: width + 'px', height: height + 'px' });
    layer().append(el);
    setTimeout(() => el.classList.remove('opening'), 200);

    const tb = h('button', { class: 'task', title }, h('span', { class: 'task-ico', html: Icons.app(icon, 18) }), h('span', { class: 'task-label' }, title));
    $('#tasklist').append(tb);

    const win = {
      id, app, el, body, minimized: false, maximized: false, beforeClose: null, data: {}, _close: [], minWidth, minHeight, resizable,
      setTitle(t) { titleEl.textContent = t; tb.title = t; tb.lastChild.textContent = t; el.setAttribute('aria-label', t); },
      get title() { return titleEl.textContent; },
      onClose(fn) { this._close.push(fn); },
      close(force) { return close(win, force); },
      focus() { focus(win); },
      minimize() { minimize(win); },
      maximize() { toggleMax(win, true); },
      toggleMax() { toggleMax(win); },
    };
    win._tb = tb; win._btnMax = btnMax;
    wins.set(id, win);

    tb.addEventListener('click', () => (active === win && !win.minimized ? minimize(win) : focus(win)));
    tb.addEventListener('contextmenu', e => {
      e.preventDefault();
      OS.contextMenu(e.clientX, e.clientY, [
        { label: win.minimized ? 'Restore' : 'Minimize', action: () => (win.minimized ? focus(win) : minimize(win)) },
        { label: win.maximized ? 'Unmaximize' : 'Maximize', action: () => toggleMax(win) },
        { sep: true },
        { label: 'Close', icon: 'close', action: () => close(win) },
      ]);
    });
    btnMin.addEventListener('click', () => minimize(win));
    btnMax.addEventListener('click', () => toggleMax(win));
    btnClose.addEventListener('click', () => close(win));
    bar.addEventListener('dblclick', e => { if (!e.target.closest('.t-btns') && resizable) toggleMax(win); });
    el.addEventListener('pointerdown', () => { if (active !== win) focus(win); }, true);
    bar.addEventListener('pointerdown', e => startDrag(win, e, bar));
    el.querySelectorAll('.rz').forEach(r => r.addEventListener('pointerdown', e => startResize(win, e, r.dataset.dir)));

    if (innerWidth < 760 && resizable) toggleMax(win, true);
    focus(win);
    return win;
  }

  function focus(win) {
    if (!wins.has(win.id)) return;
    desktopShown = null;
    if (win.minimized) { win.minimized = false; win.el.classList.remove('minimized'); }
    win.el.style.zIndex = ++z;
    for (const w of wins.values()) { w.el.classList.toggle('active', w === win); w._tb.classList.toggle('active', w === win); }
    active = win;
    win._tb.classList.remove('attention');
  }
  function topmost() {
    let best = null;
    for (const w of wins.values()) if (!w.minimized && (!best || +w.el.style.zIndex > +best.el.style.zIndex)) best = w;
    return best;
  }
  function minimize(win) {
    win.minimized = true; win.el.classList.add('minimized');
    win.el.classList.remove('active'); win._tb.classList.remove('active');
    if (active === win) { active = null; const t = topmost(); if (t) focus(t); }
  }
  function toggleMax(win, force) {
    win.maximized = force === undefined ? !win.maximized : force;
    win.el.classList.toggle('maximized', win.maximized);
    win._btnMax.innerHTML = Icons.ui(win.maximized ? 'restore' : 'max', 14);
    win._btnMax.title = win.maximized ? 'Restore' : 'Maximize';
  }
  async function close(win, force) {
    if (!wins.has(win.id)) return true;
    if (!force && win.beforeClose) { const ok = await win.beforeClose(); if (!ok) return false; }
    win._close.forEach(fn => { try { fn(); } catch (e) { console.error(e); } });
    win.el.classList.add('closing');
    wins.delete(win.id); win._tb.remove();
    setTimeout(() => win.el.remove(), 140);
    if (active === win) { active = null; const t = topmost(); if (t) focus(t); }
    return true;
  }

  function snapPreview(rect) {
    if (!snapEl) { snapEl = h('div', { id: 'snap' }); layer().append(snapEl); }
    if (!rect) { snapEl.style.display = 'none'; return; }
    Object.assign(snapEl.style, { display: 'block', left: rect.x + 'px', top: rect.y + 'px', width: rect.w + 'px', height: rect.h + 'px', zIndex: z + 1 });
  }
  function snapRect(x, y) {
    const a = area();
    if (y <= 2) return { x: 0, y: 0, w: a.w, h: a.h, max: true };
    if (x <= 2) return { x: 0, y: 0, w: Math.round(a.w / 2), h: a.h };
    if (x >= innerWidth - 3) return { x: Math.round(a.w / 2), y: 0, w: a.w - Math.round(a.w / 2), h: a.h };
    return null;
  }

  function startDrag(win, e, bar) {
    if (e.button !== 0 || e.target.closest('.t-btns')) return;
    const el = win.el;
    const sx = e.clientX, sy = e.clientY;
    let base = { left: el.offsetLeft, top: el.offsetTop };
    let moved = false, snap = null;
    bar.setPointerCapture(e.pointerId);
    const move = ev => {
      const dx = ev.clientX - sx, dy = ev.clientY - sy;
      if (!moved) {
        if (Math.abs(dx) + Math.abs(dy) < 5) return;
        moved = true; document.body.classList.add('dragging');
        if (win.maximized) {
          const ratio = (sx - el.offsetLeft) / el.offsetWidth;
          toggleMax(win, false);
          base = { left: sx - el.offsetWidth * ratio, top: Math.max(0, sy - 16) };
        }
      }
      const a = area();
      const nx = Math.min(Math.max(base.left + dx, 60 - el.offsetWidth), a.w - 60);
      const ny = Math.min(Math.max(base.top + dy, 0), a.h - 32);
      el.style.left = nx + 'px'; el.style.top = ny + 'px';
      snap = snapRect(ev.clientX, ev.clientY);
      snapPreview(snap);
    };
    const up = () => {
      bar.removeEventListener('pointermove', move); bar.removeEventListener('pointerup', up); bar.removeEventListener('pointercancel', up);
      document.body.classList.remove('dragging'); snapPreview(null);
      if (snap) {
        if (snap.max) toggleMax(win, true);
        else Object.assign(el.style, { left: snap.x + 'px', top: snap.y + 'px', width: snap.w + 'px', height: snap.h + 'px' });
      }
    };
    bar.addEventListener('pointermove', move); bar.addEventListener('pointerup', up); bar.addEventListener('pointercancel', up);
  }

  function startResize(win, e, dir) {
    if (e.button !== 0 || win.maximized) return;
    e.preventDefault(); e.stopPropagation();
    const el = win.el, t = e.target;
    const sx = e.clientX, sy = e.clientY;
    const r = { l: el.offsetLeft, t: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight };
    t.setPointerCapture(e.pointerId);
    document.body.classList.add('dragging');
    const move = ev => {
      const dx = ev.clientX - sx, dy = ev.clientY - sy;
      let { l, t: tp, w, h: hh } = r;
      if (dir.includes('e')) w = Math.max(win.minWidth, r.w + dx);
      if (dir.includes('s')) hh = Math.max(win.minHeight, r.h + dy);
      if (dir.includes('w')) { w = Math.max(win.minWidth, r.w - dx); l = r.l + r.w - w; }
      if (dir.includes('n')) { hh = Math.max(win.minHeight, r.h - dy); tp = Math.max(0, r.t + r.h - hh); }
      Object.assign(el.style, { left: l + 'px', top: tp + 'px', width: w + 'px', height: hh + 'px' });
    };
    const up = () => {
      t.removeEventListener('pointermove', move); t.removeEventListener('pointerup', up); t.removeEventListener('pointercancel', up);
      document.body.classList.remove('dragging');
    };
    t.addEventListener('pointermove', move); t.addEventListener('pointerup', up); t.addEventListener('pointercancel', up);
  }

  function showDesktop() {
    if (desktopShown) { desktopShown.forEach(w => wins.has(w.id) && focus(w)); desktopShown = null; return; }
    const vis = [...wins.values()].filter(w => !w.minimized);
    vis.forEach(minimize); desktopShown = vis.length ? vis : null;
  }

  addEventListener('resize', () => {
    const a = area();
    for (const w of wins.values()) {
      if (innerWidth < 760 && w.resizable && !w.maximized) toggleMax(w, true);
      if (w.el.offsetTop > a.h - 32) w.el.style.top = Math.max(0, a.h - 60) + 'px';
      if (w.el.offsetLeft > a.w - 60) w.el.style.left = Math.max(0, a.w - w.el.offsetWidth) + 'px';
    }
  });

  return {
    create, focus, minimize, close, showDesktop,
    list: () => [...wins.values()],
    byApp: app => [...wins.values()].filter(w => w.app === app),
    active: () => active,
  };
})();
