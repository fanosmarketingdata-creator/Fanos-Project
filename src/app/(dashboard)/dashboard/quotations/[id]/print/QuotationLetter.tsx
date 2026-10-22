'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { COMPANY } from '@/lib/company';

type Row = { no: number; sku: string; name: string; qty: string; uom: string; price: string; total: string };
type Total = { label: string; value: string; bold?: boolean };

const DEFAULT_PEMBUKA =
  'Dengan hormat,\n\nKami dari Divisi Project PT Fanosindo Internusa ingin mengajukan Surat Penawaran Harga kepada [attn]. Berikut kami lampirkan jenis barang serta harga untuk project [project].';
const DEFAULT_SYARAT =
  'Syarat dan Ketentuan:\n\n1. Penawaran harga ini berlaku selama 7 hari kalender terhitung sejak tanggal surat penawaran diterbitkan.\n2. Estimasi waktu pengiriman barang adalah 7 hari setelah diterimanya Purchase Order (PO) resmi dan pembayaran sesuai ketentuan.\n3. Pembayaran dilakukan dengan ketentuan sebagai berikut:\na. DP 50% setelah quotation terkirim\nb. Pelunasan setelah semua barang terkirim.\nc. Pembayaran dilakukan melalui transfer ke rekening perusahaan yang akan diinformasikan dalam invoice.\n4. Uang muka (DP) yang telah dibayarkan tidak dapat dikembalikan apabila pembatalan dilakukan setelah proses dimulai.\n5. Hal-hal lain yang belum tercantum dalam syarat dan ketentuan ini akan dibicarakan lebih lanjut dan dituangkan dalam perjanjian tertulis antara kedua belah pihak.';
const DEFAULT_PENUTUP = 'Demikian surat penawaran ini kami sampaikan. Atas perhatian dan pertimbangan anda, kami ucapkan terima kasih.';

