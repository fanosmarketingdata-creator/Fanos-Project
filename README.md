# Fanos ERP — Fase 1 (Fondasi)

Migrasi dari Google Apps Script ke **Next.js + Supabase + Vercel**.

Fase 1 ini berisi: struktur project, skema database lengkap (Supabase),
sistem login (Supabase Auth), dan shell dashboard (sidebar + topbar).
Modul-modul bisnis (Clients, Products, BOQ, Quotation, Sales Order, dst)
akan menyusul di fase berikutnya — file/folder-nya sudah disiapkan di
sidebar, tapi halamannya belum dibuat.

## 1. Setup Supabase

1. Buat akun & project baru di https://supabase.com (gratis untuk mulai).
2. Buka **SQL Editor** di dashboard Supabase, jalankan isi file
   `supabase/migrations/0001_init.sql` (klik Run).
3. Jalankan juga `supabase/migrations/0002_rls.sql` setelah yang pertama
   selesai.
4. Buka **Authentication > Providers**, pastikan **Email** provider aktif.
5. Buka **Authentication > Users**, klik **Add user** untuk membuat akun
   pertama (misal buat akun Superuser kamu sendiri dulu). Setelah dibuat,
   buka tabel `profiles` di **Table Editor**, cari baris dengan email yang
   sama, lalu ubah kolom `role` jadi `Superuser` dan isi `full_name`.
6. Buka **Project Settings > API**, salin:
   - `Project URL`
   - `anon public` key

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
```

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
3. Klik **Deploy**. Selesai — setiap kali push ke branch `main`, Vercel
   otomatis build & deploy ulang.

## Struktur project

```
supabase/migrations/     -> skema database (SQL), jalankan manual di Supabase SQL Editor
src/lib/supabase/        -> koneksi Supabase (client.ts untuk browser, server.ts untuk server)
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

- Fase 2: Clients, Vendors, Products (CRUD dasar)
- Fase 3: BOQ Project + BOQ Akumulasi
- Fase 4: Quotations, Sales Orders, Delivery Orders
- Fase 5: Invoices, Payments, Retur, Credit Notes
- Fase 6: Purchase Order, Defect List, Reminders
- Fase 7: Master Team Member, Master Akun, Role Group (Superuser)
- Fase 8: cetak PDF (Invoice/PO/SO/dll) & polish UI

Lanjutkan ke fase berikutnya kapan saja — beri tahu modul mana yang mau
dikerjakan duluan.
