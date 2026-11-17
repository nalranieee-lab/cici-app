# Integrasi Simulasi Cicilan dan Laporan Keuangan Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Simulasi dan laporan membaca data akun yang konsisten serta memperlihatkan dampak cicilan sepanjang tenor.

**Architecture:** Adapter data akun menyediakan snapshot bertipe; fungsi proyeksi murni menghasilkan baseline dan skenario. Kedua halaman mengonsumsi snapshot serta hasil yang sama. Skenario dipisahkan dari transaksi aktual.

**Tech Stack:** React 19, TypeScript, Supabase existing, fungsi perhitungan murni, Vite/pnpm existing.

**Spec:** Scope Rama pada [TASKS.md](../../../../TASKS.md) dan [bukti pemeriksaan live](../../reviews/2026-11-16-live-review.md). Ini rencana bertahap; I-01 menghasilkan kontrak desain yang harus disepakati sebelum I-02. Tidak menganggap keputusan produk yang belum dijawab sebagai persetujuan.

## Global Constraints

- Lingkup utama: integrasi simulasi cicilan dengan laporan keuangan.
- E-wallet tetap demo visual dan tidak menjadi sumber saldo akun.
- Kalender dan anggaran harian masuk scope berdasarkan koreksi Rama 17 November 2026; lihat `../plans/2026-11-17-calendar-budget-account-data.md`. Perbaikan profil, pembayaran atomik, dan lonceng tetap di luar scope ini.
- Tidak melakukan commit, push, atau deployment otomatis; tidak memodifikasi database operasional untuk pengujian.
- Sumber saldo, pemasukan terjadwal, kewajiban, dan waktu pembayaran mengikuti data akun. Jangan menganggap pemasukan terjadwal sebagai penerimaan aktual tanpa bukti.
- Perubahan kontrak publik hook/fungsi existing menjaga perilaku pemanggil dashboard.
- Eksekusi berurutan dalam sesi utama; tidak otomatis membuat subagent, branch, atau worktree.

## Review Focus

- Data akun kosong/saldo belum diisi: tampilkan permintaan melengkapi data, bukan fallback angka demo (I-02/I-04).
- Gagal query atau akun berganti: jangan memperlihatkan data akun sebelumnya sebagai data saat ini (I-02).
- Jatuh tempo tanggal 29/30/31, tahun kabisat, dan lintas tahun: jadwal mengikuti aturan tanggal yang disetujui (I-03).
- Saldo akhir positif tetapi defisit terjadi lebih awal: risiko mengikuti saldo harian, bukan saldo akhir saja (I-03).
- Berpindah Simulasi ke Laporan, lalu mengganti periode: skenario tetap teridentifikasi, tanpa dihitung sebagai pembayaran aktual (I-04/I-05).

## Peta berkas yang diusulkan

| Berkas | Peran |
| --- | --- |
| `docs/superpowers/specs/2026-11-16-simulation-reports-design.md` baru pada I-01 | Keputusan produk, definisi angka, contoh hitung, dan kontrak final. |
| `src/lib/financialTypes.ts` baru | Tipe snapshot akun, rencana cicilan, dan hasil proyeksi. |
| `src/lib/useFinancialData.ts` baru | Query rentang tanggal dan normalisasi data milik user login. |
| `src/lib/projection.ts`, `src/lib/projection.test.ts` baru | Jadwal cicilan, saldo harian, ringkasan bulanan, dan tes bermakna. |
| `src/lib/reportSummary.ts`, `src/lib/reportSummary.test.ts` baru | Agregasi laporan untuk periode terpilih. |
| `src/pages/Simulation.tsx`, `src/pages/Reports.tsx` baru | Memindahkan hanya dua halaman terkait dari App.tsx dan menghubungkannya. |
| `src/lib/cashflow.ts` existing | Referensi perilaku dashboard; perubahan hanya bila perlu reuse yang teruji. |
| `src/App.tsx`, `src/index.css` | Penghubung snapshot/skenario dan gaya terbatas halaman terkait. |

## I-01: Kontrak integrasi

