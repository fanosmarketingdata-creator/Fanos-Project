import { COMPANY } from '@/lib/company';

export type PrintParty = { label: string; lines: string[] };
export type PrintColumn = { key: string; label: string; align?: 'left' | 'right' | 'center'; width?: string };
export type PrintTotal = { label: string; value: string; bold?: boolean };

export type PrintDocumentProps = {
  title: string;
  meta: { label: string; value: string }[];
  parties: PrintParty[];
  columns: PrintColumn[];
  rows: Record<string, string | number>[];
  totals?: PrintTotal[];
  notes?: string[];
  signatures: string[];
};

const align = (a?: 'left' | 'right' | 'center') => (a === 'right' ? 'text-right' : a === 'center' ? 'text-center' : 'text-left');

// Server component (tanpa state) — murni layout cetak. Margin halaman TIDAK
// diatur di sini (@page hanya size:auto), jadi ukuran kertas & margin
// mengikuti dialog print browser, sesuai keputusan di sistem lama.
export default function PrintDocument({ title, meta, parties, columns, rows, totals, notes, signatures }: PrintDocumentProps) {
  return (
    <div className="mx-auto w-full max-w-[210mm] bg-white p-6 text-[11px] leading-snug text-black shadow print:max-w-none print:p-0 print:shadow-none">
      <style>{`@page { size: auto; }`}</style>

      {/* Kop */}
      <div className="mb-3 flex items-start justify-between">
        <div>
          <div className="text-[15px] font-extrabold tracking-tight">{COMPANY.name}</div>
          <div className="text-[10px]">{COMPANY.address}</div>
        </div>
        <div className="text-[20px] font-extrabold tracking-wide">{title}</div>
      </div>

      {/* Pihak & meta */}
      <div className="mb-3 grid grid-cols-[1fr_auto] gap-3">
        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.max(parties.length, 1)}, 1fr)` }}>
          {parties.map((p) => (
            <div key={p.label} className="min-h-[70px] border border-black p-2">
              <div className="mb-0.5 text-[10px]">{p.label}</div>
              {p.lines.map((l, i) => (
                <div key={i} className={i === 0 ? 'font-bold' : ''}>
                  {l}
                </div>
              ))}
            </div>
          ))}
        </div>
        <table className="h-fit border border-black">
          <tbody>
            {meta.map((m) => (
              <tr key={m.label}>
                <td className="border border-black px-2 py-0.5 font-semibold">{m.label}</td>
                <td className="border border-black px-2 py-0.5">{m.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Item */}
      <table className="w-full border-collapse border border-black">
        <thead>
          <tr className="bg-gray-100 [-webkit-print-color-adjust:exact] [print-color-adjust:exact]">
            {columns.map((c) => (
              <th key={c.key} style={{ width: c.width }} className={`border border-black px-1.5 py-1 font-bold ${align(c.align ?? 'center')}`}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {columns.map((c) => (
                <td key={c.key} className={`border border-black px-1.5 py-1 align-top ${align(c.align)}`}>
                  {r[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Catatan & total */}
      <div className="mt-2 grid grid-cols-[1fr_auto] gap-3">
        <div className="text-[10px]">
          {(notes ?? []).map((n, i) => (
            <div key={i}>{n}</div>
          ))}
        </div>
        {totals && totals.length > 0 && (
          <table className="h-fit min-w-[220px] border border-black">
            <tbody>
              {totals.map((t) => (
                <tr key={t.label}>
                  <td className={`border border-black px-2 py-0.5 ${t.bold ? 'font-bold' : ''}`}>{t.label}</td>
                  <td className={`border border-black px-2 py-0.5 text-right ${t.bold ? 'font-bold' : ''}`}>{t.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Tanda tangan */}
      <div className="mt-3 grid gap-2 break-inside-avoid" style={{ gridTemplateColumns: `repeat(${signatures.length}, 1fr)` }}>
        {signatures.map((s) => (
          <div key={s} className="flex h-24 flex-col justify-end border border-black pb-1 text-center text-[10px] font-semibold">
            {s},
          </div>
        ))}
      </div>
    </div>
  );
}
