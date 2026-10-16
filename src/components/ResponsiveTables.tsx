'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

// Di layar kecil (< 768px) semua <table> di dalam <main> ditampilkan sebagai
// kartu: tiap baris = 1 kartu, tiap sel diberi label dari header kolomnya.
// Transformasinya murni CSS (lihat ".cardify" di globals.css); komponen ini
// hanya menandai tabel dan mengisi atribut data-label di setiap sel, sehingga
// 27 tabel yang ada tidak perlu ditulis ulang satu per satu dan tabel baru
// otomatis ikut. Tabel di area cetak ([data-no-cards]) dilewati.
function decorate(root: ParentNode) {
  root.querySelectorAll<HTMLTableElement>('main table').forEach((table) => {
    if (table.closest('[data-no-cards]')) return;
    const headCells = Array.from(table.querySelectorAll<HTMLTableCellElement>('thead th'));
    if (headCells.length === 0) return;

    const labels: string[] = [];
    const actionCols = new Set<number>();
    let col = 0;
    headCells.forEach((th) => {
      const text = (th.textContent || '').trim();
      for (let i = 0; i < th.colSpan; i++) {
        labels[col] = text;
        if (!text || /^aksi$/i.test(text)) actionCols.add(col);
        col++;
      }
    });

    table.classList.add('cardify');
    table.querySelectorAll<HTMLTableRowElement>('tbody tr, tfoot tr').forEach((tr) => {
      const cells = Array.from(tr.children) as HTMLTableCellElement[];
      // Baris pesan ("Belum ada data") = 1 sel yang membentang seluruh kolom.
      const isSpan = cells.length === 1 && cells[0].colSpan > 1;
      tr.classList.toggle('cardify-empty', isSpan);
      let c = 0;
      cells.forEach((td) => {
        if (!isSpan) {
          if (td.dataset.label !== labels[c]) td.dataset.label = labels[c] ?? '';
          td.classList.toggle('cardify-actions', actionCols.has(c));
        }
        c += td.colSpan || 1;
      });
    });
  });
}

export default function ResponsiveTables() {
  const pathname = usePathname();

  useEffect(() => {
    const main = document.querySelector('main');
    if (!main) return;
    let raf = 0;
    const run = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => decorate(document));
    };
    run();
    // Baris/tabel baru (filter, modal, data ter-refresh) ikut diberi label.
    const mo = new MutationObserver(run);
    mo.observe(main, { childList: true, subtree: true });
    return () => {
      mo.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [pathname]);

  return null;
}
