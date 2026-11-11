/* MintWeb OS — Calculator */
(() => {
  function launch(win) {
    let expr = '';
    const ex = h('div', { class: 'expr' }), res = h('div', { class: 'res' }, '0');
    const keys = h('div', { class: 'calc-keys' });
    const upd = () => { ex.textContent = expr; try { res.textContent = expr ? String(safeMath(expr)) : '0'; res.style.opacity = .55; } catch { /* partial */ } };
    const press = k => {
      if (k === 'C') expr = '';
      else if (k === '⌫') expr = expr.slice(0, -1);
      else if (k === '=') { try { const r = safeMath(expr); ex.textContent = expr + ' ='; expr = String(r); res.textContent = expr; res.style.opacity = 1; return; } catch (e) { res.textContent = 'Error'; return; } }
      else expr += k;
      upd();
    };
    ['C', '(', ')', '÷', '7', '8', '9', '×', '4', '5', '6', '-', '1', '2', '3', '+', '0', '.', '⌫', '='].forEach(k =>
      keys.append(h('button', { class: k === '=' ? 'eq' : /[÷×\-+()C⌫]/.test(k) ? 'op' : '', onclick: () => press(k) }, k)));
    win.body.append(h('div', { class: 'calc' }, h('div', { class: 'calc-screen' }, ex, res), keys));
    win.el.tabIndex = -1;
    win.el.addEventListener('keydown', e => {
      const map = { Enter: '=', '=': '=', Backspace: '⌫', Escape: 'C', '*': '×', '/': '÷' };
      const k = map[e.key] || (/^[\d.+\-()%^]$/.test(e.key) ? e.key : null);
      if (k) { e.preventDefault(); press(k); }
    });
    setTimeout(() => win.el.focus(), 30);
  }
  OS.register({ id: 'calculator', name: 'Calculator', icon: 'calculator', category: 'Accessories', description: 'Perform calculations', keywords: ['calc', 'math'], window: { width: 320, height: 460, minWidth: 260 }, launch });
})();
