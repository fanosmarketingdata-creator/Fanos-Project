# Fanos ERP — Fase 1 & 2

Migrasi dari Google Apps Script ke **Next.js + Supabase + Vercel**.

- **Fase 1**: struktur project, skema database lengkap, login (Supabase
  Auth), shell dashboard (sidebar + topbar).
- **Fase 2**: modul **Clients**, **Vendors**, **Products** — masing-masing
  sudah full CRUD (tambah/edit/hapus/cari), termasuk upload foto produk
  (drag & drop, kriteria sama seperti sistem lama: JPG/PNG/WebP maks 2MB)
  lewat Supabase Storage.
- **Fase 3**: modul **BOQ Project** (form Area → Sub-area → Item
  berjenjang, bisa tambah/hapus di setiap level, pilih produk lewat
  pencarian SKU) dan **BOQ Akumulasi** (rekap otomatis total qty per SKU
  dari BOQ Project, bisa di-refresh atau disesuaikan manual).
- **Fase 4** *(baru)*: modul **Quotations** (dari BOQ Project atau manual,
  dengan editor diskon & biaya tambahan, tombol "Accept → SO" yang
  otomatis membuat Sales Order), **Sales Orders** (manual / langsung dari
  BOQ, tombol "Ship Items" untuk kirim sebagian/seluruh qty dan otomatis
  bikin Delivery Order, status SO naik otomatis jadi ONGOING/COMPLETED),
  dan **Delivery Orders** (riwayat pengiriman, read-only karena dibuat
  otomatis dari Ship Items).

- **Fase 5** *(baru)*: modul **Invoices** (dibuat dari Sales Order, item &
  harga & diskon ditarik otomatis, satu SO hanya bisa punya satu invoice),
  **Payments** (catat pembayaran cicilan/termin langsung dari halaman detail
  invoice, status UNPAID → PARTIAL → PAID otomatis), **Outstanding**
  (daftar piutang + umur invoice), **Retur Penjualan** (qty yang bisa
  diretur dihitung otomatis = qty invoice dikurangi retur sebelumnya, dicek
  ulang di server) dan **Credit Notes** (terbit otomatis dari retur &
  langsung mengurangi sisa tagihan invoice).

- **Fase 6** *(baru)*: **Purchase Order** (form item per vendor, status
  DRAFT → ORDERED → RECEIVED maju satu langkah, hanya DRAFT yang bisa
  diedit), **Defect List** (catat barang cacat, filter Open/Resolved,
  tombol Selesaikan/Buka Lagi) dan **Reminders** (daftar tugas dengan
  checkbox selesai, penanda Terlambat / Hari ini).

- **Fase 7** *(baru)*: grup **Superuser** — **Role Group** (CRUD label
  role; role "Superuser" dilindungi, role yang masih dipakai tidak bisa
  dihapus, rename ikut memperbarui akun), **Master Team Member** (CRUD
  data anggota tim, menampilkan foto dari akun yang tertaut) dan
  **Master Akun** (buat/edit/hapus akun login, reset password, status
  Active/Inactive, tautkan 1 team member = 1 akun, upload foto profil
  JPG/PNG/WebP maks 2MB). Superuser hanya melihat menu Superuser; role lain
  tidak melihatnya dan tidak bisa membuka halamannya lewat URL. Akun
  Inactive diblokir login di Supabase Auth dan langsung dikunci di dalam
  aplikasi.

- **Fase 8** *(baru)*:
  - **Cetak dokumen** (Invoice, Quotation, Sales Order, Surat Jalan, PO):
    tombol "Cetak" di daftar/detail membuka halaman siap cetak; klik
    "Cetak / Simpan PDF" lalu pilih printer atau "Save as PDF" di dialog
    browser. Ukuran kertas & margin mengikuti dialog print (`@page` hanya
    `size: auto`), sama seperti keputusan di sistem lama. Kop & info
    rekening ada di `src/lib/company.ts` — **isi dengan data asli**.
  - **Nomor dokumen otomatis** (migration 0005), tampil di daftar & cetakan.
  - **Dashboard Overview**: KPI (penjualan & pembayaran bulan ini, piutang,
    SO berjalan, quotation draft, PO belum diterima, defect open), grafik
    penjualan 6 bulan, dan reminder yang jatuh tempo.
  - **Auto logout 12 jam tidak aktif** (dicek lewat waktu aktivitas
    terakhir, bukan satu timer panjang; aktivitas di tab mana pun dihitung).
  - **Indikator siapa yang sedang aktif** (avatar bertumpuk + daftar
    Aktif/Tidak Aktif) lewat Supabase Realtime Presence; Superuser tidak
    ikut ditampilkan dan tidak melihat widget ini.

Semua modul dari sistem Apps Script sudah dipindahkan.

### Hal yang belum ada / perlu kamu ketahui
- Role Group masih berupa label (belum ada pengaturan akses per-halaman),
  sama seperti rencana awal.
- Kode belum pernah dijalankan end-to-end di lingkungan pembuatnya —
  jalankan `npm run dev`, coba tiap alur sekali, dan kabari kalau ada error.
- Tidak ada data lama yang dipindahkan (sesuai keputusan mulai dari kosong).

## 1. Setup Supabase

