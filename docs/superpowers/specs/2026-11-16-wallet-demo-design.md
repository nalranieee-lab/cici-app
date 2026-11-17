# Rancangan e-wallet demo CICI

Status: implementasi diizinkan Rama pada 16 November 2026 melalui instruksi mengeksekusi rencana dan delegasi keputusan teknis. Hasil lokal diverifikasi di docs/reviews/2026-11-16-feature-verification.md.

Pembaruan: Rama kemudian menyetujui simulasi pembayaran kewajiban melalui e-wallet. Alur terbaru dan batasnya dicatat dalam 2026-11-16-wallet-payment-simulation.md dan menggantikan butir sebelumnya yang melarang tombol pembayaran untuk simulasi.

## Tujuan dan konteks

CICI merupakan platform web simulasi keputusan cicilan dan proyeksi arus kas
untuk mahasiswa, fresh graduate, dan generasi muda. CICI bukan penyedia pinjaman.
Rama menetapkan bahwa e-wallet dibuat dummy secara visual terlebih dahulu,
dengan logo dompet digital yang umum digunakan. Mode antislop sesi ini: during.

Referensi deployment yang diberikan Rama: https://cici-app-sigma.vercel.app/.
Pada pemeriksaan browser 16 November 2026, halaman login CICI tampil.
Halaman setelah login belum diperiksa dan identitas commit deployment belum
diverifikasi terhadap checkout lokal. Referensi ini tidak membuktikan fitur
akun atau integrasi Supabase telah lulus pengujian.

## Pendekatan

- Usulan utama: halaman E-wallet terpisah di menu aplikasi. Saldo contoh dan
  detail transaksi mudah ditinjau tanpa tercampur dengan saldo akun dashboard.
- Alternatif: ringkasan dompet pada dashboard. Perubahannya lebih kecil,
  tetapi ruang detail terbatas dan angka demo berdekatan dengan data akun.
- Integrasi penyedia pembayaran tidak termasuk cakupan yang diminta.

Pendekatan halaman terpisah dilaksanakan sesuai delegasi Rama.

## Isi dan interaksi yang diusulkan

1. Judul E-wallet dan keterangan yang terlihat: "Demo visual. Saldo dan
   transaksi di halaman ini adalah contoh."
2. Ringkasan total saldo contoh, dihitung dari empat dompet contoh.
3. Dompet DANA, GoPay, OVO, dan ShopeePay, masing-masing dengan logo penyedia,
   nama, label saldo contoh, dan nominal rupiah.
4. Riwayat transaksi contoh dengan tanggal, keterangan, dompet, arah transaksi,
   dan nominal. Semua contoh diberi konteks demo, tanpa identitas pribadi.
5. Filter Semua/DANA/GoPay/OVO/ShopeePay mengubah daftar secara lokal;
   keadaan kosong menjelaskan bahwa tidak ada transaksi contoh yang cocok.
6. Tidak menampilkan tombol transfer, pembayaran, atau sambungkan akun
   yang berpotensi disalahartikan sebagai layanan aktif.

## Arah tampilan

- Mengikuti shell, tipografi, kartu, dan warna biru CICI pada kode existing.
- Mode permukaan: Operate. ENERGY 1 / RHYTHM 1 / MOTION 1.
- Total saldo menjadi fokus utama, dilanjutkan empat dompet dan riwayat.
- Warna penyedia dipakai pada logo; tampilan keseluruhan tetap konsisten
  dengan CICI. Logo tidak boleh digambar ulang sebagai aset resmi.
- Desktop menggunakan dua kolom dompet; ponsel satu kolom. Riwayat membungkus
  dengan rapi tanpa membutuhkan scroll horizontal halaman.
- Kontrol memakai label yang jelas, fokus keyboard terlihat, dan target
  sentuh minimum 44 piksel. Animasi dibatasi pada umpan balik interaksi.

## Batas implementasi

- Memakai React, TypeScript, Vite, dan CSS proyek yang sudah tersedia.
- Halaman di src/pages/Wallet.tsx; data demo bertipe di modul terpisah.
- Registrasi menu dan halaman melalui src/App.tsx; gaya dibatasi ke e-wallet.
- Logo diambil dari sumber penyedia yang dapat diverifikasi dan disimpan
  sebagai aset lokal beserta catatan sumber saat implementasi.
- Data contoh tidak disimpan ke Supabase dan tidak mengubah saldo profil,
  simulasi cicilan, laporan keuangan, maupun status pembayaran.
- Integrasi simulasi-laporan dan lonceng merupakan pekerjaan terpisah.
- Tidak melakukan commit, push, atau deployment otomatis.

## Verifikasi setelah implementasi disetujui

- Periksa TypeScript dan build memakai dependensi proyek yang resolved.
- Periksa navigasi ke halaman serta semua filter dan keadaan kosong.
- Periksa logo, label demo, total saldo, format rupiah, dan tanda transaksi.
- Periksa desktop dan ponsel, keyboard, kontras, serta overflow horizontal.
- Catat keterbatasan secara eksplisit bila build atau preview tidak dapat
  dijalankan. Saat telaah awal, node_modules belum tersedia dan build gagal
  karena vite tidak ditemukan.

## Persetujuan yang diperlukan

Implementasi lokal selesai; menunggu review hasil oleh Rama. Tidak ada persetujuan rilis yang diasumsikan.
