'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import RichTextEditor from '@/components/RichTextEditor';
import Select from '@/components/ui/Select';
import { RT_MARK, isRich, toRich, valueToHtml } from '@/lib/rich-text';

type Lang = 'id' | 'en';
type Row = { no: number; sku: string; name: string; qty: string; uom: string; price: string; total: string };
type Disc = { label?: string; percent: number; kind?: string };
type Charge = { label?: string; amount: number };

const rp = (n: number) => 'Rp' + Math.round(n).toLocaleString('id-ID');

const T_PLAIN = {
  id: {
    title: 'Surat Penawaran Harga', to: 'Kepada Yth,', cols: ['No', 'Code', 'Item', 'Harga Jual', 'Qty', 'Satuan', 'Total'],
    total: 'TOTAL', grand: 'GRAND TOTAL', discount: 'Diskon', tax: 'Pajak', regards: 'Hormat kami,', slogan: 'Salam "Sukses Bersama"', page: (a: number | string, b: number | string) => `hal. ${a} dari ${b}`,
    pembuka: 'Dengan hormat,\n\nKami dari Divisi Project PT Fanosindo Internusa ingin mengajukan Surat Penawaran Harga kepada [attn]. Berikut kami lampirkan jenis barang serta harga untuk project [project].',
    syarat: 'Syarat dan Ketentuan:\n\n1. Penawaran harga ini berlaku selama 7 hari kalender terhitung sejak tanggal surat penawaran diterbitkan.\n2. Estimasi waktu pengiriman barang adalah 7 hari setelah diterimanya Purchase Order (PO) resmi dan pembayaran sesuai ketentuan.\n3. Pembayaran dilakukan dengan ketentuan sebagai berikut:\na. DP 50% setelah quotation terkirim\nb. Pelunasan setelah semua barang terkirim.\nc. Pembayaran dilakukan melalui transfer ke rekening perusahaan yang akan diinformasikan dalam invoice.\n4. Uang muka (DP) yang telah dibayarkan tidak dapat dikembalikan apabila pembatalan dilakukan setelah proses dimulai.\n5. Hal-hal lain yang belum tercantum dalam syarat dan ketentuan ini akan dibicarakan lebih lanjut dan dituangkan dalam perjanjian tertulis antara kedua belah pihak.',
    penutup: 'Demikian surat penawaran ini kami sampaikan. Atas perhatian dan pertimbangan anda, kami ucapkan terima kasih.',
  },
  en: {
    title: 'Price Quotation Letter', to: 'To,', cols: ['No', 'Code', 'Item', 'Unit Price', 'Qty', 'Unit', 'Total'],
    total: 'TOTAL', grand: 'GRAND TOTAL', discount: 'Discount', tax: 'Tax', regards: 'Best regards,', slogan: 'Salam "Sukses Bersama"', page: (a: number | string, b: number | string) => `page ${a} of ${b}`,
    pembuka: 'Dear Sir/Madam,\n\nWe from the Project Division of PT Fanosindo Internusa would like to submit a Price Quotation to [attn]. Please find attached the items and prices for the project [project].',
    syarat: 'Terms and Conditions:\n\n1. This price quotation is valid for 7 calendar days from the date the quotation letter is issued.\n2. Estimated delivery time is 7 days after receipt of an official Purchase Order (PO) and payment in accordance with the terms.\n3. Payment is made under the following terms:\na. 50% down payment (DP) after the quotation is sent\nb. Final payment after all goods have been delivered.\nc. Payment is made by transfer to the company account, which will be stated in the invoice.\n4. A down payment (DP) that has been paid is non-refundable if cancellation occurs after the process has started.\n5. Any matters not covered in these terms and conditions will be discussed further and set out in a written agreement between both parties.',
    penutup: 'We hereby submit this quotation letter. Thank you for your attention and consideration.',
  },
} as const;

