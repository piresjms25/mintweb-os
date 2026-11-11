/* MintWeb OS — Files (Nemo-style file manager) */
const FilesApp = (() => {
  let clipboard = null; // { paths, cut }
  const TEXT_RE = /^(text\/|application\/(json|xml|javascript|x-sh|x-yaml|toml))/;
  const TEXT_EXT = /\.(txt|md|markdown|js|mjs|ts|json|html?|css|py|sh|bash|c|h|cpp|java|rs|go|rb|php|xml|ya?ml|toml|ini|cfg|conf|csv|log|svg|sql)$/i;

  function upload(fileList, dir) {
    for (const f of fileList) {
      if (f.size > 3 * 1024 * 1024) { OS.notify(`${f.name} is too large (max 3 MB in browser storage)`, { type: 'error' }); continue; }
      const r = new FileReader();
      const asText = TEXT_RE.test(f.type) || TEXT_EXT.test(f.name);
      r.onload = () => {
        try { VFS.write(VFS.join(dir, VFS.uniqueName(dir, f.name)), r.result); OS.notify(`Uploaded ${f.name} to ${VFS.pretty(dir)}`, { icon: 'files' }); }
        catch (e) { OS.notify(e.message, { type: 'error' }); }
      };
      asText ? r.readAsText(f) : r.readAsDataURL(f);
    }
  }

  function pickUpload(dir) {
    const inp = h('input', { type: 'file', multiple: true, style: { display: 'none' } });
    inp.onchange = () => { upload(inp.files, dir); inp.remove(); };
    document.body.append(inp); inp.click();
  }

  function launch(win, args) {
    let cur = args.path && VFS.isDir(VFS.norm(args.path)) ? VFS.norm(args.path) : VFS.HOME;
    const hist = [cur]; let hi = 0;
    const sel = new Set();
    let showHidden = false, listView = false, filter = '';

    const btn = (icon, title, fn) => h('button', { class: 'btn icon', title, 'aria-label': title, html: Icons.ui(icon, 16), onclick: fn });
    const backB = btn('back', 'Back', () => { if (hi > 0) { hi--; go(hist[hi], true); } });
    const fwdB = btn('fwd', 'Forward', () => { if (hi < hist.length - 1) { hi++; go(hist[hi], true); } });
    const upB = btn('up', 'Parent folder', () => go(VFS.split(cur)[0]));
    const crumbs = h('div', { class: 'f-crumbs' });
    const searchIn = h('input', { class: 'input', placeholder: 'Filter…', style: { width: '140px', padding: '5px 8px' }, oninput: () => { filter = searchIn.value.toLowerCase(); render(); } });
    const viewB = btn('max', 'Toggle list/icon view', () => { listView = !listView; render(); });
    const toolbar = h('div', { class: 'toolbar' }, backB, fwdB, upB, crumbs, searchIn,
      btn('newfolder', 'New folder', () => ShellUI.newItem(cur, 'dir')),
      btn('newfile', 'New document', () => ShellUI.newItem(cur, 'file')),
      btn('upload', 'Upload from your computer', () => pickUpload(cur)),
      btn('download', 'Download selected to your computer', () => downloadSel()),
      btn('del', 'Move selected to Trash', () => trashSel()), viewB);
    const side = h('div', { class: 'f-side' });
    const grid = h('div', { class: 'f-grid', tabindex: 0 });
    const status = h('div', { class: 'statusbar' });
    win.body.append(toolbar, h('div', { class: 'files' }, side, h('div', { class: 'f-main' }, grid, status)));

    const places = [
      ['Home', VFS.HOME, 'home'], ['Desktop', VFS.HOME + '/Desktop'], ['Documents', VFS.HOME + '/Documents'], ['Downloads', VFS.HOME + '/Downloads'],
      ['Music', VFS.HOME + '/Music'], ['Pictures', VFS.HOME + '/Pictures'], ['Videos', VFS.HOME + '/Videos'], ['Trash', VFS.TRASH, 'trash'],
    ];
    function renderSide() {
      side.innerHTML = '';
      side.append(h('div', { class: 'm-head' }, 'My Computer'));
      for (const [name, path, ic] of places) {
        if (!VFS.isDir(path)) continue;
        side.append(h('button', { class: 'f-place' + (cur === path ? ' on' : ''), onclick: () => go(path), html: (ic ? Icons.app(ic, 18) : Icons.folder(18)) + `<span>${esc(name)}</span>` }));
      }
      side.append(h('button', { class: 'f-place' + (cur === '/' ? ' on' : ''), onclick: () => go('/'), html: Icons.app('computer', 18) + '<span>File System</span>' }));
    }

    function go(path, fromHist) {
      path = VFS.norm(path);
      if (!VFS.isDir(path)) { OS.notify(`${VFS.pretty(path)} is not a folder`, { type: 'error' }); return; }
      cur = path; sel.clear(); filter = ''; searchIn.value = '';
      if (!fromHist) { hist.splice(hi + 1); hist.push(path); hi = hist.length - 1; }
      render();
    }

    function openItem(e) { e.type === 'dir' ? go(e.path) : OS.openPath(e.path); }
    function selected() { return [...sel].filter(VFS.exists); }
    function trashSel() {
      const s = selected(); if (!s.length) return;
      try { s.forEach(p => (cur.startsWith(VFS.TRASH) ? VFS.rm(p, { recursive: true }) : VFS.trash(p))); } catch (e) { OS.notify(e.message, { type: 'error' }); }
    }
    function downloadSel() {
      const s = selected().filter(p => !VFS.isDir(p));
      if (!s.length) { OS.notify('Select one or more files to download'); return; }
      s.forEach(p => OS.download(VFS.basename(p), VFS.read(p)));
    }
    async function rename(p) {
      const old = VFS.basename(p);
      const n = await OS.prompt('Rename', old);
      if (n && n !== old) try { VFS.mv(p, VFS.join(VFS.split(p)[0], n)); } catch (e) { OS.notify(e.message, { type: 'error' }); }
    }
    function paste() {
      if (!clipboard) return;
      try {
        for (const p of clipboard.paths) {
          if (!VFS.exists(p)) continue;
          const name = VFS.uniqueName(cur, VFS.basename(p));
          if (clipboard.cut) VFS.mv(p, VFS.join(cur, name)); else VFS.cp(p, VFS.join(cur, name));
        }
        if (clipboard.cut) clipboard = null;
      } catch (e) { OS.notify(e.message, { type: 'error' }); }
    }

    function itemMenu(e, ev) {
      if (!sel.has(e.path)) { sel.clear(); sel.add(e.path); paintSel(); }
      const inTrash = cur.startsWith(VFS.TRASH);
      const items = [
        { label: 'Open', action: () => openItem(e) },
        e.type === 'dir' ? { label: 'Open in Terminal', icon: 'play', action: () => OS.launch('terminal', { cwd: e.path }) } : { label: 'Open with Text Editor', icon: 'rename', action: () => OS.launch('editor', { path: e.path }) },
        { sep: true },
        { label: 'Cut', hint: 'Ctrl+X', action: () => (clipboard = { paths: selected(), cut: true }) },
        { label: 'Copy', icon: 'copy', hint: 'Ctrl+C', action: () => (clipboard = { paths: selected(), cut: false }) },
        { label: 'Rename…', icon: 'rename', hint: 'F2', action: () => rename(e.path) },
        e.type === 'file' ? { label: 'Download to my computer', icon: 'download', action: downloadSel } : null,
        e.type === 'file' ? { label: 'Ask Mint AI about this file', icon: 'sparkle', action: () => {
          const c = VFS.read(e.path);
          OS.launch('assistant', { prompt: /^data:/.test(c) ? `I have a binary file named "${e.name}". What kind of file is it likely to be and how can I use it?` : `Summarize and explain the file "${e.name}":\n\n\`\`\`\n${c.slice(0, 8000)}\n\`\`\`` });
        } } : null,
        { sep: true },
        inTrash ? { label: 'Delete Permanently', icon: 'del', hint: 'Del', action: trashSel } : { label: 'Move to Trash', icon: 'del', hint: 'Del', action: trashSel },
      ].filter(Boolean);
      OS.contextMenu(ev.clientX, ev.clientY, items);
    }

    function paintSel() { $$('.f-item', grid).forEach(el => el.classList.toggle('sel', sel.has(el.dataset.path))); updateStatus(); }
    function updateStatus(entries) {
      const n = entries ? entries.length : $$('.f-item', grid).length;
      status.textContent = '';
      status.append(h('span', {}, `${n} item${n === 1 ? '' : 's'}${sel.size ? `, ${sel.size} selected` : ''}`), h('span', {}, `Storage used: ${fmtBytes(VFS.usage())}`));
    }

    function render() {
      if (!VFS.isDir(cur)) cur = VFS.HOME;
      win.setTitle(cur === VFS.HOME ? 'Home' : cur === '/' ? 'File System' : cur === VFS.TRASH ? 'Trash' : VFS.basename(cur));
      backB.disabled = hi <= 0; fwdB.disabled = hi >= hist.length - 1; upB.disabled = cur === '/';
      viewB.innerHTML = Icons.ui(listView ? 'max' : 'min', 16);
      crumbs.innerHTML = '';
      const parts = cur.split('/').filter(Boolean);
      const homeParts = VFS.HOME.split('/').filter(Boolean);
      let start = 0, base = '';
      if (cur.startsWith(VFS.HOME)) { start = homeParts.length; base = VFS.HOME; crumbs.append(h('button', { onclick: () => go(VFS.HOME), html: Icons.ui('homeS', 14) })); }
      else crumbs.append(h('button', { onclick: () => go('/') }, '/'));
      for (let i = start; i < parts.length; i++) { base += '/' + parts[i]; const p = base; crumbs.append(h('button', { onclick: () => go(p) }, parts[i])); }
      renderSide();

      grid.classList.toggle('listview', listView);
      grid.innerHTML = '';
      let entries = [];
      try { entries = VFS.list(cur, { hidden: showHidden }); } catch (e) { grid.append(h('div', { class: 'empty' }, e.message)); return; }
      if (filter) entries = entries.filter(e => e.name.toLowerCase().includes(filter));
      if (!entries.length) grid.append(h('div', { class: 'empty', style: { gridColumn: '1/-1' } }, filter ? 'No matches' : cur === VFS.TRASH ? 'Trash is empty' : 'This folder is empty'));
      for (const e of entries) {
        const isDir = e.type === 'dir';
        const el = h('div', { class: 'f-item', tabindex: -1, draggable: 'true', 'data-path': e.path, title: e.name, html: (isDir ? Icons.folder(listView ? 22 : 48) : Icons.file(listView ? 22 : 48, VFS.ext(e.name))) },
          h('span', { class: 'n' }, e.name), h('span', { class: 'meta' }, (isDir ? `${e.size} items` : fmtBytes(e.size)) + ' · ' + fmtDate(e.mtime)));
        el.addEventListener('click', ev => {
          if (ev.ctrlKey || ev.metaKey) sel.has(e.path) ? sel.delete(e.path) : sel.add(e.path);
          else { sel.clear(); sel.add(e.path); }
          paintSel(); if (ev.pointerType === 'touch') openItem(e);
        });
        el.addEventListener('dblclick', () => openItem(e));
        el.addEventListener('contextmenu', ev => { ev.preventDefault(); ev.stopPropagation(); itemMenu(e, ev); });
        el.addEventListener('dragstart', ev => ev.dataTransfer.setData('text/x-mintweb-path', e.path));
        if (isDir) {
          el.addEventListener('dragover', ev => { ev.preventDefault(); el.classList.add('drop'); });
          el.addEventListener('dragleave', () => el.classList.remove('drop'));
          el.addEventListener('drop', ev => {
            ev.preventDefault(); ev.stopPropagation(); el.classList.remove('drop');
            const src = ev.dataTransfer.getData('text/x-mintweb-path');
            if (src && src !== e.path) try { VFS.mv(src, e.path); } catch (er) { OS.notify(er.message, { type: 'error' }); }
            else if (ev.dataTransfer.files.length) upload(ev.dataTransfer.files, e.path);
          });
        }
        grid.append(el);
      }
      paintSel(); updateStatus(entries);
    }

    grid.addEventListener('pointerdown', ev => { if (ev.target === grid) { sel.clear(); paintSel(); } });
    grid.addEventListener('contextmenu', ev => {
      if (ev.target.closest('.f-item')) return;
      ev.preventDefault();
      const inTrash = cur.startsWith(VFS.TRASH);
      OS.contextMenu(ev.clientX, ev.clientY, [
        { label: 'New Folder', icon: 'newfolder', action: () => ShellUI.newItem(cur, 'dir') },
        { label: 'New Document', icon: 'newfile', action: () => ShellUI.newItem(cur, 'file') },
        { label: 'Paste', hint: 'Ctrl+V', disabled: !clipboard, action: paste },
        { sep: true },
        { label: 'Upload files from my computer…', icon: 'upload', action: () => pickUpload(cur) },
        { label: 'Open in Terminal', icon: 'play', action: () => OS.launch('terminal', { cwd: cur }) },
        { label: (showHidden ? 'Hide' : 'Show') + ' Hidden Files', hint: 'Ctrl+H', action: () => { showHidden = !showHidden; render(); } },
        inTrash ? { label: 'Empty Trash', icon: 'del', action: ShellUI.emptyTrash } : null,
      ].filter(Boolean));
    });
    grid.addEventListener('dragover', ev => ev.preventDefault());
    grid.addEventListener('drop', ev => {
      ev.preventDefault();
      const src = ev.dataTransfer.getData('text/x-mintweb-path');
      if (src) { if (VFS.split(src)[0] !== cur) try { VFS.mv(src, cur); } catch (er) { OS.notify(er.message, { type: 'error' }); } }
      else if (ev.dataTransfer.files.length) upload(ev.dataTransfer.files, cur);
    });
    win.el.addEventListener('keydown', ev => {
      if (ev.target.tagName === 'INPUT') return;
      const k = ev.key.toLowerCase();
      if (ev.key === 'Delete') trashSel();
      else if (ev.key === 'F2' && sel.size === 1) rename([...sel][0]);
      else if (ev.key === 'Enter' && sel.size) { const p = [...sel][0]; openItem(VFS.stat(p)); }
      else if (ev.key === 'Backspace' || (ev.altKey && ev.key === 'ArrowUp')) go(VFS.split(cur)[0]);
      else if (ev.ctrlKey && k === 'a') { ev.preventDefault(); $$('.f-item', grid).forEach(el => sel.add(el.dataset.path)); paintSel(); }
      else if (ev.ctrlKey && k === 'c') clipboard = { paths: selected(), cut: false };
      else if (ev.ctrlKey && k === 'x') clipboard = { paths: selected(), cut: true };
      else if (ev.ctrlKey && k === 'v') paste();
      else if (ev.ctrlKey && k === 'h') { ev.preventDefault(); showHidden = !showHidden; render(); }
      else return;
    });

    const off = VFS.onChange(render);
    win.onClose(off);
    win.data.go = go;
    render();
  }

  OS.register({ id: 'files', name: 'Files', icon: 'files', category: 'Accessories', description: 'Access and organize files', keywords: ['nemo', 'explorer', 'folder', 'file manager', 'finder'], window: { width: 860, height: 540 }, launch });
  return { upload, pickUpload };
})();
