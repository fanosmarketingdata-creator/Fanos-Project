'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import DialSlider from '@/components/DialSlider';

type Lang = 'id' | 'en';
export type PrintItem = { no: number; sku: string; name: string; image_url: string | null; spec: string[]; qty: number; uom: string; drawing_code: string };

const NAVY = '#1a237e';
const MONTHS = {
  id: ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
};
// Format manual (tanpa toLocale*) agar hasil server dan browser selalu sama.
const fmtDate = (iso: string, l: Lang) => { const [y, m, d] = iso.split('-').map(Number); return `${d} ${MONTHS[l][m - 1]} ${y}`; };
const fmtQty = (n: number) => String(Math.round(n * 100) / 100).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');

const T = {
  id: { title: 'Lighting Specification', project: 'Project', client: 'Klien', attn: 'Up.', address: 'Alamat', date: 'Tanggal', notes: 'Catatan', cols: ['No', 'Drawing Code', 'Produk', 'Spesifikasi', 'Picture Reference', 'Qty', 'Satuan'], madeBy: 'Dibuat oleh', approvedBy: 'Disetujui oleh', page: 'hal.', of: 'dari', total: 'Total item' },
  en: { title: 'Lighting Specification', project: 'Project', client: 'Client', attn: 'Attn.', address: 'Address', date: 'Date', notes: 'Notes', cols: ['No', 'Drawing Code', 'Product', 'Specification', 'Picture Reference', 'Qty', 'Unit'], madeBy: 'Prepared by', approvedBy: 'Approved by', page: 'page', of: 'of', total: 'Total items' },
} as const;

