# Dashboard langsung dan penyimpanan lokal

Status: selesai lokal pada 17 November 2026; belum commit/push/deploy.

## Perubahan

- Form login/registrasi dihapus. App tidak memeriksa sesi, tidak menampilkan tombol keluar, dan tidak mewajibkan onboarding. Pengubahan profil tetap tersedia secara opsional.
- Repository lokal bertipe, validasi skema versi 1, dan satu snapshot bersama digunakan oleh seluruh halaman. Kunci penyimpanan `cici.finance.v1` berada pada origin/browser pengguna.
- Data keuangan awal kosong mengikuti arahan terakhir untuk menghapus demo. Nama umum Pengguna CICI dapat diedit. Nominal, tanggal, ID, serta nilai tersimpan divalidasi.
- CRUD profil, saldo, pemasukan, kewajiban dan pembayaran menggunakan penyimpanan lokal. Pencatatan/pembatalan pembayaran dan pembaruan saldo dilakukan dalam satu setItem; kegagalan simpan tidak meninggalkan status/saldo setengah berubah.
- Saldo dan riwayat simulasi dompet bertahan setelah refresh. Perubahan kewajiban merekonsiliasi simulasi dompet terkait. Skenario perbandingan cicilan tetap dihapus saat refresh sesuai perilaku sebelumnya.
- Tab pada origin/browser yang sama menerima pembaruan lewat event storage. Tidak ada sinkronisasi ke server atau antarperangkat.
- Data UAT, akun, environment, dan kebijakan Supabase tidak diubah. Modul konfigurasi Supabase lama tetap ada di source untuk referensi tim, tetapi tidak diimpor oleh alur aplikasi aktif.

## Verifikasi

- 41 tes lulus: 32 tes sebelumnya dan 9 tes repository lokal. Cakupan baru: isolasi storage, reload, CRUD, pembayaran/pembatalan tepat sekali, saldo belum diisi, kegagalan quota, format/versi rusak, validasi, persistensi dompet, serta pembacaan data terbaru sebelum menulis.
- TypeScript dan Vite build lulus. Bundel aplikasi tidak membutuhkan autentikasi Supabase.
- Browser membuka `/` dengan dashboard dan 0 input email/password; sumber daya yang dimuat tidak menunjukkan request Supabase/auth/rest.
- Saldo Rp3.000.000, satu pemasukan Rp4.000.000, dan kewajiban Rp300.000 disimpan lewat UI lokal dan tetap tersedia setelah navigasi penuh/refresh.
- Pembayaran dari kalender mengubah saldo menjadi Rp2.700.000 dan status menjadi lunas; klik ganda tidak mengurangi lagi. Pembatalan dari Kewajiban Saya mengembalikan saldo Rp3.000.000. Laporan menampilkan pembayaran yang sesuai.
- Saldo DANA Rp500.000, simulasi tagihan Rp300.000: saldo dompet Rp200.000 dan satu riwayat bertahan setelah refresh. Saldo profil dan status kewajiban aktual tidak berubah oleh simulasi.
- Tab kedua menampilkan data tersimpan yang sama. Mengubah saldo menjadi Rp3.100.000 di tab kedua langsung memperbarui kartu pada tab pertama tanpa refresh.
- Skenario uang muka Rp100.000 dan 3 pembayaran Rp210.000 muncul di laporan Februari 2027: baseline Rp6.800.000, skenario Rp6.070.000. Tidak ada request Supabase.
- Delapan halaman diukur pada 320/390/1440 px, 24 kombinasi tanpa horizontal overflow pada data yang diuji.
- Konsol sesi sukses 0 error/0 warning. Fixture HTTP dari pengujian lama tidak digunakan untuk bukti di atas; pengujian ini memakai halaman utama dan localStorage nyata dalam browser pengujian.

## Batas

- Isolasi storage berbeda dibuktikan oleh unit test. Browser diuji dengan dua tab pada profil/origin yang sama; dua profil browser fisik terpisah belum diuji.
- Penulisan lokal menggunakan mekanisme last writer wins; tidak menjamin locking lintas tab yang menulis pada saat persis bersamaan.
- Menghapus data browser, memakai mode privat, browser/origin lain, atau berganti perangkat dapat menghasilkan data kosong. Aplikasi menampilkan penjelasan penyimpanan pada halaman utama. Tidak tersedia pemulihan dari server.
- Penghapusan login tidak membuktikan kesiapan produksi atau integrasi pembayaran penyedia. E-wallet tetap simulasi dan pengiriman notifikasi belum diimplementasikan.
- Data uji lokal berada di profil browser alat pengujian. Data akun UAT Supabase tidak dibaca, dimigrasikan, diubah, atau dihapus.
