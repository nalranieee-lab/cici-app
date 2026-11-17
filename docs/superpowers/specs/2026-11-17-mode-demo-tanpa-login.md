# Keputusan: mode demo tanpa login untuk penilaian

Tanggal: 17 November 2026  
Status: diimplementasikan dan diverifikasi lokal. Belum commit, push, atau deployment untuk perubahan ini.

## Tujuan

Juri kompetisi dapat membuka URL CICI dan langsung menjelajahi dashboard serta fitur tanpa registrasi, login, atau onboarding wajib.

## Keputusan produk

- URL aplikasi langsung membuka dashboard.
- Setiap juri menggunakan data demo yang tersimpan secara lokal pada browser masing-masing. Perubahan satu juri tidak memengaruhi juri lain.
- Data tetap tersedia setelah refresh pada browser dan origin yang sama; data tidak tersinkron antarperangkat dan dapat hilang ketika data browser dibersihkan atau sesi privat berakhir.
- Koreksi terbaru Rama: data keuangan sebelumnya tetap tersedia untuk demo. Data awal disalin dari UI akun Vercel yang sudah login; profil Nalranie, saldo Rp8.000.000, empat pemasukan dan lima kewajiban. Saldo serta riwayat awal empat e-wallet dipulihkan dari data proyek. Semua dapat diubah pada browser masing-masing pengguna.
- Skenario cicilan dan pembayaran e-wallet tetap simulasi. Tidak ada transfer uang; simulasi pembayaran e-wallet tidak mengubah status kewajiban aktual.
- Data UAT dan akun Supabase yang ada dipertahankan. Data tersebut tidak otomatis dimigrasikan atau ditampilkan dalam mode demo lokal.
- Lonceng notifikasi tetap opsional dan di luar pekerjaan ini.

## Kondisi sebelum implementasi

`src/App.tsx` masih memeriksa sesi Supabase dan menampilkan form login ketika sesi tidak ada. Profil, saldo, pemasukan, kewajiban, dan beberapa ringkasan dashboard masih bergantung pada identitas pengguna dan query Supabase. Menghilangkan form saja akan membuat fitur yang membutuhkan data akun tidak berfungsi. Penerapan mode demo perlu mencakup alur baca dan tulis data terkait.

## Urutan task berikutnya

1. **D-01: Rancang penyimpanan demo lokal.** Tetapkan bentuk dan versi data, nilai awal berlabel demo, validasi, kondisi penyimpanan browser gagal, dan cara menjaga data UAT lama tetap terpisah.
2. **D-02: Buka dashboard tanpa login.** Hilangkan kewajiban sesi dan onboarding pada alur demo, sesuaikan tombol serta teks yang masih mengharuskan akun.
3. **D-03: Hubungkan data demo.** Pindahkan pembacaan dan perubahan profil, saldo, pemasukan, kewajiban, pembayaran tercatat, serta ringkasan dashboard ke sumber data lokal yang sama.
4. **D-04: Integrasikan fitur Rama.** Pastikan Simulasi Cicilan, Kalender Keuangan, Anggaran Harian, Laporan Keuangan, dan e-wallet memakai data demo yang konsisten dengan dashboard; pertahankan batas pembayaran simulasi.
5. **D-05: Verifikasi dan review.** Periksa kunjungan pertama, refresh, dua browser atau profil browser terpisah, tambah/ubah/hapus data, alur simulasi sampai laporan, dan pembayaran e-wallet; jalankan pemeriksaan proyek yang relevan dan catat hasil serta keterbatasannya.
6. **D-06: Rilis setelah akses GitHub tersedia.** Tinjau perubahan bersama pekerjaan lokal sebelumnya, kemudian commit, push, dan proses deployment sesuai alur tim. Verifikasi URL Vercel setelah deployment.

## Hasil implementasi

Form login, registrasi, dan pemeriksaan sesi dihapus dari alur aplikasi. Seluruh data profil, saldo, pemasukan, kewajiban, dan dompet menggunakan penyimpanan lokal bersama dengan versi skema `cici.finance.v1`. Saldo serta riwayat dompet bertahan setelah refresh; skenario perbandingan cicilan tetap sesi. Pencatatan pembayaran dan perubahan saldo ditulis bersama. Data yang rusak atau kegagalan penyimpanan tidak ditimpa diam-diam.

Data awal tidak lagi kosong. `starterVersion: 1` memastikan pemasangan satu kali tanpa menimpa saldo yang telah diperbarui, menggandakan entri identik, atau memunculkan kembali entri yang sengaja dihapus. Lihat [pemulihan data awal](../../reviews/2026-11-17-restored-starter-data.md).

Lihat [bukti verifikasi](../../reviews/2026-11-17-no-login-local-finance.md) untuk cakupan pemeriksaan dan batasannya.

## Batas status

Implementasi dan verifikasi lokal telah selesai. Commit tambahan, push, dan deployment belum dilakukan. Push sebelumnya ditolak GitHub dengan HTTP 403 karena akun `ramaatha` belum memiliki izin tulis pada repository tujuan.
