// Membuat src/styles/dark.css dari CSS yang ada (light) + scripts/dark-manual.css.
// Jalankan ulang:  node scripts/gen-dark.mjs   (setelah mengubah warna di CSS utama)
import fs from 'node:fs';
import postcss from 'postcss';

const FILES = ['src/app/globals.css', 'src/styles/registry.css', 'src/styles/theme.css', 'src/styles/dash.css', 'src/styles/pm.css'];
const NOT_PAPER = ':not(.paper *)';

// ---------- warna ----------
const named = { white: [255, 255, 255, 1], black: [0, 0, 0, 1] };
function parseColor(tok) {
  tok = tok.trim().toLowerCase();
  if (named[tok]) return [...named[tok]];
  let m = tok.match(/^#([0-9a-f]{3,8})$/);
  if (m) {
    let h = m[1];
    if (h.length === 3 || h.length === 4) h = h.split('').map((c) => c + c).join('');
    if (h.length !== 6 && h.length !== 8) return null;
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1];
  }
  m = tok.match(/^rgba?\(([^)]+)\)$/);
  if (m) {
    const p = m[1].split(/[\s,\/]+/).filter(Boolean).map(parseFloat);
    if (p.length < 3 || p.some(Number.isNaN)) return null;
    return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1];
  }
  return null;
}
function rgb2hsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  let h = 0, s = 0;
  if (mx !== mn) {
    const d = mx - mn;
    s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    if (mx === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (mx === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return [h, s, l];
}
function hsl2rgb(h, s, l) {
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) [r, g, b] = [c, x, 0]; else if (h < 120) [r, g, b] = [x, c, 0]; else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c]; else if (h < 300) [r, g, b] = [x, 0, c]; else [r, g, b] = [c, 0, x];
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const NEUTRAL_H = 228; // kebiruan seperti Midnight Black #090A10

function mapColor(kind, [r, g, b, a]) {
  if (a === 0) return null;
  const [h, s, l] = rgb2hsl(r, g, b);
  let nh = h, ns = s, nl = l;
  const neutral = s < 0.25;
  if (kind === 'bg') {
    if ((r === 255 && g === 255 && b === 255 || r === 0 && g === 0 && b === 0) && a < 0.5) return null; // kilau/overlay tipis
    if (l >= 0.8 || (l >= 0.6 && s >= 0.3)) {
      if (neutral) { nh = NEUTRAL_H; ns = 0.22; nl = 0.075 + (1 - l) * 0.55; }
      else { ns = Math.min(s, 0.45); nl = 0.1 + (1 - l) * 0.5; }
    } else if (l < 0.8 && l >= 0.45 && neutral) { nh = NEUTRAL_H; ns = 0.18; nl = 0.28; }
    else return null;
  } else if (kind === 'text') {
    if (neutral) {
      if (l <= 0.6) { nh = NEUTRAL_H; ns = Math.min(0.2, s + 0.08); nl = 0.93 - l * 0.55; } else return null;
    } else if (l < 0.62) { nl = l < 0.3 ? 0.76 : Math.max(l, 0.68); ns = Math.min(1, s * 0.95); } else return null;
  } else if (kind === 'border') {
    if (l >= 0.7) {
      if (neutral) { nh = NEUTRAL_H; ns = 0.2; nl = 0.13 + (1 - l) * 0.6; }
      else { ns = Math.min(s, 0.4); nl = 0.16 + (1 - l) * 0.55; }
    } else return null;
  }
  const [R, G, B] = hsl2rgb(nh, clamp(ns, 0, 1), clamp(nl, 0, 1));
  return a < 1 ? `rgba(${R}, ${G}, ${B}, ${+a.toFixed(3)})` : '#' + [R, G, B].map((v) => v.toString(16).padStart(2, '0')).join('');
}
const COLOR_RE = /#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)|\b(?:white|black)\b/g;
function convertValue(kind, value) {
  // jangan sentuh url(...)
  const parts = value.split(/(url\([^)]*\))/g);
  let changed = false;
  const out = parts.map((p) => {
    if (p.startsWith('url(')) return p;
    return p.replace(COLOR_RE, (tok) => {
      const c = parseColor(tok);
      if (!c) return tok;
      const n = mapColor(kind, c);
      if (n && n !== tok) { changed = true; return n; }
      return tok;
    });
  }).join('');
  return changed ? out : null;
}
function kindOf(prop) {
  if (/^--/.test(prop)) return null;
  if (/^background(-color|-image)?$/.test(prop)) return 'bg';
  if (/^(color|fill|stroke|caret-color|text-decoration-color|-webkit-text-fill-color)$/.test(prop)) return 'text';
  if (/^(border|outline|column-rule)(-(top|right|bottom|left|inline|block))?(-color)?$/.test(prop)) return 'border';
  return null;
}

