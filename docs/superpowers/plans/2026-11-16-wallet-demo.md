# E-wallet Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menambahkan e-wallet demo visual dengan logo penyedia dan riwayat contoh yang dapat difilter.

**Architecture:** Halaman React terpisah memakai data contoh bertipe dan aset lokal. State filter hanya berada pada halaman; saldo akun dan database tidak menerima perubahan dari fitur ini.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind/CSS existing, pnpm sesuai lockfile.

**Spec:** [Rancangan e-wallet](../specs/2026-11-16-wallet-demo-design.md). Penempatan halaman dan detail interaksi merupakan usulan yang ditinjau sebelum E-02; permintaan saat ini hanya menyusun task.

## Global Constraints

- E-wallet dibuat dummy secara visual terlebih dahulu, dengan logo dompet digital yang umum digunakan.
- Mode antislop sesi ini: during. Ikuti tampilan CICI existing.
- Tidak melakukan commit, push, atau deployment otomatis.
- Tidak mengubah saldo profil, kewajiban, simulasi, atau laporan dengan data demo.
- Status task berada di [TASKS.md](../../../../TASKS.md); rencana ini memuat langkah pelaksanaan.
- Eksekusi berurutan dalam sesi utama. Tidak otomatis membuat subagent, branch, atau worktree.

## Review Focus

- Logo tidak tersedia: nama penyedia tetap terbaca (E-02).
- Filter tidak mempunyai transaksi: tampilkan keadaan kosong, bukan daftar milik dompet lain (E-03).
- Angka panjang dan layar 390/320 piksel: tidak ada overflow horizontal (E-04).
- Navigasi ponsel: E-wallet tetap dapat dicapai lewat menu existing (E-02/E-04).
- Data demo: label tetap terlihat dan tidak masuk ke saldo akun (E-01/E-04).

## Peta berkas

| Berkas | Peran |
| --- | --- |
| `src/lib/walletDemo.ts` baru | Tipe dan fixture dompet/transaksi, tanpa akses Supabase. |
| `public/wallet-logos/` baru | Aset penyedia dari sumber terverifikasi. |
| `docs/assets/wallet-logo-sources.md` baru | URL sumber, tanggal pengambilan, nama aset, batas penggunaan yang ditemukan. |
| `src/pages/Wallet.tsx` baru | Ringkasan, dompet, riwayat, dan state filter lokal. |
| `src/pages/Wallet.css` baru | Gaya khusus e-wallet agar tidak memengaruhi halaman lain. |
| `src/App.tsx` diubah | Import, tipe Page, item menu, dan render Wallet. |

## E-00: Baseline lokal

- [x] Catat checkout, diff awal, runtime Node/pnpm dan script yang tersedia. Pertahankan perbedaan awal `.figma/make/social-image.png`.
- [x] Pasang dependensi resolved dengan pnpm 10.34.3 dan `install --frozen-lockfile`; manifest dan lockfile tidak berubah.
- [x] Periksa TypeScript dan build. Binary lokal tsc/vite lulus (exit 0); kegagalan launcher pnpm 11 dicatat pada laporan E-00.
- [ ] Pastikan preview lokal dapat dibuka dengan konfigurasi publik Supabase yang disediakan melalui jalur yang diizinkan; jangan menyalin sesi/token produksi. Jika belum tersedia, catat penghambatnya.

**Selesai jika:** baseline build/typecheck diketahui dan lingkungan preview siap, atau hambatan spesifik tercatat sebelum mengklaim kesiapan. Perbaikan baseline di luar scope dicatat untuk keputusan terpisah.

## E-01: Logo dan data demo

**Berkas:** `src/lib/walletDemo.ts`, `public/wallet-logos/`, catatan sumber logo.

**Interfaces:** `WalletId = 'dana' | 'gopay' | 'ovo' | 'shopeepay'`; `DemoWallet = { id: WalletId; name: string; logo: string; balance: number }`; `DemoTransaction = { id: string; walletId: WalletId; date: string; description: string; direction: 'in' | 'out'; amount: number }`. Ekspor `demoWallets` dan `demoTransactions` sebagai array readonly.

