/* MintWeb OS — AI engine. Works with any OpenAI-compatible endpoint
   (Ollama, LM Studio, llama.cpp, OpenAI, OpenRouter, Groq, …) plus an offline built-in helper. */
const AI = (() => {
  const PRESETS = {
    builtin:    { label: 'Built-in helper (offline, no setup)', baseUrl: '', model: 'mint-helper', needsKey: false },
    ollama:     { label: 'Ollama (free, runs on your computer)', baseUrl: 'http://localhost:11434/v1', model: 'llama3.2', needsKey: false },
    lmstudio:   { label: 'LM Studio (free, runs on your computer)', baseUrl: 'http://localhost:1234/v1', model: 'local-model', needsKey: false },
    openrouter: { label: 'OpenRouter (has free models)', baseUrl: 'https://openrouter.ai/api/v1', model: 'meta-llama/llama-3.3-70b-instruct:free', needsKey: true },
    groq:       { label: 'Groq', baseUrl: 'https://api.groq.com/openai/v1', model: 'llama-3.3-70b-versatile', needsKey: true },
    openai:     { label: 'OpenAI', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini', needsKey: true },
    custom:     { label: 'Custom OpenAI-compatible server', baseUrl: 'http://localhost:8080/v1', model: 'default', needsKey: false },
  };
  const DEFAULT = { provider: 'builtin', baseUrl: '', model: 'mint-helper', apiKey: '', temperature: 0.6, allowActions: true };

  const config = () => Object.assign({}, DEFAULT, store.get('ai', {}));
  const setConfig = c => store.set('ai', Object.assign(config(), c));
  const label = () => { const c = config(); return c.provider === 'builtin' ? 'Built-in helper' : `${c.model}`; };

  function systemPrompt() {
    const apps = (typeof OS !== 'undefined' ? OS.apps() : []).map(a => `${a.id} (${a.name})`).join(', ');
    return `You are Mint AI, the friendly built-in assistant of MintWeb OS — a free, open-source desktop that runs in the web browser and is inspired by Linux Mint 22.3 "Zena" (Cinnamon).
The user's home directory is ${VFS.HOME}. Today is ${new Date().toDateString()}.
Be concise and helpful. Use Markdown. When you show shell commands use \`\`\`bash blocks; the MintWeb terminal supports: ls, cd, pwd, cat, echo, mkdir, touch, rm, mv, cp, grep, tree, head, wc, date, neofetch, open, ai, theme, wallpaper, clear.
You can control the desktop. To perform an action, output a fenced block with language "action" containing ONE JSON object per line. Available actions:
{"action":"open_app","app":"<id>"}   apps: ${apps}
{"action":"open_url","url":"https://..."}
{"action":"create_file","path":"~/Documents/name.txt","content":"..."}
{"action":"open_file","path":"~/..."}
{"action":"set_theme","mode":"dark|light","accent":"green|aqua|blue|brown|grey|orange|pink|purple|red|sand|teal"}
{"action":"set_wallpaper","id":"aurora|zena|dusk|ocean|forest|graphite|sunrise"}
{"action":"run_command","command":"<terminal command>"}
{"action":"notify","text":"..."}
Only use actions when the user asks you to do something on the desktop. Briefly say what you did.`;
  }

  async function chat(messages, { onToken, signal } = {}) {
    const c = config();
    if (c.provider === 'builtin') {
      const text = Builtin.reply(messages);
      for (const chunk of text.match(/[\s\S]{1,12}/g) || []) {
        if (signal && signal.aborted) break;
        onToken && onToken(chunk);
        await new Promise(r => setTimeout(r, 8));
      }
      return text;
    }
    if (!c.baseUrl) throw new Error('No server URL configured. Open System Settings > AI Assistant.');
    const headers = { 'Content-Type': 'application/json' };
    if (c.apiKey) headers.Authorization = 'Bearer ' + c.apiKey;
    if (c.provider === 'openrouter') { headers['HTTP-Referer'] = location.origin; headers['X-Title'] = 'MintWeb OS'; }
    let res;
    try {
      res = await fetch(c.baseUrl.replace(/\/+$/, '') + '/chat/completions', {
        method: 'POST', headers, signal,
        body: JSON.stringify({ model: c.model, messages, stream: true, temperature: Number(c.temperature) }),
      });
    } catch (e) {
      if (e.name === 'AbortError') throw e;
      const local = /localhost|127\.0\.0\.1/.test(c.baseUrl);
      throw new Error(`Could not reach ${c.baseUrl}. ` + (local
        ? `Is the server running? For Ollama, allow browser access with OLLAMA_ORIGINS="*" (then restart Ollama).`
        : `Check your internet connection, URL and API key.`));
    }
    if (!res.ok) {
      const t = await res.text().catch(() => '');
      throw new Error(`Server returned HTTP ${res.status}. ${t.slice(0, 400)}`);
    }
    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('event-stream') || !res.body) {
      const j = await res.json();
      const text = (j.choices && j.choices[0] && (j.choices[0].message?.content ?? j.choices[0].text)) || '';
      onToken && onToken(text);
      return text;
    }
    const reader = res.body.getReader(); const dec = new TextDecoder();
    let buf = '', full = '';
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let i;
      while ((i = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
        if (!line.startsWith('data:')) continue;
        const data = line.slice(5).trim();
        if (data === '[DONE]') return full;
        try {
          const j = JSON.parse(data);
          const d = j.choices && j.choices[0] && (j.choices[0].delta?.content || '');
          if (d) { full += d; onToken && onToken(d); }
        } catch { /* partial line */ }
      }
    }
    return full;
  }

  async function ask(prompt, { system, onToken, signal } = {}) {
    return chat([{ role: 'system', content: system || systemPrompt() }, { role: 'user', content: prompt }], { onToken, signal });
  }

  async function listModels() {
    const c = config();
    if (c.provider === 'builtin') return ['mint-helper'];
    const headers = {}; if (c.apiKey) headers.Authorization = 'Bearer ' + c.apiKey;
    const res = await fetch(c.baseUrl.replace(/\/+$/, '') + '/models', { headers });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const j = await res.json();
    return (j.data || j.models || []).map(m => m.id || m.name).filter(Boolean);
  }

  function parseActions(text) {
    const actions = [];
    const re = /```action[^\n]*\n([\s\S]*?)```/g; let m;
    while ((m = re.exec(text))) {
      for (const line of m[1].split('\n')) {
        const t = line.trim(); if (!t) continue;
        try { actions.push(JSON.parse(t)); } catch { /* ignore */ }
      }
    }
    return actions;
  }

  /* Offline rule-based helper: useful without any model, and demonstrates desktop actions. */
  const Builtin = {
    reply(messages) {
      const last = [...messages].reverse().find(m => m.role === 'user');
      const parts = (last ? last.content : '').split(/\s*(?:\band then\b|\bthen\b|\band\b|;)\s*/i).filter(Boolean);
      if (parts.length > 1 && parts.length <= 5) {
        const outs = parts.map(t => this.replyOne([{ role: 'user', content: t }]));
        if (outs.filter(o => o.includes('```action')).length > 1) return outs.filter(o => o.includes('```action')).join('\n');
      }
      return this.replyOne(messages);
    },
    replyOne(messages) {
      const last = [...messages].reverse().find(m => m.role === 'user');
      const q = (last ? last.content : '').trim();
      const ql = q.toLowerCase();
      const act = o => '\n```action\n' + JSON.stringify(o) + '\n```\n';
      const apps = typeof OS !== 'undefined' ? OS.apps() : [];

      if (/^(hi|hello|hey|hola|olá|ola|bonjour)\b/.test(ql))
        return `Hello! I'm **Mint AI**, your desktop assistant. I'm running in offline helper mode, so I can control the desktop and answer basic questions.\n\nTry: *"open the terminal"*, *"switch to light theme"*, *"change wallpaper"*, *"create a note called ideas"*, or *"what is 12*(4+3)"*.\n\nFor full AI conversations connect a model in **System Settings → AI Assistant** (Ollama is free and runs on your own computer).`;

      const mathM = ql.replace(/^(what is|what's|calculate|compute|calc)\s*/, '').replace(/[?=]\s*$/, '');
      if (/^[\d\s+\-*/().^%,]+$/.test(mathM) && /\d/.test(mathM) && /[+\-*/^%]/.test(mathM)) {
        try { return `**${mathM.trim()} = ${safeMath(mathM)}**`; } catch { /* fallthrough */ }
      }
      if (/\b(time|date|day)\b/.test(ql) && /\b(what|which|current|today)\b/.test(ql))
        return `It is **${new Date().toLocaleString()}**.`;

      if (/\b(light)\b.*\b(theme|mode)\b|\b(theme|mode)\b.*\blight\b/.test(ql)) return 'Switching to the light theme.' + act({ action: 'set_theme', mode: 'light' });
      if (/\b(dark)\b.*\b(theme|mode)\b|\b(theme|mode)\b.*\bdark\b|night mode/.test(ql)) return 'Switching to the dark theme.' + act({ action: 'set_theme', mode: 'dark' });
      const colors = ['green', 'aqua', 'blue', 'brown', 'grey', 'orange', 'pink', 'purple', 'red', 'sand', 'teal'];
      const col = colors.find(c => new RegExp('\\b' + c + '\\b').test(ql));
      if (col && /(accent|color|colour|theme)/.test(ql)) return `Accent color set to **${col}**.` + act({ action: 'set_theme', accent: col });
      if (/(wallpaper|background)/.test(ql)) {
        const ids = ['aurora', 'zena', 'dusk', 'ocean', 'forest', 'graphite', 'sunrise'];
        const id = ids.find(i => ql.includes(i)) || ids[(ids.indexOf(store.get('settings', {}).wallpaper) + 1) % ids.length] || 'zena';
        return `Changed the wallpaper to **${id}**.` + act({ action: 'set_wallpaper', id });
      }
      let m;
      if ((m = ql.match(/(?:create|make|new|write)\s+(?:a\s+)?(?:note|file|document)(?:\s+(?:called|named))?\s+["']?([\w .-]+?)["']?(?:\s+(?:with|saying|containing)\s+(.+))?$/))) {
        let name = m[1].trim(); if (!/\.\w+$/.test(name)) name += '.txt';
        const content = m[2] ? q.slice(q.toLowerCase().indexOf(m[2])) : '';
        return `Created **~/Documents/${name}** and opened it.` + act({ action: 'create_file', path: '~/Documents/' + name, content }) + act({ action: 'open_file', path: '~/Documents/' + name });
      }
      if ((m = ql.match(/(?:open|launch|start|run|show)\s+(?:the\s+|my\s+)?(.+)/))) {
        const t = m[1].replace(/[.!?]$/, '').trim();
        if (/^https?:\/\//.test(t) || /^[\w-]+\.(com|org|net|io|dev|app)\b/.test(t)) return `Opening ${t}.` + act({ action: 'open_url', url: /^https?:/.test(t) ? t : 'https://' + t });
        if (/^(home|documents|downloads|pictures|music|videos|desktop)( folder)?$/.test(t)) {
          const f = t.replace(' folder', ''); const p = f === 'home' ? '~' : '~/' + f[0].toUpperCase() + f.slice(1);
          return `Opening ${p}.` + act({ action: 'open_file', path: p });
        }
        const a = apps.find(a => t.includes(a.name.toLowerCase()) || t.includes(a.id) || (a.keywords || []).some(k => t.includes(k)));
        if (a) return `Opening **${a.name}**.` + act({ action: 'open_app', app: a.id });
      }
      if (/(neofetch|system info|about this|specs)/.test(ql)) return 'Here is your system information:' + act({ action: 'run_command', command: 'neofetch' });
      if (/(what is|about|tell me about).*(linux mint|mint)/.test(ql))
        return `**Linux Mint** is a free, community-driven Linux distribution based on Ubuntu, known for being elegant, easy to use and comfortable for people coming from Windows. Its flagship desktop is **Cinnamon**. The latest release is **Linux Mint 22.3 "Zena"**.\n\n**MintWeb OS** recreates the Mint/Cinnamon experience inside your web browser, so it works on Windows, Linux, macOS and ChromeOS.`;
      if (/(what is|explain).*linux/.test(ql))
        return `**Linux** is a free and open-source operating-system kernel created by Linus Torvalds in 1991. Combined with GNU tools and a desktop (like Cinnamon), it forms complete operating systems called *distributions* — e.g. Linux Mint, Ubuntu, Debian and Fedora.`;
      if (/(help|what can you do|commands|how)/.test(ql) || !q)
        return `Here's what I can do in offline mode:\n\n- **Open apps** — "open files", "open terminal", "open settings"\n- **Customize** — "light theme", "blue accent", "change wallpaper"\n- **Create files** — "create a note called todo with buy milk"\n- **Quick math & time** — "what is 15% of 80" → try "80*15%"\n- **Open websites** — "open wikipedia.org"\n\nFor real AI chat, coding help, translation and writing, connect a model:\n1. Install **Ollama** (free) from ollama.com and run \`ollama pull llama3.2\`\n2. Start it with \`OLLAMA_ORIGINS="*" ollama serve\`\n3. In **System Settings → AI Assistant** pick *Ollama*.` + act({ action: 'notify', text: 'Tip: connect a free local model in Settings → AI Assistant' });
      return `I'm running in **offline helper mode**, so I can only handle desktop commands (open apps, themes, wallpapers, files, math).\n\nTo get full answers to questions like *"${q.slice(0, 80)}"*, connect a model in **System Settings → AI Assistant** — Ollama (local & free), OpenRouter (free models) or any OpenAI-compatible server.`;
    },
  };

  return { PRESETS, config, setConfig, label, systemPrompt, chat, ask, listModels, parseActions };
})();
