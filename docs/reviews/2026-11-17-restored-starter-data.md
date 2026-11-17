# Pemulihan data awal untuk demo tanpa login

Status: selesai lokal, 17 November 2026. Belum commit/push/deploy.

## Sumber terkonfirmasi

Data akun dibaca lewat computer-use pada Chrome pengguna yang sudah login ke `https://cici-app-sigma.vercel.app/`. Halaman Dashboard, Pengaturan/Pemasukan, dan Kewajiban Saya dibaca tanpa mengubah data server.

- Profil: Nalranie, mahasiswa. Saldo Rp8.000.000, diperbarui 17 November 2026.
- Pemasukan: UAT CICI pemasukan 20261116 Rp1.000.000 (16 November), gaji Rp4.200.000 (25 November), test-freelance Rp4.000.000 (27 November), freelance Rp800.000 (28 November). Total Rp10.000.000.
- Kewajiban: cicilan hp Rp500.000 (jatuh tempo 10 November, dibayar 11 November), listrik Rp300.000 (15 November), UAT CICI cicilan 20261116 Rp300.000 (16 November; catatan Data uji integrasi CICI), sewa kos Rp800.000 (28 November), testing-cicilan laptop Rp3.000.000 (5 Desember). Selain cicilan hp, semuanya belum lunas. Semua tanggal pada tahun 2026.
- Dompet berasal dari fixture awal proyek, karena halaman e-wallet tidak ada pada deployment lama: DANA Rp600.000, GoPay Rp450.000, OVO Rp350.000, ShopeePay Rp250.000. Empat riwayat aktivitas awal dipulihkan dengan deskripsi tanpa kata contoh.

## Perilaku

- `starterFinance.ts` menyediakan salinan data awal dengan ID lokal stabil; ID backend tidak dibaca atau disalin. Tanggal dipertahankan, tidak digeser otomatis mengikuti bulan baru.
- UI lama hanya memperlihatkan tanggal, bukan waktu tepat perubahan saldo/pembayaran. Tanggal itu disimpan sebagai YYYY-MM-DD dan laporan tidak mengarang jam pembaruan.
- Saldo awal Rp8.000.000 adalah titik awal perhitungan. Pelunasan historis Rp500.000 tidak dikurangkan lagi, dan pembatalan catatan historis itu tidak menambah saldo awal.
- Browser baru membaca data awal tersebut. Browser dengan data versi kosong sebelumnya dimigrasikan satu kali; data lokal dan saldo yang sudah diedit dipertahankan. Dompet nol diisi dari saldo awal hanya jika belum memiliki pembayaran/nominal lokal.
- Penghapusan setelah migrasi tetap dihormati: tidak ada pengisian ulang otomatis pada setiap refresh.
- Saldo awal dompet adalah saldo pada snapshot; riwayat historis tidak dijumlahkan ulang terhadap saldo itu.

## Bukti

- 45 tes lulus: data awal valid, total data, migrasi tanpa duplikasi, edit lokal dipertahankan, penghapusan tidak dibatalkan refresh, serta perlakuan pembayaran historis.
- TypeScript dan Vite build lulus.
- Computer-use pada tab Chrome pengguna `http://localhost:8443/` memperlihatkan dashboard tanpa login dengan saldo Rp8.000.000, empat pemasukan Rp10.000.000, pengeluaran Rp500.000, kewajiban bulan November Rp1.400.000, proyeksi akhir Rp15.600.000, saldo terendah Rp7.400.000, dan uang aman Rp925.000. Hasil tersebut cocok dengan Dashboard Vercel yang dibaca sebelumnya.
- Halaman e-wallet lokal memperlihatkan total Rp1.650.000, empat saldo sesuai sumber, serta empat riwayat awal.
- Dataset ini merupakan salinan untuk demo; aplikasi lokal tetap memakai storage browser dan tidak bergantung pada login/query akun lama.
