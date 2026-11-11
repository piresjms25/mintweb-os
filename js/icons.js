/* MintWeb OS — icon set (original artwork, GPL-3.0-or-later) */
const Icons = (() => {
  const S = 'fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"';
  const app = {
    files:    ['#7cb342', '#4e8a1f', `<path ${S} d="M5 8.5h5l1.5 1.5H19v7.5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1z"/><path ${S} d="M5 8.5V7a1 1 0 0 1 1-1h3.5l1.5 1.5"/>`],
    terminal: ['#3b3f45', '#1d1f22', `<path ${S} d="M7 9l3 3-3 3"/><path ${S} d="M12 15.5h5"/>`],
    editor:   ['#42a5f5', '#1565c0', `<path ${S} d="M7 7h7M7 10.5h10M7 14h6"/><path ${S} d="M14 18l4.5-4.5 1.5 1.5L15.5 19.5H14z"/>`],
    ai:       ['#26c6da', '#5e35b1', `<path fill="#fff" d="M12 4.5l1.6 4.1 4.1 1.6-4.1 1.6L12 15.9l-1.6-4.1-4.1-1.6 4.1-1.6z"/><path fill="#fff" d="M17.5 14l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z" opacity=".85"/><circle cx="7" cy="16.5" r="1.3" fill="#fff" opacity=".7"/>`],
    settings: ['#78909c', '#455a64', `<circle ${S} cx="12" cy="12" r="2.6"/><path ${S} d="M12 4.8v2M12 17.2v2M4.8 12h2M17.2 12h2M6.9 6.9l1.4 1.4M15.7 15.7l1.4 1.4M6.9 17.1l1.4-1.4M15.7 8.3l1.4-1.4"/>`],
    browser:  ['#ff7043', '#c62828', `<circle ${S} cx="12" cy="12" r="6.5"/><path ${S} d="M5.5 12h13M12 5.5c2 2 2.8 4.2 2.8 6.5s-.8 4.5-2.8 6.5c-2-2-2.8-4.2-2.8-6.5s.8-4.5 2.8-6.5z"/>`],
    software: ['#ab47bc', '#6a1b9a', `<path ${S} d="M6 9h12l-1 9.5H7z"/><path ${S} d="M9.5 9V7.5a2.5 2.5 0 0 1 5 0V9"/>`],
    monitor:  ['#ef5350', '#ad1457', `<path ${S} d="M5 13h3l2-4 3 7 2-4h4"/>`],
    calculator:['#ffa726', '#ef6c00', `<rect ${S} x="7" y="5" width="10" height="14" rx="1.5"/><path ${S} d="M9.5 8.5h5M9.5 12h.01M12 12h.01M14.5 12h.01M9.5 15h.01M12 15h.01M14.5 15h.01"/>`],
    viewer:   ['#26a69a', '#00695c', `<rect ${S} x="5" y="6.5" width="14" height="11" rx="1.5"/><path ${S} d="M5.5 16l4-4 3 3 2-2 4 3.5"/><circle cx="15" cy="9.8" r="1.2" fill="#fff"/>`],
    computer: ['#5c6bc0', '#283593', `<rect ${S} x="5" y="6" width="14" height="9.5" rx="1"/><path ${S} d="M9.5 18.5h5M12 15.5v3"/>`],
    home:     ['#7cb342', '#4e8a1f', `<path ${S} d="M5.5 11.5L12 6l6.5 5.5"/><path ${S} d="M7.5 10v8h9v-8"/><path ${S} d="M10.5 18v-4h3v4"/>`],
    trash:    ['#90a4ae', '#546e7a', `<path ${S} d="M6.5 8h11M10 8V6.5h4V8M8 8l.8 10.5h6.4L16 8"/>`],
    webapp:   ['#29b6f6', '#0277bd', `<rect ${S} x="5" y="6" width="14" height="12" rx="1.5"/><path ${S} d="M5 9.5h14"/><circle cx="7.2" cy="7.8" r=".6" fill="#fff"/><circle cx="9" cy="7.8" r=".6" fill="#fff"/>`],
    linux:    ['#455a64', '#263238', `<path ${S} d="M12 5c-2 0-3 1.8-3 4 0 1.5-1.8 3.2-2.5 5.5-.4 1.4.6 2.5 2 2.5h7c1.4 0 2.4-1.1 2-2.5C16.8 12.2 15 10.5 15 9c0-2.2-1-4-3-4z"/><circle cx="10.8" cy="9" r=".7" fill="#fff"/><circle cx="13.2" cy="9" r=".7" fill="#fff"/>`],
  };

  function appIcon(name, size = 32) {
    const a = app[name] || app.webapp;
    const id = 'g' + name + Math.random().toString(36).slice(2, 7);
    return `<svg class="ico" width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a[0]}"/><stop offset="1" stop-color="${a[1]}"/></linearGradient></defs><rect x="2" y="2" width="20" height="20" rx="5" fill="url(#${id})"/>${a[2]}</svg>`;
  }

  function folder(size = 48, color = 'var(--accent)') {
    return `<svg class="ico" width="${size}" height="${size}" viewBox="0 0 48 48" aria-hidden="true"><path d="M5 12a3 3 0 0 1 3-3h10l4 4h18a3 3 0 0 1 3 3v3H5z" fill="${color}" style="filter:brightness(.78)"/><path d="M5 17h38v20a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3z" fill="${color}"/><path d="M5 17h38v2H5z" fill="#fff" opacity=".18"/></svg>`;
  }

  function file(size = 48, ext = '') {
    const colors = { txt: '#90a4ae', md: '#42a5f5', js: '#fbc02d', json: '#fbc02d', html: '#ef6c00', css: '#1e88e5', py: '#43a047', sh: '#546e7a', png: '#26a69a', jpg: '#26a69a', jpeg: '#26a69a', gif: '#26a69a', svg: '#26a69a', webp: '#26a69a' };
    const c = colors[ext] || '#9e9e9e';
    const label = ext ? ext.slice(0, 4).toUpperCase() : '';
    return `<svg class="ico" width="${size}" height="${size}" viewBox="0 0 48 48" aria-hidden="true"><path d="M11 5h18l9 9v27a2 2 0 0 1-2 2H11a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" fill="#f5f5f5" stroke="#bdbdbd"/><path d="M29 5v7a2 2 0 0 0 2 2h7" fill="#e0e0e0" stroke="#bdbdbd"/><rect x="9" y="28" width="${label ? 24 : 0}" height="9" rx="2" fill="${c}"/><text x="21" y="35" font-size="7" font-family="sans-serif" font-weight="700" text-anchor="middle" fill="#fff">${label}</text></svg>`;
  }

  const U = 'fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"';
  const ui = {
    min: `<path ${U} d="M5 12h14"/>`,
    max: `<rect ${U} x="5.5" y="5.5" width="13" height="13" rx="1"/>`,
    restore: `<rect ${U} x="5.5" y="8.5" width="10" height="10" rx="1"/><path ${U} d="M8.5 5.5h10v10"/>`,
    close: `<path ${U} d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>`,
    lock: `<rect ${U} x="6" y="11" width="12" height="9" rx="1.5"/><path ${U} d="M8.5 11V8.5a3.5 3.5 0 0 1 7 0V11"/>`,
    logout: `<path ${U} d="M10 5H6v14h4M14 8l4 4-4 4M18 12H9"/>`,
    power: `<path ${U} d="M12 4v8M7.5 7a7 7 0 1 0 9 0"/>`,
    back: `<path ${U} d="M14.5 6l-6 6 6 6"/>`,
    fwd: `<path ${U} d="M9.5 6l6 6-6 6"/>`,
    up: `<path ${U} d="M6 14.5l6-6 6 6"/>`,
    reload: `<path ${U} d="M18 12a6 6 0 1 1-1.8-4.3M18 5v3.5h-3.5"/>`,
    homeS: `<path ${U} d="M5 11.5L12 6l7 5.5M7 10v8.5h10V10"/>`,
    ext: `<path ${U} d="M13 5h6v6M19 5l-8 8M17 14v4.5a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5H10"/>`,
    plus: `<path ${U} d="M12 6v12M6 12h12"/>`,
    newfolder: `<path ${U} d="M4 7.5h6l1.5 1.5H20v9H4z"/><path ${U} d="M12 11.5v4M10 13.5h4"/>`,
    newfile: `<path ${U} d="M7 4h7l4 4v12H7z"/><path ${U} d="M12.5 11v6M9.5 14h6"/>`,
    del: `<path ${U} d="M6 8h12M10 8V6h4v2M8 8l1 11h6l1-11"/>`,
    upload: `<path ${U} d="M12 16V5M7.5 9.5L12 5l4.5 4.5M5 19h14"/>`,
    download: `<path ${U} d="M12 5v11M7.5 11.5L12 16l4.5-4.5M5 19h14"/>`,
    rename: `<path ${U} d="M5 19h4l10-10-4-4L5 15z"/>`,
    send: `<path ${U} d="M5 12l14-7-5 14-2.5-5.5z"/>`,
    stop: `<rect x="7" y="7" width="10" height="10" rx="1.5" fill="currentColor"/>`,
    gear: `<circle ${U} cx="12" cy="12" r="3"/><path ${U} d="M12 3.5v2.5M12 18v2.5M3.5 12H6M18 12h2.5M6 6l1.8 1.8M16.2 16.2L18 18M6 18l1.8-1.8M16.2 7.8L18 6"/>`,
    trashS: `<path ${U} d="M6 8h12M10 8V6h4v2M8 8l1 11h6l1-11"/>`,
    search: `<circle ${U} cx="10.5" cy="10.5" r="5.5"/><path ${U} d="M15 15l4.5 4.5"/>`,
    sparkle: `<path fill="currentColor" d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path fill="currentColor" d="M18.5 15l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z"/>`,
    net: `<path ${U} d="M4 9.5a12 12 0 0 1 16 0M7 12.8a7.5 7.5 0 0 1 10 0M10 16a3 3 0 0 1 4 0"/><circle cx="12" cy="18.5" r="1" fill="currentColor"/>`,
    netOff: `<path ${U} d="M4 9.5a12 12 0 0 1 16 0M7 12.8a7.5 7.5 0 0 1 10 0M4.5 4.5l15 15"/>`,
    vol: `<path ${U} d="M5 10v4h3l4 3.5v-11L8 10z"/><path ${U} d="M15 9.5a3.5 3.5 0 0 1 0 5M17 7.5a6.5 6.5 0 0 1 0 9"/>`,
    copy: `<rect ${U} x="8" y="8" width="11" height="11" rx="1.5"/><path ${U} d="M5 15V6a1 1 0 0 1 1-1h9"/>`,
    play: `<path fill="currentColor" d="M8 5.5v13l10.5-6.5z"/>`,
    star: `<path ${U} d="M12 4.5l2.3 4.8 5.2.7-3.8 3.6.9 5.2L12 16.3l-4.6 2.5.9-5.2-3.8-3.6 5.2-.7z"/>`,
  };
  function uiIcon(name, size = 16) {
    return `<svg class="uic" width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true">${ui[name] || ''}</svg>`;
  }

  function logo(size = 28) {
    return `<svg class="logo" width="${size}" height="${size}" viewBox="0 0 48 48" aria-hidden="true"><path d="M6 8h22c8 0 14 6 14 14v12c0 3.3-2.7 6-6 6H12c-3.3 0-6-2.7-6-6z" fill="var(--accent, #35a854)"/><path d="M13 16v14c0 2 1 3 3 3h14c3 0 5-2 5-5v-6c0-2.5-2-4.5-4.5-4.5S26 19.5 26 22v6M19.5 33V22c0-2.5 2-4.5 4.5-4.5" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  }

  return { app: appIcon, folder, file, ui: uiIcon, logo };
})();
