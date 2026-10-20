'use client';

import { useState } from 'react';

export type BoqRepoArea = { name: string; count: number; subs: { name: string; items: { sku: string; name: string; qty: number; uom: string; kode: string }[] }[] };
export type BoqSynth = { sku: string; name: string; qty: number; uom: string };

export default function BoqDetailTabs({ areas, synth }: { areas: BoqRepoArea[]; synth: BoqSynth[] }) {
  const [tab, setTab] = useState<'repo' | 'synth'>('repo');
  return (
    <>
      <div className="seg-tabs">
        <button type="button" className={`seg-tab ${tab === 'repo' ? 'active' : ''}`} onClick={() => setTab('repo')}>
          <i className="fi fi-rr-folder" /> Repositori
        </button>
        <button type="button" className={`seg-tab ${tab === 'synth' ? 'active' : ''}`} onClick={() => setTab('synth')}>
          <i className="fi fi-rr-calculator" /> Sintesis
        </button>
      </div>

      {tab === 'repo' &&
        (areas.length === 0 ? (
          <div className="dv2-empty">Belum terdapat area pada BOQ Project ini</div>
        ) : (
          <div className="dv2-area-grid">
            {areas.map((a) => (
              <div key={a.name} className="dv2-area">
                <div className="dv2-area-head">
                  <span className="ico"><i className="fi fi-rr-building" /></span>
                  <span className="nm">{a.name || '-'}</span>
                  <span className="cnt">{a.count} item</span>
                </div>
                <div className="dv2-area-body">
                  {a.subs.map((s) => (
                    <div key={s.name} style={{ marginBottom: 10 }}>
                      <div className="dv2-sub-title">
                        <i className="fi fi-rr-layers" /> {s.name || '-'} <span className="n">({s.items.length})</span>
                      </div>
                      <div className="dv2-table-wrap">
                        <table className="dv2-table" style={{ minWidth: 380 }}>
                          <thead>
                            <tr><th className="tl">SKU</th><th>Qty</th><th>UOM</th><th>Kode Gambar</th></tr>
                          </thead>
                          <tbody>
                            {s.items.map((it, i) => (
                              <tr key={i}>
                                <td className="tl"><div style={{ fontWeight: 700 }}>{it.sku}</div><div style={{ fontSize: 11, color: '#9ca3af' }}>{it.name}</div></td>
                                <td>{it.qty}</td><td>{it.uom}</td><td>{it.kode || '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ))}

      {tab === 'synth' && (
        <div className="dv2-table-wrap">
          <table className="dv2-table">
            <thead><tr><th className="tl">SKU</th><th className="tl">Nama Produk</th><th>Total Qty</th><th>UOM</th></tr></thead>
            <tbody>
              {synth.length === 0 && <tr><td colSpan={4}>Belum terdapat data</td></tr>}
              {synth.map((r) => (
                <tr key={r.sku}><td className="tl" style={{ fontWeight: 700 }}>{r.sku}</td><td className="tl">{r.name}</td><td>{r.qty}</td><td>{r.uom}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
