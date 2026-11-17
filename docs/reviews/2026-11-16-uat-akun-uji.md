# Skenario uji alur lengkap CICI

Status: dijalankan pada 16 November 2026 dengan akun yang sedang login,
sesuai pilihan Rama. Data uji masih tersimpan untuk direview.
Target: preview lokal `http://127.0.0.1:8443/`; backend Supabase sama dengan
deployment yang diberikan. Gunakan akun khusus uji atau akun yang dinyatakan
boleh dipakai pengguna. Jangan mencatat kata sandi, token, atau data pribadi.

## Data uji terencana

Pada akun yang semula kosong, isi saldo Rp3.000.000, catat pemasukan terjadwal
Rp1.000.000 pada hari uji, dan satu kewajiban belum dibayar Rp300.000 jatuh tempo
pada hari uji. Catat ID data uji secara privat hanya jika diperlukan untuk
pembersihan; jangan menghapus atau mengubah data yang bukan dibuat untuk uji.

## Simulasi cicilan dan laporan

Masukkan harga Rp2.000.000, uang muka Rp100.000 pada hari uji, cicilan Rp200.000,
biaya tambahan Rp10.000/bulan, tenor tiga bulan, dan jatuh tempo pertama pada
hari uji. Dengan hanya data di atas, baseline akhir proyeksi seharusnya
Rp3.700.000; dengan skenario seharusnya Rp2.970.000. Bandingkan hasil di
Simulasi dan bulan terakhir tenor pada Laporan. Pastikan label pemasukan
terjadwal dan pemisahan kewajiban aktual/skenario jelas.

## Simulasi e-wallet

Untuk kewajiban Rp300.000, pilih ShopeePay contoh Rp250.000 dan pastikan
simulasi ditolak tanpa perubahan saldo. Pilih DANA contoh Rp600.000, simulasikan,
dan pastikan saldo contoh menjadi Rp300.000 serta status **Dibayar dalam
simulasi** muncul. Status aktual harus tetap **Belum dibayar** setelah membaca
ulang daftar kewajiban; tidak ada transfer uang. Uji duplikasi dan refresh hanya
sesuai perilaku simulasi sesi yang dijelaskan di aplikasi.

## Verifikasi dan pembersihan

Periksa tampilan pada desktop dan ponsel, serta catat hasil, kesalahan, dan
console tanpa menyimpan nilai kredensial. Gunakan akun khusus agar saldo uji
tidak mengubah saldo milik orang lain. Penghapusan hanya untuk entri yang dibuat
uji ini dan dilakukan jika disetujui pemilik akun; jangan menghapus akun atau
data yang sudah ada. Uji lokal tidak membuktikan deployment baru atau RLS.

## Hasil pelaksanaan pada akun yang sudah memiliki data

Akun awal memiliki dua pemasukan terjadwal total Rp5.000.000, dua kewajiban
belum lunas sebesar Rp1.100.000, dan saldo belum diisi. Dengan izin Rama,
pengujian menyimpan saldo Rp3.000.000, pemasukan **UAT CICI pemasukan
20261116** Rp1.000.000, dan kewajiban **UAT CICI cicilan 20261116** Rp300.000
tanggal 16 November 2026 dengan catatan `Data uji integrasi CICI`.

Karena akun tidak kosong, baseline yang diharapkan adalah Rp3.000.000 +
Rp6.000.000 - Rp1.400.000 = **Rp7.600.000**. Uang muka Rp100.000 dan tiga
pembayaran Rp210.000 menghasilkan **Rp6.870.000**. Kedua angka teramati
di Simulasi dan pada baris Januari 2027 di Laporan.

ShopeePay contoh Rp250.000 menolak kewajiban Rp300.000. DANA contoh berhasil:
saldo Rp600.000 menjadi Rp300.000 dan total demo Rp1.650.000 menjadi
Rp1.350.000. Setelah daftar dimuat kembali, kewajiban uji tetap **Belum
dibayar**, badge **Dibayar dalam simulasi** tampil, dan tombol simulasi ganda
nonaktif. Setelah browser di-refresh, saldo DANA demo kembali Rp600.000,
badge simulasi hilang, dan kewajiban uji tetap belum dibayar; skenario juga
hilang dari laporan sesuai desain sesi. Tidak ada transfer uang.

Data awal tidak dihapus. Dua entri berlabel UAT dan saldo Rp3.000.000 tetap
ada pada akun/backend terhubung; belum ada pembersihan atau pemulihan saldo.
Rama memilih mempertahankan data tersebut untuk review. Saldo awal berstatus
belum diisi. Uji ini pada preview lokal, bukan deployment baru.
