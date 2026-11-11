/* MintWeb OS — System Settings */
(() => {
  const PAGES = [['themes', 'Themes', 'settings'], ['backgrounds', 'Backgrounds', 'viewer'], ['ai', 'AI Assistant', 'ai'], ['panel', 'Desktop & Panel', 'computer'], ['storage', 'Storage & Backup', 'files'], ['about', 'About', 'linux']];

  function launch(win, args) {
    let page = args.page || 'themes';
    const side = h('div', { class: 's-side' }), main = h('div', { class: 's-main' });
    win.body.append(h('div', { class: 'settings' }, side, main));
    const row = (label, sub, ctrl) => h('div', { class: 's-row' }, h('div', { class: 's-lbl' }, h('span', {}, label), sub ? h('small', {}, sub) : null), ctrl);
    const toggle = (val, fn) => { const i = h('input', { type: 'checkbox' }); i.checked = val; i.onchange = () => fn(i.checked); return h('label', { class: 'switch' }, i, h('span')); };

    function render() {
      side.innerHTML = '';
      PAGES.forEach(([id, label, ic]) => side.append(h('button', { class: 'f-place' + (page === id ? ' on' : ''), onclick: () => { page = id; render(); }, html: Icons.app(ic, 18) + `<span>${label}</span>` })));
      main.innerHTML = ''; main.scrollTop = 0;
      ({ themes, backgrounds, ai, panel, storage, about })[page]();
    }

    function themes() {
      const s = OS.settings;
      const card = (mode, label, a, b) => h('button', { class: 'theme-card' + (s.theme === mode ? ' on' : ''), onclick: () => { OS.setSetting({ theme: mode }); render(); } },
        h('div', { class: 'tp', style: { background: a } }, h('i', { style: { background: b } })), h('div', { style: { background: b, color: mode === 'dark' ? '#eee' : '#222' } }, label));
      const sw = h('div', { class: 'swatches' });
      Object.entries(OS.ACCENTS).forEach(([k, c]) => sw.append(h('button', { class: 'swatch' + (s.accent === k ? ' on' : ''), title: k, 'aria-label': k, style: { background: c }, onclick: () => { OS.setSetting({ accent: k }); render(); } })));
      main.append(h('h2', {}, 'Themes'), h('h3', {}, 'Style'), h('div', { class: 'theme-cards' }, card('light', 'Mint-Y Light', '#f7f7f7', '#e4e4e4'), card('dark', 'Mint-Y Dark', '#2f2f2f', '#232323')),
        h('h3', {}, 'Accent color'), sw);
    }

    function backgrounds() {
      const s = OS.settings;
      const grid = h('div', { class: 'wp-grid' });
      Object.entries(OS.WALLPAPERS).forEach(([id, w]) => grid.append(h('div', { class: 'wp' + (s.wallpaper === id ? ' on' : ''), style: { background: w.css }, onclick: () => { OS.setSetting({ wallpaper: id }); render(); } }, h('span', {}, w.name))));
      if (s.customWallpaper) grid.append(h('div', { class: 'wp' + (s.wallpaper === 'custom' ? ' on' : ''), style: { background: `center/cover url("${s.customWallpaper}")` }, onclick: () => { OS.setSetting({ wallpaper: 'custom' }); render(); } }, h('span', {}, 'Custom')));
      const url = h('input', { class: 'input', placeholder: 'https://example.com/image.jpg' });
      const file = h('input', { type: 'file', accept: 'image/*', style: { display: 'none' }, onchange: () => {
        const f = file.files[0]; if (!f) return;
        if (f.size > 2.5 * 1024 * 1024) { OS.notify('Image too large (max 2.5 MB)', { type: 'error' }); return; }
        const r = new FileReader(); r.onload = () => { if (!store.set('probe', 1)) return; OS.setSetting({ customWallpaper: r.result, wallpaper: 'custom' }); render(); }; r.readAsDataURL(f);
      } });
      main.append(h('h2', {}, 'Backgrounds'), grid, h('h3', {}, 'Custom image'),
        h('div', { class: 'fd-name' }, url, h('button', { class: 'btn', onclick: () => { if (url.value.trim()) { OS.setSetting({ customWallpaper: url.value.trim(), wallpaper: 'custom' }); render(); } } }, 'Use URL'), h('button', { class: 'btn', html: Icons.ui('upload', 14) + ' Upload', onclick: () => file.click() })), file);
    }

    function ai() {
      const c = AI.config();
      const sel = h('select', { class: 'input' });
      Object.entries(AI.PRESETS).forEach(([k, p]) => sel.append(h('option', { value: k, selected: c.provider === k }, p.label)));
      const base = h('input', { class: 'input', value: c.baseUrl, placeholder: 'https://…/v1' });
      const model = h('input', { class: 'input', value: c.model, list: 'mw-models' });
      const models = h('datalist', { id: 'mw-models' });
      const key = h('input', { class: 'input', type: 'password', value: c.apiKey, placeholder: 'sk-… (stored only in this browser)', autocomplete: 'off' });
      const temp = h('input', { type: 'range', min: 0, max: 1.5, step: 0.1, value: c.temperature });
      const result = h('div');
      const fields = h('div');
      const sync = () => {
        const p = sel.value;
        fields.style.display = p === 'builtin' ? 'none' : '';
      };
      sel.onchange = () => { const p = AI.PRESETS[sel.value]; base.value = p.baseUrl; model.value = p.model; sync(); };
      const save = () => { AI.setConfig({ provider: sel.value, baseUrl: base.value.trim(), model: model.value.trim(), apiKey: key.value.trim(), temperature: +temp.value }); OS.setSetting({}); };
      fields.append(
        h('div', { class: 's-field' }, h('label', {}, 'Server URL (OpenAI-compatible)'), base),
        h('div', { class: 's-field' }, h('label', {}, 'Model'), model, models),
        h('div', { class: 's-field' }, h('label', {}, 'API key (leave empty for local servers)'), key),
        h('div', { class: 's-field' }, h('label', {}, 'Creativity (temperature)'), temp));
      main.append(h('h2', {}, 'AI Assistant'),
        h('div', { class: 'note', html: 'Mint AI works with <b>any OpenAI-compatible API</b>. For a fully free and private setup, install <a href="https://ollama.com" target="_blank" rel="noopener">Ollama</a>, run <code>ollama pull llama3.2</code>, then start it with <code>OLLAMA_ORIGINS="*" ollama serve</code> (on Windows set the <code>OLLAMA_ORIGINS</code> environment variable to <code>*</code> and restart Ollama). Your API key never leaves this browser except to the server you choose.' }),
        h('div', { class: 's-field' }, h('label', {}, 'Provider'), sel), fields,
        row('Allow AI to control the desktop', 'Open apps, create files, change themes, run terminal commands', toggle(c.allowActions, v => AI.setConfig({ allowActions: v }))),
        h('div', { style: { display: 'flex', gap: '8px', marginTop: '12px' } },
          h('button', { class: 'btn primary', onclick: () => { save(); OS.notify('AI settings saved', { title: 'Mint AI' }); } }, 'Save'),
          h('button', { class: 'btn', onclick: async () => {
            save(); result.className = 'note'; result.textContent = 'Testing…';
            try { const ms = await AI.listModels().catch(() => []); models.innerHTML = ''; ms.forEach(m => models.append(h('option', { value: m })));
              const r = await AI.ask('Reply with exactly: MintWeb AI is ready.', { system: 'You are a test endpoint.' });
              result.textContent = `✔ Connected. Model replied: "${r.trim().slice(0, 120)}"${ms.length ? ` — ${ms.length} models available (see suggestions in the Model field)` : ''}`;
            } catch (e) { result.textContent = '✖ ' + e.message; }
          } }, 'Test connection')),
        result);
      sync();
    }

    function panel() {
      const s = OS.settings;
      main.append(h('h2', {}, 'Desktop & Panel'),
        row('Show desktop icons', 'Computer, Home, Trash and files in ~/Desktop', toggle(s.desktopIcons, v => OS.setSetting({ desktopIcons: v }))),
        row('Show Welcome Screen at startup', '', toggle(store.get('showWelcome', true), v => store.set('showWelcome', v))),
        row('Reset panel launchers', 'Restore the default pinned apps', h('button', { class: 'btn', onclick: () => OS.setSetting({ launchers: ['browser', 'files', 'terminal', 'assistant'] }) }, 'Reset')),
        h('h3', {}, 'Keyboard shortcuts'),
        h('div', { class: 'card' }, h('div', { class: 'kv', html: [['Super / Alt+F1 / Ctrl+Esc', 'Open menu'], ['Ctrl+Alt+T', 'Terminal'], ['Ctrl+Alt+A', 'Mint AI'], ['Ctrl+Alt+E', 'Files'], ['Ctrl+Alt+D', 'Show desktop'], ['Ctrl+Alt+L', 'Lock screen'], ['Ctrl+Alt+Q', 'Close window'], ['Drag title to edge', 'Snap / maximize']].map(([k, v]) => `<b>${k}</b><span>${v}</span>`).join('') })));
    }

    async function storage() {
      const used = VFS.usage();
      const est = navigator.storage && navigator.storage.estimate ? await navigator.storage.estimate().catch(() => null) : null;
      const imp = h('input', { type: 'file', accept: '.json,application/json', style: { display: 'none' }, onchange: () => {
        const f = imp.files[0]; if (!f) return; const r = new FileReader();
        r.onload = () => { try { const j = JSON.parse(r.result); VFS.importJSON(JSON.stringify(j.fs || j)); if (j.settings) store.set('settings', j.settings); OS.notify('Backup restored. Reloading…'); setTimeout(() => location.reload(), 800); } catch (e) { OS.notify('Invalid backup: ' + e.message, { type: 'error' }); } };
        r.readAsText(f);
      } });
      main.append(h('h2', {}, 'Storage & Backup'),
        h('div', { class: 'card' }, h('div', { class: 'kv' }, h('b', {}, 'Your files'), h('span', {}, fmtBytes(used)), h('b', {}, 'Browser quota'), h('span', {}, est ? `${fmtBytes(est.usage || 0)} of ${fmtBytes(est.quota || 0)}` : 'n/a')), h('div', { class: 'bar' }, h('i', { style: { width: Math.min(100, used / (5 * 1024 * 1024) * 100) + '%' } }))),
        h('p', { style: { color: 'var(--muted)' } }, 'Everything is stored locally in this browser (localStorage, ~5 MB). Back up regularly to move your desktop to another computer or browser.'),
        row('Back up', 'Download your files and settings as a JSON file', h('button', { class: 'btn', html: Icons.ui('download', 14) + ' Export', onclick: () => OS.download(`mintweb-backup-${new Date().toISOString().slice(0, 10)}.json`, 'data:application/json;charset=utf-8,' + encodeURIComponent(JSON.stringify({ fs: JSON.parse(VFS.exportJSON()), settings: OS.settings }))) })),
        row('Restore', 'Import a backup file', h('button', { class: 'btn', html: Icons.ui('upload', 14) + ' Import', onclick: () => imp.click() })), imp,
        row('Factory reset', 'Erase all files, settings and chat history', h('button', { class: 'btn danger', onclick: async () => { if (await OS.confirm('Factory reset?', 'This permanently erases everything stored by MintWeb OS in this browser.', { okLabel: 'Erase everything', danger: true })) { Object.keys(localStorage).filter(k => k.startsWith('mintweb.')).forEach(k => localStorage.removeItem(k)); location.reload(); } } }, 'Reset')));
    }

    function about() {
      main.append(h('div', { class: 'welcome-hero' }, h('div', { html: Icons.logo(64) }), h('div', {}, h('h1', {}, 'MintWeb OS 1.0'), h('p', {}, 'Inspired by Linux Mint 22.3 “Zena” · Cinnamon'))),
        h('div', { class: 'card' }, h('div', { class: 'kv' },
          h('b', {}, 'Host'), h('span', {}, `${SysInfo.browserName()} on ${SysInfo.hostOS()}`),
          h('b', {}, 'Display'), h('span', {}, `${screen.width}×${screen.height}`),
          h('b', {}, 'Processor'), h('span', {}, `${navigator.hardwareConcurrency || '?'} threads`),
          h('b', {}, 'AI engine'), h('span', {}, AI.label()),
          h('b', {}, 'License'), h('span', {}, 'GNU GPL v3 or later — free software'))),
        h('p', { style: { color: 'var(--muted)', lineHeight: 1.6 } }, 'MintWeb OS is an independent free-software project that recreates the look and feel of the Linux Mint Cinnamon desktop in the browser. It is not affiliated with or endorsed by the Linux Mint project. “Linux Mint” is a trademark of its respective owners.'),
        h('div', { style: { display: 'flex', gap: '8px' } },
          h('button', { class: 'btn', onclick: async () => { if (!(await ShellUI.install())) OS.notify('Use your browser menu → "Install app" / "Add to Home screen" to install MintWeb OS.', { title: 'Install' }); } }, 'Install as app'),
          h('button', { class: 'btn', onclick: () => OS.launch('browser', { url: 'https://linuxmint.com' }) }, 'Visit linuxmint.com')));
    }

    win.data.go = p => { page = p; render(); };
    render();
  }

  OS.register({ id: 'settings', name: 'System Settings', icon: 'settings', category: 'Preferences', description: 'Themes, backgrounds, AI and more', keywords: ['settings', 'preferences', 'control', 'config', 'theme', 'wallpaper'], singleton: true, window: { width: 820, height: 560 }, launch, reopen(win, args) { if (args.page) win.data.go(args.page); } });
})();
