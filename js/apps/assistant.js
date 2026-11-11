/* MintWeb OS — Mint AI assistant */
(() => {
  const SUGGESTIONS = ['Open the terminal', 'Switch to light theme', 'Change the wallpaper', 'Create a note called ideas', 'What is Linux Mint?', 'Write a bash script that backs up my Documents'];

  function launch(win, args) {
    let history = store.get('chat', []);
    let ctrl = null;
    const log = h('div', { class: 'chat-log', 'aria-live': 'polite' });
    const ta = h('textarea', { class: 'input', rows: 1, placeholder: 'Ask Mint AI anything, or tell it what to do…' });
    const sendB = h('button', { class: 'btn primary', title: 'Send (Enter)', html: Icons.ui('send', 16) });
    const modelLbl = h('span', { style: { fontSize: '12px', color: 'var(--muted)' } });
    const bar = h('div', { class: 'toolbar' },
      h('span', { html: Icons.app('ai', 20) }), h('strong', {}, 'Mint AI'), modelLbl, h('div', { class: 'spacer' }),
      h('button', { class: 'btn sm', html: Icons.ui('trashS', 14) + ' New chat', onclick: () => { ctrl && ctrl.abort(); history = []; store.set('chat', history); render(); } }),
      h('button', { class: 'btn icon', title: 'AI settings', html: Icons.ui('gear', 16), onclick: () => OS.launch('settings', { page: 'ai' }) }));
    win.body.append(h('div', { class: 'chat' }, bar, log, h('div', { class: 'chat-input' }, ta, sendB)));

    const updLabel = () => { const c = AI.config(); modelLbl.textContent = c.provider === 'builtin' ? '· offline helper' : `· ${AI.PRESETS[c.provider] ? AI.PRESETS[c.provider].label.split(' (')[0] : c.provider} · ${c.model}`; };
    updLabel(); OS.onSettings(updLabel);

    function bubble(role, content, done = true) {
      const b = h('div', { class: 'bubble' });
      const m = h('div', { class: 'msg ' + role }, role === 'user' ? h('div', { class: 'av' }, 'M') : h('div', { class: 'av', html: Icons.app('ai', 30) }), b);
      fill(b, role, content, done);
      log.append(m); log.scrollTop = log.scrollHeight;
      return b;
    }
    function fill(b, role, content, done, results) {
      if (role === 'user') { b.textContent = content; return; }
      const { html } = renderMarkdown(content);
      b.innerHTML = html || '';
      b.classList.toggle('typing', !done);
      $$('.codeblock', b).forEach(cb => {
        const lang = cb.dataset.lang; const code = cb.querySelector('code').textContent;
        const btns = cb.querySelector('.codebtns');
        btns.append(h('button', { class: 'btn', onclick: () => navigator.clipboard && navigator.clipboard.writeText(code) }, 'Copy'));
        if (/^(bash|sh|shell|console|zsh)$/.test(lang) && done) btns.append(h('button', { class: 'btn', onclick: () => code.split('\n').filter(l => l.trim() && !l.trim().startsWith('#')).forEach((l, i) => setTimeout(() => runInTerminal(l.replace(/^\$\s*/, '')), i * 400)) }, '▶ Run in Terminal'));
        if (done && lang !== 'action') btns.append(h('button', { class: 'btn', onclick: async () => { const p = await OS.fileDialog({ mode: 'save', name: 'snippet.' + ({ bash: 'sh', sh: 'sh', python: 'py', javascript: 'js', js: 'js', html: 'html', css: 'css', json: 'json' }[lang] || 'txt') }); if (p) { VFS.write(p, code); OS.notify(`Saved ${VFS.pretty(p)}`); } } }, 'Save'));
      });
      if (results) results.forEach(r => b.append(h('span', { class: 'act-chip' + (r.ok ? '' : ' bad') }, (r.ok ? '✔ ' : '✖ ') + r.text)));
    }
    function runInTerminal(cmd) {
      const t = WM.byApp('terminal')[0];
      if (t && t.data.run) { t.focus(); t.data.run(cmd); } else OS.launch('terminal', { run: cmd });
    }

    function render() {
      log.innerHTML = '';
      if (!history.length) {
        const chips = h('div', { class: 'chips' });
        SUGGESTIONS.forEach(s => chips.append(h('button', { class: 'chip', onclick: () => send(s) }, s)));
        const c = AI.config();
        log.append(h('div', { class: 'chat-hero' }, h('div', { html: Icons.app('ai', 64) }), h('h2', {}, 'How can I help?'),
          h('div', {}, 'I can answer questions, write and explain code, and control your desktop — open apps, create files, change themes and more.'),
          c.provider === 'builtin' ? h('div', { class: 'note' }, 'Offline helper mode. For full AI, connect a free local model (Ollama) or any OpenAI-compatible API in ', h('a', { href: '#', onclick: e => { e.preventDefault(); OS.launch('settings', { page: 'ai' }); } }, 'Settings → AI Assistant'), '.') : null,
          chips));
        return;
      }
      history.forEach(m => bubble(m.role, m.content, true));
    }

    async function send(text) {
      text = (text ?? ta.value).trim();
      if (!text) return;
      if (ctrl) { ctrl.abort(); }
      ta.value = ''; autosize();
      if (!history.length) log.innerHTML = '';
      history.push({ role: 'user', content: text }); bubble('user', text);
      const b = bubble('assistant', '', false);
      ctrl = new AbortController();
      sendB.innerHTML = Icons.ui('stop', 16); sendB.title = 'Stop';
      let out = '';
      try {
        const msgs = [{ role: 'system', content: AI.systemPrompt() }, ...history.slice(-20)];
        await AI.chat(msgs, { signal: ctrl.signal, onToken: t => { out += t; fill(b, 'assistant', out, false); log.scrollTop = log.scrollHeight; } });
        const results = [];
        if (AI.config().allowActions) for (const a of AI.parseActions(out)) { try { results.push({ ok: true, text: OS.runAction(a) || a.action }); } catch (e) { results.push({ ok: false, text: e.message }); } }
        fill(b, 'assistant', out || '_(no response)_', true, results);
        history.push({ role: 'assistant', content: out });
      } catch (e) {
        if (e.name === 'AbortError') { fill(b, 'assistant', out + '\n\n_(stopped)_', true); if (out) history.push({ role: 'assistant', content: out }); }
        else { fill(b, 'assistant', `⚠️ **${e.message}**\n\nOpen **Settings → AI Assistant** to check your configuration, or switch to the built-in helper.`, true); history.pop(); }
      } finally {
        ctrl = null; sendB.innerHTML = Icons.ui('send', 16); sendB.title = 'Send (Enter)';
        store.set('chat', history.slice(-60)); log.scrollTop = log.scrollHeight;
      }
    }
    const autosize = () => { ta.style.height = 'auto'; ta.style.height = Math.min(160, ta.scrollHeight) + 'px'; };
    ta.addEventListener('input', autosize);
    ta.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } });
    sendB.onclick = () => (ctrl ? ctrl.abort() : send());
    win.onClose(() => ctrl && ctrl.abort());
    win.data.send = send;
    render();
    if (args.prompt) send(args.prompt); else setTimeout(() => ta.focus(), 50);
  }

  OS.register({
    id: 'assistant', name: 'Mint AI', icon: 'ai', category: 'Accessories', description: 'AI assistant that can chat and control your desktop', keywords: ['ai', 'assistant', 'chat', 'gpt', 'copilot', 'llm', 'ask'],
    singleton: true, window: { width: 560, height: 620 }, launch,
    reopen(win, args) { if (args.prompt && win.data.send) win.data.send(args.prompt); },
  });
})();
