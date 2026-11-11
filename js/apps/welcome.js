/* MintWeb OS — Welcome Screen */
(() => {
  OS.register({ id: 'welcome', name: 'Welcome Screen', icon: 'linux', category: 'Preferences', description: 'Introduction to MintWeb OS', keywords: ['welcome', 'intro', 'help', 'tour'], singleton: true, window: { width: 760, height: 560 },
    launch(win) {
      const main = h('div', { class: 's-main' });
      win.body.append(h('div', { class: 'welcome' }, main));
      const step = (n, title, sub, ...btns) => h('div', { class: 'step' }, h('div', { class: 'num' }, n), h('div', { class: 's-lbl' }, h('strong', {}, title), h('small', {}, sub)), ...btns);
      const b = (label, fn, primary) => h('button', { class: 'btn' + (primary ? ' primary' : ''), onclick: fn }, label);
      const chk = h('input', { type: 'checkbox' }); chk.checked = store.get('showWelcome', true); chk.onchange = () => store.set('showWelcome', chk.checked);
      main.append(
        h('div', { class: 'welcome-hero' }, h('div', { html: Icons.logo(72) }), h('div', {}, h('h1', {}, 'Welcome to MintWeb OS'), h('p', {}, 'A free, AI-powered desktop inspired by Linux Mint 22.3 “Zena” — running right in your browser on Windows, Linux, macOS or ChromeOS.'))),
        step(1, 'Choose your style', 'Light or dark, with your favourite accent color.', b('Light', () => OS.setSetting({ theme: 'light' })), b('Dark', () => OS.setSetting({ theme: 'dark' })), b('More…', () => OS.launch('settings', { page: 'themes' }))),
        step(2, 'Meet Mint AI', 'Chat, write, code — or just say “open the terminal”.', b('Open Mint AI', () => OS.launch('assistant'), true)),
        step(3, 'Connect a free AI model (optional)', 'Use Ollama locally for private AI, or any OpenAI-compatible API.', b('AI settings', () => OS.launch('settings', { page: 'ai' }))),
        step(4, 'Install free software', 'Add open-source web apps like Excalidraw, CyberChef or a real Linux VM.', b('Software Manager', () => OS.launch('software'))),
        step(5, 'Try the terminal', 'Type neofetch, help, or  ai explain pipes in bash', b('Terminal', () => OS.launch('terminal', { run: 'neofetch' }))),
        step(6, 'Install as an app', 'Add MintWeb OS to your desktop/start menu as a standalone app (works offline).', b('Install', async () => { if (!(await ShellUI.install())) OS.notify('Use your browser menu → “Install app” (Chrome/Edge) or “Add to Home screen”.', { title: 'Install' }); })),
        h('label', { style: { display: 'flex', alignItems: 'center', gap: '8px', marginTop: '14px' } }, chk, 'Show this dialog at startup'));
    } });
})();
