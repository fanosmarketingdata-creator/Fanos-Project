// Teks kaya ringan (bold, italic, underline, list, indent) untuk isi surat.
// Disimpan sebagai string HTML berawalan RT_MARK. String tanpa awalan dianggap teks biasa (data lama).
export const RT_MARK = '<!--rt-->';

export const isRich = (v: string) => v.startsWith(RT_MARK);

export const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Teks biasa -> HTML (satu baris = satu <div>, baris kosong = jarak). */
export function plainToHtml(v: string): string {
  return v.split('\n').map((l) => (l.trim() ? `<div>${escapeHtml(l)}</div>` : '<div><br></div>')).join('');
}

/** Ubah nilai tersimpan (teks biasa / HTML) menjadi nilai berawalan RT_MARK. */
export function toRich(v: string): string {
  return isRich(v) ? v : RT_MARK + plainToHtml(v);
}

const ALLOWED = new Set(['b', 'strong', 'i', 'em', 'u', 's', 'strike', 'ul', 'ol', 'li', 'br', 'div', 'p', 'blockquote', 'span']);

/** Whitelist tag & atribut (deterministik, jalan di server maupun browser). */
export function sanitizeHtml(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, '')
    .replace(/<\/?([a-zA-Z0-9]+)([^>]*)>/g, (m, tag: string, attrs: string) => {
      const t = tag.toLowerCase();
      if (!ALLOWED.has(t)) return '';
      if (m.startsWith('</')) return `</${t}>`;
      let out = `<${t}`;
      if (t === 'ol') {
        const ty = /type\s*=\s*["']?([aAiI1])["']?/.exec(attrs);
        if (ty) out += ` type="${ty[1]}"`;
      }
      const st = /style\s*=\s*"([^"]*)"|style\s*=\s*'([^']*)'/.exec(attrs);
      if (st) {
        const keep = (st[1] ?? st[2] ?? '')
          .split(';')
          .map((x) => x.trim())
          .filter((x) => /^(text-align|margin-left|padding-left|text-indent)\s*:\s*[a-z0-9.\s%-]+$/i.test(x));
        if (keep.length) out += ` style="${keep.join('; ')}"`;
      }
      return out + '>';
    });
}

/** HTML siap tampil untuk sebuah nilai (teks biasa maupun rich). */
export function valueToHtml(v: string, vars: Record<string, string> = {}): string {
  let html = isRich(v) ? sanitizeHtml(v.slice(RT_MARK.length)) : plainToHtml(v);
  for (const [k, val] of Object.entries(vars)) html = html.split(`[${k}]`).join(escapeHtml(val));
  return html;
}