// Default isi surat dalam bentuk teks kaya (daftar bernomor + sub-daftar huruf), bukan lagi teks biasa.
const li = (x: string) => `<li>${x}</li>`;
const richSyarat = (head: string, items: string[], pay: string[], tail: string[], idx: number) =>
  RT_MARK + `<div>${head}</div><div><br></div><ol>` + items.slice(0, idx).map(li).join('') +
  `<li>${items[idx]}<ol type="a">${pay.map(li).join('')}</ol></li>` + tail.map(li).join('') + '</ol>';
const T = {
  id: {
    ...T_PLAIN.id,
    pembuka: toRich(T_PLAIN.id.pembuka), penutup: toRich(T_PLAIN.id.penutup),
    syarat: richSyarat('Syarat dan Ketentuan:', [
      'Penawaran harga ini berlaku selama 7 hari kalender terhitung sejak tanggal surat penawaran diterbitkan.',
      'Estimasi waktu pengiriman barang adalah 7 hari setelah diterimanya Purchase Order (PO) resmi dan pembayaran sesuai ketentuan.',
      'Pembayaran dilakukan dengan ketentuan sebagai berikut:',
    ], ['DP 50% setelah quotation terkirim', 'Pelunasan setelah semua barang terkirim.', 'Pembayaran dilakukan melalui transfer ke rekening perusahaan yang akan diinformasikan dalam invoice.'], [
      'Uang muka (DP) yang telah dibayarkan tidak dapat dikembalikan apabila pembatalan dilakukan setelah proses dimulai.',
      'Hal-hal lain yang belum tercantum dalam syarat dan ketentuan ini akan dibicarakan lebih lanjut dan dituangkan dalam perjanjian tertulis antara kedua belah pihak.',
    ], 2),
  },
  en: {
    ...T_PLAIN.en,
    pembuka: toRich(T_PLAIN.en.pembuka), penutup: toRich(T_PLAIN.en.penutup),
    syarat: richSyarat('Terms and Conditions:', [
      'This price quotation is valid for 7 calendar days from the date the quotation letter is issued.',
      'Estimated delivery time is 7 days after receipt of an official Purchase Order (PO) and payment in accordance with the terms.',
      'Payment is made under the following terms:',
    ], ['50% down payment (DP) after the quotation is sent', 'Final payment after all goods have been delivered.', 'Payment is made by transfer to the company account, which will be stated in the invoice.'], [
      'A down payment (DP) that has been paid is non-refundable if cancellation occurs after the process has started.',
      'Any matters not covered in these terms and conditions will be discussed further and set out in a written agreement between both parties.',
    ], 2),
  },
} as const;

