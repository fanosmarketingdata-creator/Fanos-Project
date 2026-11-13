'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { guard } from '@/lib/permissions';
import type { ImportResult, ImportRow } from '@/lib/bulk-import';
import { s, parseNum, checkSize, inChunks } from '@/lib/bulk-server';
import { sumDiscountPercent, sumChargeAmount, sumTaxAmount, type DiscountLine, type ChargeLine } from '@/lib/discount-charge';

// Tanggal: 2026-11-13, 13/11/2026, 13-11-2026, atau nomor seri Excel.
function parseDate(v: string): string | null {
  const t = s(v);
  if (!t) return null;
  let y: number, m: number, d: number;
  let mt = t.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (mt) { y = +mt[1]; m = +mt[2]; d = +mt[3]; }
  else if ((mt = t.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/))) { d = +mt[1]; m = +mt[2]; y = +mt[3]; }
  else if (/^\d{5}(\.\d+)?$/.test(t)) {
    const dt = new Date(Math.round((Number(t) - 25569) * 86400 * 1000));
    y = dt.getUTCFullYear(); m = dt.getUTCMonth() + 1; d = dt.getUTCDate();
  } else return null;
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

type Item = { row: number; sku: string; qty: number; unit_price: number; notes: string; product_id: string };
type Group = { rows: ImportRow[]; key: string; soNo: string; date: string; clientId: string; clientKey: string; notes: string; items: Item[] };

