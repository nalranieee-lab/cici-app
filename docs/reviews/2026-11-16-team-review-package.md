# Paket review tim CICI

Status: paket review untuk branch lokal, belum menjadi draft PR. Perubahan tidak digabungkan ke base branch oleh paket ini.
Base checkout: `main` pada `f76f14d`.

Koreksi scope Rama (17 November 2026): selain e-wallet demo pembayaran, bagian Rama mencakup Simulasi Cicilan, Kalender Keuangan, Anggaran Harian, dan Laporan Keuangan. Kalender dan anggaran kini menerima snapshot akun yang sama dengan simulasi dan laporan. Detail implementasi serta verifikasi terbaru ada pada [laporan Kalender dan Anggaran](2026-11-17-calendar-budget-verification.md).

## Perubahan fitur untuk review

- `src/App.tsx`
- `src/pages/Obligations.tsx`
- `src/pages/Wallet.tsx`, `src/pages/Simulation.tsx`, `src/pages/Reports.tsx`, `src/pages/Finance.css`
- `src/pages/FinancialCalendar.tsx`, `src/pages/DailyBudget.tsx`
- `src/lib/financialTypes.ts`, `src/lib/useFinancialData.ts`, `src/lib/projection.ts`, `src/lib/reportSummary.ts`, `src/lib/walletDemo.ts`, `src/lib/walletPayments.ts`
- `src/lib/financialViews.ts`, `src/lib/financialViews.test.ts`, `src/lib/projection.test.ts`, `src/lib/reportSummary.test.ts`, `src/lib/walletPayments.test.ts`
- `public/wallet-logos/` dan `docs/assets/wallet-logo-sources.md`
- `package.json` (hanya script test/typecheck)
- `.gitignore` (mengecualikan preview review lokal dan policy lokal)
- `PRODUCT.md`, `docs/superpowers/specs/2026-11-16-simulation-reports-design.md`, `docs/superpowers/specs/2026-11-16-wallet-payment-simulation.md`, `docs/superpowers/specs/2026-11-16-wallet-demo-design.md`

## Jangan masukkan ke paket tim

- `.figma/make/social-image.png`: sudah berubah sebelum task fitur dimulai; tidak diperiksa atau disentuh oleh pekerjaan ini.
- `docs/reviews/2026-11-16-uat-akun-uji.md`, `docs/reviews/2026-11-16-live-review.md`, dan `docs/reviews/2026-11-16-feature-verification.md`: bukti lokal mencantumkan nilai finansial akun Rama. Simpan lokal kecuali Rama memilih membagikannya.
- `docs/reviews/cc-safety-net-project-proposal.json`: proposal pengecualian policy lokal, bukan perubahan fitur; jangan bagikan atau deploy.
- `.env.local`, `logs/`, `.tmp-*`, `.playwright-mcp/`, `.impeccable/review/`, `dist/`: environment, log, fixture, tangkapan layar, atau hasil build lokal.
- `docs/superpowers/plans/`: rencana kerja internal; bukan bagian runtime. Sertakan hanya bila tim meminta dokumentasi proses.

## Ringkasan untuk reviewer

1. E-wallet demo memotong saldo contoh dan menambah transaksi simulasi. Status kewajiban aktual tetap belum lunas; data tidak ditulis ke Supabase.
2. Simulasi memakai snapshot akun dan proyeksi sepanjang tenor; Laporan memakai periode yang dipilih dan membandingkan skenario aktif dalam sesi.
3. Periksa batasan: skenario dan saldo e-wallet simulasi hilang saat reload/logout; jadwal pemasukan tidak otomatis berulang; saldo historis tidak direkonstruksi; anggaran harian belum mencatat pengeluaran di luar kewajiban.
4. UAT akun Rama sebelumnya tetap tersimpan untuk review, tetapi fitur Kalender dan Anggaran tambahan diverifikasi memakai fixture lokal. Bukti berangka akun sengaja tidak disertakan dalam paket ini.

## Bukti verifikasi lokal

- `npm test`: 30/30 lulus setelah penambahan tes kalender dan anggaran.
- `npm run typecheck`: lulus.
- `npm run build`: lulus, Vite 8.0.5.
- `git diff --check` untuk source yang tracked: lulus. Logo dan berkas baru ditinjau melalui daftar berkas dan sumber masing-masing.
- Browser fixture lokal: grid kalender, batas bulan, keyboard/pointer, dan menu Anggaran pada 320 px diperiksa; ukuran 320/390/392/1440 tidak menyebabkan scroll horizontal. Rincian ada di laporan Kalender dan Anggaran.
- Impeccable detector untuk UI: `[]`, exit 0. Preview akun nyata lokal yang disebut di atas hanya membuktikan alur yang diuji saat itu, bukan RLS atau deployment baru.
- Kalender dan Anggaran tambahan masih berupa perubahan lokal yang belum masuk commit `6e7235d`. Push branch sebelumnya ditolak GitHub dengan HTTP 403; belum ada branch remote, PR, merge, atau deployment baru.