export default function QuotationLetter(p: {
  quoteId: string;
  docNo: string;
  dateIso: string;
  company: string;
  clientNo: string;
  contactName: string;
  project: string;
  rows: Row[];
  subtotal: number;
  discounts: Disc[];
  charges: Charge[];
  signerName: string;
  signerRole: string;
  templates: { id: string; name: string; lang: 'id' | 'en'; content: string; is_default: boolean }[];
}) {
  const key = `quote-print-v2-${p.quoteId}`;
  const [lang, setLang] = useState<Lang>('id');
  const [attn, setAttn] = useState(p.contactName);
  const [pembuka, setPembuka] = useState<string>(T.id.pembuka as string);
  const [syarat, setSyarat] = useState<string>(T.id.syarat);
  const [penutup, setPenutup] = useState<string>(T.id.penutup);
  const [tplId, setTplId] = useState(''); // '' = bawaan sistem
  const [signer, setSigner] = useState(p.signerName);
  const [role, setRole] = useState(p.signerRole);

  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem(key) || 'null');
      if (!s) {
        // Belum pernah dicetak: pakai template default (bila ada).
        const d = p.templates.find((t) => t.is_default);
        if (d) { setTplId(d.id); setSyarat(d.content); setLang(d.lang); }
        return;
      }
      if (typeof s.tplId === 'string' && p.templates.some((t) => t.id === s.tplId)) setTplId(s.tplId);
      if (s.lang === 'en' || s.lang === 'id') setLang(s.lang);
      if (typeof s.attn === 'string') setAttn(s.attn);
      // Nilai lama berupa teks biasa: yang masih sama dengan default lama diganti default baru (rich), sisanya dikonversi.
      const mig = (v: string, k: 'pembuka' | 'syarat' | 'penutup') => {
        if (isRich(v)) return v;
        if (v === T_PLAIN.id[k]) return T.id[k];
        if (v === T_PLAIN.en[k]) return T.en[k];
        return toRich(v);
      };
      if (typeof s.pembuka === 'string') setPembuka(mig(s.pembuka, 'pembuka'));
      if (typeof s.syarat === 'string') setSyarat(mig(s.syarat, 'syarat'));
      if (typeof s.penutup === 'string') setPenutup(mig(s.penutup, 'penutup'));
      if (typeof s.signer === 'string') setSigner(s.signer);
      if (typeof s.role === 'string') setRole(s.role);
    } catch {}
  }, [key]);
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify({ lang, attn, pembuka, syarat, penutup, signer, role, tplId }));
    } catch {}
  }, [key, lang, attn, pembuka, syarat, penutup, signer, role, tplId]);

  // Ganti bahasa: teks yang masih default ikut diterjemahkan, teks yang sudah diedit dibiarkan.
  function switchLang(next: Lang) {
    if (next === lang) return;
    const from = T[lang], to = T[next];
    if (pembuka === from.pembuka) setPembuka(to.pembuka);
    if (syarat === from.syarat) setSyarat(to.syarat);
    if (penutup === from.penutup) setPenutup(to.penutup);
    setLang(next);
  }
  function pickTemplate(id: string) {
    setTplId(id);
    const t = p.templates.find((x) => x.id === id);
    setSyarat(t ? t.content : T[lang].syarat);
  }
  function reset() {
    setAttn(p.contactName);
    setPembuka(T[lang].pembuka);
    setSyarat(T[lang].syarat);
    setTplId('');
    setPenutup(T[lang].penutup);
    setSigner(p.signerName);
    setRole(p.signerRole);
  }

  const t = T[lang];
  const attnText = attn.trim() || '................';
  const openingHtml = valueToHtml(pembuka, { attn: attnText, project: p.project || '-' });
  const date = new Date(p.dateIso + 'T00:00:00').toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  // Grand Total = Subtotal − Diskon + Pajak (+ Biaya tambahan); pajak dihitung dari Subtotal − Diskon.
  let disc = 0;
  const discRows = p.discounts.filter((d) => d.kind !== 'tax').map((d) => {
    const a = (p.subtotal * (d.percent || 0)) / 100;
    disc += a;
    return { label: `${t.discount}${d.label ? ' ' + d.label : ''} (${d.percent}%)`, value: '-' + rp(a) };
  });
  let tax = 0;
  const taxRows = p.discounts.filter((d) => d.kind === 'tax').map((d) => {
    const a = ((p.subtotal - disc) * (d.percent || 0)) / 100;
    tax += a;
    return { label: `${t.tax}${d.label ? ' ' + d.label : ''} (${d.percent}%)`, value: '+' + rp(a) };
  });
  let chg = 0;
  const chgRows = p.charges.map((c) => {
    chg += c.amount || 0;
    return { label: c.label || 'Biaya', value: rp(c.amount) };
  });
  const grand = p.subtotal - disc + tax + chg;
  const extra = [...discRows, ...taxRows, ...chgRows];

  const NAVY = '#1a237e';
  const inputCls = 'mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] font-normal text-slate-800';
  const roCls = inputCls + ' bg-slate-100 text-slate-500';

  const Head = () => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: 8, borderBottom: "2px solid #000", marginBottom: 14 }}>
      <div>
        <div style={{ fontSize: 24, fontWeight: 700, color: NAVY, letterSpacing: '-0.3px', lineHeight: 1.1 }}>PT Fanosindo Internusa</div>
        <div style={{ fontSize: 9.5, color: '#555', marginTop: 4, lineHeight: 1.5 }}>
          Komplek Rukan Permata Ancol<br />Jl. R.E. Martadinata Blok C no 10, Pademangan<br />Jakarta Utara - Indonesia
        </div>
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo-fanos.png" alt="FANOS" style={{ height: 40 }} />
    </div>
  );

  // ---- Blok-blok isi surat (dipecah per halaman ala Word) ----
  type Block = { kind: 'blk' | 'row'; keep?: boolean; node: React.ReactNode };
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const blocks: Block[] = useMemo(() => {
    if (!mounted) return [];
    const out: Block[] = [];
    out.push({
      kind: 'blk', node: (
        <div>
          <div style={{ textAlign: 'center', fontSize: 15, fontWeight: 700, textDecoration: 'underline', letterSpacing: '1.5px', margin: '8px 0 16px' }}>{t.title}</div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>{t.to}</span><span>{date}</span></div>
          <div style={{ fontWeight: 700, textDecoration: 'underline', marginTop: 8 }}>{attnText}</div>
          <div style={{ textDecoration: 'underline', marginTop: 4 }}>{p.company}</div>
        </div>
      ),
    });
    splitHtml(openingHtml).forEach((h, i, arr) => out.push({ kind: 'blk', node: <div className="rt-view" style={{ textAlign: 'justify', marginTop: i === 0 ? 14 : 0, marginBottom: i === arr.length - 1 ? 14 : 0 }} dangerouslySetInnerHTML={{ __html: h }} /> }));
    p.rows.forEach((r) => out.push({
      kind: 'row', node: (
        <tr key={`r${r.no}`}>
          <td style={{ textAlign: 'center' }}>{r.no}</td>
          <td>{r.sku}</td>
          <td>{r.name}</td>
          <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{r.price}</td>
          <td style={{ textAlign: 'center' }}>{r.qty}</td>
          <td style={{ textAlign: 'center' }}>{r.uom}</td>
          <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{r.total}</td>
        </tr>
      ),
    }));
    out.push({ kind: 'row', node: (
      <tr key="tot" style={{ background: '#f4f4f5', fontWeight: 700 }}>
        <td colSpan={6} style={{ textAlign: 'right' }}>{t.total}</td>
        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{rp(p.subtotal)}</td>
      </tr>
    ) });
    extra.forEach((x, i) => out.push({ kind: 'row', node: (
      <tr key={`x${i}`} style={{ background: '#f4f4f5' }}>
        <td colSpan={6} style={{ textAlign: 'right' }}>{x.label}</td>
        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{x.value}</td>
      </tr>
    ) }));
    out.push({ kind: 'row', node: (
      <tr key="grand" style={{ background: '#e8eaf6', fontWeight: 700 }}>
        <td colSpan={6} style={{ textAlign: 'right' }}>{t.grand}</td>
        <td style={{ textAlign: 'right', whiteSpace: 'nowrap', color: NAVY }}>{rp(grand)}</td>
      </tr>
    ) });
    splitHtml(valueToHtml(syarat)).forEach((h, i) => out.push({
      kind: 'blk', keep: i < 2,
      node: <div className="rt-view" style={{ fontSize: 11.5, marginTop: i === 0 ? 18 : 0 }} dangerouslySetInnerHTML={{ __html: h }} />,
    }));
    splitHtml(valueToHtml(penutup)).forEach((h, i) => out.push({
      kind: 'blk', node: <div className="rt-view" style={{ marginTop: i === 0 ? 18 : 0 }} dangerouslySetInnerHTML={{ __html: h }} />,
    }));
    out.push({
      kind: 'blk', node: (
        <div style={{ marginTop: 22 }}>
          <div>{t.regards}</div>
          <div>{t.slogan}</div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-fanos.png" alt="" style={{ height: 24, marginTop: 10 }} />
          <div style={{ width: 150, borderTop: '1px solid #000', marginTop: 8, paddingTop: 3, fontWeight: 700 }}>{signer || '................'}</div>
          <div style={{ fontSize: 10.5, color: '#444' }}>{role}</div>
        </div>
      ),
    });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, lang, attn, pembuka, syarat, penutup, signer, role, p.rows, p.company, p.docNo, openingHtml, date, grand]);

  // ---- Paginasi: ukur tiap blok lalu isi halaman A4 satu per satu ----
  const measureRef = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState<number[][]>([]);
  const computePages = () => {
    const root = measureRef.current;
    if (!root) return;
    const probe = root.querySelector<HTMLElement>('[data-probe]');
    const headEl = root.querySelector<HTMLElement>('[data-head]');
    const theadEl = root.querySelector<HTMLElement>('[data-thead]');
    if (!probe || !headEl || !theadEl) return;
    const pageH = probe.offsetHeight;
    const mm = pageH / 297;
    const cap = pageH - mm * (12 + 20) - headEl.offsetHeight - 14 * 1.0; // 14px = jarak kop → isi
    const theadH = theadEl.offsetHeight;
    const hs = blocks.map((_, i) => root.querySelector<HTMLElement>(`[data-m="${i}"]`)?.getBoundingClientRect().height ?? 0);
    const res: number[][] = [];
    let cur: number[] = [];
    let used = 0;
    const need = (i: number, list: number[]) => hs[i] + (blocks[i].kind === 'row' && (list.length === 0 || blocks[list[list.length - 1]].kind !== 'row') ? theadH : 0);
    for (let i = 0; i < blocks.length; i++) {
      let h = need(i, cur);
      // blok judul (keep) ikut pindah bila blok berikutnya tidak muat
      const nextKeep = blocks[i].keep && blocks[i + 1] ? hs[i + 1] : 0;
      if (cur.length > 0 && used + h + nextKeep > cap) { res.push(cur); cur = []; used = 0; h = need(i, cur); }
      cur.push(i); used += h;
    }
    if (cur.length) res.push(cur);
    setPages((prev) => (JSON.stringify(prev) === JSON.stringify(res) ? prev : res));
  };
  useLayoutEffect(() => { computePages(); });
  useEffect(() => {
    const f = (document as Document & { fonts?: { ready: Promise<unknown> } }).fonts;
    f?.ready.then(() => computePages());
    // Tinggi blok bisa berubah saat font selesai dimuat → hitung ulang.
    const el = measureRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => computePages());
    ro.observe(el);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  // Skala pratinjau mengikuti lebar panel kanan.
  const rightRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const el = rightRef.current;
    if (!el) return;
    // Satu halaman pas di dalam panel (lebar & tinggi), seperti pratinjau PDF.
    const upd = () => setScale(Math.min(1, Math.max(0.3, Math.min((el.clientWidth - 32) / 794, (el.clientHeight - 32) / 1123))));
    upd();
    const ro = new ResizeObserver(upd);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const colgroup = (
    <colgroup>
      <col style={{ width: '6%' }} /><col style={{ width: '15%' }} /><col style={{ width: '33%' }} /><col style={{ width: '16%' }} />
      <col style={{ width: '7%' }} /><col style={{ width: '9%' }} /><col style={{ width: '14%' }} />
    </colgroup>
  );
  const theadNode = (ref?: boolean) => (
    <thead {...(ref ? { 'data-thead': '' } : {})}><tr>{t.cols.map((h) => <th key={h}>{h}</th>)}</tr></thead>
  );
  const totalPages = Math.max(1, pages.length);
  // Pratinjau menampilkan satu halaman per kali, dengan pager di bawah.
  const [cur, setCur] = useState(0);
  const [curText, setCurText] = useState('1');
  const curSafe = Math.min(cur, totalPages - 1);
  useEffect(() => { setCurText(String(curSafe + 1)); }, [curSafe]);
  const goto = (n: number) => setCur(Math.min(totalPages - 1, Math.max(0, n)));

  return (
    <div className="ql" style={{ fontFamily: "'Outfit', 'Segoe UI', Arial, sans-serif" }}>

      <div className="ql-left print:hidden" data-no-cards data-no-i18n>
        <div className="ql-left-bar">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex overflow-hidden rounded-lg border border-slate-200 text-sm font-semibold">
              {(['id', 'en'] as Lang[]).map((l) => (
                <button key={l} type="button" onClick={() => switchLang(l)} className={`px-3 py-1.5 ${lang === l ? 'bg-brand-500 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
                  {l === 'id' ? 'Indonesia' : 'English'}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={reset} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50">Reset Default</button>
              <button type="button" onClick={() => window.print()} className="rounded-lg bg-brand-500 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-600">🖨️ Cetak</button>
            </div>
          </div>
        </div>
        <div className="ql-left-body">
        <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">Informasi Penerima</div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-[11px] font-semibold uppercase text-slate-500">Project<input value={p.project} readOnly className={roCls} /></label>
          <label className="text-[11px] font-semibold uppercase text-slate-500">Kepada Yth (Nama) <span className="text-red-500">*</span>
            <input value={attn} onChange={(e) => setAttn(e.target.value)} placeholder="Nama penerima" className={inputCls} /></label>
        </div>
        <label className="mt-3 block text-[11px] font-semibold uppercase text-slate-500">Perusahaan
          <input value={`${p.company}${p.clientNo ? ` (${p.clientNo})` : ''}`} readOnly className={roCls} /></label>
        <div className="mb-1 mt-4 text-[11px] font-bold uppercase tracking-wide text-slate-400">Isi Surat</div>
        <label className="block text-[11px] font-semibold uppercase text-slate-500">Pembuka Surat <span className="font-normal normal-case">(gunakan [attn] dan [project])</span>
          </label>
        <RichTextEditor value={pembuka} onChange={setPembuka} minHeight={90} />
        <div className="mt-3 flex items-end justify-between gap-2">
          <label className="block flex-1 text-[11px] font-semibold uppercase text-slate-500">Template Syarat &amp; Ketentuan
            <div className="mt-1 font-normal normal-case">
              <Select value={tplId} onChange={(e) => pickTemplate(e.target.value)}>
                <option value="">Bawaan sistem</option>
                {p.templates.map((t) => (
                  <option key={t.id} value={t.id}>{t.name} ({t.lang === 'en' ? 'EN' : 'ID'}){t.is_default ? ' — default' : ''}</option>
                ))}
              </Select>
            </div>
          </label>
          <Link href="/dashboard/quotation-templates" className="pb-2 text-xs font-medium text-brand-600 hover:underline">Kelola template →</Link>
        </div>
        <label className="mt-3 block text-[11px] font-semibold uppercase text-slate-500">Syarat &amp; Ketentuan
          </label>
        <RichTextEditor value={syarat} onChange={setSyarat} minHeight={200} />
        <label className="mt-3 block text-[11px] font-semibold uppercase text-slate-500">Penutup Surat
          </label>
        <RichTextEditor value={penutup} onChange={setPenutup} minHeight={70} />
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="text-[11px] font-semibold uppercase text-slate-500">Nama Penandatangan<input value={signer} onChange={(e) => setSigner(e.target.value)} className={inputCls} /></label>
          <label className="text-[11px] font-semibold uppercase text-slate-500">Jabatan<input value={role} onChange={(e) => setRole(e.target.value)} className={inputCls} /></label>
        </div>
        </div>
      </div>

      <div className="ql-right" data-no-cards data-no-i18n>
       <div className="ql-stage" ref={rightRef}>
        <div className="ql-pages" style={{ zoom: scale }}>
          {pages.map((idxs, pi) => {
            const groups: { row: boolean; items: number[] }[] = [];
            idxs.forEach((bi) => {
              const row = blocks[bi].kind === 'row';
              const last = groups[groups.length - 1];
              if (last && last.row && row) last.items.push(bi);
              else groups.push({ row, items: [bi] });
            });
            return (
              <section key={pi} className={`ql-page paper${pi === curSafe ? '' : ' ql-hidden'}`}>
                <Head />
                {groups.map((g, gi) =>
                  g.row ? (
                    <table key={gi} className="items">
                      {colgroup}
                      {theadNode()}
                      <tbody>{g.items.map((bi) => blocks[bi].node)}</tbody>
                    </table>
                  ) : (
                    <div key={gi}>{g.items.map((bi) => <div key={bi} style={{ display: 'flow-root' }}>{blocks[bi].node}</div>)}</div>
                  )
                )}
                <div className="ql-foot"><span>PT Fanosindo Internusa — Lighting &amp; Electrical Consultant</span><span>{p.docNo} | {t.page(pi + 1, totalPages)}</span></div>
              </section>
            );
          })}
        </div>
       </div>
        <div className="ql-pager print:hidden">
          <button type="button" onClick={() => goto(0)} disabled={curSafe === 0} aria-label="Halaman pertama">«</button>
          <button type="button" onClick={() => goto(curSafe - 1)} disabled={curSafe === 0} aria-label="Sebelumnya">‹</button>
          <input
            value={curText}
            inputMode="numeric"
            onChange={(e) => setCurText(e.target.value.replace(/\D/g, ''))}
            onBlur={() => goto((parseInt(curText, 10) || 1) - 1)}
            onKeyDown={(e) => { if (e.key === 'Enter') goto((parseInt(curText, 10) || 1) - 1); }}
            aria-label="Nomor halaman"
          />
          <span>/ {totalPages}</span>
          <button type="button" onClick={() => goto(curSafe + 1)} disabled={curSafe >= totalPages - 1} aria-label="Berikutnya">›</button>
          <button type="button" onClick={() => goto(totalPages - 1)} disabled={curSafe >= totalPages - 1} aria-label="Halaman terakhir">»</button>
        </div>
      </div>

      {/* Pengukur tak terlihat: tinggi tiap blok pada lebar isi halaman A4 */}
      {mounted && (
        <div ref={measureRef} className="ql-m" aria-hidden style={{ position: 'absolute', left: -99999, top: 0, visibility: 'hidden', pointerEvents: 'none' }} data-no-cards data-no-i18n>
          <div data-probe style={{ position: 'absolute', width: 1, height: '297mm' }} />
          <div data-head style={{ display: 'flow-root' }}><Head /></div>
          <table className="items">{colgroup}{theadNode(true)}</table>
          {blocks.map((b, i) =>
            b.kind === 'row' ? (
              <table key={i} className="items" data-m={i}>{colgroup}<tbody>{b.node}</tbody></table>
            ) : (
              <div key={i} data-m={i} style={{ display: 'flow-root' }}>{b.node}</div>
            )
          )}
        </div>
      )}
    </div>
  );
}

// Memecah HTML teks kaya menjadi potongan tingkat-atas (daftar dipecah per butir, nomor tetap berlanjut).
function splitHtml(html: string): string[] {
  if (typeof window === 'undefined') return [html];
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
  const out: string[] = [];
  doc.body.childNodes.forEach((n) => {
    if (n.nodeType === 3) {
      if ((n.textContent ?? '').trim()) out.push(`<div>${n.textContent}</div>`);
      return;
    }
    if (n.nodeType !== 1) return;
    const el = n as HTMLElement;
    const tag = el.tagName;
    if ((tag === 'OL' || tag === 'UL') && el.children.length > 1) {
      const start = tag === 'OL' ? Number(el.getAttribute('start') || 1) : 0;
      Array.from(el.children).forEach((li, i) => {
        const w = el.cloneNode(false) as HTMLElement;
        if (tag === 'OL') w.setAttribute('start', String(start + i));
        w.appendChild(li.cloneNode(true));
        out.push(w.outerHTML);
      });
    } else {
      out.push(el.outerHTML);
    }
  });
  return out.length ? out : [''];
}
