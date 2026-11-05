'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useToast } from '@/components/Toast';
import { FormModal } from '@/components/registry/RegistryModal';
import { normHeader, type ImportColumn, type ImportResult, type ImportRow } from '@/lib/bulk-import';

type Props = {
  title: string;                      // mis. "Import Client"
  fileName: string;                   // nama file template (tanpa .xlsx)
  columns: ImportColumn[];
  templateRows?: Record<string, string>[]; // baris yang sudah terisi di template (mis. daftar SKU)
  notes?: string[];                   // catatan umum di sheet Petunjuk
  run: (rows: ImportRow[], commit: boolean) => Promise<ImportResult>;
  kind?: 'create' | 'edit';           // hak akses yang dibutuhkan (untuk menyembunyikan tombol)
};

const TEXT_ROWS = 500;

async function downloadTemplate({ fileName, columns, templateRows, notes }: Props) {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();

  const aoa: string[][] = [columns.map((c) => c.label + (c.required ? ' *' : ''))];
  (templateRows ?? []).forEach((r) => aoa.push(columns.map((c) => r[c.key] ?? '')));
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = columns.map((c) => ({ wch: Math.max(16, c.label.length + 6) }));
  // Semua sel berformat teks agar nomor telepon / kode tidak kehilangan angka 0 di depan.
  const lastRow = Math.max(TEXT_ROWS, aoa.length);
  for (let r = 0; r < lastRow; r++) {
    for (let c = 0; c < columns.length; c++) {
      const ref = XLSX.utils.encode_cell({ r, c });
      const cell = ws[ref] as { t?: string; v?: unknown; z?: string } | undefined;
      if (cell) cell.z = '@';
      else ws[ref] = { t: 's', v: '', z: '@' };
    }
  }
  ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: lastRow - 1, c: columns.length - 1 } });
  XLSX.utils.book_append_sheet(wb, ws, 'Template');

  const guide: string[][] = [
    ['PETUNJUK PENGISIAN'],
    ['1. Isi data mulai dari baris ke-2 pada sheet "Template". Jangan mengubah / menghapus judul kolom di baris pertama.'],
    ['2. Kolom bertanda * wajib diisi.'],
    ['3. Kolom yang punya "Pilihan nilai" harus diisi persis salah satu pilihan tersebut.'],
    ['4. Maksimal 1000 baris per sekali impor. Baris kosong dilewati.'],
    ...(notes ?? []).map((n) => [n]),
    [],
    ['Kolom', 'Wajib', 'Keterangan', 'Pilihan nilai', 'Contoh'],
    ...columns.map((c) => [c.label, c.required ? 'Ya' : 'Tidak', c.note ?? '', (c.options ?? []).join(' | '), c.example ?? '']),
  ];
  const wg = XLSX.utils.aoa_to_sheet(guide);
  wg['!cols'] = [{ wch: 30 }, { wch: 8 }, { wch: 55 }, { wch: 60 }, { wch: 28 }];
  XLSX.utils.book_append_sheet(wb, wg, 'Petunjuk');
  XLSX.writeFile(wb, `${fileName}.xlsx`);
}

async function parseFile(file: File, columns: ImportColumn[]): Promise<{ rows: ImportRow[]; error?: string; ignored: string[] }> {
  const XLSX = await import('xlsx');
  const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
  const ws = wb.Sheets['Template'] ?? wb.Sheets[wb.SheetNames[0]];
  if (!ws) return { rows: [], error: 'File tidak memiliki sheet.', ignored: [] };
  const aoa = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true, defval: '' });
  const headerIdx = aoa.findIndex((r) => r.some((v) => String(v).trim() !== ''));
  if (headerIdx < 0) return { rows: [], error: 'File kosong.', ignored: [] };

  const byHeader = new Map<string, string>();
  columns.forEach((c) => { byHeader.set(normHeader(c.label), c.key); byHeader.set(normHeader(c.key), c.key); });
  const header = aoa[headerIdx].map((h) => byHeader.get(normHeader(h)) ?? '');
  const ignored = aoa[headerIdx].filter((h, i) => String(h).trim() && !header[i]).map(String);
  const missing = columns.filter((c) => c.required && !header.includes(c.key)).map((c) => c.label);
  if (missing.length) return { rows: [], error: `Kolom wajib tidak ditemukan: ${missing.join(', ')}. Gunakan template yang diunduh.`, ignored };

  const rows: ImportRow[] = [];
  for (let i = headerIdx + 1; i < aoa.length; i++) {
    const obj: Record<string, string> = {};
    let any = false;
    header.forEach((k, ci) => {
      if (!k) return;
      const v = String(aoa[i][ci] ?? '').trim();
      if (v) any = true;
      obj[k] = v;
    });
    if (any) rows.push({ ...obj, _row: i + 1 } as ImportRow);
  }
  return { rows, ignored };
}

