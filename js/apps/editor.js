/* MintWeb OS — Text Editor (xed-style) with AI writing tools */
(() => {
  const AI_TOOLS = [
    ['improve', 'Improve writing', 'Rewrite the following text to be clearer and more polished. Keep the meaning and language. Return only the rewritten text.', 'replace'],
    ['fix', 'Fix spelling & grammar', 'Fix spelling and grammar in the following text. Return only the corrected text.', 'replace'],
    ['continue', 'Continue writing', 'Continue writing the following text naturally for one or two paragraphs. Return only the continuation.', 'append'],
    ['summarize', 'Summarize', 'Summarize the following text in a few bullet points.', 'panel'],
    ['explain', 'Explain code', 'Explain what the following code does, step by step, concisely.', 'panel'],
    ['translate', 'Translate to English', 'Translate the following text to English. Return only the translation.', 'replace'],
  ];

  function launch(win, args) {
    let path = args.path ? VFS.norm(args.path) : null;
    let saved = '';
    const ta = h('textarea', { class: 'editor-area', spellcheck: 'false', 'aria-label': 'Document' });
    const status = h('div', { class: 'statusbar' });
    const panelBody = h('div', { class: 'ai-panel-body' });
    let panelText = '';
    const panel = h('div', { class: 'ai-panel hidden' },
      h('div', { class: 'ai-panel-head' }, h('span', { html: Icons.ui('sparkle', 14) }), h('span', { style: { flex: 1 } }, 'Mint AI'),
        h('button', { class: 'btn sm', onclick: () => insertAt(panelText) }, 'Insert'),
        h('button', { class: 'btn sm', onclick: () => navigator.clipboard && navigator.clipboard.writeText(panelText) }, 'Copy'),
        h('button', { class: 'btn icon sm', html: Icons.ui('close', 12), onclick: () => panel.classList.add('hidden') })),
      panelBody);
    const aiMenu = h('div', { class: 'dropdown-menu hidden' });
    let busy = null;
    AI_TOOLS.forEach(([id, label, , mode]) => aiMenu.append(h('button', { class: 'ctx-item', onclick: () => { aiMenu.classList.add('hidden'); runAI(id); } }, h('span', {}, label), h('span', { class: 'ctx-hint' }, mode === 'panel' ? '' : mode))));
    aiMenu.append(h('div', { class: 'ctx-sep' }), h('button', { class: 'ctx-item', onclick: async () => { aiMenu.classList.add('hidden'); const q = await OS.prompt('Ask AI about this document', '', { label: 'Instruction (e.g. "make it a formal email")' }); if (q) runAI('custom', q); } }, 'Custom instruction…'));
    const aiBtn = h('button', { class: 'btn', html: Icons.ui('sparkle', 14) + ' AI', title: 'AI writing tools', onclick: e => { e.stopPropagation(); aiMenu.classList.toggle('hidden'); } });
    const wrapB = h('button', { class: 'btn icon', title: 'Toggle word wrap', html: '↵', onclick: () => { ta.classList.toggle('nowrap'); } });
    const bar = h('div', { class: 'toolbar' },
      h('button', { class: 'btn icon', title: 'New (Ctrl+N)', html: Icons.ui('newfile', 16), onclick: () => OS.launch('editor') }),
      h('button', { class: 'btn icon', title: 'Open (Ctrl+O)', html: Icons.ui('newfolder', 16), onclick: open }),
      h('button', { class: 'btn', title: 'Save (Ctrl+S)', onclick: () => save() }, 'Save'),
      h('button', { class: 'btn icon', title: 'Download to my computer', html: Icons.ui('download', 16), onclick: () => OS.download(path ? VFS.basename(path) : 'Untitled.txt', ta.value) }),
      wrapB, h('div', { class: 'spacer' }), h('div', { class: 'dropdown' }, aiBtn, aiMenu));
    win.body.append(bar, h('div', { class: 'editor-wrap' }, ta, panel), status);
    win.el.addEventListener('pointerdown', e => { if (!e.target.closest('.dropdown')) aiMenu.classList.add('hidden'); });

    const dirty = () => ta.value !== saved;
    function title() { win.setTitle(`${dirty() ? '*' : ''}${path ? VFS.basename(path) : 'Untitled Document'} - Text Editor`); }
    function updStatus() {
      const pos = ta.selectionStart; const before = ta.value.slice(0, pos);
      const ln = before.split('\n').length, col = pos - before.lastIndexOf('\n');
      status.textContent = '';
      status.append(h('span', {}, path ? VFS.pretty(path) : 'Unsaved'), h('span', { style: { marginLeft: 'auto' } }, `Ln ${ln}, Col ${col}`), h('span', {}, `${ta.value.length} chars`), h('span', {}, VFS.ext(path || '') || 'Plain Text'));
    }
    function load(p) {
      try { const c = VFS.read(p); if (/^data:/.test(c)) { OS.openPath(p); win.close(true); return; } path = p; ta.value = c; saved = c; } catch (e) { OS.notify(e.message, { type: 'error' }); }
      title(); updStatus();
    }
    async function save(as) {
      if (!path || as) {
        const p = await OS.fileDialog({ mode: 'save', dir: path ? VFS.split(path)[0] : VFS.HOME + '/Documents', name: path ? VFS.basename(path) : 'Untitled.txt' });
        if (!p) return false;
        if (VFS.exists(p) && p !== path && !(await OS.confirm('Replace file?', `${VFS.basename(p)} already exists. Replace it?`, { okLabel: 'Replace', danger: true }))) return false;
        path = p;
      }
      try { VFS.write(path, ta.value); saved = ta.value; title(); updStatus(); return true; } catch (e) { OS.notify(e.message, { type: 'error' }); return false; }
    }
    async function open() { const p = await OS.fileDialog({ mode: 'open', dir: path ? VFS.split(path)[0] : VFS.HOME + '/Documents' }); if (p) { if (dirty() || path) OS.launch('editor', { path: p }); else load(p); } }
    function insertAt(text) { const s = ta.selectionEnd; ta.setRangeText(text, s, s, 'end'); ta.dispatchEvent(new Event('input')); ta.focus(); }

    async function runAI(id, custom) {
      if (busy) { busy.abort(); }
      const tool = AI_TOOLS.find(t => t[0] === id);
      const s = ta.selectionStart, e = ta.selectionEnd;
      const hasSel = e > s;
      const text = hasSel ? ta.value.slice(s, e) : ta.value;
      if (!text.trim()) { OS.notify('Write or select some text first.'); return; }
      const mode = custom ? 'panel' : tool[3];
      const instr = custom || tool[2];
      busy = new AbortController();
      aiBtn.disabled = true; aiBtn.innerHTML = Icons.ui('sparkle', 14) + ' Thinking…';
      panel.classList.remove('hidden'); panelText = ''; panelBody.textContent = ''; panelBody.classList.add('typing');
      try {
        const out = await AI.chat([
          { role: 'system', content: 'You are a precise writing and coding assistant built into the MintWeb OS text editor. Follow the instruction exactly. Do not add preambles.' },
          { role: 'user', content: `${instr}\n\n---\n${text.slice(0, 16000)}` },
        ], { signal: busy.signal, onToken: t => { panelText += t; panelBody.textContent = panelText; panelBody.scrollTop = panelBody.scrollHeight; } });
        panelText = out.trim();
        if (AI.config().provider === 'builtin') { panelBody.textContent = panelText; return; }
        if (mode === 'replace') { hasSel ? ta.setRangeText(panelText, s, e, 'select') : (ta.value = panelText); ta.dispatchEvent(new Event('input')); }
        else if (mode === 'append') { const end = hasSel ? e : ta.value.length; ta.setRangeText((ta.value[end - 1] === '\n' ? '' : '\n') + panelText, end, end, 'end'); ta.dispatchEvent(new Event('input')); }
        if (mode !== 'panel') panelBody.textContent = '✔ Applied. Press Ctrl+Z to undo.\n\n' + panelText;
      } catch (err) { if (err.name !== 'AbortError') panelBody.textContent = '⚠ ' + err.message; }
      finally { panelBody.classList.remove('typing'); aiBtn.disabled = false; aiBtn.innerHTML = Icons.ui('sparkle', 14) + ' AI'; busy = null; }
    }

    ta.addEventListener('input', () => { title(); updStatus(); });
    ta.addEventListener('click', updStatus); ta.addEventListener('keyup', updStatus);
    ta.addEventListener('keydown', e => {
      const k = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && k === 's') { e.preventDefault(); save(e.shiftKey); }
      else if ((e.ctrlKey || e.metaKey) && k === 'o') { e.preventDefault(); open(); }
      else if (e.ctrlKey && e.altKey && k === 'n') { e.preventDefault(); OS.launch('editor'); }
      else if (e.key === 'Tab') { e.preventDefault(); ta.setRangeText('    ', ta.selectionStart, ta.selectionEnd, 'end'); ta.dispatchEvent(new Event('input')); }
    });
    win.beforeClose = async () => {
      if (!dirty()) return true;
      const r = await OS.modal('Save changes?', h('div', { class: 'modal-body' }, h('p', {}, `Save changes to "${path ? VFS.basename(path) : 'Untitled Document'}" before closing?`)), [
        { label: 'Cancel', value: () => 'cancel' }, { label: 'Close without Saving', danger: true, value: () => 'discard' }, { label: 'Save', primary: true, value: () => 'save' },
      ]);
      if (r === 'discard') return true;
      if (r === 'save') return save();
      return false;
    };
    win.onClose(() => busy && busy.abort());
    if (path) { if (!VFS.exists(path)) VFS.write(path, ''); load(path); } else { title(); updStatus(); }
    setTimeout(() => ta.focus(), 50);
  }

  OS.register({ id: 'editor', name: 'Text Editor', icon: 'editor', category: 'Accessories', description: 'Edit text files, with AI writing tools', keywords: ['xed', 'gedit', 'notepad', 'text', 'write', 'nano'], window: { width: 760, height: 520 }, launch });
})();