- [ ] Ambil logo DANA, GoPay, OVO, ShopeePay dari sumber penyedia yang terverifikasi; catat sumber dan simpan lokal. Jangan menggambar ulang logo seolah aset resmi.
- [ ] Buat fixture dengan nominal rupiah integer nonnegatif, tanggal ISO, ID unik, dan referensi walletId valid; sisakan satu dompet tanpa transaksi untuk pemeriksaan keadaan kosong.
- [ ] Periksa sumber aset, kecocokan nama, relasi transaksi, dan bahwa modul tidak mengimpor klien Supabase.

**Selesai jika:** empat aset dan data contoh siap digunakan, dapat diperiksa asalnya, dan tidak memakai identitas pribadi.

## E-02: Halaman dan navigasi

**Berkas:** `src/pages/Wallet.tsx`, `src/pages/Wallet.css`, `src/App.tsx`.
**Interfaces:** default `Wallet(): React.JSX.Element`, mengonsumsi fixture E-01; Page menambahkan `'wallet'`.

- [ ] Tinjau rancangan halaman terpisah sebelum edit UI; gunakan arah visual existing dan mode during yang sudah dipilih Rama.
- [ ] Buat judul, total yang dihitung dari saldo fixture, empat dompet, riwayat contoh, dan teks terlihat: "Demo visual. Saldo dan transaksi di halaman ini adalah contoh."
- [ ] Pasang menu E-wallet pada navigasi existing. Pastikan dapat dicapai di desktop dan melalui menu ponsel, tanpa menambah terlalu banyak item bottom navigation.
- [ ] Periksa navigasi masuk/keluar halaman dan fallback teks saat gambar logo gagal dimuat. Hindari kontrol pembayaran tanpa aksi.

**Selesai jika:** halaman dapat dibuka dan menampilkan empat dompet secara konsisten, dengan total sesuai fixture serta status demo yang jelas.

## E-03: Filter riwayat

**Berkas:** `src/pages/Wallet.tsx`, `src/pages/Wallet.css`.
**Interfaces:** state `filter: 'all' | WalletId`; daftar diturunkan dari fixture E-01, tanpa penyimpanan server.

- [ ] Tambahkan pilihan Semua/DANA/GoPay/OVO/ShopeePay dan indikator pilihan aktif.
- [ ] Filter transaksi berdasarkan walletId; tampilkan tanggal, nama dompet, keterangan, tanda masuk/keluar, dan nominal rupiah.
- [ ] Coba semua pilihan, termasuk dompet tanpa transaksi. Periksa hanya transaksi dompet terpilih muncul dan keadaan kosong menjelaskan hasilnya.
- [ ] Periksa kontrol dengan keyboard, label, dan fokus yang terlihat.

**Selesai jika:** seluruh filter bekerja, nilai contoh tidak berubah, dan tidak ada tombol yang tampak aktif tetapi tidak berfungsi.

## E-04: Verifikasi e-wallet

- [ ] Jalankan `pnpm exec tsc --noEmit` dan `pnpm build`; bedakan kegagalan baseline bila ada.
- [ ] Uji browser pada lebar 1440, 390, dan 320 piksel: logo, teks panjang, nominal, filter, menu ponsel, fokus, dan overflow. Periksa kontras teks serta target sentuh 44 piksel.
- [ ] Periksa state kosong; pastikan data demo tidak menulis ke database atau mengubah saldo dashboard.
- [ ] Simpan ringkasan pemeriksaan dan screenshot desktop/ponsel, lalu sajikan perubahan lokal untuk review Rama/tim.

**Selesai jika:** perilaku dan visual telah diverifikasi dengan bukti. Status lokal, commit, push, deployment dicatat terpisah. Deployment hanya diperiksa setelah benar-benar dilakukan melalui alur yang disetujui.