1. Buat akun & project baru di https://supabase.com (gratis untuk mulai).
2. Buka **SQL Editor** di dashboard Supabase, jalankan file-file di
   `supabase/migrations/` **berurutan sesuai nomornya** (0001, lalu 0002,
   lalu 0003) — masing-masing klik Run satu per satu, tunggu sukses
   sebelum lanjut ke berikutnya.
   - `0001_init.sql` — semua tabel
   - `0002_rls.sql` — keamanan akses data
   - `0003_storage.sql` — bucket penyimpanan foto produk
   - `0004_superuser.sql` — Role Group, Team Member, foto profil, dan
     pengetatan keamanan tabel `profiles` (**wajib dijalankan** — tanpa ini
     user biasa secara teknis bisa mengubah role-nya sendiri jadi Superuser)
   - `0005_doc_numbers.sql` — nomor dokumen otomatis (INV-20260910-0074,
     dst) untuk BOQ, Quotation, SO, DO, Invoice, PO, Retur, Credit Note.
     **Wajib dijalankan sebelum membuka aplikasi versi ini**: halaman daftar
     dan halaman cetak membaca kolom `doc_no`; tanpa migration ini daftar
     akan tampil kosong.
4. Buka **Authentication > Providers**, pastikan **Email** provider aktif.
5. Buka **Authentication > Users**, klik **Add user** untuk membuat akun
   pertama (misal buat akun Superuser kamu sendiri dulu). Setelah dibuat,
   buka tabel `profiles` di **Table Editor**, cari baris dengan email yang
   sama, lalu ubah kolom `role` jadi `Superuser` dan isi `full_name`.
6. Buka **Project Settings > API**, salin:
   - `Project URL`
   - `anon public` key
   - `service_role` key (**rahasia** — hanya untuk server, lihat catatan di bawah)

## 2. Setup project di VS Code

```bash
# Clone / buka folder project ini di VS Code, lalu:
npm install
cp .env.local.example .env.local
```

Isi `.env.local` dengan `Project URL` dan `anon public key` dari langkah
1.6 di atas:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

> **Catatan keamanan `service_role` key:** key ini melewati semua aturan
> akses database dan bisa membuat/menghapus akun login. Dipakai HANYA oleh
> halaman Master Akun (di server). Jangan pernah memberi awalan
> `NEXT_PUBLIC_`, jangan di-commit ke GitHub, dan jangan dibagikan. Kalau
> sempat bocor, segera buat ulang lewat Supabase Dashboard > Project
> Settings > API. Kode sudah dijaga: file `src/lib/supabase/admin.ts`
> memakai `server-only`, jadi build akan gagal kalau ada yang tidak sengaja
> meng-importnya dari komponen browser.

Jalankan lokal:

```bash
npm run dev
```

Buka http://localhost:3000 — akan otomatis diarahkan ke halaman login.
Login pakai akun yang dibuat di langkah 1.5.

## 3. Push ke GitHub

```bash
git init
git add .
git commit -m "Fase 1: fondasi, skema database, login, dashboard shell"
git branch -M main
git remote add origin https://github.com/<username>/<nama-repo>.git
git push -u origin main
```

(`.env.local` TIDAK ikut ter-push — sudah masuk `.gitignore` — supaya
kredensial Supabase tidak bocor ke repo publik.)

## 4. Deploy ke Vercel

1. Buka https://vercel.com, **Add New Project**, pilih repo GitHub di
   atas.
2. Saat setup, masukkan **Environment Variables** yang sama seperti di
   `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. Klik **Deploy**. Selesai — setiap kali push ke branch `main`, Vercel
   otomatis build & deploy ulang.

## Struktur project

```
supabase/migrations/     -> skema database (SQL), jalankan manual di Supabase SQL Editor
src/lib/supabase/        -> koneksi Supabase (client.ts browser, server.ts server, admin.ts server-only service role)
src/lib/auth.ts          -> cek profil & Superuser (halaman dan Server Action)
src/middleware.ts         -> proteksi halaman (redirect ke /login kalau belum login)
src/app/login/            -> halaman login
src/app/(dashboard)/      -> semua halaman setelah login (sidebar sama untuk semua halaman di sini)
src/components/           -> komponen bersama (sidebar, dsb)
```

## Kenapa lebih stabil dari versi Apps Script?

Versi Apps Script sebelumnya sering "nyangkut" saat login/logout karena
browser memblokir navigasi keluar dari iframe sandbox kalau tidak dipicu
klik langsung. Next.js + Supabase Auth tidak berjalan di dalam iframe
sama sekali — navigasi antar halaman pakai router Next.js biasa, dan
sesi login dikelola lewat cookie oleh `middleware.ts` di server pada
setiap request. Masalah itu tidak akan muncul lagi di arsitektur baru
ini.

## Rencana fase berikutnya

- ~~Fase 2: Clients, Vendors, Products (CRUD dasar)~~ ✅ selesai
- ~~Fase 3: BOQ Project + BOQ Akumulasi~~ ✅ selesai
- ~~Fase 4: Quotations, Sales Orders, Delivery Orders~~ ✅ selesai
- ~~Fase 5: Invoices, Payments, Retur, Credit Notes~~ ✅ selesai
- ~~Fase 6: Purchase Order, Defect List, Reminders~~ ✅ selesai
- ~~Fase 7: Master Team Member, Master Akun, Role Group (Superuser)~~ ✅ selesai
- ~~Fase 8: cetak dokumen, dashboard Overview, auto logout, indikator aktif~~ ✅ selesai

Lanjutkan ke fase berikutnya kapan saja — beri tahu modul mana yang mau
dikerjakan duluan.
