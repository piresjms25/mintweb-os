/* MintWeb OS — Software Manager: install free web applications */
const Software = (() => {
  const CATALOG = [
    { id: 'excalidraw', name: 'Excalidraw', desc: 'Virtual whiteboard for sketching hand-drawn diagrams', url: 'https://excalidraw.com', license: 'MIT', cat: 'Graphics' },
    { id: 'jspaint', name: 'JS Paint', desc: 'Classic paint program, reimagined for the web', url: 'https://jspaint.app', license: 'MIT', cat: 'Graphics' },
    { id: 'squoosh', name: 'Squoosh', desc: 'Compress and convert images in the browser', url: 'https://squoosh.app', license: 'Apache-2.0', cat: 'Graphics' },
    { id: 'tldraw', name: 'tldraw', desc: 'Infinite canvas whiteboard', url: 'https://www.tldraw.com', license: 'tldraw license', cat: 'Graphics' },
    { id: 'stackedit', name: 'StackEdit', desc: 'Full-featured in-browser Markdown editor', url: 'https://stackedit.io/app', license: 'Apache-2.0', cat: 'Office' },
    { id: 'drawio', name: 'draw.io', desc: 'Diagrams, flowcharts and network charts', url: 'https://app.diagrams.net', license: 'Apache-2.0', cat: 'Office', embed: false },
    { id: 'cyberchef', name: 'CyberChef', desc: 'The cyber swiss-army knife: encode, decode, convert', url: 'https://gchq.github.io/CyberChef/', license: 'Apache-2.0', cat: 'Accessories' },
    { id: 'v86', name: 'v86 Linux VM', desc: 'Boot a real x86 Linux inside the browser (emulator)', url: 'https://copy.sh/v86/', license: 'BSD-2-Clause', cat: 'System Tools' },
    { id: 'jslinux', name: 'JSLinux', desc: 'Run Linux and other OSes in the browser (by F. Bellard)', url: 'https://bellard.org/jslinux/', license: 'Free (TinyEMU: MIT)', cat: 'System Tools' },
    { id: 'osm', name: 'OpenStreetMap', desc: 'Free, editable map of the whole world', url: 'https://www.openstreetmap.org/export/embed.html?bbox=-30,25,50,65&layer=mapnik', license: 'ODbL', cat: 'Internet' },
    { id: 'wikipedia', name: 'Wikipedia', desc: 'The free encyclopedia', url: 'https://en.m.wikipedia.org/', license: 'CC BY-SA', cat: 'Internet' },
    { id: 'jitsi', name: 'Jitsi Meet', desc: 'Secure, free video conferencing', url: 'https://meet.jit.si', license: 'Apache-2.0', cat: 'Internet' },
    { id: 'lichess', name: 'Lichess', desc: 'Free, open-source chess server', url: 'https://lichess.org', license: 'AGPL-3.0', cat: 'Games', embed: false },
    { id: 'hoppscotch', name: 'Hoppscotch', desc: 'Open-source API development ecosystem', url: 'https://hoppscotch.io', license: 'MIT', cat: 'System Tools', embed: false },
    { id: 'penpot', name: 'Penpot', desc: 'Open-source design & prototyping platform', url: 'https://design.penpot.app', license: 'MPL-2.0', cat: 'Graphics', embed: false },
  ];
  const isInstalled = id => (OS.settings.webapps || []).some(w => w.id === id);
  function install(id) {
    const a = CATALOG.find(x => x.id === id); if (!a || isInstalled(id)) return;
    OS.setSetting({ webapps: [...(OS.settings.webapps || []), { id: a.id, name: a.name, url: a.url, desc: a.desc, embed: a.embed !== false }] });
    OS.notify(`${a.name} was installed. Find it in Menu → Web Apps.`, { title: 'Software Manager', icon: 'software' });
  }
  function remove(id) { OS.setSetting({ webapps: (OS.settings.webapps || []).filter(w => w.id !== id), launchers: OS.settings.launchers.filter(x => x !== 'web:' + id), favorites: OS.settings.favorites.filter(x => x !== 'web:' + id) }); }

  function launch(win) {
    const wrap = h('div', { class: 'sw' });
    const q = h('input', { class: 'input', placeholder: 'Search applications…', style: { maxWidth: '320px' } });
    win.body.append(h('div', { class: 'toolbar' }, h('span', { html: Icons.app('software', 20) }), h('strong', {}, 'Software Manager'), h('div', { class: 'spacer' }), q), wrap);
    const custom = async () => {
      const url = await OS.prompt('Add a web app', 'https://', { label: 'Address of any website or web app' }); if (!url || url === 'https://') return;
      const name = await OS.prompt('Name', new URL(url.match(/^https?:/) ? url : 'https://' + url).hostname.replace(/^www\./, '')); if (!name) return;
      const id = 'custom-' + Date.now().toString(36);
      OS.setSetting({ webapps: [...OS.settings.webapps, { id, name, url: url.match(/^https?:/) ? url : 'https://' + url, desc: 'Custom web app', embed: true }] }); render();
    };
    function render() {
      wrap.innerHTML = '';
      wrap.append(h('div', { class: 'sw-hero' }, h('h2', {}, 'Free software, one click away'), h('div', {}, 'Install open-source web applications into your menu. They run in their own windows on any computer.')));
      const term = q.value.toLowerCase();
      const cats = [...new Set(CATALOG.map(a => a.cat))];
      for (const c of cats) {
        const items = CATALOG.filter(a => a.cat === c && (a.name + a.desc + a.id).toLowerCase().includes(term));
        if (!items.length) continue;
        const grid = h('div', { class: 'sw-grid' });
        items.forEach(a => {
          const inst = isInstalled(a.id);
          grid.append(h('div', { class: 'sw-card' }, h('span', { html: Icons.app('webapp', 40) }), h('div', { class: 'sw-txt' }, h('strong', {}, a.name), h('small', {}, a.desc), h('span', { class: 'lic' }, a.license + (a.embed === false ? ' · opens in tab' : '')),
            h('div', { style: { display: 'flex', gap: '6px' } },
              inst ? h('button', { class: 'btn primary', onclick: () => OS.launch('web:' + a.id) }, 'Launch') : null,
              h('button', { class: 'btn' + (inst ? ' danger' : ' primary'), onclick: () => { inst ? remove(a.id) : install(a.id); render(); } }, inst ? 'Remove' : 'Install')))));
        });
        wrap.append(h('h3', { style: { color: 'var(--muted)', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '.6px' } }, c), grid);
      }
      const mine = (OS.settings.webapps || []).filter(w => w.id.startsWith('custom-'));
      const grid = h('div', { class: 'sw-grid' });
      mine.forEach(w => grid.append(h('div', { class: 'sw-card' }, h('span', { html: Icons.app('webapp', 40) }), h('div', { class: 'sw-txt' }, h('strong', {}, w.name), h('small', {}, w.url),
        h('div', { style: { display: 'flex', gap: '6px' } }, h('button', { class: 'btn primary', onclick: () => OS.launch('web:' + w.id) }, 'Launch'), h('button', { class: 'btn danger', onclick: () => { remove(w.id); render(); } }, 'Remove'))))));
      grid.append(h('div', { class: 'sw-card' }, h('span', { html: Icons.ui('plus', 40) }), h('div', { class: 'sw-txt' }, h('strong', {}, 'Add any website'), h('small', {}, 'Turn any site into an app in your menu'), h('button', { class: 'btn', onclick: custom }, 'Add web app'))));
      wrap.append(h('h3', { style: { color: 'var(--muted)', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '.6px' } }, 'My web apps'), grid);
    }
    q.addEventListener('input', render);
    render();
  }

  OS.register({ id: 'software', name: 'Software Manager', icon: 'software', category: 'Administration', description: 'Install free web applications', keywords: ['apt', 'install', 'store', 'apps', 'packages', 'mintinstall'], singleton: true, window: { width: 900, height: 600 }, launch });
  return { catalog: () => CATALOG, install, remove, isInstalled };
})();
window.Software = Software;
