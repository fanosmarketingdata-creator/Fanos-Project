-- ============================================================================
-- HAPUS DATA TRANSAKSI DUMMY (Project Hub, Sales, Purchase) YANG BERHUBUNGAN DENGAN PRODUK
-- JALANKAN MANUAL di Supabase SQL Editor. TIDAK BISA DIBATALKAN setelah COMMIT.
-- Urutan yang disarankan: (1) skrip ini  ->  (2) migrasi 0039_recode_existing_product_sku.sql
--
-- DIHAPUS : BOQ (+item, akumulasi), Lighting Specification, Quotation, Sales Order, Delivery Order,
--           Packing List, Invoice & Payment, Sales Return, Credit Note, Defect,
--           Purchase Order, Purchase Delivery, Purchase Invoice & Payment,
--           pergerakan stok yang berasal dari dokumen-dokumen di atas.
-- DIPERTAHANKAN: Master Data (Client, Vendor, Project, Product, Brand, Price List, Warehouse),
--           Role/User, Task Management (pm_*), Stock Adjustment & Stock Transfer manual.
-- ============================================================================
begin;

-- Cek jumlah sebelum dihapus (lihat hasilnya dulu bila perlu: jalankan blok select ini saja).
-- select 'boq_projects', count(*) from boq_projects union all select 'quotations', count(*) from quotations
-- union all select 'sales_orders', count(*) from sales_orders union all select 'purchase_orders', count(*) from purchase_orders;

-- Pergerakan stok turunan dokumen penjualan/pembelian
delete from public.stock_movements where ref_type in ('DELIVERY', 'SALES_RETURN', 'PURCHASE_RECEIPT');

truncate table
  public.lighting_specification_items,
  public.lighting_specifications,
  public.credit_note_applications,
  public.credit_notes,
  public.sales_return_items,
  public.sales_returns,
  public.defects,
  public.packing_list_items,
  public.packing_lists,
  public.payments,
  public.invoice_items,
  public.invoices,
  public.delivery_order_items,
  public.delivery_orders,
  public.sales_order_items,
  public.sales_orders,
  public.quotation_items,
  public.quotations,
  public.boq_akumulasi,
  public.boq_project_items,
  public.boq_projects,
  public.purchase_payments,
  public.purchase_invoice_items,
  public.purchase_invoices,
  public.purchase_delivery_items,
  public.purchase_deliveries,
  public.purchase_order_items,
  public.purchase_orders;

commit;
-- Setelah ini, nomor dokumen baru akan mulai dari awal (bila penomoran dihitung dari data yang ada).
