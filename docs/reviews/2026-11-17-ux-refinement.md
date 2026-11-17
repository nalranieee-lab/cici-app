# Perbaikan interaksi dan keterbacaan CICI

Status: implementasi lokal, 17 November 2026. Alur tanpa login dan data lokal sudah diterapkan; belum di-deploy.

## Perubahan

- Toast berbasis Tailwind/CSS mengikuti identitas CICI. Hasil simpan, hapus, pembayaran tercatat, penghitungan/reset skenario, profil, autentikasi, dan kegagalan aksi mendapat pemberitahuan. Validasi kolom tetap tampil dekat input.
- Input rupiah bersama menampilkan pemisah titik sambil mempertahankan nilai digit untuk perhitungan: saldo, preferensi pemasukan, pemasukan, kewajiban, rencana cicilan, dan saldo dompet. Tenor tetap berupa jumlah bulan.
- Dompet memiliki Tambah saldo dan Ubah saldo akhir. Nominal divalidasi sebagai rupiah bulat hingga 1 triliun; tambah nol ditolak, ubah saldo akhir nol diperbolehkan.
- Data awal dompet menggunakan saldo serta riwayat yang dipulihkan untuk penilaian. Perubahan saldo dan simulasi dompet tersimpan di browser; transaksi yang ditampilkan berasal dari data awal atau aksi pengguna.
- Kalimat demo/contoh pada halaman dihapus. Keterangan singkat bahwa pembayaran belum terhubung ke penyedia tetap terlihat agar pengguna memahami bahwa dana tidak ditransfer.
- Dashboard memakai tiga kolom kartu pada desktop, dua pada ukuran menengah, dan satu pada ponsel sempit. Label 13 px, keterangan 12 px, dan nominal 18–23 px; keterangan membungkus di dalam kartu. Pembayaran mendatang, radar, grafik, input, serta kalender ikut disesuaikan.
- Form Simulasi menampilkan placeholder rupiah lebih ringan; pilihan tenor 3/6/9/12/18/24; uang muka, biaya bulanan, dan tanggal uang muka opsional. Jika tanggal uang muka kosong, perhitungan menggunakan hari ini. Petunjuk tersebut memakai warna netral.
- Logo CICI pada navigasi dan onboarding memakai maskot dari lampiran Rama. Kartu “Butuh panduan?” menggunakan maskot yang sama.
- Preferensi nominal dan toggle pada Pengaturan disimpan di browser dengan pesan lokasi penyimpanan. Ini tidak mengaktifkan pengiriman notifikasi dan tidak mengubah mesin proyeksi yang memakai jadwal pemasukan tercatat.

## Bukti lokal

- 45 tes lulus; TypeScript dan Vite build lulus. Pemeriksaan sesudah perubahan form Simulasi juga meluluskan TypeScript dan build.
- Browser fixture: tambah DANA 1.000.000 menghasilkan total Rp1.000.000 serta toast berhasil; ubah saldo akhir ke 250.000 menghasilkan Rp250.000; pembayaran Rp300.000 ditolak dengan toast saldo kurang dan tidak mengubah saldo.
- Input simulasi 3000000 dan 450000 tampil sebagai 3.000.000 dan 450.000. Hitung menampilkan hasil tenor enam bulan dan toast; reset mengosongkan harga serta menampilkan toast reset.
- Delapan halaman (Dashboard, E-wallet, Simulasi, Kalender, Kewajiban, Anggaran, Laporan, Pengaturan) diukur pada 320/390/768/1440 px: lebar dokumen sama dengan viewport di seluruh 32 kombinasi.
- Screenshot desktop dan ponsel diperiksa; konsol pada sesi browser baru 0 error/0 warning. Artefak lokal berada di `.playwright-mcp/`.
- Impeccable detector menghasilkan `[]`. Pemeriksaan whitespace source lulus.
- Formatter existing sempat menghilangkan pemisah tipe pada beberapa deklarasi. Deklarasi diperbaiki dan seluruh pemeriksaan kembali lulus; formatter itu tidak dijalankan ulang.

## Pemeriksaan UI

- PASS reflow: ukuran viewport dan screenshot mendukung tidak adanya overflow halaman pada data fixture yang diuji.
- PASS interaksi: tambah/ubah saldo, saldo kurang, hitung, dan reset telah diklik; toast dapat ditutup dan memiliki status/alert untuk pembaca layar.
- PASS konsistensi: Poppins, biru CICI, maskot yang diberikan Rama, kontrol 44 px, teks nominal tabular, dan outline fokus mengikuti identitas existing.
- PASS kejelasan isi: label demo dihapus, sedangkan batas integrasi pembayaran tetap dinyatakan. Tidak mengklaim aplikasi sudah siap produksi.

## Batas

- Pengujian browser memakai fixture terisolasi; tidak menulis data UAT di Supabase.
- Saldo dompet dan pembayaran simulasi masih state sesi: refresh/logout menghapusnya. Penyimpanan permanen dompet akan mengikuti pekerjaan sumber data lokal tanpa login yang telah disepakati terpisah.
- Pengiriman notifikasi belum diimplementasikan. Toggle hanya preferensi lokal.
- Belum commit, push, atau deployment untuk perubahan ini. Kode lokal mencakup perubahan sebelumnya; file/aset lain yang sudah berubah dipertahankan.
