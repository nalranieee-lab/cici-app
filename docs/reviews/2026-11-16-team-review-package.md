# Paket review tim CICI

Status: paket review untuk draft PR. Perubahan tidak digabungkan ke base branch oleh paket ini.
Base checkout: `main` pada `f76f14d`.

## Perubahan fitur untuk review

- `src/App.tsx`
- `src/pages/Obligations.tsx`
- `src/pages/Wallet.tsx`, `src/pages/Simulation.tsx`, `src/pages/Reports.tsx`, `src/pages/Finance.css`
- `src/lib/financialTypes.ts`, `src/lib/useFinancialData.ts`, `src/lib/projection.ts`, `src/lib/reportSummary.ts`, `src/lib/walletDemo.ts`, `src/lib/walletPayments.ts`
- `src/lib/projection.test.ts`, `src/lib/reportSummary.test.ts`, `src/lib/walletPayments.test.ts`
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
3. Periksa batasan: skenario dan saldo e-wallet simulasi hilang saat reload/logout; jadwal pemasukan existing tidak otomatis berulang; saldo historis tidak direkonstruksi; kalender dan anggaran lama masih di luar scope.
4. Verifikasi nyata dilakukan pada akun yang Rama izinkan di preview lokal. Data UAT tetap tersimpan untuk review, tetapi bukti berangka akun sengaja tidak disertakan dalam paket ini.

## Bukti verifikasi lokal

- `npm test`: 22/22 lulus.
- `npm run typecheck`: lulus.
- `npm run build`: lulus, Vite 8.0.5.
- `git diff --check` untuk source yang tracked: lulus. Logo dan berkas baru ditinjau melalui daftar berkas dan sumber masing-masing.
- Impeccable detector untuk UI: `[]`, exit 0. Review UI independen: ship terbatas pada capture fixture 1440/390 dan perbaikan pembayaran terbaru. Preview akun nyata lokal juga diperiksa langsung.
- Belum ada hasil deployment baru. Jangan menganggap status lokal sebagai status commit, push, atau produksi.
