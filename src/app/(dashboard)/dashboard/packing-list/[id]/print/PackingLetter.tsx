'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type Lang = 'id' | 'en';
type Row = { no: number; sku: string; name: string; qty: string; uom: string; colli: string; weight: string; remarks: string };

const T = {
  id: { title: 'Packing List', to: 'Kepada Yth,', ship: 'Alamat Pengiriman', no: 'No. Packing List', so: 'No. Sales Order', project: 'Proyek', date: 'Tanggal', up: 'UP', phone: 'Telp',
    cols: ['No', 'Code', 'Item', 'Qty', 'Satuan', 'Koli', 'Berat (Kg)', 'Keterangan'], total: 'TOTAL', notes: 'Catatan', packedBy: 'Dikemas oleh',
    sig: ['Disiapkan (Packing)', 'Diperiksa (Gudang)', 'Pengirim / Ekspedisi', 'Diterima Oleh'], sigName: 'Nama & Tanda Tangan', note1: 'Mohon periksa jumlah dan kondisi barang saat diterima. Keberatan atas kekurangan atau kerusakan barang harap disampaikan paling lambat 2 x 24 jam.', page: (a: number | string, b: number | string) => `hal. ${a} dari ${b}` },
  en: { title: 'Packing List', to: 'To,', ship: 'Ship To', no: 'Packing List No.', so: 'Sales Order No.', project: 'Project', date: 'Date', up: 'Attn', phone: 'Phone',
    cols: ['No', 'Code', 'Item', 'Qty', 'Unit', 'Colli', 'Weight (Kg)', 'Remarks'], total: 'TOTAL', notes: 'Notes', packedBy: 'Packed by',
    sig: ['Prepared (Packing)', 'Checked (Warehouse)', 'Carrier / Courier', 'Received By'], sigName: 'Name & Signature', note1: 'Please check the quantity and condition of the goods upon receipt. Claims for shortage or damage must be submitted within 2 x 24 hours.', page: (a: number | string, b: number | string) => `page ${a} of ${b}` },
} as const;

const NAVY = '#1a237e';