// ---------- selector ----------
function prefixSelector(sel) {
  sel = sel.trim();
  if (!sel) return null;
  if (/^(:root|html)$/.test(sel)) return 'html.dark';
  if (/^(html|:root)\s/.test(sel)) return 'html.dark ' + sel.replace(/^(html|:root)\s+/, '');
  let s = 'html.dark ' + sel;
  if (/^body\b/.test(sel)) s = 'html.dark ' + sel; // html.dark body ...
  // sisipkan :not(.paper *) sebelum pseudo-element
  const m = s.match(/(::?(?:before|after|first-line|first-letter|placeholder|selection|-webkit-[a-z-]+|-moz-[a-z-]+)(?:\([^)]*\))?)+\s*$/);
  if (m) {
    const i = s.length - m[0].length;
    return s.slice(0, i) + NOT_PAPER + s.slice(i);
  }
  return s + NOT_PAPER;
}

// ---------- proses ----------
const out = [];
function processRule(rule) {
  const decls = [];
  const shorthands = new Set(); // 'border', 'background', 'outline' yang sudah diemit
  rule.each((n) => {
    if (n.type !== 'decl') return;
    const prop = n.prop.toLowerCase();
    const k = kindOf(prop);
    if (!k) return;
    const nv = convertValue(k, n.value);
    if (nv) {
      decls.push(`  ${n.prop}: ${nv}${n.important ? ' !important' : ''};`);
      if (prop === 'border' || prop === 'background' || prop === 'outline') shorthands.add(prop);
    } else if ([...shorthands].some((s) => prop.startsWith(s + '-'))) {
      // deklarasi sisi/bagian yang ditulis SETELAH shorthand harus tetap menang (mis. border-top biru pada spinner)
      decls.push(`  ${n.prop}: ${n.value}${n.important ? ' !important' : ''};`);
    }
  });
  if (!decls.length) return '';
  const sels = rule.selectors.map(prefixSelector).filter(Boolean);
  if (!sels.length) return '';
  return `${sels.join(',\n')} {\n${decls.join('\n')}\n}\n`;
}
function walk(container, mediaStack = []) {
  let css = '';
  container.each((node) => {
    if (node.type === 'rule') {
      if (node.parent.type === 'atrule' && /keyframes|font-face/.test(node.parent.name)) return;
      const r = processRule(node);
      css += mediaStack.length || node.parent.type === 'atrule' ? r : (r ? `@media screen {\n${r}}\n` : '');
    } else if (node.type === 'atrule') {
      if (/keyframes|font-face|page/.test(node.name)) return;
      if (node.name === 'media') {
        if (/print/.test(node.params)) return;
        const inner = walk(node);
        if (!inner) return;
        const params = /^\s*screen/.test(node.params) ? node.params : 'screen and ' + node.params.replace(/^\s*(?:only\s+)?/, '');
        css += `@media ${params} {\n${inner}}\n`;
      } else if (node.name === 'supports') {
        const inner = walk(node);
        if (inner) css += `@supports ${node.params} {\n${inner}}\n`;
      }
    }
  });
  return css;
}

let generated = '';
for (const f of FILES) {
  const root = postcss.parse(fs.readFileSync(f, 'utf8'));
  const body = walk(root);
  generated += `\n/* ---- dari ${f} ---- */\n` + body;
}
const manual = fs.readFileSync('scripts/dark-manual.css', 'utf8');

// Tailwind utility yang dipakai di TSX
const U = fs.readFileSync('scripts/dark-utilities.json', 'utf8');
const util = JSON.parse(U);
let tw = '';
const esc = (c) => c.replace(/([:\/\[\]#.%])/g, '\\$1');
for (const [cls, decl] of Object.entries(util)) {
  const hover = cls.startsWith('hover:');
  const focus = cls.startsWith('focus:');
  const base = '.' + esc(cls) + (hover ? ':hover' : focus ? ':focus' : '');
  tw += `html.dark ${base}${NOT_PAPER} { ${decl} }\n`;
}

const header = `/* DIBUAT OTOMATIS oleh scripts/gen-dark.mjs — jangan diedit langsung.
   Ubah scripts/dark-manual.css / scripts/dark-utilities.json lalu jalankan: node scripts/gen-dark.mjs
   Palet: Midnight Black #090A10 (60%), Electric Blue #2F6BFF (30%), aksen merah #FF4D4F (10%). */\n`;
fs.writeFileSync('src/styles/dark.css', `${header}@media screen {\n${manual}\n/* ---- utility Tailwind ---- */\n${tw}}\n${generated}`);
console.log('dark.css', (generated.length / 1024).toFixed(0) + ' KB generated');