- [ ] Tetapkan bersama Rama/tim apakah laporan membandingkan skenario aktif selama sesi saja atau memerlukan riwayat simulasi tersimpan. Penyimpanan server tidak otomatis diasumsikan.
- [ ] Tetapkan rentang laporan, waktu acuan saldo, arti pemasukan/pengeluaran, tanggal pembayaran aktual versus jatuh tempo, perlakuan uang muka/biaya, dan pembulatan rupiah.
- [ ] Tetapkan asumsi pemasukan/kewajiban beberapa bulan. Jangan otomatis mengulang transaksi sekali menjadi transaksi bulanan. Tentukan kebutuhan skenario pemasukan rendah yang datanya saat ini belum persisten.
- [ ] Tetapkan aturan tanggal akhir bulan, batas tenor, transaksi pada hari yang sama, serta indikator risiko. Hindari skor numerik tetap tanpa metode yang disepakati.
- [ ] Periksa skema dan RLS yang relevan melalui akses yang diizinkan. Catat apakah data existing cukup; perubahan skema hanya dirancang jika memang diperlukan.
- [ ] Tulis kontrak desain dengan contoh hasil yang dapat dihitung manual dan dapatkan review sebelum I-02.

**Selesai jika:** definisi, sumber data, perilaku skenario, dan contoh hitung disepakati. Jika belum, I-02 sampai I-06 tetap menunggu; task tidak diisi asumsi sepihak.

## I-02: Data akun bersama

**Berkas:** `src/lib/financialTypes.ts`, `src/lib/useFinancialData.ts`, `src/App.tsx`.
**Interfaces usulan:** `useFinancialData(input: { userId: string | undefined; startDate: string; endDate: string }): { snapshot: FinancialSnapshot | null; loading: boolean; error: string | null; reload: () => Promise<void> }`. `FinancialSnapshot` membawa saldo beserta waktu acuannya, pemasukan, kewajiban dan status pembayaran. Field final ditetapkan I-01.

- [ ] Definisikan tipe, tanggal kalender ISO, nilai uang integer rupiah, serta batas rentang yang konsisten. Jangan mengubah tipe ID database secara paksa.
- [ ] Query profil, pemasukan, dan kewajiban user sesuai kontrak; sertakan kewajiban terlambat yang masih harus dibayar. Tidak memakai konstanta demo sebagai fallback.
- [ ] Tangani data kosong, kegagalan, pergantian user/rentang, dan respons lama yang tiba belakangan.
- [ ] Verifikasi snapshot terhadap data akun uji; uji akun/rentang berganti dan kegagalan query. Periksa saldo yang belum diisi tetap berbeda dari saldo nol.

**Selesai jika:** kedua halaman dapat memakai snapshot yang sama dan status datanya dapat dipercaya. Belum perlu mengubah rumus atau tampilan laporan pada task ini.

## I-03: Mesin proyeksi

**Berkas:** `src/lib/projection.ts`, `src/lib/projection.test.ts`, tipe I-02.
**Interfaces usulan:** `buildInstallmentSchedule(plan: InstallmentPlan): ScheduledCashEvent[]`; `computeProjection(input: { snapshot: FinancialSnapshot; startDate: string; endDate: string; scenario?: InstallmentPlan }): ProjectionResult`. Hasil memuat saldo harian, ringkasan bulanan, saldo terendah, dan penjelasan risiko.

- [ ] Tulis tes yang gagal berdasarkan contoh hitung I-01: baseline, cicilan sepanjang tenor, uang muka sekali, biaya sesuai frekuensi, dan kewajiban lunas tidak dihitung ulang.
- [ ] Tambahkan kasus akhir bulan/kabisat/lintas tahun, transaksi pada hari yang sama, dan defisit sebelum tanggal pemasukan meskipun saldo akhir positif.
- [ ] Implementasikan fungsi murni tanpa akses database dan tanpa mutasi snapshot. Mengganti tenor harus mengganti jadwal/horizon, tetapi tidak wajib mengubah saldo bulan pertama bila cicilan bulanannya sama.
- [ ] Jalankan `node --experimental-strip-types --test src/lib/projection.test.ts` pada Node yang mendukung TypeScript stripping; gunakan import `.ts` eksplisit. Catat hasil aktual.

**Selesai jika:** semua contoh dan kasus batas lulus; perhitungan seluruh tenor dapat dijelaskan. Penggantian aturan dashboard existing memerlukan tes kesetaraan sebelum diubah.

