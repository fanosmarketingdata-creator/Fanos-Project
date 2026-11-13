// Audit kosakata: cari teks di tampilan yang belum ada terjemahannya.
//   node scripts/i18n-audit.mjs            -> ringkasan + daftar
//   node scripts/i18n-audit.mjs --json     -> keluaran JSON (untuk pengolahan)
// Teks Indonesia yang belum ada di locales/en.ts dan teks Inggris yang belum ada di locales/id.ts dilaporkan.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import ts from 'typescript';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const i18nDir = path.join(root, 'src/lib/i18n');

// --- muat dict.ts (TypeScript) tanpa build ---
const cache = {};
function load(file) {
  if (cache[file]) return cache[file].exports;
  const src = fs.readFileSync(file, 'utf8');
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const mod = { exports: {} };
  cache[file] = mod;
  const req = (p) => {
    if (p.startsWith('.')) {
      let f = path.resolve(path.dirname(file), p);
      if (!fs.existsSync(f)) f += '.ts';
      return load(f);
    }
    return createRequire(import.meta.url)(p);
  };
  new Function('exports', 'require', 'module', js)(mod.exports, req, mod);
  return mod.exports;
}
const { translateText, translateTextId } = load(path.join(i18nDir, 'dict.ts'));

// --- ambil kandidat teks dari sumber ---
const files = [];
(function walk(d) {
  for (const n of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, n.name);
    if (n.isDirectory()) { if (!['node_modules', '.next', 'i18n', 'api'].includes(n.name)) walk(p); }
    else if (/\.(tsx|ts)$/.test(n.name) && !/\.d\.ts$/.test(n.name)) files.push(p);
  }
})(path.join(root, 'src'));

const found = new Map(); // teks -> Set(file)
const add = (txt, f) => {
  const s = txt.replace(/\s+/g, ' ').trim();
  if (!s || s.length < 2 || s.length > 220) return;
  if (/\$\{|[{}]|^https?:|^[\w./-]+\.(png|jpg|svg|css|js|tsx?)$|^\/|^#|^\d+([.,:\-\/ ]\d+)*$/.test(s)) return;
  if (!/[A-Za-z]{2}/.test(s)) return;
  // buang potongan kode yang tidak sengaja tertangkap (generik TypeScript, hook, dsb.)
  if (/[;=]|\buse[A-Z]|\bconst\b|\breturn\b|=>|\(\)|\bnew [A-Z]|\bas \w|\|\||&&|\?\.|\bfunction\b|\bnull\b|\bundefined\b/.test(s)) return;
  if (/[)\]]\s*[;,]?$/.test(s) && /[(\[]/.test(s)) return;
  if (/^[a-z][a-zA-Z0-9_]*$/.test(s) && !/[A-Z]/.test(s.slice(1)) && s.length < 4) return;
  if (!found.has(s)) found.set(s, new Set());
  found.get(s).add(path.relative(root, f));
};
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  let m;
  const jsx = />([^<>{}]+)</g;
  while ((m = jsx.exec(src))) add(m[1], f);
  const attr = /\b(?:placeholder|title|aria-label|alt|label|confirmLabel|question|note|itemName|description|hint|emptyText|subtitle)=(["'])((?:(?!\1).)+)\1/g;
  while ((m = attr.exec(src))) add(m[2], f);
  const lit = /\b(?:toast|setError|setMsg|setMessage|alert|error|label|title|placeholder|message|text|name|desc|hint)\s*[:(]\s*(["'`])((?:(?!\1)[^\n\\]|\\.)+)\1/g;
  while ((m = lit.exec(src))) add(m[2], f);
}

// --- klasifikasi bahasa (heuristik) ---
const ID_WORDS = new Set('no jl perlu telah lalu judul buka keluarkan jadikan informasi surat jalan retur giro bukti apakah format didukung menjadi supaya yang dan untuk tidak dengan belum sudah harus silakan atau ini itu dari ke di pada akan bisa dapat semua baru lama buat simpan hapus tambah ubah batal cari pilih isi wajib nama tanggal jumlah harga total keterangan catatan alamat nomor kode jenis tipe nilai bulan tahun hari minggu masuk keluar kembali lanjut selesai mulai terkirim gagal berhasil periksa pastikan mohon anda kami kita sedang sebelum setelah jika karena maka tersedia kosong lihat detail daftar data laporan pengiriman pembelian penjualan pembayaran penerimaan persetujuan pengguna perusahaan proyek pelanggan pemasok barang produk gudang stok kategori satuan'.split(' '));
const EN_WORDS = new Set('the and for with not are is was has have this that from to of in on at by please select enter search add edit delete save cancel back next previous new all none no yes your you our we will can must should required invalid failed success error loading total date name address phone email number code type status amount price quantity description notes list view details settings create update remove upload download export import print close open confirm select choose'.split(' '));
// Kata yang sama di dua bahasa / istilah baku: tidak perlu diterjemahkan.
const SAME = new Set('status edit email master data no no. total item items detail project client brand invoice quotation dashboard admin sku uom qty cbm nw gw pdf excel boq ppn pph npwp top logo user role staff stock deal id po so'.split(' '));
function guess(s) {
  const lower = s.toLowerCase().replace(/[:.]+$/, '');
  if (SAME.has(lower) || lower.split(/\s+/).every((x) => SAME.has(x))) return 'neutral';
  const w = s.toLowerCase().match(/[a-z]+/g) || [];
  let i = 0, e = 0;
  for (const x of w) { if (ID_WORDS.has(x)) i++; if (EN_WORDS.has(x)) e++; }
  if (i > e) return 'id';
  if (e > i) return 'en';
  return 'neutral';
}

const needEn = []; // teks Indonesia belum ada English-nya
const needId = []; // teks Inggris belum ada Indonesia-nya
for (const [s, fs_] of found) {
  const g = guess(s);
  if (g === 'id' && translateText(s) === s) needEn.push([s, [...fs_]]);
  if (g === 'en' && translateText(s) === s && translateTextId(s) === s) needId.push([s, [...fs_]]);
}

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ needEn, needId }, null, 1));
} else {
  const show = (title, arr) => {
    console.log(`\n== ${title}: ${arr.length} ==`);
    for (const [s, f] of arr) console.log(`- ${s}   [${f[0]}${f.length > 1 ? ` +${f.length - 1}` : ''}]`);
  };
  show('Teks Indonesia BELUM ada di locales/en.ts', needEn);
  show('Teks Inggris BELUM ada di locales/id.ts', needId);
  console.log(`\nTotal kandidat teks: ${found.size}`);
}
process.exit(process.argv.includes('--strict') && (needEn.length || needId.length) ? 1 : 0);
