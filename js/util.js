/* MintWeb OS — helpers */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function fmtBytes(n) {
  if (n < 1024) return n + ' B';
  const u = ['KB', 'MB', 'GB', 'TB']; let i = -1;
  do { n /= 1024; i++; } while (n >= 1024 && i < u.length - 1);
  return n.toFixed(n < 10 ? 1 : 0) + ' ' + u[i];
}

function fmtDate(t) {
  const d = new Date(t);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

const store = {
  get(key, def) { try { const v = localStorage.getItem('mintweb.' + key); return v == null ? def : JSON.parse(v); } catch { return def; } },
  set(key, val) { try { localStorage.setItem('mintweb.' + key, JSON.stringify(val)); return true; } catch (e) { console.warn('storage', e); return false; } },
  del(key) { localStorage.removeItem('mintweb.' + key); },
};

/* Minimal, safe Markdown renderer (escapes HTML first). */
function renderMarkdown(src) {
  const blocks = [];
  let text = String(src).replace(/```([\w+-]*)[^\n]*\n([\s\S]*?)(```|$)/g, (_, lang, code) => {
    blocks.push({ lang: lang.toLowerCase(), code: code.replace(/\n$/, '') });
    return `\u0000${blocks.length - 1}\u0000`;
  });
  text = esc(text);
  const inline = s => s
    .replace(/`([^`\n]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  const out = []; let list = null;
  for (const line of text.split('\n')) {
    let m;
    if ((m = line.match(/^\s*([-*]|\d+\.)\s+(.*)/))) {
      const type = /\d/.test(m[1]) ? 'ol' : 'ul';
      if (!list || list.type !== type) { if (list) out.push(`</${list.type}>`); list = { type }; out.push(`<${type}>`); }
      out.push(`<li>${inline(m[2])}</li>`); continue;
    }
    if (list) { out.push(`</${list.type}>`); list = null; }
    if ((m = line.match(/^(#{1,4})\s+(.*)/))) out.push(`<h${m[1].length + 2}>${inline(m[2])}</h${m[1].length + 2}>`);
    else if (/^\u0000\d+\u0000$/.test(line.trim())) out.push(line.trim());
    else if (line.trim() === '') out.push('<br>');
    else out.push(`<p>${inline(line)}</p>`);
  }
  if (list) out.push(`</${list.type}>`);
  let html = out.join('').replace(/(<br>)+/g, '<br>');
  html = html.replace(/\u0000(\d+)\u0000/g, (_, i) => {
    const b = blocks[+i];
    return `<div class="codeblock" data-lang="${esc(b.lang)}"><div class="codebar"><span>${esc(b.lang || 'code')}</span><span class="codebtns"></span></div><pre><code>${esc(b.code)}</code></pre></div>`;
  });
  return { html, blocks };
}

function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }

/* Safe arithmetic evaluator (no eval of arbitrary code). */
function safeMath(expr) {
  const s = String(expr).replace(/\s+/g, '').replace(/×/g, '*').replace(/÷/g, '/').replace(/\^/g, '**').replace(/,/g, '.');
  if (!/^[\d+\-*/().%e]*(?:(?:sqrt|sin|cos|tan|log|ln|abs|pi|PI|E)[\d+\-*/().%e]*)*$/i.test(s) || !s) throw new Error('Invalid expression');
  const fn = new Function('sqrt,sin,cos,tan,log,ln,abs,pi,PI,E', `"use strict";return (${s.replace(/(\d+(?:\.\d+)?)%/g, '($1/100)')});`);
  const r = fn(Math.sqrt, Math.sin, Math.cos, Math.tan, Math.log10, Math.log, Math.abs, Math.PI, Math.PI, Math.E);
  if (typeof r !== 'number' || !isFinite(r)) throw new Error('Math error');
  return Math.round(r * 1e12) / 1e12;
}