export default function BulkImportButton(props: Props) {
  const { title, columns, run, kind = 'create' } = props;
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [ignored, setIgnored] = useState<string[]>([]);
  const [fatal, setFatal] = useState('');

  function close() {
    setOpen(false); setFileName(''); setRows([]); setResult(null); setIgnored([]); setFatal(''); setBusy(false);
  }

  async function onFile(f: File | undefined) {
    if (!f) return;
    setBusy(true); setResult(null); setFatal(''); setFileName(f.name);
    try {
      const parsed = await parseFile(f, columns);
      setIgnored(parsed.ignored);
      if (parsed.error) { setFatal(parsed.error); setRows([]); return; }
      setRows(parsed.rows);
      const r = await run(parsed.rows, false);
      if (r.error) setFatal(r.error);
      setResult(r);
    } catch (e) {
      setFatal('File tidak dapat dibaca: ' + (e instanceof Error ? e.message : 'format tidak didukung'));
    } finally {
      setBusy(false);
    }
  }

  async function doImport() {
    setBusy(true);
    try {
      const r = await run(rows, true);
      if (r.error) { setFatal(r.error); setResult(r); return; }
      toast(`${r.inserted ?? r.valid} data berhasil diimpor`, 'success');
      close();
    } catch (e) {
      setFatal('Impor gagal: ' + (e instanceof Error ? e.message : 'terjadi kendala pada server'));
    } finally {
      setBusy(false);
    }
  }

  const skipped = result ? result.total - result.valid : 0;

  return (
    <>
      <button type="button" className={`btn btn-secondary bulk-${kind}`} onClick={() => setOpen(true)}>
        <i className="fi fi-rr-file-import" /> Import
      </button>
      {open && typeof document !== 'undefined' && createPortal(
        <FormModal
          title={title}
          icon="fi fi-rr-file-import"
          maxWidth={720}
          onClose={close}
          footer={
            <>
              <button type="button" className="btn btn-primary" onClick={doImport} disabled={busy || !result || result.valid === 0 || !!result.error}>
                <i className="fi fi-rr-upload" /> {busy ? 'Memproses...' : result ? `Import ${result.valid} Data` : 'Import'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={close}>Batal</button>
            </>
          }
        >
          <div className="bi-step">
            <span className="bi-num">1</span>
            <div>
              <h4>Unduh template</h4>
              <p>Isi data sesuai format. Sheet “Petunjuk” menjelaskan setiap kolom dan pilihan nilainya.</p>
              <button type="button" className="btn btn-secondary" onClick={() => downloadTemplate(props)}>
                <i className="fi fi-rr-download" /> Download Template
              </button>
            </div>
          </div>
          <div className="bi-step">
            <span className="bi-num">2</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h4>Unggah file yang sudah diisi</h4>
              <p>Format .xlsx, .xls atau .csv. Data diperiksa dulu sebelum disimpan.</p>
              <label className="bi-drop">
                <input type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ''; }} />
                <i className="fi fi-rr-cloud-upload" /> {fileName ? fileName : 'Klik untuk memilih file'}
              </label>
            </div>
          </div>

          {busy && !result && <p style={{ fontSize: 13, color: '#94a3b8' }}>Memeriksa data...</p>}
          {fatal && <div className="bi-err" style={{ marginBottom: 10 }}>{fatal}</div>}
          {ignored.length > 0 && <p style={{ fontSize: 12, color: '#92400e' }}>Kolom tidak dikenal diabaikan: {ignored.join(', ')}</p>}
          {result && !result.error && (
            <div className="bi-step">
              <span className="bi-num">3</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h4>Hasil pemeriksaan</h4>
                <div className="bi-sum">
                  <span className="bi-chip" style={{ background: '#e2e8f0', color: '#334155' }}>{result.total} baris</span>
                  <span className="bi-chip" style={{ background: '#dcfce7', color: '#166534' }}>{result.valid} siap diimpor</span>
                  {skipped > 0 && <span className="bi-chip" style={{ background: '#fee2e2', color: '#991b1b' }}>{skipped} dilewati</span>}
                </div>
                {result.errors.length > 0 && (
                  <>
                    <p>Baris berikut tidak akan diimpor. Perbaiki di file lalu unggah ulang, atau lanjutkan untuk mengimpor baris yang valid saja.</p>
                    <div className="bi-err">
                      {result.errors.slice(0, 100).map((e, i) => <div key={i}><b>Baris {e.row}:</b> {e.message}</div>)}
                      {result.errors.length > 100 && <div>…dan {result.errors.length - 100} baris lainnya.</div>}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </FormModal>,
        document.body,
      )}
    </>
  );
}
