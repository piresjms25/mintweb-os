/* MintWeb OS — virtual file system persisted in localStorage */
const VFS = (() => {
  const KEY = 'mintweb.fs.v1';
  const HOME = '/home/mint';
  const TRASH = HOME + '/.local/share/Trash';
  const listeners = new Set();
  let root;

  const now = () => Date.now();
  const dir = (children = {}) => ({ type: 'dir', children, mtime: now() });
  const file = (content = '') => ({ type: 'file', content, mtime: now() });
  const fail = msg => { const e = new Error(msg); e.fs = true; return e; };

  const WELCOME = `Welcome to MintWeb OS!

A free (GPL-3.0) desktop that runs entirely in your web browser,
inspired by Linux Mint 22.3 "Zena" with the Cinnamon desktop.

Things to try
  * Click the menu button (bottom-left) or press Alt+F1.
  * Open "Mint AI" from the panel (sparkle icon) and ask it to
    "open the terminal" or "switch to light theme".
  * Open the Terminal and type: neofetch, help, or  ai what is Linux?
  * Connect a real AI model in System Settings > AI Assistant
    (Ollama runs free on your own computer).

Everything you create is stored locally in this browser.
Use System Settings > Storage to back up or restore your files.
`;

  const OSREL = `PRETTY_NAME="MintWeb OS 1.0"
NAME="MintWeb OS"
VERSION="1.0 (Zena-inspired)"
ID=mintweb
ID_LIKE="linuxmint ubuntu debian"
UPSTREAM_INSPIRATION="Linux Mint 22.3 Zena (Cinnamon)"
HOME_URL="https://github.com/"
`;

  function defaults() {
    return dir({
      home: dir({
        mint: dir({
          Desktop: dir({ 'Welcome.txt': file(WELCOME) }),
          Documents: dir({
            'notes.md': file('# My notes\n\n- Try the Mint AI assistant\n- Explore the terminal (type `help`)\n'),
            'hello.sh': file('#!/bin/bash\necho "Hello from MintWeb OS"\n'),
          }),
          Downloads: dir(), Music: dir(), Pictures: dir(), Videos: dir(), Templates: dir(), Public: dir(),
          '.local': dir({ share: dir({ Trash: dir() }) }),
          '.bashrc': file('# ~/.bashrc\nalias ll="ls -la"\n'),
        }),
      }),
      etc: dir({ 'os-release': file(OSREL), hostname: file('mintweb\n'), motd: file('Welcome to MintWeb OS. Type "help" to get started.\n') }),
      tmp: dir(),
      usr: dir({ bin: dir(), share: dir({ doc: dir({ 'LICENSE.txt': file('MintWeb OS is free software: GNU GPL v3 or later.\nhttps://www.gnu.org/licenses/gpl-3.0.html\n') }) }) }),
    });
  }

  function load() {
    try { root = JSON.parse(localStorage.getItem(KEY)); } catch { root = null; }
    if (!root || root.type !== 'dir') { root = defaults(); persist(); }
  }
  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify(root)); }
    catch (e) { throw fail('Storage full: browser storage quota exceeded'); }
  }
  const notify = debounce(() => listeners.forEach(fn => { try { fn(); } catch (e) { console.error(e); } }), 30);
  function save() { persist(); notify(); }

  function norm(p, cwd = HOME) {
    if (p == null || p === '') p = '.';
    p = String(p);
    if (p === '~' || p.startsWith('~/')) p = HOME + p.slice(1);
    if (!p.startsWith('/')) p = cwd.replace(/\/$/, '') + '/' + p;
    const out = [];
    for (const s of p.split('/')) { if (!s || s === '.') continue; if (s === '..') out.pop(); else out.push(s); }
    return '/' + out.join('/');
  }
  const join = (a, b) => (a === '/' ? '' : a) + '/' + b;
  const split = p => { const i = p.lastIndexOf('/'); return [p.slice(0, i) || '/', p.slice(i + 1)]; };
  const basename = p => split(p)[1] || '/';
  const ext = name => { const m = /\.([^.\/]+)$/.exec(name); return m ? m[1].toLowerCase() : ''; };
  const pretty = p => p === HOME ? '~' : p.startsWith(HOME + '/') ? '~' + p.slice(HOME.length) : p;

  function node(path) {
    let n = root;
    for (const s of path.split('/').filter(Boolean)) {
      if (!n || n.type !== 'dir') return null;
      n = Object.prototype.hasOwnProperty.call(n.children, s) ? n.children[s] : null;
    }
    return n || null;
  }
  function sizeOf(n) { return n.type === 'file' ? (n.content || '').length : Object.keys(n.children).length; }

  function stat(path) { const n = node(path); if (!n) return null; return { name: basename(path), path, type: n.type, size: sizeOf(n), mtime: n.mtime }; }
  const exists = p => !!node(p);
  const isDir = p => { const n = node(p); return !!n && n.type === 'dir'; };

  function list(path, { hidden = true } = {}) {
    const n = node(path);
    if (!n) throw fail(`${path}: No such file or directory`);
    if (n.type !== 'dir') throw fail(`${path}: Not a directory`);
    return Object.keys(n.children)
      .filter(k => hidden || !k.startsWith('.'))
      .map(name => { const c = n.children[name]; return { name, path: join(path, name), type: c.type, size: sizeOf(c), mtime: c.mtime }; })
      .sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }) : a.type === 'dir' ? -1 : 1));
  }
  function read(path) {
    const n = node(path);
    if (!n) throw fail(`${path}: No such file or directory`);
    if (n.type === 'dir') throw fail(`${path}: Is a directory`);
    return n.content;
  }
  function validName(name) { if (!name || name.includes('/') || name === '.' || name === '..') throw fail(`Invalid name: "${name}"`); }
  function write(path, content = '', { append = false } = {}) {
    const [d, name] = split(path); validName(name);
    const pd = node(d);
    if (!pd || pd.type !== 'dir') throw fail(`${d}: No such directory`);
    const ex = pd.children[name];
    if (ex && ex.type === 'dir') throw fail(`${path}: Is a directory`);
    pd.children[name] = file(append && ex ? ex.content + content : String(content));
    pd.mtime = now(); save();
  }
  function mkdir(path, { parents = false } = {}) {
    const parts = path.split('/').filter(Boolean);
    let n = root, cur = '';
    parts.forEach((s, i) => {
      cur += '/' + s;
      const last = i === parts.length - 1;
      if (!n.children[s]) {
        if (!last && !parents) throw fail(`${cur}: No such file or directory`);
        validName(s); n.children[s] = dir(); n.mtime = now();
      } else if (n.children[s].type !== 'dir') throw fail(`${cur}: Not a directory`);
      else if (last && !parents) throw fail(`${path}: File exists`);
      n = n.children[s];
    });
    save();
  }
  function rm(path, { recursive = false } = {}) {
    if (path === '/' || path === HOME) throw fail(`Refusing to remove ${pretty(path)}`);
    const [d, name] = split(path); const pd = node(d); const n = node(path);
    if (!n) throw fail(`${path}: No such file or directory`);
    if (n.type === 'dir' && Object.keys(n.children).length && !recursive) throw fail(`${path}: Directory not empty (use -r)`);
    delete pd.children[name]; pd.mtime = now(); save();
  }
  function uniqueName(d, name) {
    const pd = node(d); if (!pd || !pd.children[name]) return name;
    const m = /^(.*?)(\.[^.]*)?$/.exec(name); let i = 2;
    while (pd.children[`${m[1]} (${i})${m[2] || ''}`]) i++;
    return `${m[1]} (${i})${m[2] || ''}`;
  }
  function mv(src, dst, { copy = false } = {}) {
    const n = node(src);
    if (!n) throw fail(`${src}: No such file or directory`);
    if (src === '/' || src === HOME) throw fail(`Cannot move ${pretty(src)}`);
    if (isDir(dst)) dst = join(dst, basename(src));
    if (dst === src) return dst;
    if (n.type === 'dir' && (dst + '/').startsWith(src + '/')) throw fail('Cannot move a directory into itself');
    const [d, name] = split(dst); validName(name);
    const pd = node(d); if (!pd || pd.type !== 'dir') throw fail(`${d}: No such directory`);
    if (pd.children[name] && pd.children[name].type === 'dir') throw fail(`${dst}: Is a directory`);
    pd.children[name] = copy ? JSON.parse(JSON.stringify(n)) : n;
    pd.mtime = now();
    if (!copy) { const [sd, sn] = split(src); delete node(sd).children[sn]; }
    save(); return dst;
  }
  const cp = (s, d) => mv(s, d, { copy: true });
  function trash(path) {
    if (!isDir(TRASH)) mkdir(TRASH, { parents: true });
    return mv(path, join(TRASH, uniqueName(TRASH, basename(path))));
  }
  function emptyTrash() { const t = node(TRASH); if (t) { t.children = {}; save(); } }
  function walk(path, fn, depth = 0) {
    for (const e of list(path)) { fn(e, depth); if (e.type === 'dir') walk(e.path, fn, depth + 1); }
  }
  function usage() { return (localStorage.getItem(KEY) || '').length * 2; }
  function exportJSON() { return JSON.stringify(root); }
  function importJSON(json) { const r = JSON.parse(json); if (!r || r.type !== 'dir') throw fail('Invalid backup'); root = r; save(); }
  function reset() { root = defaults(); save(); }
  const onChange = fn => { listeners.add(fn); return () => listeners.delete(fn); };

  load();
  return { HOME, TRASH, norm, join, split, basename, ext, pretty, stat, exists, isDir, list, read, write, mkdir, rm, mv, cp, trash, emptyTrash, uniqueName, walk, usage, exportJSON, importJSON, reset, onChange };
})();