// Template cetak Quotation berbentuk Surat Penawaran Harga (mengikuti sistem lama):
// penerima, pembuka, tabel barang, total, syarat & ketentuan, penutup, tanda tangan.
// Isi surat bisa diedit di panel (tidak ikut tercetak) dan diingat per quotation di browser ini.
export default function QuotationLetter(p: {
  quoteId: string;
  docNo: string;
  date: string;
  validUntil: string;
  company: string;
  address: string;
  contactName: string;
  project: string;
  rows: Row[];
  totals: Total[];
}) {
  const key = `quote-print-${p.quoteId}`;
  const [attn, setAttn] = useState(p.contactName);
  const [pembuka, setPembuka] = useState(DEFAULT_PEMBUKA);
  const [syarat, setSyarat] = useState(DEFAULT_SYARAT);
  const [penutup, setPenutup] = useState(DEFAULT_PENUTUP);
  const [signer, setSigner] = useState('');

  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem(key) || 'null');
      if (s) {
        if (typeof s.attn === 'string') setAttn(s.attn);
        if (typeof s.pembuka === 'string') setPembuka(s.pembuka);
        if (typeof s.syarat === 'string') setSyarat(s.syarat);
        if (typeof s.penutup === 'string') setPenutup(s.penutup);
        if (typeof s.signer === 'string') setSigner(s.signer);
      }
    } catch {}
  }, [key]);

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify({ attn, pembuka, syarat, penutup, signer }));
    } catch {}
  }, [key, attn, pembuka, syarat, penutup, signer]);

  function reset() {
    setAttn(p.contactName);
    setPembuka(DEFAULT_PEMBUKA);
    setSyarat(DEFAULT_SYARAT);
    setPenutup(DEFAULT_PENUTUP);
    setSigner('');
  }

  const attnText = attn.trim() || '................';
  const opening = pembuka.replace(/\[attn\]/g, attnText).replace(/\[project\]/g, p.project || '-');

  return (
    <div>
      {/* Panel isi surat — tidak tercetak */}
      <div className="mx-auto mb-4 w-full max-w-[210mm] rounded-xl border border-slate-200 bg-white p-4 print:hidden" data-no-cards>
        <div className="mb-3 flex items-center justify-between">
          <Link href="/dashboard/quotations" className="text-sm font-medium text-slate-500 hover:text-slate-700">← Kembali</Link>
          <div className="flex gap-2">
            <button type="button" onClick={reset} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Reset Default</button>
            <button type="button" onClick={() => window.print()} className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-600">🖨️ Cetak / Simpan PDF</button>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-[11px] font-semibold text-slate-500">Kepada Yth (Nama)
            <input value={attn} onChange={(e) => setAttn(e.target.value)} placeholder="Nama penerima" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] font-normal text-slate-800" />
          </label>
          <label className="text-[11px] font-semibold text-slate-500">Nama Penandatangan
            <input value={signer} onChange={(e) => setSigner(e.target.value)} placeholder="Nama & jabatan (opsional)" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] font-normal text-slate-800" />
          </label>
        </div>
        <label className="mt-3 block text-[11px] font-semibold text-slate-500">Pembuka Surat <span className="font-normal">(gunakan [attn] dan [project])</span>
          <textarea value={pembuka} onChange={(e) => setPembuka(e.target.value)} rows={4} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] font-normal text-slate-800" />
        </label>
        <label className="mt-3 block text-[11px] font-semibold text-slate-500">Syarat &amp; Ketentuan
          <textarea value={syarat} onChange={(e) => setSyarat(e.target.value)} rows={8} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] font-normal text-slate-800" />
        </label>
        <label className="mt-3 block text-[11px] font-semibold text-slate-500">Penutup Surat
          <textarea value={penutup} onChange={(e) => setPenutup(e.target.value)} rows={3} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] font-normal text-slate-800" />
        </label>
      </div>

      {/* Surat */}
      <div data-no-cards className="mx-auto w-full max-w-[210mm] bg-white p-8 text-[12px] leading-relaxed text-black shadow print:max-w-none print:p-0 print:shadow-none">
        <style>{`@page { size: auto; }`}</style>

        <div className="border-b-2 border-black pb-2">
          <div className="text-[18px] font-extrabold tracking-tight">{COMPANY.name}</div>
          <div className="text-[11px]">{COMPANY.address}</div>
        </div>

        <div className="mt-4 grid grid-cols-[auto_1fr] gap-x-3 text-[12px]">
          <div>Nomor</div><div>: {p.docNo}</div>
          <div>Tanggal</div><div>: {p.date}</div>
          <div>Perihal</div><div className="font-bold">: Penawaran Harga{p.project ? ` — ${p.project}` : ''}</div>
          <div>Berlaku s/d</div><div>: {p.validUntil}</div>
        </div>

        <div className="mt-4">
          <div>Kepada Yth,</div>
          <div className="font-bold">{attnText}</div>
          <div className="font-bold">{p.company}</div>
          {p.address && <div>{p.address}</div>}
        </div>

        <div className="mt-4 whitespace-pre-wrap">{opening}</div>

        <table className="mt-3 w-full border-collapse border border-black text-[11px]">
          <thead>
            <tr className="bg-gray-100 [-webkit-print-color-adjust:exact] [print-color-adjust:exact]">
              {['No.', 'Item', 'Deskripsi', 'Qty', 'Unit', 'Harga Satuan', 'Jumlah'].map((h) => (
                <th key={h} className="border border-black px-1.5 py-1 text-center font-bold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {p.rows.map((r) => (
              <tr key={r.no} className="break-inside-avoid">
                <td className="border border-black px-1.5 py-1 text-center align-top">{r.no}</td>
                <td className="border border-black px-1.5 py-1 align-top">{r.sku}</td>
                <td className="border border-black px-1.5 py-1 align-top">{r.name}</td>
                <td className="border border-black px-1.5 py-1 text-center align-top">{r.qty}</td>
                <td className="border border-black px-1.5 py-1 text-center align-top">{r.uom}</td>
                <td className="border border-black px-1.5 py-1 text-right align-top">{r.price}</td>
                <td className="border border-black px-1.5 py-1 text-right align-top">{r.total}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-2 flex justify-end break-inside-avoid">
          <table className="min-w-[240px] border border-black text-[11px]">
            <tbody>
              {p.totals.map((t) => (
                <tr key={t.label}>
                  <td className={`border border-black px-2 py-0.5 ${t.bold ? 'font-bold' : ''}`}>{t.label}</td>
                  <td className={`border border-black px-2 py-0.5 text-right ${t.bold ? 'font-bold' : ''}`}>{t.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {syarat.trim() && <div className="mt-4 whitespace-pre-wrap text-[11px]">{syarat}</div>}
        {penutup.trim() && <div className="mt-4 whitespace-pre-wrap">{penutup}</div>}

        <div className="mt-6 break-inside-avoid">
          <div>Hormat kami,</div>
          <div className="font-bold">PT Fanosindo Internusa</div>
          <div className="h-20" />
          <div className="font-bold underline">{signer.trim() || '................'}</div>
        </div>
      </div>
    </div>
  );
}
