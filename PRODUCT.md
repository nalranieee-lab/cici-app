# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Mahasiswa, fresh graduate, dan generasi muda yang ingin memperkirakan dampak cicilan terhadap arus kas.

## Product Purpose

CICI membantu pengambilan keputusan cicilan melalui pencatatan pemasukan, kewajiban, dan proyeksi. CICI bukan penyedia pinjaman.

## Capabilities and Constraints

Proyek kompetisi berbasis React, Vite, TypeScript, Tailwind, dan Supabase. Scope Rama mencakup Simulasi Cicilan, Kalender Keuangan, Anggaran Harian, Laporan Keuangan, dan e-wallet demo sebagai opsi simulasi pembayaran cicilan. Pembayaran e-wallet hanya mengubah saldo contoh di CICI, bukan mentransfer uang atau melunasi kewajiban aktual. Lonceng opsional. Skenario tidak mengubah transaksi aktual. Tidak ada commit/push/deployment otomatis.

Pembaruan 17 November 2026: aplikasi lokal membuka dashboard tanpa login. Profil, saldo, pemasukan, kewajiban, dan dompet tersimpan di browser masing-masing pengguna. Sesuai koreksi Rama, data awal kini menggunakan salinan akun lama yang dibaca dari UI Vercel melalui Chrome: saldo Rp8.000.000, empat pemasukan, lima kewajiban, serta saldo/riwayat e-wallet awal dari data proyek. Migrasi menambahkan data awal sekali dan mempertahankan edit lokal. Data tidak disinkronkan antarperangkat. Skenario perbandingan cicilan tetap selama sesi. Sumber data aktif tidak memakai sesi atau query Supabase; data UAT lama di Supabase tetap dipertahankan. Implementasi belum dideploy. Rincian ada di `docs/reviews/2026-11-17-restored-starter-data.md`.

## Brand Commitments

Pertahankan identitas CICI: warna biru, tipografi Poppins, shell navigasi, bahasa Indonesia, dan logo maskot pada `public/brand/cici-mascot.png`. Logo dipakai di navigasi dan onboarding. Semua saldo dan transaksi e-wallet diberi konteks simulasi.

## Evidence on Hand

Repo lokal dan pemeriksaan live di docs/reviews/2026-11-16-live-review.md. Data sintetis pengujian tidak membuktikan keberhasilan akun nyata atau RLS.