export async function importSalesOrders(rows: ImportRow[], commit: boolean): Promise<ImportResult> {
  { const denied = await guard('/dashboard/sales-orders', 'create'); if (denied) return { total: rows.length, valid: 0, errors: [], error: denied }; }
  const bad = checkSize(rows);
  if (bad) return bad;
  const supabase = createClient();

  // --- kelompokkan baris menjadi Sales Order ---
  const groups: { so_no: string; rows: ImportRow[] }[] = [];
  const byNo = new Map<string, number>();
  for (const r of rows) {
    const no = s(r.so_no);
    if (no) {
      const k = no.toLowerCase();
      if (byNo.has(k)) groups[byNo.get(k)!].rows.push(r);
      else { byNo.set(k, groups.length); groups.push({ so_no: no, rows: [r] }); }
    } else {
      // SO No kosong: gabungkan baris berurutan dengan Client & Tanggal sama.
      const last = groups[groups.length - 1];
      const sig = (x: ImportRow) => `${s(x.client_no).toLowerCase()}|${s(x.client_name).toLowerCase()}|${s(x.so_date)}`;
      if (last && !last.so_no && sig(last.rows[0]) === sig(r) && (s(r.client_no) || s(r.client_name) || s(r.so_date))) last.rows.push(r);
      else groups.push({ so_no: '', rows: [r] });
    }
  }

  // --- data pendukung ---
  const [{ data: clients }, { data: existingSOs }] = await Promise.all([
    supabase.from('clients').select('id, client_no, company'),
    supabase.from('sales_orders').select('id, doc_no, status, client_id, so_date, global_notes, discounts, charges').not('doc_no', 'is', null),
  ]);
  const clientByNo = new Map((clients ?? []).filter((c) => c.client_no).map((c) => [String(c.client_no).trim().toLowerCase(), c]));
  const clientByName = new Map((clients ?? []).map((c) => [String(c.company ?? '').trim().toLowerCase(), c]));
  const soByNo = new Map((existingSOs ?? []).map((o) => [String(o.doc_no).trim().toLowerCase(), o]));

  const skus = Array.from(new Set(rows.map((r) => s(r.sku)).filter(Boolean)));
  const products = new Map<string, { id: string; sku: string; price: number | null; price_listed: boolean | null }>();
  for (let i = 0; i < skus.length; i += 200) {
    const { data } = await supabase.from('products').select('id, sku, price, price_listed').in('sku', skus.slice(i, i + 200));
    for (const p of data ?? []) products.set(String(p.sku).trim().toLowerCase(), p as never);
  }

  const errors: ImportResult['errors'] = [];
  const adds: { g: Group; total: number }[] = [];
  const upds: { g: Group; id: string; total: number; discountPercent: number }[] = [];

  for (const gr of groups) {
    const first = gr.rows[0];
    const rowErr = (r: ImportRow, m: string) => errors.push({ row: r._row, message: m });
    const failAll = (m: string) => gr.rows.forEach((r) => rowErr(r, m));
    const existing = gr.so_no ? soByNo.get(gr.so_no.toLowerCase()) : undefined;

    // Header (dari baris pertama; baris lain harus konsisten bila diisi)
    const date = parseDate(first.so_date);
    if (!date && !existing) { failAll('SO Date wajib diisi (format 2026-11-13 atau 13/11/2026).'); continue; }
    if (s(first.so_date) && !date) { failAll('Format SO Date tidak valid (gunakan 2026-11-13 atau 13/11/2026).'); continue; }

    let clientId = existing ? String(existing.client_id) : '';
    const cNo = s(first.client_no), cName = s(first.client_name);
    if (cNo || cName) {
      const c = (cNo && clientByNo.get(cNo.toLowerCase())) || (cName && clientByName.get(cName.toLowerCase())) || null;
      if (!c) { failAll(`Client "${cNo || cName}" tidak ditemukan di Client Master.`); continue; }
      clientId = String(c.id);
    }
    if (!clientId) { failAll('Client ID atau Client Name wajib diisi.'); continue; }

    if (existing && existing.status !== 'DRAFT') { failAll(`Sales Order ${gr.so_no} berstatus ${existing.status}; hanya yang berstatus DRAFT yang dapat ditimpa lewat impor.`); continue; }

    // Item
    const items: Item[] = [];
    let ok = true;
    for (const r of gr.rows) {
      const sku = s(r.sku);
      if (!sku) { rowErr(r, 'SKU wajib diisi.'); ok = false; continue; }
      const prod = products.get(sku.toLowerCase());
      if (!prod) { rowErr(r, `SKU "${sku}" tidak ada di Catalogue.`); ok = false; continue; }
      const qty = parseNum(r.qty);
      if (qty == null || Number.isNaN(qty) || qty <= 0) { rowErr(r, 'Qty harus berupa angka lebih dari 0.'); ok = false; continue; }
      let price: number | null = null;
      if (s(r.unit_price)) {
        price = parseNum(r.unit_price);
        if (price == null || Number.isNaN(price) || price < 0) { rowErr(r, 'Unit Price harus berupa angka.'); ok = false; continue; }
      } else if (prod.price_listed && prod.price != null) price = Number(prod.price);
      else { rowErr(r, `Unit Price kosong dan SKU "${sku}" belum ada di Price List.`); ok = false; continue; }
      items.push({ row: r._row, sku: String(prod.sku), qty, unit_price: price, notes: s(r.item_notes), product_id: prod.id });
    }
    if (!ok) continue;

    const subtotal = items.reduce((a, it) => a + it.qty * it.unit_price, 0);
    const g: Group = { rows: gr.rows, key: gr.so_no.toLowerCase(), soNo: gr.so_no, date: date ?? String(existing?.so_date), clientId, clientKey: '', notes: s(first.global_notes) || (existing && first.global_notes === undefined ? String(existing.global_notes ?? '') : ''), items };
    if (existing) {
      const discounts = (existing.discounts ?? []) as DiscountLine[];
      const charges = (existing.charges ?? []) as ChargeLine[];
      const dp = sumDiscountPercent(discounts);
      const total = subtotal * (1 - dp / 100) + sumChargeAmount(charges) + sumTaxAmount(subtotal, discounts);
      upds.push({ g, id: String(existing.id), total, discountPercent: dp });
    } else adds.push({ g, total: subtotal });
  }

  const validRows = adds.reduce((a, x) => a + x.g.rows.length, 0) + upds.reduce((a, x) => a + x.g.rows.length, 0);
  const result: ImportResult = { total: rows.length, valid: validRows, errors, added: adds.length, updated: upds.length };
  if (!commit || validRows === 0) return result;
  if (adds.length) { const denied = await guard('/dashboard/sales-orders', 'create'); if (denied) return { ...result, error: denied }; }
  if (upds.length) { const denied = await guard('/dashboard/sales-orders', 'edit'); if (denied) return { ...result, error: denied }; }

  const itemRows = (soId: string, g: Group) => g.items.map((it, i) => ({
    sales_order_id: soId, product_id: it.product_id, sku: it.sku, qty: it.qty, unit_price: it.unit_price,
    total: it.qty * it.unit_price, notes: it.notes || null, sort_order: i,
  }));

  const failures: string[] = [];
  // Sales Order baru
  const addErr = await inChunks(adds, 5, async ({ g, total }) => {
    const { data, error } = await supabase.from('sales_orders')
      .insert({ ...(g.soNo ? { doc_no: g.soNo } : {}), so_date: g.date, client_id: g.clientId, global_notes: g.notes || null, total_amount: total, discount_percent: 0, discounts: [], charges: [], status: 'DRAFT', source_type: 'manual' })
      .select('id').single();
    if (error || !data) { failures.push(`${g.soNo || `baris ${g.rows[0]._row}`}: ${error?.message ?? 'gagal'}`); return null; }
    const { error: ie } = await supabase.from('sales_order_items').insert(itemRows(data.id, g));
    if (ie) { await supabase.from('sales_orders').delete().eq('id', data.id); failures.push(`${g.soNo || `baris ${g.rows[0]._row}`}: ${ie.message}`); }
    return null;
  });
  // Sales Order lama: timpa header + ganti seluruh item
  const updErr = await inChunks(upds, 5, async ({ g, id, total, discountPercent }) => {
    const { error } = await supabase.from('sales_orders').update({ so_date: g.date, client_id: g.clientId, global_notes: g.notes || null, total_amount: total, discount_percent: discountPercent }).eq('id', id);
    if (error) { failures.push(`${g.soNo}: ${error.message}`); return null; }
    const { error: de } = await supabase.from('sales_order_items').delete().eq('sales_order_id', id);
    if (de) { failures.push(`${g.soNo}: ${de.message}`); return null; }
    const { error: ie } = await supabase.from('sales_order_items').insert(itemRows(id, g));
    if (ie) failures.push(`${g.soNo}: item gagal disimpan (${ie.message})`);
    return null;
  });
  void addErr; void updErr;

  revalidatePath('/dashboard/sales-orders');
  if (failures.length) return { ...result, inserted: adds.length + upds.length - failures.length, error: `${failures.length} Sales Order gagal: ${failures.slice(0, 3).join('; ')}` };
  return { ...result, inserted: adds.length + upds.length };
}
