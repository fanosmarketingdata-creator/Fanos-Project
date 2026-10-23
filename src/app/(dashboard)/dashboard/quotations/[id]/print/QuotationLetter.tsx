'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type Lang = 'id' | 'en';
type Row = { no: number; sku: string; name: string; qty: string; uom: string; price: string; total: string };
type Disc = { label?: string; percent: number; kind?: string };
type Charge = { label?: string; amount: number };

const rp = (n: number) => 'Rp' + Math.round(n).toLocaleString('id-ID');

const T = {
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
}) {
  const key = `quote-print-v2-${p.quoteId}`;
  const [lang, setLang] = useState<Lang>('id');
  const [attn, setAttn] = useState(p.contactName);
  const [pembuka, setPembuka] = useState<string>(T.id.pembuka);
  const [syarat, setSyarat] = useState<string>(T.id.syarat);
  const [penutup, setPenutup] = useState<string>(T.id.penutup);
  const [signer, setSigner] = useState(p.signerName);
  const [role, setRole] = useState(p.signerRole);

  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem(key) || 'null');
      if (!s) return;
      if (s.lang === 'en' || s.lang === 'id') setLang(s.lang);
      if (typeof s.attn === 'string') setAttn(s.attn);
      if (typeof s.pembuka === 'string') setPembuka(s.pembuka);
      if (typeof s.syarat === 'string') setSyarat(s.syarat);
      if (typeof s.penutup === 'string') setPenutup(s.penutup);
      if (typeof s.signer === 'string') setSigner(s.signer);
      if (typeof s.role === 'string') setRole(s.role);
    } catch {}
  }, [key]);
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify({ lang, attn, pembuka, syarat, penutup, signer, role }));
    } catch {}
  }, [key, lang, attn, pembuka, syarat, penutup, signer, role]);

  // Ganti bahasa: teks yang masih default ikut diterjemahkan, teks yang sudah diedit dibiarkan.
  function switchLang(next: Lang) {
    if (next === lang) return;
    const from = T[lang], to = T[next];
    if (pembuka === from.pembuka) setPembuka(to.pembuka);
    if (syarat === from.syarat) setSyarat(to.syarat);
    if (penutup === from.penutup) setPenutup(to.penutup);
    setLang(next);
  }
  function reset() {
    setAttn(p.contactName);
    setPembuka(T[lang].pembuka);
    setSyarat(T[lang].syarat);
    setPenutup(T[lang].penutup);
    setSigner(p.signerName);
    setRole(p.signerRole);
  }

  const t = T[lang];
  const attnText = attn.trim() || '................';
  const opening = pembuka.replace(/\[attn\]/g, attnText).replace(/\[project\]/g, p.project || '-');
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
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
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

  return (
    <div className="ql" style={{ fontFamily: "'Outfit', 'Segoe UI', Arial, sans-serif" }}>
      <style>{`
        .ql, .ql * { font-family: 'Outfit', 'Segoe UI', Arial, sans-serif !important; }
        @page { size: A4; margin: 12mm 14mm 16mm; @bottom-left { content: "PT Fanosindo Internusa — Lighting & Electrical Consultant"; font: 8px 'Outfit', sans-serif; color: #888; }
          @bottom-right { content: "${p.docNo} | " "${lang === 'id' ? 'hal.' : 'page'} " counter(page) " ${lang === 'id' ? 'dari' : 'of'} " counter(pages); font: 8px 'Outfit', sans-serif; color: #888; } }
        .ql-sheet { max-width: 210mm; margin: 0 auto; background: #fff; padding: 12mm 14mm; box-shadow: 0 1px 8px rgba(0,0,0,.12); font-size: 12px; color: #000; line-height: 1.55; }
        .ql-sheet table.layout { width: 100%; border-collapse: collapse; }
        .ql-sheet table.items { width: 100%; border-collapse: collapse; font-size: 11px; }
        .ql-sheet table.items th { background: ${NAVY}; color: #fff; padding: 6px 6px; font-weight: 600; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .ql-sheet table.items td { border: 1px solid #d4d4d8; padding: 5px 7px; vertical-align: top; }
        .ql-sheet table.items tr { break-inside: avoid; }
        .ql-screen-foot { display: flex; justify-content: space-between; margin-top: 18px; padding-top: 4px; border-top: 1px solid #e5e5e5; font-size: 9px; color: #888; }
        .ql-break { break-before: page; }
        @media print {
          html, body, main { background: #fff !important; }
          .ql-sheet { box-shadow: none; padding: 0; max-width: none; }
          .ql-screen-foot, .ql-sep { display: none !important; }
        }
        .ql-sep { height: 18px; }
      `}</style>

      <div className="mx-auto mb-4 w-full max-w-[210mm] rounded-xl border border-slate-200 bg-white p-4 print:hidden" data-no-cards data-no-i18n>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <Link href="/dashboard/quotations" className="text-sm font-medium text-slate-500 hover:text-slate-700">← Kembali</Link>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex overflow-hidden rounded-lg border border-slate-200 text-sm font-semibold">
              {(['id', 'en'] as Lang[]).map((l) => (
                <button key={l} type="button" onClick={() => switchLang(l)} className={`px-3 py-2 ${lang === l ? 'bg-brand-500 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
                  {l === 'id' ? 'Indonesia' : 'English'}
                </button>
              ))}
            </div>
            <button type="button" onClick={reset} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Reset Default</button>
            <button type="button" onClick={() => window.print()} className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-600">🖨️ Cetak / Simpan PDF</button>
          </div>
        </div>
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
          <textarea value={pembuka} onChange={(e) => setPembuka(e.target.value)} rows={4} className={inputCls} /></label>
        <label className="mt-3 block text-[11px] font-semibold uppercase text-slate-500">Syarat &amp; Ketentuan
          <textarea value={syarat} onChange={(e) => setSyarat(e.target.value)} rows={8} className={inputCls} /></label>
        <label className="mt-3 block text-[11px] font-semibold uppercase text-slate-500">Penutup Surat
          <textarea value={penutup} onChange={(e) => setPenutup(e.target.value)} rows={3} className={inputCls} /></label>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="text-[11px] font-semibold uppercase text-slate-500">Nama Penandatangan<input value={signer} onChange={(e) => setSigner(e.target.value)} className={inputCls} /></label>
          <label className="text-[11px] font-semibold uppercase text-slate-500">Jabatan<input value={role} onChange={(e) => setRole(e.target.value)} className={inputCls} /></label>
        </div>
      </div>

      <div className="ql-sheet" data-no-cards data-no-i18n>
        {/* Halaman 1: surat + tabel */}
        <table className="layout">
          <thead><tr><td><Head /></td></tr></thead>
          <tbody>
            <tr><td>
              <div style={{ textAlign: 'center', fontSize: 15, fontWeight: 700, textDecoration: 'underline', letterSpacing: '1.5px', margin: '8px 0 16px' }}>{t.title}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>{t.to}</span><span>{date}</span></div>
              <div style={{ fontWeight: 700, textDecoration: 'underline', marginTop: 8 }}>{attnText}</div>
              <div style={{ textDecoration: 'underline', marginTop: 4 }}>{p.company}</div>
              <div style={{ whiteSpace: 'pre-wrap', textAlign: 'justify', margin: '14px 0' }}>{opening}</div>

              <table className="items">
                <thead>
                  <tr>{t.cols.map((h) => <th key={h}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {p.rows.map((r) => (
                    <tr key={r.no}>
                      <td style={{ textAlign: 'center' }}>{r.no}</td>
                      <td>{r.sku}</td>
                      <td>{r.name}</td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{r.price}</td>
                      <td style={{ textAlign: 'center' }}>{r.qty}</td>
                      <td style={{ textAlign: 'center' }}>{r.uom}</td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{r.total}</td>
                    </tr>
                  ))}
                  <tr style={{ background: '#f4f4f5', fontWeight: 700 }}>
                    <td colSpan={6} style={{ textAlign: 'right' }}>{t.total}</td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{rp(p.subtotal)}</td>
                  </tr>
                  {extra.map((x, i) => (
                    <tr key={i} style={{ background: '#f4f4f5' }}>
                      <td colSpan={6} style={{ textAlign: 'right' }}>{x.label}</td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{x.value}</td>
                    </tr>
                  ))}
                  <tr style={{ background: '#e8eaf6', fontWeight: 700 }}>
                    <td colSpan={6} style={{ textAlign: 'right' }}>{t.grand}</td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap', color: NAVY }}>{rp(grand)}</td>
                  </tr>
                </tbody>
              </table>
              <div className="ql-screen-foot"><span>PT Fanosindo Internusa — Lighting &amp; Electrical Consultant</span><span>{p.docNo} | {t.page(1, 2)}</span></div>
              <div className="ql-sep" />
            </td></tr>
          </tbody>
        </table>
        {/* Halaman 2: syarat, penutup, tanda tangan (kop diulang) */}
        <table className="layout ql-break">
          <thead><tr><td><Head /></td></tr></thead>
          <tbody>
            <tr><td>
              <div style={{ whiteSpace: 'pre-wrap', fontSize: 11.5, marginTop: 6 }}>{syarat}</div>
              <div style={{ whiteSpace: 'pre-wrap', marginTop: 18 }}>{penutup}</div>
              <div style={{ marginTop: 22, breakInside: 'avoid' }}>
                <div>{t.regards}</div>
                <div>{t.slogan}</div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo-fanos.png" alt="" style={{ height: 24, marginTop: 10 }} />
                <div style={{ width: 150, borderTop: '1px solid #000', marginTop: 8, paddingTop: 3, fontWeight: 700 }}>{signer || '................'}</div>
                <div style={{ fontSize: 10.5, color: '#444' }}>{role}</div>
              </div>
              <div className="ql-screen-foot"><span>PT Fanosindo Internusa — Lighting &amp; Electrical Consultant</span><span>{p.docNo} | {t.page(2, 2)}</span></div>
            </td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