export default function PackingLetter(p: {
  docNo: string; dateIso: string; soNo: string; project: string; company: string; contact: string; phone: string;
  shipTo: string; packedBy: string; notes: string; rows: Row[]; totals: { qty: string; colli: string; weight: string };
}) {
  const [lang, setLang] = useState<Lang>('id');
  useEffect(() => {
    try { const l = localStorage.getItem('packing-print-lang'); if (l === 'en' || l === 'id') setLang(l); } catch {}
  }, []);
  function sw(l: Lang) { setLang(l); try { localStorage.setItem('packing-print-lang', l); } catch {} }
  const t = T[lang];
  const date = new Date(p.dateIso + 'T00:00:00').toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

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
          @bottom-right { content: "${p.docNo} | ${lang === 'id' ? 'hal.' : 'page'} " counter(page) " ${lang === 'id' ? 'dari' : 'of'} " counter(pages); font: 8px 'Outfit', sans-serif; color: #888; } }
        .ql-sheet { max-width: 210mm; margin: 0 auto; background: #fff; padding: 12mm 14mm; box-shadow: 0 1px 8px rgba(0,0,0,.12); font-size: 12px; color: #000; line-height: 1.5; }
        .ql-sheet table.layout { width: 100%; border-collapse: collapse; }
        .ql-sheet table.items { width: 100%; border-collapse: collapse; font-size: 11px; }
        .ql-sheet table.items th { background: ${NAVY}; color: #fff; padding: 6px; font-weight: 600; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .ql-sheet table.items td { border: 1px solid #d4d4d8; padding: 5px 7px; vertical-align: top; }
        .ql-sheet table.items tr { break-inside: avoid; }
        @media print { html, body, main { background: #fff !important; } .ql-sheet { box-shadow: none; padding: 0; max-width: none; } }
      `}</style>

      <div className="mx-auto mb-4 flex w-full max-w-[210mm] flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white p-3 print:hidden" data-no-cards data-no-i18n>
        <Link href="/dashboard/packing-list" className="text-sm font-medium text-slate-500 hover:text-slate-700">← Kembali</Link>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex overflow-hidden rounded-lg border border-slate-200 text-sm font-semibold">
            {(['id', 'en'] as Lang[]).map((l) => (
              <button key={l} type="button" onClick={() => sw(l)} className={`px-3 py-2 ${lang === l ? 'bg-brand-500 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>{l === 'id' ? 'Indonesia' : 'English'}</button>
            ))}
          </div>
          <button type="button" onClick={() => window.print()} className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-600">🖨️ Cetak / Simpan PDF</button>
        </div>
      </div>

      <div className="ql-sheet" data-no-cards data-no-i18n>
        <table className="layout">
          <thead><tr><td><Head /></td></tr></thead>
          <tbody><tr><td>
            <div style={{ textAlign: 'center', fontSize: 15, fontWeight: 700, textDecoration: 'underline', letterSpacing: '1.5px', margin: '8px 0 14px' }}>{t.title}</div>

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 24 }}>
              <div style={{ flex: 1 }}>
                <div>{t.to}</div>
                <div style={{ fontWeight: 700, textDecoration: 'underline' }}>{p.company}</div>
                {p.contact && <div>{t.up}: {p.contact}{p.phone ? ` · ${t.phone}: ${p.phone}` : ''}</div>}
                <div style={{ marginTop: 6, fontWeight: 600 }}>{t.ship}:</div>
                <div>{p.shipTo || '-'}</div>
              </div>
              <table style={{ fontSize: 11.5, borderCollapse: 'collapse', alignSelf: 'flex-start' }}>
                <tbody>
                  {[[t.no, p.docNo], [t.date, date], [t.so, p.soNo], ...(p.project ? [[t.project, p.project]] : [])].map(([k, v]) => (
                    <tr key={k}><td style={{ padding: '1px 8px 1px 0', color: '#555' }}>{k}</td><td style={{ padding: '1px 0', fontWeight: 600 }}>: {v}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>

            <table className="items" style={{ marginTop: 14 }}>
              <thead><tr>{t.cols.map((h) => <th key={h}>{h}</th>)}</tr></thead>
              <tbody>
                {p.rows.map((r) => (
                  <tr key={r.no}>
                    <td style={{ textAlign: 'center' }}>{r.no}</td>
                    <td>{r.sku}</td>
                    <td>{r.name}</td>
                    <td style={{ textAlign: 'center' }}>{r.qty}</td>
                    <td style={{ textAlign: 'center' }}>{r.uom}</td>
                    <td style={{ textAlign: 'center' }}>{r.colli}</td>
                    <td style={{ textAlign: 'center' }}>{r.weight}</td>
                    <td>{r.remarks}</td>
                  </tr>
                ))}
                <tr style={{ background: '#e8eaf6', fontWeight: 700 }}>
                  <td colSpan={3} style={{ textAlign: 'right' }}>{t.total}</td>
                  <td style={{ textAlign: 'center' }}>{p.totals.qty}</td>
                  <td />
                  <td style={{ textAlign: 'center' }}>{p.totals.colli}</td>
                  <td style={{ textAlign: 'center' }}>{p.totals.weight}</td>
                  <td />
                </tr>
              </tbody>
            </table>

            {(p.notes || p.packedBy) && (
              <div style={{ marginTop: 10, fontSize: 11.5 }}>
                {p.notes && <div><strong>{t.notes}:</strong> {p.notes}</div>}
                {p.packedBy && <div><strong>{t.packedBy}:</strong> {p.packedBy}</div>}
              </div>
            )}
            <div style={{ marginTop: 10, fontSize: 10, color: '#555' }}>{t.note1}</div>

            <div style={{ marginTop: 18, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, breakInside: 'avoid' }}>
              {t.sig.map((s) => (
                <div key={s} style={{ textAlign: 'center', fontSize: 11 }}>
                  <div style={{ fontWeight: 600 }}>{s}</div>
                  <div style={{ height: 64 }} />
                  <div style={{ borderTop: '1px solid #000', paddingTop: 3, fontSize: 9.5, color: '#555' }}>{t.sigName}</div>
                </div>
              ))}
            </div>
          </td></tr></tbody>
        </table>
      </div>
    </div>
  );
}
