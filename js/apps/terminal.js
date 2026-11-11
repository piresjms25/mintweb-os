/* MintWeb OS — Terminal with a small bash-like shell ("mbash") and built-in AI */
(() => {
  const ART = [
    '  ███████████████▄   ',
    '  ██            ▀██  ',
    '  ██  ██ ▄▀▀▄▄▀▀▄ ██ ',
    '  ██  ██ █  ██  █ ██ ',
    '  ██  ██ █  ██  █ ██ ',
    '  ██  ▀█▄▄▄▄▄▄▄▄█ ██ ',
    '  ▀██▄▄▄▄▄▄▄▄▄▄▄██▀  ',
  ];

  function browserName() {
    const ua = navigator.userAgent;
    const m = ua.match(/(Edg|OPR|Firefox|Chrome|Version)\/([\d.]+)/g) || [];
    if (/Edg\//.test(ua)) return 'Microsoft Edge ' + (ua.match(/Edg\/([\d]+)/) || [])[1];
    if (/OPR\//.test(ua)) return 'Opera ' + (ua.match(/OPR\/([\d]+)/) || [])[1];
    if (/Firefox\//.test(ua)) return 'Firefox ' + (ua.match(/Firefox\/([\d]+)/) || [])[1];
    if (/Chrome\//.test(ua)) return 'Chromium/Chrome ' + (ua.match(/Chrome\/([\d]+)/) || [])[1];
    if (/Safari\//.test(ua)) return 'Safari ' + (ua.match(/Version\/([\d]+)/) || [])[1];
    return m[0] || 'Unknown browser';
  }
  function hostOS() {
    const p = (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || '';
    const ua = navigator.userAgent;
    if (/Win/i.test(p) || /Windows/.test(ua)) return 'Windows';
    if (/Android/.test(ua)) return 'Android';
    if (/CrOS/.test(ua)) return 'ChromeOS';
    if (/Mac/i.test(p)) return /iPhone|iPad/.test(ua) ? 'iOS' : 'macOS';
    if (/Linux/i.test(p) || /Linux/.test(ua)) return 'Linux';
    return p || 'Unknown';
  }
  const uptime = () => { const s = Math.floor((Date.now() - (window.OS_BOOT || Date.now())) / 1000); const m = Math.floor(s / 60); return m ? `${Math.floor(m / 60)}h ${m % 60}m` : `${s}s`; };
  window.SysInfo = { browserName, hostOS, uptime };

  function tokenize(line, env) {
    const toks = []; let cur = null, i = 0;
    const push = () => { if (cur !== null) { toks.push({ t: 'w', v: cur }); cur = null; } };
    const expand = s => s.replace(/\$(\w+)|\$\{(\w+)\}/g, (_, a, b) => env[a || b] ?? '');
    while (i < line.length) {
      const c = line[i];
      if (c === ' ' || c === '\t') { push(); i++; continue; }
      if (c === "'") { const j = line.indexOf("'", i + 1); cur = (cur || '') + line.slice(i + 1, j < 0 ? undefined : j); i = j < 0 ? line.length : j + 1; continue; }
      if (c === '"') {
        let j = i + 1, s = '';
        while (j < line.length && line[j] !== '"') { if (line[j] === '\\' && j + 1 < line.length) { s += line[j + 1]; j += 2; } else s += line[j++]; }
        cur = (cur || '') + expand(s); i = j + 1; continue;
      }
      if (c === '\\' && i + 1 < line.length) { cur = (cur || '') + line[i + 1]; i += 2; continue; }
      const two = line.slice(i, i + 2);
      if (two === '&&' || two === '>>' || two === '||') { push(); toks.push({ t: 'op', v: two }); i += 2; continue; }
      if (c === ';' || c === '|' || c === '>') { push(); toks.push({ t: 'op', v: c }); i++; continue; }
      if (c === '#' && cur === null) break;
      let j = i; while (j < line.length && !/[\s'"\\;|>&]/.test(line[j])) j++;
      if (j === i) { cur = (cur || '') + c; i++; continue; }
      let w = line.slice(i, j);
      if (cur === null && (w === '~' || w.startsWith('~/'))) w = env.HOME + w.slice(1);
      cur = (cur || '') + expand(w); i = j;
    }
    push();
    return toks;
  }

  function launch(win, args) {
    const term = h('div', { class: 'term', tabindex: -1 });
    win.body.append(term);
    const S = {
      cwd: args.cwd && VFS.isDir(VFS.norm(args.cwd)) ? VFS.norm(args.cwd) : VFS.HOME,
      hist: store.get('termhist', []), hi: -1, busy: false, abort: null,
      env: { USER: 'mint', HOME: VFS.HOME, SHELL: '/bin/mbash', HOSTNAME: 'mintweb', PATH: '/usr/bin:/bin', LANG: navigator.language || 'en_US' },
      aliases: { ll: 'ls -la', la: 'ls -a', l: 'ls', cls: 'clear', dir: 'ls', nano: 'xed', vim: 'xed', vi: 'xed', gedit: 'xed', 'xdg-open': 'open' },
    };
    S.env.PWD = S.cwd;
    let inputEl = null;

    const scroll = () => { term.scrollTop = term.scrollHeight; };
    function line(text = '', cls) { const d = h('div', { class: 'ln' + (cls ? ' ' + cls : '') }); d.textContent = text; term.append(d); scroll(); return d; }
    function lineHTML(html) { const d = h('div', { class: 'ln', html }); term.append(d); scroll(); return d; }
    const promptHTML = () => `<span class="p-user">mint@mintweb</span>:<span class="p-path">${esc(VFS.pretty(S.cwd))}</span>$ `;

    function caretEnd(el) { const r = document.createRange(); r.selectNodeContents(el); r.collapse(false); const s = getSelection(); s.removeAllRanges(); s.addRange(r); }
    function newPrompt(prefill = '') {
      const cmd = h('span', { class: 'cmd', contenteditable: 'true', spellcheck: 'false', autocapitalize: 'off', autocorrect: 'off' });
      cmd.textContent = prefill;
      const row = h('div', { class: 'inrow' }, h('span', { html: promptHTML() }), cmd);
      term.append(row); inputEl = cmd; S.hi = -1;
      cmd.addEventListener('keydown', onKey);
      cmd.addEventListener('paste', e => { e.preventDefault(); document.execCommand('insertText', false, (e.clipboardData.getData('text/plain') || '').replace(/\r?\n/g, ' ')); });
      setTimeout(() => { cmd.focus(); caretEnd(cmd); }, 0); scroll();
    }

    async function submit(text) {
      if (inputEl) { inputEl.contentEditable = 'false'; inputEl.removeEventListener('keydown', onKey); inputEl = null; }
      if (text.trim()) { S.hist = S.hist.filter(x => x !== text).concat(text).slice(-200); store.set('termhist', S.hist); }
      S.busy = true;
      try { await runLine(text); } catch (e) { if (e.name !== 'AbortError') line(String(e.message || e), 'err'); }
      S.busy = false; S.abort = null;
      if (wins()) newPrompt();
    }
    const wins = () => document.body.contains(term);

    function onKey(e) {
      const cmd = e.currentTarget;
      if (e.key === 'Enter') { e.preventDefault(); submit(cmd.textContent); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); if (!S.hist.length) return; S.hi = S.hi < 0 ? S.hist.length - 1 : Math.max(0, S.hi - 1); cmd.textContent = S.hist[S.hi]; caretEnd(cmd); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); if (S.hi < 0) return; S.hi++; if (S.hi >= S.hist.length) { S.hi = -1; cmd.textContent = ''; } else cmd.textContent = S.hist[S.hi]; caretEnd(cmd); }
      else if (e.key === 'Tab') { e.preventDefault(); complete(cmd); }
      else if (e.ctrlKey && e.key.toLowerCase() === 'l') { e.preventDefault(); const t = cmd.textContent; term.innerHTML = ''; newPrompt(t); }
      else if (e.ctrlKey && e.key.toLowerCase() === 'c' && !getSelection().toString()) { e.preventDefault(); cmd.contentEditable = 'false'; cmd.textContent += '^C'; cmd.removeEventListener('keydown', onKey); inputEl = null; newPrompt(); }
      else if (e.ctrlKey && e.key.toLowerCase() === 'd' && !cmd.textContent) { e.preventDefault(); win.close(); }
    }
    term.addEventListener('keydown', e => {
      if (S.busy && e.ctrlKey && e.key.toLowerCase() === 'c') { e.preventDefault(); S.abort && S.abort.abort(); line('^C', 'dim'); }
    });
    term.addEventListener('mouseup', () => { if (!getSelection().toString() && inputEl) { inputEl.focus(); caretEnd(inputEl); } });
    win.el.addEventListener('pointerdown', () => setTimeout(() => { if (inputEl && !getSelection().toString()) inputEl.focus(); }, 0));

    function complete(cmd) {
      const text = cmd.textContent;
      const parts = text.split(/\s+/); const last = parts[parts.length - 1] || '';
      let options = [];
      if (parts.length === 1) options = Object.keys(COMMANDS).concat(Object.keys(S.aliases)).filter(c => c.startsWith(last)).sort();
      else {
        const slash = last.lastIndexOf('/');
        const dirPart = slash >= 0 ? last.slice(0, slash + 1) : '';
        const base = last.slice(slash + 1);
        const dir = VFS.norm(dirPart || '.', S.cwd);
        if (VFS.isDir(dir)) options = VFS.list(dir).filter(e => e.name.startsWith(base) && (base.startsWith('.') || !e.name.startsWith('.'))).map(e => dirPart + e.name + (e.type === 'dir' ? '/' : ''));
      }
      if (!options.length) return;
      if (options.length === 1) { parts[parts.length - 1] = options[0] + (options[0].endsWith('/') ? '' : ' '); cmd.textContent = parts.join(' '); caretEnd(cmd); return; }
      let pre = options[0];
      for (const o of options) while (!o.startsWith(pre)) pre = pre.slice(0, -1);
      if (pre.length > last.length) { parts[parts.length - 1] = pre; cmd.textContent = parts.join(' '); caretEnd(cmd); return; }
      const t = cmd.textContent; cmd.contentEditable = 'false'; cmd.removeEventListener('keydown', onKey);
      line(options.map(o => o.split('/').filter(Boolean).pop() + (o.endsWith('/') ? '/' : '')).join('  '));
      newPrompt(t);
      cmd.parentElement.remove();
    }

    /* ---- execution ---- */
    async function runLine(text) {
      const toks = tokenize(text, S.env);
      // split into sequences by ; && ||
      const seqs = []; let curT = [], joiner = ';';
      for (const t of toks) {
        if (t.t === 'op' && (t.v === ';' || t.v === '&&' || t.v === '||')) { seqs.push({ toks: curT, joiner }); curT = []; joiner = t.v; }
        else curT.push(t);
      }
      seqs.push({ toks: curT, joiner });
      let last = 0;
      for (const s of seqs) {
        if (!s.toks.length) continue;
        if (s.joiner === '&&' && last !== 0) continue;
        if (s.joiner === '||' && last === 0) continue;
        last = await runPipeline(s.toks);
        if (!wins()) return;
      }
    }

    async function runPipeline(toks) {
      const stages = [[]];
      for (const t of toks) { if (t.t === 'op' && t.v === '|') stages.push([]); else stages[stages.length - 1].push(t); }
      let stdin = null, code = 0;
      for (let si = 0; si < stages.length; si++) {
        const st = stages[si];
        let redirect = null; const words = [];
        for (let i = 0; i < st.length; i++) {
          if (st[i].t === 'op' && (st[i].v === '>' || st[i].v === '>>')) { const f = st[i + 1]; if (!f || f.t !== 'w') { line('mbash: syntax error near redirect', 'err'); return 2; } redirect = { path: VFS.norm(f.v, S.cwd), append: st[i].v === '>>' }; i++; }
          else words.push(st[i].v);
        }
        if (!words.length) continue;
        if (S.aliases[words[0]]) words.splice(0, 1, ...tokenize(S.aliases[words[0]], S.env).map(t => t.v));
        const isLast = si === stages.length - 1;
        const live = isLast && !redirect;
        let buf = '', liveEl = null;
        const io = {
          stdin,
          write(text, cls) {
            text = String(text);
            if (!live) { buf += text; return; }
            if (!liveEl) liveEl = line('');
            const parts = text.split('\n');
            parts.forEach((p, i) => {
              if (i > 0) liveEl = line('');
              if (p) liveEl.append(cls ? h('span', { class: cls }, p) : document.createTextNode(p));
            });
            scroll();
          },
          println(text = '', cls) { this.write(text + '\n', cls); },
          html(markup) { if (live) { lineHTML(markup); liveEl = null; } else buf += markup.replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&') + '\n'; },
          err(text) { line(text, 'err'); },
          live,
        };
        const [name, ...argv] = words;
        const fn = COMMANDS[name];
        if (!fn) { line(`${name}: command not found`, 'err'); if (/^[a-z]/i.test(name) && name.length > 2) line(`Tip: type "help" for commands, or ask the AI: ai how do I ${words.join(' ')}`, 'dim'); return 127; }
        try { code = (await fn(argv, io)) || 0; } catch (e) { if (e.name === 'AbortError') return 130; io.err(`${name}: ${e.message}`); code = 1; }
        if (liveEl && liveEl.textContent === '') liveEl.remove();
        if (redirect) { try { VFS.write(redirect.path, buf, { append: redirect.append }); } catch (e) { io.err(`mbash: ${e.message}`); code = 1; } }
        stdin = buf;
      }
      return code;
    }

    const path = p => VFS.norm(p, S.cwd);
    const flags = (argv, allowed) => { const f = new Set(), rest = []; for (const a of argv) { if (/^-[a-zA-Z]+$/.test(a)) [...a.slice(1)].forEach(c => f.add(c)); else if (/^--\w/.test(a)) f.add(a.slice(2)); else rest.push(a); } return [f, rest]; };
    const textIn = (files, io) => files.length ? files.map(f => VFS.read(path(f))).join('') : (io.stdin || '');

    const HELP = [
      ['Files', 'ls [-la] [dir], cd <dir>, pwd, tree, cat, head, tail, touch, mkdir [-p], rm [-r], mv, cp, find <name>'],
      ['Text', 'echo, grep [-i] <pattern>, wc, sort, uniq, rev, xed <file> (text editor)'],
      ['System', 'neofetch, uname [-a], whoami, hostname, date, uptime, free, df, ps, kill, history, env, export, alias, clear, exit'],
      ['Desktop', 'open <file|dir|app|url>, nemo [dir], theme dark|light [accent], wallpaper [name], lock, reboot, shutdown'],
      ['Software', 'apt list | apt search <q> | apt install <app> | apt remove <app>  (free web apps from the Software Manager)'],
      ['AI', 'ai <question>      e.g.  ai explain what grep does\n             cat notes.md | ai summarize this'],
      ['Shell', 'pipes |, redirects > >>, chaining ; && ||, $VARS, ~, Tab completion, ↑/↓ history, Ctrl+C, Ctrl+L'],
    ];

    const COMMANDS = {
      help(argv, io) {
        io.println('MintWeb mbash 1.0 — available commands', 'acc');
        for (const [k, v] of HELP) { io.write(k.padEnd(10), 'ok'); io.println(' ' + v.replace(/\n/g, '\n           ')); }
      },
      man(argv, io) { return COMMANDS.help(argv, io); },
      pwd(argv, io) { io.println(S.cwd); },
      cd([d], io) {
        const p = d === '-' ? (S.oldpwd || S.cwd) : path(d || '~');
        if (!VFS.exists(p)) { io.err(`cd: ${d}: No such file or directory`); return 1; }
        if (!VFS.isDir(p)) { io.err(`cd: ${d}: Not a directory`); return 1; }
        S.oldpwd = S.cwd; S.cwd = p; S.env.PWD = p;
      },
      ls(argv, io) {
        const [f, rest] = flags(argv);
        const targets = rest.length ? rest : ['.'];
        let code = 0;
        targets.forEach((t, ti) => {
          const p = path(t); const st = VFS.stat(p);
          if (!st) { io.err(`ls: cannot access '${t}': No such file or directory`); code = 2; return; }
          const entries = st.type === 'dir' ? VFS.list(p).filter(e => f.has('a') || !e.name.startsWith('.')) : [st];
          if (targets.length > 1) io.println((ti ? '\n' : '') + t + ':');
          if (f.has('l')) {
            io.println(`total ${entries.length}`);
            for (const e of entries) {
              io.write(`${e.type === 'dir' ? 'drwxr-xr-x' : '-rw-r--r--'} 1 mint mint ${String(e.size).padStart(7)} ${new Date(e.mtime).toLocaleDateString(undefined, { month: 'short', day: '2-digit' }).padEnd(7)} `);
              io.println(e.name, e.type === 'dir' ? 'dir' : /\.sh$/.test(e.name) ? 'ok' : '');
            }
          } else {
            entries.forEach((e, i) => { io.write(e.name, e.type === 'dir' ? 'dir' : /\.sh$/.test(e.name) ? 'ok' : ''); io.write(i < entries.length - 1 ? '  ' : ''); });
            if (entries.length) io.println('');
          }
        });
        return code;
      },
      tree([d], io) {
        const p = path(d || '.'); io.println(VFS.pretty(p), 'dir'); let nd = 0, nf = 0;
        const rec = (dir, pre) => {
          const items = VFS.list(dir).filter(e => !e.name.startsWith('.'));
          items.forEach((e, i) => {
            const lastI = i === items.length - 1;
            io.write(pre + (lastI ? '└── ' : '├── ')); io.println(e.name, e.type === 'dir' ? 'dir' : '');
            if (e.type === 'dir') { nd++; rec(e.path, pre + (lastI ? '    ' : '│   ')); } else nf++;
          });
        };
        rec(p, ''); io.println(`\n${nd} directories, ${nf} files`, 'dim');
      },
      cat(argv, io) { const t = textIn(argv, io); if (/^data:/.test(t)) { io.err('cat: binary file (use "open" to view it)'); return 1; } io.write(t.endsWith('\n') || !t ? t : t + '\n'); },
      head(argv, io) { const [f, rest] = flags(argv.filter(a => !/^-\d+$/.test(a))); const n = +((argv.find(a => /^-\d+$/.test(a)) || '-10').slice(1)); const t = textIn(rest, io).split('\n').slice(0, n).join('\n'); io.println(t); },
      tail(argv, io) { const n = +((argv.find(a => /^-\d+$/.test(a)) || '-10').slice(1)); const rest = argv.filter(a => !/^-\d+$/.test(a)); const ls = textIn(rest, io).replace(/\n$/, '').split('\n'); io.println(ls.slice(-n).join('\n')); },
      echo(argv, io) { const n = argv[0] === '-n'; io.write(argv.slice(n ? 1 : 0).join(' ') + (n ? '' : '\n')); },
      touch(argv, io) { for (const a of argv) { const p = path(a); if (!VFS.exists(p)) VFS.write(p, ''); } },
      mkdir(argv, io) { const [f, rest] = flags(argv); if (!rest.length) { io.err('mkdir: missing operand'); return 1; } rest.forEach(a => VFS.mkdir(path(a), { parents: f.has('p') })); },
      rmdir(argv, io) { argv.forEach(a => { if (!VFS.isDir(path(a))) throw new Error(`${a}: Not a directory`); VFS.rm(path(a)); }); },
      rm(argv, io) {
        const [f, rest] = flags(argv);
        if (!rest.length) { io.err('rm: missing operand'); return 1; }
        for (const a of rest) {
          const p = path(a);
          if (p === '/' || p === VFS.HOME) { io.err(`rm: it is dangerous to operate recursively on '${a}' — refusing (nice try!)`); return 1; }
          if (!VFS.exists(p)) { if (!f.has('f')) { io.err(`rm: cannot remove '${a}': No such file or directory`); } continue; }
          if (VFS.isDir(p) && !f.has('r') && !f.has('R')) { io.err(`rm: cannot remove '${a}': Is a directory`); return 1; }
          VFS.rm(p, { recursive: true });
        }
      },
      mv(argv, io) { const [, rest] = flags(argv); if (rest.length < 2) { io.err('mv: missing destination'); return 1; } const dst = path(rest.pop()); rest.forEach(s => VFS.mv(path(s), dst)); },
      cp(argv, io) { const [, rest] = flags(argv); if (rest.length < 2) { io.err('cp: missing destination'); return 1; } const dst = path(rest.pop()); rest.forEach(s => VFS.cp(path(s), dst)); },
      find(argv, io) {
        const [, rest] = flags(argv.filter(a => a !== '-name'));
        const start = rest.length > 1 ? path(rest[0]) : S.cwd; const pat = (rest.length > 1 ? rest[1] : rest[0] || '').replace(/\*/g, '');
        VFS.walk(start, e => { if (!pat || e.name.toLowerCase().includes(pat.toLowerCase())) io.println(VFS.pretty(e.path), e.type === 'dir' ? 'dir' : ''); });
      },
      grep(argv, io) {
        const [f, rest] = flags(argv); const pat = rest.shift();
        if (pat == null) { io.err('usage: grep [-i] [-n] PATTERN [FILE...]'); return 2; }
        let re; try { re = new RegExp(pat, f.has('i') ? 'i' : ''); } catch { re = new RegExp(pat.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), f.has('i') ? 'i' : ''); }
        let found = false;
        const scan = (text, label) => text.split('\n').forEach((l, i) => {
          if (re.test(l) !== f.has('v')) { found = true; if (label) io.write(label + ':', 'acc'); if (f.has('n')) io.write((i + 1) + ':', 'ok'); io.println(l); }
        });
        if (rest.length) rest.forEach(r => scan(VFS.read(path(r)), rest.length > 1 ? r : '')); else scan(io.stdin || '');
        return found ? 0 : 1;
      },
      wc(argv, io) { const [, rest] = flags(argv); const t = textIn(rest, io); io.println(`${String(t ? t.replace(/\n$/, '').split('\n').length : 0).padStart(4)} ${String(t.split(/\s+/).filter(Boolean).length).padStart(5)} ${String(t.length).padStart(6)}${rest[0] ? ' ' + rest[0] : ''}`); },
      sort(argv, io) { const [f, rest] = flags(argv); let l = textIn(rest, io).replace(/\n$/, '').split('\n').sort((a, b) => (f.has('n') ? parseFloat(a) - parseFloat(b) : a.localeCompare(b))); if (f.has('r')) l.reverse(); io.println(l.join('\n')); },
      uniq(argv, io) { const l = textIn(argv, io).replace(/\n$/, '').split('\n'); io.println(l.filter((x, i) => x !== l[i - 1]).join('\n')); },
      rev(argv, io) { io.println(textIn(argv, io).replace(/\n$/, '').split('\n').map(l => [...l].reverse().join('')).join('\n')); },
      clear() { term.innerHTML = ''; },
      date(argv, io) { io.println(new Date().toString()); },
      whoami(argv, io) { io.println('mint'); },
      hostname(argv, io) { io.println('mintweb'); },
      uptime(argv, io) { io.println(` ${new Date().toLocaleTimeString()} up ${uptime()},  1 user`); },
      uname(argv, io) { const [f] = flags(argv); io.println(f.has('a') ? `MintWeb 1.0-web #1 SMP ${browserName()} ${hostOS()} wasm/js GNU/Linux-inspired` : 'MintWeb'); },
      free(argv, io) { const gb = navigator.deviceMemory; const used = performance.memory ? performance.memory.usedJSHeapSize : 0; io.println('               total        used'); io.println(`Mem:   ${(gb ? gb + ' GB' : 'unknown').padStart(13)} ${(used ? fmtBytes(used) : 'n/a').padStart(11)}`); },
      async df(argv, io) {
        let quota = 'n/a', usage = 'n/a';
        if (navigator.storage && navigator.storage.estimate) { const e = await navigator.storage.estimate(); quota = fmtBytes(e.quota || 0); usage = fmtBytes(e.usage || 0); }
        io.println('Filesystem      Size   Used'); io.println(`browser-store ${quota.padStart(7)} ${usage.padStart(7)}`); io.println(`home (vfs)            ${fmtBytes(VFS.usage())}`);
      },
      ps(argv, io) { io.println('  PID  APP              TITLE', 'dim'); WM.list().forEach(w => io.println(`${w.id.slice(1).padStart(5)}  ${w.app.padEnd(16)} ${w.title}`)); },
      kill([pid], io) { const w = WM.list().find(x => x.id === 'w' + pid); if (!w) { io.err(`kill: (${pid}) - No such process`); return 1; } w.close(true); },
      history(argv, io) { S.hist.forEach((c, i) => io.println(`${String(i + 1).padStart(5)}  ${c}`)); },
      env(argv, io) { Object.entries(S.env).forEach(([k, v]) => io.println(`${k}=${v}`)); },
      export(argv) { argv.forEach(a => { const i = a.indexOf('='); if (i > 0) S.env[a.slice(0, i)] = a.slice(i + 1); }); },
      alias(argv, io) { if (!argv.length) return Object.entries(S.aliases).forEach(([k, v]) => io.println(`alias ${k}='${v}'`)); argv.forEach(a => { const i = a.indexOf('='); if (i > 0) S.aliases[a.slice(0, i)] = a.slice(i + 1); }); },
      which([c], io) { if (COMMANDS[c]) io.println('/usr/bin/' + c); else if (S.aliases[c]) io.println(`${c}: aliased to ${S.aliases[c]}`); else return 1; },
      async sleep([s]) { await new Promise(r => setTimeout(r, Math.min(60, +s || 1) * 1000)); },
      sudo(argv, io) { if (!argv.length) { io.err('usage: sudo <command>'); return 1; } io.println('[sudo] running as root in your browser sandbox', 'dim'); return runPipeline(argv.map(v => ({ t: 'w', v }))); },
      exit() { win.close(); },
      neofetch(argv, io) {
        const accent = Object.keys(OS.ACCENTS).find(k => k === OS.settings.accent) || 'green';
        const info = [
          ['', `mint@mintweb`], ['', '------------'],
          ['OS', 'MintWeb OS 1.0 (inspired by Linux Mint 22.3 "Zena")'],
          ['Host', `${browserName()} on ${hostOS()}`],
          ['Kernel', 'JavaScript / Web Platform'],
          ['Uptime', uptime()],
          ['Packages', `${OS.apps().length} (apps)`],
          ['Shell', 'mbash 1.0'],
          ['Resolution', `${screen.width}x${screen.height} @${devicePixelRatio}x`],
          ['DE', 'Cinnamon-Web'],
          ['Theme', `Mint-Y-${OS.settings.theme === 'dark' ? 'Dark-' : ''}${accent[0].toUpperCase() + accent.slice(1)}`],
          ['CPU', `${navigator.hardwareConcurrency || '?'} threads`],
          ['Memory', navigator.deviceMemory ? `≥ ${navigator.deviceMemory} GB` : 'n/a'],
          ['AI', AI.label()],
        ];
        const rows = Math.max(ART.length, info.length);
        for (let i = 0; i < rows; i++) {
          const a = ART[i] || ' '.repeat(ART[0].length);
          const [k, v] = info[i] || ['', ''];
          io.html(`<span class="acc">${esc(a)}</span>  ${k ? `<span class="acc">${esc(k)}</span>: ${esc(v)}` : `<span class="acc">${esc(v)}</span>`}`);
        }
        io.html('<span>' + ['#2e3436', '#cc0000', '#4e9a06', '#c4a000', '#3465a4', '#75507b', '#06989a', '#d3d7cf'].map(c => `<span style="background:${c}">   </span>`).join('') + '</span>');
      },
      open([t], io) {
        if (!t) { io.err('usage: open <file|folder|app|url>'); return 1; }
        if (/^https?:\/\//.test(t)) { OS.launch('browser', { url: t }); return; }
        const p = path(t);
        if (VFS.exists(p)) { OS.openPath(p); return; }
        const a = OS.apps().find(x => x.id === t || x.name.toLowerCase() === t.toLowerCase() || (x.keywords || []).includes(t.toLowerCase()));
        if (a) { OS.launch(a.id); return; }
        io.err(`open: ${t}: not found`); return 1;
      },
      xed([f], io) { if (f) { const p = path(f); if (!VFS.exists(p)) VFS.write(p, ''); OS.launch('editor', { path: p }); } else OS.launch('editor'); },
      nemo([d]) { OS.launch('files', { path: path(d || '.') }); },
      theme([mode, accent], io) {
        if (!mode) { io.println(`theme: ${OS.settings.theme}, accent: ${OS.settings.accent}`); io.println('usage: theme dark|light [' + Object.keys(OS.ACCENTS).join('|') + ']', 'dim'); return; }
        const patch = {};
        if (mode === 'dark' || mode === 'light') patch.theme = mode; else if (OS.ACCENTS[mode]) patch.accent = mode;
        if (accent && OS.ACCENTS[accent]) patch.accent = accent;
        if (!Object.keys(patch).length) { io.err('theme: unknown option'); return 1; }
        OS.setSetting(patch); io.println('Theme updated.', 'ok');
      },
      wallpaper([id], io) {
        const ids = Object.keys(OS.WALLPAPERS);
        if (!id) { io.println('Wallpapers: ' + ids.join(', ')); io.println(`Current: ${OS.settings.wallpaper}`, 'dim'); return; }
        if (!OS.WALLPAPERS[id]) { io.err(`wallpaper: unknown "${id}"`); return 1; }
        OS.setSetting({ wallpaper: id }); io.println(`Wallpaper set to ${OS.WALLPAPERS[id].name}.`, 'ok');
      },
      lock() { ShellUI.power('lock'); },
      reboot() { ShellUI.power('logout'); },
      shutdown() { ShellUI.power('shutdown'); },
      apt(argv, io) {
        const SW = window.Software; const [sub, ...rest] = argv;
        if (!SW) { io.err('apt: software catalog unavailable'); return 1; }
        const cat = SW.catalog();
        const find = q => cat.find(a => a.id === q || a.name.toLowerCase() === q.toLowerCase());
        switch (sub) {
          case 'update': io.println('Hit:1 mintweb://catalog stable InRelease'); io.println('Reading package lists... Done'); io.println(`All ${cat.length} packages are up to date.`, 'ok'); return;
          case 'upgrade': io.println('Calculating upgrade... Done'); io.println('0 upgraded, 0 newly installed, 0 to remove.', 'ok'); return;
          case 'list': cat.forEach(a => { io.write(a.id.padEnd(14), 'ok'); io.println(`${SW.isInstalled(a.id) ? '[installed] ' : ''}${a.desc}`); }); return;
          case 'search': cat.filter(a => (a.id + a.name + a.desc + a.cat).toLowerCase().includes((rest[0] || '').toLowerCase())).forEach(a => { io.write(a.id.padEnd(14), 'ok'); io.println(a.desc); }); return;
          case 'install': case 'remove': case 'purge': {
            if (!rest.length) { io.err(`apt: ${sub} needs a package name`); return 1; }
            for (const q of rest.filter(r => !r.startsWith('-'))) {
              const a = find(q);
              if (!a) { io.err(`E: Unable to locate package ${q}`); continue; }
              if (sub === 'install') { io.println(`Reading package lists... Done\nSetting up ${a.id} (${a.license})...`); SW.install(a.id); io.println(`${a.name} installed. Find it in Menu → Web Apps.`, 'ok'); }
              else { SW.remove(a.id); io.println(`Removing ${a.id}... Done`, 'ok'); }
            }
            return;
          }
          default: io.println('usage: apt update | upgrade | list | search <q> | install <pkg> | remove <pkg>');
        }
      },
      'apt-get'(argv, io) { return COMMANDS.apt(argv, io); },
      calc(argv, io) { try { io.println(String(safeMath(argv.join('')))); } catch (e) { io.err('calc: ' + e.message); return 1; } },
      expr(argv, io) { return COMMANDS.calc(argv, io); },
      bash([f], io) { if (!f) { io.println('Already running mbash.', 'dim'); return; } return runScript(path(f), io); },
      sh(argv, io) { return COMMANDS.bash(argv, io); },
      source(argv, io) { return COMMANDS.bash(argv, io); },
      async ai(argv, io) {
        let q = argv.join(' ').trim();
        if (!q && !io.stdin) { io.println('usage: ai <question>     e.g.  ai how do I find large files?'); io.println('       cat file.txt | ai summarize', 'dim'); return 1; }
        if (io.stdin) q = `${q || 'Explain this:'}\n\n---\n${io.stdin.slice(0, 12000)}`;
        S.abort = new AbortController();
        const cfg = AI.config();
        const sys = cfg.provider === 'builtin' ? AI.systemPrompt() : `You are Mint AI inside the MintWeb OS terminal (a browser desktop inspired by Linux Mint 22.3). The user's cwd is ${VFS.pretty(S.cwd)}. Answer concisely in plain text suited for a terminal; avoid heavy Markdown. Supported shell commands: ${Object.keys(COMMANDS).join(', ')}.`;
        let el = null, text = '';
        if (io.live) { el = h('div', { class: 'ln ai-out typing' }); term.append(el); }
        try {
          await AI.chat([{ role: 'system', content: sys }, { role: 'user', content: q }], {
            signal: S.abort.signal,
            onToken: t => { text += t; if (el) { el.textContent = text.replace(/```action[\s\S]*?(```|$)/g, '').trim(); scroll(); } },
          });
        } finally { if (el) el.classList.remove('typing'); }
        const actions = AI.parseActions(text);
        if (actions.length && cfg.allowActions) for (const a of actions) { try { const r = OS.runAction(a); if (r) io.println('✔ ' + r, 'dim'); } catch (e) { io.err('✖ ' + e.message); } }
        if (!io.live) io.write(text + '\n');
      },
      ask(argv, io) { return COMMANDS.ai(argv, io); },
    };

    async function runScript(p, io) {
      const src = VFS.read(p);
      for (const l of src.split('\n')) { const t = l.trim(); if (!t || t.startsWith('#')) continue; await runLine(t); }
    }

    // .bashrc aliases
    try { VFS.read(VFS.HOME + '/.bashrc').split('\n').forEach(l => { const m = l.match(/^alias\s+(\w+)=["'](.*)["']/); if (m) S.aliases[m[1]] = m[2]; }); } catch { /* none */ }

    win.setTitle(`mint@mintweb: ${VFS.pretty(S.cwd)}`);
    const titleUpd = setInterval(() => wins() && win.setTitle(`mint@mintweb: ${VFS.pretty(S.cwd)}`), 500);
    win.onClose(() => { clearInterval(titleUpd); S.abort && S.abort.abort(); });
    try { line(VFS.read('/etc/motd').trim(), 'dim'); } catch { /* none */ }
    if (args.run) { newPrompt(args.run); submit(args.run); }
    else newPrompt();
    win.data.run = cmd => { if (S.busy) return; if (inputEl) inputEl.textContent = cmd; submit(cmd); };
  }

  OS.register({
    id: 'terminal', name: 'Terminal', icon: 'terminal', category: 'System Tools', description: 'Use the command line', keywords: ['console', 'shell', 'bash', 'cmd', 'command', 'prompt'],
    window: { width: 760, height: 460 }, launch,
  });
})();
