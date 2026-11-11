# MintWeb OS

A **free-software, AI-powered desktop that runs in any modern web browser** — on Windows, Linux, macOS or ChromeOS. Its look and feel is modelled on **Linux Mint 22.3 “Zena” (Cinnamon edition)**.

> MintWeb OS is an independent project. It is not affiliated with or endorsed by the Linux Mint project. It is a web desktop, not a Linux distribution: it does not boot on hardware or run native Linux binaries.

## Features

- **Cinnamon-style desktop**: bottom panel, Mint menu with search and favourites, window list, system tray, calendar, desktop icons, workspaces-style show-desktop, lock screen.
- **Window manager**: drag, resize, minimise, maximise, snap to screen edges, keyboard shortcuts.
- **Mint AI assistant**: chat, write and explain code, and **control the desktop** (open apps, create files, change themes/wallpapers, run terminal commands). Works with:
  - the built-in **offline helper** (no setup, no network),
  - **Ollama** or **LM Studio** running on your own computer (free and private),
  - any **OpenAI-compatible API** (OpenRouter, Groq, OpenAI, self-hosted servers…).
- **Apps**: Files (Nemo-style), Terminal (`mbash` with pipes, redirects, `neofetch`, `apt`, `ai` …), Text Editor with AI writing tools, System Settings, Web Browser, Software Manager (install free web apps such as Excalidraw, CyberChef or a real Linux VM via v86), System Monitor, Calculator, Image Viewer, Welcome Screen.
- **Your data stays local**: files, settings and API keys are kept in your browser’s storage. Export/import backups from *Settings → Storage & Backup*.
- **Installable PWA** with offline support.
- **No build step, no dependencies** — plain HTML, CSS and JavaScript.

## Run it

Any static web server works. With the included scripts:

| OS | Command |
|---|---|
| Linux / macOS | `./start.sh` (optional port: `./start.sh 9000`) |
| Windows | double-click `start.bat` |

Both use Python 3 (or `npx serve` as fallback) and open <http://localhost:8080>. You can also open `index.html` directly (offline install/service worker is then unavailable), or host the folder on GitHub Pages, Netlify, or any web host.

To install as an app, click **Install** in the Welcome Screen, or use your browser menu → *Install app* (Chrome, Edge, Brave, Opera…).

## Connect a free AI model (optional)

1. Install [Ollama](https://ollama.com) and pull a model: `ollama pull llama3.2`
2. Allow browser access:
   - Linux/macOS: `OLLAMA_ORIGINS="*" ollama serve`
   - Windows: set the environment variable `OLLAMA_ORIGINS` to `*`, then restart Ollama.
3. In MintWeb OS open **System Settings → AI Assistant**, choose *Ollama*, and click **Test connection**.

Any other OpenAI-compatible endpoint works the same way: pick a provider (or *Custom*), enter the server URL, model and API key. The key is stored only in your browser and is sent only to the server you choose.

## Keyboard shortcuts

| Shortcut | Action |
|---|---|
| `Alt+F1` / `Ctrl+Esc` | Menu |
| `Ctrl+Alt+T` | Terminal |
| `Ctrl+Alt+A` | Mint AI |
| `Ctrl+Alt+E` | Files |
| `Ctrl+Alt+D` | Show desktop |
| `Ctrl+Alt+L` | Lock screen |
| `Ctrl+Alt+Q` | Close window |

## Project layout

```
index.html            entry point
css/style.css         Mint-Y inspired theme (light/dark, accent colours)
js/util.js            helpers, storage, Markdown renderer
js/vfs.js             virtual file system (localStorage)
js/ai.js              AI providers, streaming, desktop action protocol, offline helper
js/wm.js              window manager
js/os.js              app registry, settings, dialogs, notifications
js/main.js            panel, menu, desktop, shortcuts, PWA
js/apps/*.js          applications
sw.js                 service worker (offline)
```

### Adding an app

```js
OS.register({
  id: 'hello', name: 'Hello', icon: 'webapp', category: 'Accessories',
  launch(win, args) { win.body.append(h('p', {}, 'Hello world')); },
});
```

## License

Copyright (C) 2026 MintWeb OS contributors. Free software under the [GNU General Public License v3.0 or later](LICENSE).