export default function LightingSpecPrint(p: {
  specId: string; project: string; client: string; attn: string; address: string; notes: string;
  dateIso: string; signerName: string; signerRole: string; rows: PrintItem[];
}) {
  const [lang, setLang] = useState<Lang>('id');
  const t = T[lang];
  const [preparing, setPreparing] = useState(false);
  // Slider per gambar: muncul di bawah gambar yang diklik. Posisinya dikunci saat dibuka (tidak ikut bergeser saat ukuran berubah).
  const [pop, setPop] = useState<{ no: number; top: number; left: number } | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  // Zoom pratinjau dokumen (hanya tampilan; cetak tetap 100%).
  const [zoom, setZoomState] = useState(1);
  const setZoom = (z: number) => { setPop(null); setZoomState(Math.min(2.5, Math.max(0.5, Math.round(z * 100) / 100))); };
  const zoomRef = useRef(1);
  zoomRef.current = zoom;
  useEffect(() => {
    const w = wrapRef.current;
    if (!w) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      setZoom(zoomRef.current * (e.deltaY < 0 ? 1.1 : 1 / 1.1));
    };
    w.addEventListener('wheel', onWheel, { passive: false });
    return () => w.removeEventListener('wheel', onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const openPop = (no: number, el: HTMLElement) => {
    const w = wrapRef.current;
    if (!w) return;
    const wr = w.getBoundingClientRect(), r = el.getBoundingClientRect();
    setPop({ no, top: r.bottom - wr.top + 8, left: r.left + r.width / 2 - wr.left });
  };
  useEffect(() => {
    if (!pop) return;
    const down = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest('.ls-pop') || t.closest('.ls-pick')) return;
      setPop(null);
    };
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') setPop(null); };
    document.addEventListener('mousedown', down);
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('mousedown', down); document.removeEventListener('keydown', key); };
  }, [pop]);
  // Ukuran tinggi gambar (mm), disimpan di browser.
  const [imgH, setImgH] = useState(56);
  useEffect(() => {
    try { const v = Number(localStorage.getItem('fanos-ls-img-h')); if (v >= 25 && v <= 110) setImgH(v); } catch {}
  }, []);
  // Ukuran per gambar (menimpa ukuran umum), disimpan per dokumen di browser.
  const sizesKey = `fanos-ls-img-sizes-${p.specId}`;
  const [sizes, setSizes] = useState<Record<number, number>>({});
  useEffect(() => {
    try {
      const v = JSON.parse(localStorage.getItem(sizesKey) || 'null');
      if (v && typeof v === 'object') setSizes(v);
    } catch {}
  }, [sizesKey]);
  // Slider umum: mengubah ukuran SEMUA gambar sekaligus (ukuran per gambar yang pernah diatur ikut disamakan).
  const changeImgH = (v: number) => {
    setImgH(v);
    setSizes({});
    try { localStorage.setItem('fanos-ls-img-h', String(v)); localStorage.removeItem(sizesKey); } catch {}
  };
  const setSize = (no: number, mm: number | null) => {
    setSizes((prev) => {
      const next = { ...prev };
      if (mm == null) delete next[no]; else next[no] = mm;
      try { localStorage.setItem(sizesKey, JSON.stringify(next)); } catch {}
      return next;
    });
  };
  const doPrint = () => {
    setPreparing(true);
    // beri waktu browser menggambar overlay sebelum print() memblokir thread
    setTimeout(() => {
      try { window.print(); } finally { setPreparing(false); }
    }, 120);
  };
  const date = fmtDate(p.dateIso, lang);

  return (
    <div className="ls" style={{ fontFamily: "'Outfit', 'Segoe UI', Arial, sans-serif" }}>
      <style dangerouslySetInnerHTML={{ __html: `
        .ls, .ls * { font-family: 'Outfit', 'Segoe UI', Arial, sans-serif !important; }
        @page { size: A4 portrait; margin: 10mm 12mm 14mm; @bottom-left { content: "PT Fanosindo Internusa — Lighting & Electrical Consultant"; font: 8px 'Outfit', sans-serif; color: #888; }
          @bottom-right { content: "${p.project.replace(/"/g, '')} | ${t.page} " counter(page) " ${t.of} " counter(pages); font: 8px 'Outfit', sans-serif; color: #888; } }
        .ls-sheet { max-width: 210mm; margin: 0 auto; background: #fff; padding: 10mm 12mm; box-shadow: 0 1px 8px rgba(0,0,0,.12); font-size: 11.5px; color: #000; line-height: 1.5; }
        .ls-sheet table.layout { width: 100%; border-collapse: collapse; }
        .ls-sheet table.items { width: 100%; border-collapse: collapse; font-size: 11px; table-layout: fixed; }
        .ls-sheet table.items thead { display: table-header-group; }
        .ls-sheet table.items th { background: ${NAVY}; color: #fff; padding: 6px 4px; font-weight: 600; font-size: 10.5px; text-transform: none !important; letter-spacing: 0 !important; white-space: normal !important; word-break: normal; overflow-wrap: normal; line-height: 1.25; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .ls-sheet table.items td { border: 1px solid #d4d4d8; padding: 6px 8px; vertical-align: middle; }
        .ls-sheet table.items tr { break-inside: avoid; page-break-inside: avoid; }
        .ls-img { width: 100%; height: var(--ls-img-h, 56mm); object-fit: contain; display: block; }
        .ls-pick { cursor: pointer; }
        .ls-sel { outline: 2px solid #2563eb; outline-offset: 2px; border-radius: 2px; }
        .ls-zoom { position: fixed; right: 24px; bottom: 88px; z-index: 40; display: inline-flex; align-items: center; background: #fff; border: 1px solid #e2e8f0; border-radius: 999px; box-shadow: 0 6px 20px rgba(15,23,42,.18); padding: 3px; }
        .ls-zoom button { width: 32px; height: 32px; border: 0; border-radius: 50%; background: transparent; color: #334155; font-size: 18px; line-height: 1; cursor: pointer; }
        .ls-zoom button:hover:not(:disabled) { background: #f1f5f9; }
        .ls-zoom button:disabled { opacity: .35; cursor: default; }
        .ls-zoom .ls-zoom-val { width: auto; min-width: 52px; padding: 0 6px; border-radius: 999px; font-size: 12px; font-weight: 600; }
        @media print { .ls-zoom { display: none !important; } }
        .ls-pop { position: absolute; z-index: 30; width: 236px; transform: translateX(-50%); display: flex; align-items: center; gap: 4px; background: #fff; color: #1e293b; border: 1px solid #e2e8f0; border-radius: 999px; padding: 4px 6px 4px 12px; box-shadow: 0 6px 20px rgba(15,23,42,.16); }
        .ls-pop-dial { flex: 1; min-width: 0; }
        .ls-pop-ic { flex: none; width: 24px; height: 24px; border: 0; border-radius: 50%; background: #f1f5f9; color: #475569; font-size: 12px; line-height: 1; cursor: pointer; }
        .ls-pop-ic:hover:not(:disabled) { background: #e2e8f0; }
        .ls-pop-ic:disabled { opacity: .35; cursor: default; }
        @media print { .ls-sheet { zoom: 1 !important; } }
        @media print { .ls-pop { display: none !important; } .ls-sel { outline: none !important; } }
        .ls-noimg { width: 100%; height: var(--ls-img-h, 56mm); display: flex; align-items: center; justify-content: center; color: #cbd5e1; font-size: 10px; border: 1px dashed #e2e8f0; }
        .ls-spec div { padding: 1px 0; }
        .ls-sign { display: flex; gap: 40px; margin-top: 22px; break-inside: avoid; }
        .ls-sign > div { width: 180px; text-align: center; font-size: 11px; }
        .ls-sign .box { height: 62px; border-bottom: 1px solid #111; margin-bottom: 4px; }
        .ls-foot { display: flex; justify-content: space-between; margin-top: 16px; padding-top: 4px; border-top: 1px solid #e5e5e5; font-size: 9px; color: #888; }
        @keyframes lsPulse { 0%,100% { opacity: .55 } 50% { opacity: 1 } }
        .ls-skel { animation: lsPulse 1.1s ease-in-out infinite; background: #e2e8f0; border-radius: 6px; }
        @media print {
          .ls-loading { display: none !important; }
          html, body, main { background: #fff !important; }
          .ls-sheet { box-shadow: none; padding: 0; max-width: none; }
          .ls-foot, .ls-toolbar { display: none !important; }
        }
      ` }} />

      {preparing && (
        <div className="ls-loading fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white/90 print:hidden" data-no-i18n>
          <div className="w-[min(420px,86vw)] rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
            <div className="ls-skel mb-3 h-5 w-2/3" />
            <div className="ls-skel mb-2 h-3 w-full" />
            <div className="ls-skel mb-2 h-3 w-5/6" />
            <div className="ls-skel mb-4 h-24 w-full" />
            <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-brand-500" />
              {lang === 'id' ? 'Menyiapkan dokumen cetak...' : 'Preparing print document...'}
            </div>
          </div>
        </div>
      )}

      <div className="ls-toolbar mx-auto mb-4 flex w-full max-w-[210mm] flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white p-3 print:hidden" data-no-cards data-no-i18n>
        <Link href="/dashboard/lighting-specification" className="text-sm font-medium text-slate-500 hover:text-slate-700">← Kembali</Link>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <span className="max-w-[90px] leading-tight">{lang === 'id' ? 'Ukuran gambar (semua)' : 'Image size (all)'}</span>
            <DialSlider className="w-44 text-slate-700" value={imgH} min={25} max={110} onChange={changeImgH} unit="mm" />
            <button type="button" onClick={() => changeImgH(56)} className="rounded border border-slate-200 px-1.5 py-0.5 text-[11px] text-slate-500 hover:bg-slate-50">Reset</button>
          </div>
          <div className="inline-flex overflow-hidden rounded-lg border border-slate-200 text-sm font-semibold">
            {(['id', 'en'] as Lang[]).map((l) => (
              <button key={l} type="button" onClick={() => setLang(l)} className={`px-3 py-2 ${lang === l ? 'bg-brand-500 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
                {l === 'id' ? 'Indonesia' : 'English'}
              </button>
            ))}
          </div>
          <button type="button" onClick={doPrint} disabled={preparing} className="rounded-lg disabled:opacity-60 bg-brand-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-600">🖨️ Cetak / Simpan PDF</button>
        </div>
      </div>

      <div className="ls-zoom print:hidden" data-no-cards data-no-i18n title={lang === 'id' ? 'Zoom pratinjau (Ctrl + scroll)' : 'Preview zoom (Ctrl + scroll)'}>
        <button type="button" onClick={() => setZoom(zoom / 1.2)} disabled={zoom <= 0.5} aria-label={lang === 'id' ? 'Perkecil' : 'Zoom out'}>−</button>
        <button type="button" className="ls-zoom-val" onClick={() => setZoom(1)} title={lang === 'id' ? 'Kembali ke 100%' : 'Back to 100%'}>{Math.round(zoom * 100)}%</button>
        <button type="button" onClick={() => setZoom(zoom * 1.2)} disabled={zoom >= 2.5} aria-label={lang === 'id' ? 'Perbesar' : 'Zoom in'}>+</button>
      </div>

      <div ref={wrapRef} className="ls-sheet-wrap" style={{ position: 'relative' }}>
      <div className="ls-sheet paper" data-no-cards data-no-i18n style={{ ['--ls-img-h' as string]: `${imgH}mm`, zoom }}>
        <table className="layout">
          <thead>
            <tr><td>
              {/* Kop surat */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: 8, borderBottom: "2px solid #000", marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: NAVY, letterSpacing: '-0.3px', lineHeight: 1.1 }}>PT Fanosindo Internusa</div>
                  <div style={{ fontSize: 9.5, color: '#555', marginTop: 4, lineHeight: 1.5 }}>
                    Komplek Rukan Permata Ancol<br />Jl. R.E. Martadinata Blok C no 10, Pademangan<br />Jakarta Utara - Indonesia
                  </div>
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo-fanos.png" alt="FANOS" style={{ height: 40 }} />
              </div>
            </td></tr>
          </thead>
          <tbody>
            <tr><td>
              <div style={{ textAlign: 'center', fontSize: 16, fontWeight: 700, textDecoration: 'underline', letterSpacing: '1.5px', margin: '4px 0 12px', textTransform: 'uppercase' }}>{t.title}</div>
              <table style={{ width: '100%', fontSize: 11.5, marginBottom: 12 }}>
                <tbody>
                  <tr>
                    <td style={{ width: '50%', verticalAlign: 'top' }}>
                      <div><b style={{ display: 'inline-block', width: 70 }}>{t.project}</b>: {p.project}</div>
                      <div><b style={{ display: 'inline-block', width: 70 }}>{t.client}</b>: {p.client}</div>
                      {p.attn && <div><b style={{ display: 'inline-block', width: 70 }}>{t.attn}</b>: {p.attn}</div>}
                    </td>
                    <td style={{ width: '50%', verticalAlign: 'top' }}>
                      <div><b style={{ display: 'inline-block', width: 70 }}>{t.date}</b>: {date}</div>
                      {p.address && <div><b style={{ display: 'inline-block', width: 70 }}>{t.address}</b>: {p.address}</div>}
                      {p.notes && <div><b style={{ display: 'inline-block', width: 70 }}>{t.notes}</b>: {p.notes}</div>}
                    </td>
                  </tr>
                </tbody>
              </table>

              <table className="items">
                <colgroup>
                  <col style={{ width: '5%' }} /><col style={{ width: '9%' }} /><col style={{ width: '14%' }} /><col style={{ width: '21%' }} />
                  <col style={{ width: '37%' }} /><col style={{ width: '6%' }} /><col style={{ width: '8%' }} />
                </colgroup>
                <thead>
                  <tr>{t.cols.map((c, i) => <th key={c} style={{ textAlign: i === 2 || i === 3 ? 'left' : 'center' }}>{c}</th>)}</tr>
                </thead>
                <tbody>
                  {p.rows.map((r) => (
                    <tr key={r.no}>
                      <td style={{ textAlign: 'center' }}>{r.no}</td>
                      <td style={{ textAlign: 'center', fontWeight: 700 }}>{r.drawing_code}</td>
                      <td>{r.name}</td>
                      <td className="ls-spec" style={{ fontSize: 10.5 }}>{r.spec.map((l, i) => <div key={i}>{l}</div>)}</td>
                      <td>
                        {r.image_url
                          // eslint-disable-next-line @next/next/no-img-element
                          ? <img className={`ls-img ls-pick${pop?.no === r.no ? ' ls-sel' : ''}`} onClick={(e) => openPop(r.no, e.currentTarget)} style={sizes[r.no] ? { height: `${sizes[r.no]}mm` } : undefined} src={r.image_url} alt={r.name} loading="eager" decoding="async" />
                          : <div className={`ls-noimg ls-pick${pop?.no === r.no ? ' ls-sel' : ''}`} onClick={(e) => openPop(r.no, e.currentTarget)} style={sizes[r.no] ? { height: `${sizes[r.no]}mm` } : undefined}>—</div>}
                      </td>
                      <td style={{ textAlign: 'center' }}>{fmtQty(r.qty)}</td>
                      <td style={{ textAlign: 'center' }}>{r.uom}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </td></tr>
          </tbody>
        </table>
        <div className="ls-foot"><span>PT Fanosindo Internusa — Lighting &amp; Electrical Consultant</span><span>{p.project}</span></div>
      </div>
      {pop && (
        <div className="ls-pop print:hidden" data-no-cards data-no-i18n style={{ top: pop.top, left: pop.left }}>
          <DialSlider compact className="ls-pop-dial" value={sizes[pop.no] ?? imgH} min={25} max={110} onChange={(v) => setSize(pop.no, v)} unit="mm" label={`${lang === 'id' ? 'Gambar' : 'Image'} ${pop.no}`} />
          <button type="button" className="ls-pop-ic" onClick={() => setSize(pop.no, null)} disabled={sizes[pop.no] == null} title={lang === 'id' ? 'Ikut ukuran semua' : 'Match all'}>↺</button>
          <button type="button" className="ls-pop-ic" onClick={() => setPop(null)} title={lang === 'id' ? 'Tutup' : 'Close'}>✕</button>
        </div>
      )}
      </div>
    </div>
  );
}