## I-04: Halaman simulasi

**Berkas:** `src/pages/Simulation.tsx`, `src/App.tsx`, gaya terkait.
**Interfaces usulan:** `Simulation({ snapshot, onScenarioChange }: { snapshot: FinancialSnapshot | null; onScenarioChange: (plan: InstallmentPlan | null) => void })`. State skenario pada induk bersama laporan; jika riwayat persisten dipilih I-01, kontrak ini diperluas di desain dahulu.

- [ ] Pindahkan halaman simulasi dari App.tsx tanpa refactor halaman lain; hubungkan data I-02 dan fungsi I-03.
- [ ] Validasi nominal finite/nonnegatif, tenor integer sesuai batas I-01, nama, tanggal, dan aturan uang muka. Tampilkan alasan kesalahan pada field terkait.
- [ ] Tampilkan baseline versus skenario, periode seluruh tenor, titik defisit, serta asumsi yang benar-benar dipakai. Skenario belum dijalankan tidak tampil sebagai hasil baru.
- [ ] Uji hitung, revisi input, hitung ulang, dan reset. Periksa input invalid serta saldo belum diisi; jangan menulis skenario sebagai kewajiban aktual.

**Selesai jika:** hasil UI sesuai fungsi teruji, data demo hilang dari jalur akun, dan skenario dapat diterima laporan tanpa mengubah saldo akun.

## I-05: Laporan keuangan

**Berkas:** `src/pages/Reports.tsx`, `src/lib/reportSummary.ts`, `src/lib/reportSummary.test.ts`, `src/App.tsx`.
**Interfaces usulan:** `summarizeReport(input: { snapshot: FinancialSnapshot; startDate: string; endDate: string }): ReportSummary`; `Reports({ snapshot, scenario }: { snapshot: FinancialSnapshot | null; scenario: InstallmentPlan | null })`. Field ringkasan dan definisi periode mengikuti I-01.

- [ ] Tulis tes agregasi yang gagal: transaksi tepat di batas periode, status lunas/belum lunas, dan perpindahan bulan; pemasukan terjadwal tidak otomatis dianggap diterima.
- [ ] Implementasikan ringkasan dan pemilih periode dari data akun. Label pengeluaran mencerminkan data yang tersedia; jangan mengklaim seluruh belanja jika hanya kewajiban lunas yang tercatat.
- [ ] Hubungkan perbandingan skenario dari I-04. Hapus grafik/persentase/insight tetap; tampilkan hanya agregasi yang didukung data, beserta keadaan kosong/error.
- [ ] Jalankan `node --experimental-strip-types --test src/lib/reportSummary.test.ts`; coba pilihan periode dan perpindahan halaman. Verifikasi aturan refresh/persistensi yang disetujui I-01.

**Selesai jika:** angka laporan cocok dengan snapshot dan definisinya, periode benar-benar berubah, serta aktual dan simulasi dapat dibedakan dengan jelas.

## I-06: Verifikasi integrasi

- [ ] Jalankan tes fungsi di atas, `pnpm exec tsc --noEmit`, dan `pnpm build`.
- [ ] Pada akun/lingkungan uji terisolasi: catat saldo, pemasukan, dan kewajiban; hitung manual satu contoh; cocokkan baseline serta skenario di Simulasi dan Laporan.
- [ ] Uji tenor, biaya, uang muka, tanggal lintas bulan, periode laporan, reset, navigasi, dan refresh sesuai kontrak. Periksa saldo serta kewajiban aktual tidak berubah akibat simulasi.
- [ ] Periksa regresi tampilan dashboard, akun kosong, gagal query, responsive, keyboard, dan overflow. Jangan memakai data akun operasional untuk uji tulis tanpa otorisasi.
- [ ] Sajikan bukti, batas yang belum diuji, perubahan lokal, dan langkah rilis terpisah untuk Rama/tim.

**Selesai jika:** alur data akun ke Simulasi ke Laporan konsisten, kasus batas lulus, dan tidak ada pencampuran data demo/aktual/skenario. Commit, push, deploy, serta pemeriksaan deployment dilaporkan terpisah; tes lokal tidak membuktikan deployment sudah diperbarui.
