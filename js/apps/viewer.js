/* MintWeb OS — Image Viewer */
(() => {
  OS.register({ id: 'viewer', name: 'Image Viewer', icon: 'viewer', category: 'Graphics', description: 'View pictures', keywords: ['xviewer', 'photos', 'image', 'picture'], window: { width: 760, height: 540 },
    launch(win, args) {
      const box = h('div', { class: 'viewer' });
      win.body.append(h('div', { class: 'toolbar' },
        h('button', { class: 'btn', html: Icons.ui('newfolder', 14) + ' Open', onclick: async () => { const p = await OS.fileDialog({ mode: 'open', dir: VFS.HOME + '/Pictures' }); if (p) show(p); } }),
        h('button', { class: 'btn', html: Icons.ui('gear', 14) + ' Set as background', onclick: () => { if (win.data.src) { if (win.data.src.length > 2.5e6) return OS.notify('Image too large for a background', { type: 'error' }); OS.setSetting({ customWallpaper: win.data.src, wallpaper: 'custom' }); } } })), box);
      function show(p) {
        try {
          let c = VFS.read(p);
          if (!/^data:/.test(c)) c = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(c);
          win.data.src = c; box.innerHTML = ''; box.append(h('img', { src: c, alt: VFS.basename(p) })); win.setTitle(VFS.basename(p) + ' - Image Viewer');
        } catch (e) { box.innerHTML = ''; box.append(h('div', { class: 'empty' }, e.message)); }
      }
      if (args.path) show(VFS.norm(args.path)); else box.append(h('div', { class: 'empty' }, 'Open an image or upload one in Files.'));
    } });
})();
