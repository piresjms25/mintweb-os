/* MintWeb OS — System Monitor */
(() => {
  function launch(win) {
    const wrap = h('div', { class: 'mon' });
    win.body.append(wrap);
    const fpsC = h('canvas', { width: 560, height: 220 }), memC = h('canvas', { width: 560, height: 220 });
    const fpsLbl = h('span'), memLbl = h('span');
    const sys = h('div', { class: 'kv' }), stor = h('div'), procs = h('div');
    wrap.append(
      h('div', { class: 'card' }, h('h4', {}, 'Frame rate (responsiveness) ', fpsLbl), fpsC),
      h('div', { class: 'card' }, h('h4', {}, 'JavaScript memory ', memLbl), memC),
      h('div', { class: 'card' }, h('h4', {}, 'System'), sys),
      h('div', { class: 'card' }, h('h4', {}, 'Storage'), stor),
      h('div', { class: 'card', style: { gridColumn: '1/-1' } }, h('h4', {}, 'Open windows (processes)'), procs));
    const fps = [], mem = [];
    let frames = 0, last = performance.now(), raf, alive = true;
    const loop = t => { frames++; if (t - last >= 1000) { fps.push(Math.round(frames * 1000 / (t - last))); frames = 0; last = t; if (performance.memory) mem.push(performance.memory.usedJSHeapSize / 1048576); if (fps.length > 60) fps.shift(); if (mem.length > 60) mem.shift(); tick(); } if (alive) raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    function draw(c, data, max) {
      const g = c.getContext('2d'), W = c.width, H = c.height;
      g.clearRect(0, 0, W, H);
      g.strokeStyle = 'rgba(128,128,128,.25)'; g.lineWidth = 1;
      for (let i = 1; i < 4; i++) { g.beginPath(); g.moveTo(0, H * i / 4); g.lineTo(W, H * i / 4); g.stroke(); }
      if (!data.length) return;
      const ac = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#35a854';
      g.beginPath();
      data.forEach((v, i) => { const x = W - (data.length - 1 - i) * (W / 59), y = H - Math.min(1, v / max) * (H - 6) - 3; i ? g.lineTo(x, y) : g.moveTo(x, y); });
      g.strokeStyle = ac; g.lineWidth = 3; g.stroke();
      g.lineTo(W, H); g.lineTo(W - (data.length - 1) * (W / 59), H); g.closePath(); g.globalAlpha = .18; g.fillStyle = ac; g.fill(); g.globalAlpha = 1;
    }
    async function tick() {
      draw(fpsC, fps, 70); fpsLbl.textContent = fps.length ? `· ${fps[fps.length - 1]} fps` : '';
      if (mem.length) { draw(memC, mem, Math.max(...mem) * 1.3); memLbl.textContent = `· ${mem[mem.length - 1].toFixed(1)} MB`; } else memLbl.textContent = '· not reported by this browser';
      sys.innerHTML = [['Host', `${SysInfo.browserName()} on ${SysInfo.hostOS()}`], ['CPU threads', navigator.hardwareConcurrency || '?'], ['Device memory', navigator.deviceMemory ? '≥ ' + navigator.deviceMemory + ' GB' : 'n/a'], ['Uptime', SysInfo.uptime()], ['Network', navigator.onLine ? 'Online' : 'Offline'], ['Language', navigator.language]].map(([k, v]) => `<b>${k}</b><span>${esc(v)}</span>`).join('');
      if (fps.length % 5 === 1) {
        const e = navigator.storage && navigator.storage.estimate ? await navigator.storage.estimate().catch(() => null) : null;
        const used = VFS.usage();
        stor.innerHTML = `<div class="kv"><b>Files</b><span>${fmtBytes(used)} of ~5 MB</span><b>Browser</b><span>${e ? fmtBytes(e.usage || 0) + ' / ' + fmtBytes(e.quota || 0) : 'n/a'}</span></div><div class="bar"><i style="width:${Math.min(100, used / 5242880 * 100)}%"></i></div>`;
      }
      procs.innerHTML = '';
      WM.list().forEach(w => procs.append(h('div', { class: 'proc' }, h('span', { html: Icons.app(OS.getApp(w.app) ? OS.getApp(w.app).icon : 'webapp', 18) }), h('span', {}, w.title), h('small', { style: { color: 'var(--muted)' } }, 'PID ' + w.id.slice(1)), w === win ? null : h('button', { class: 'btn sm', onclick: () => w.close(true) }, 'End'))));
    }
    win.onClose(() => { alive = false; cancelAnimationFrame(raf); });
    tick();
  }
  OS.register({ id: 'monitor', name: 'System Monitor', icon: 'monitor', category: 'System Tools', description: 'View performance and running apps', keywords: ['task manager', 'processes', 'performance', 'top', 'htop'], singleton: true, window: { width: 780, height: 560 }, launch });
})();
