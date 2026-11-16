# Simulasi pembayaran cicilan dengan e-wallet

Rama menjelaskan bahwa e-wallet perlu menjadi pilihan untuk membayar cicilan yang sudah diinput, dan memilih simulasi untuk tahap kompetisi. Pilihan yang dilaksanakan: saldo contoh dan status simulasi berubah di CICI tanpa transfer uang.

## Alur

1. Pengguna membuka Kewajiban Saya dan memilih **Simulasikan dengan E-wallet**, atau membuka E-wallet dan memilih kewajiban belum lunas.
2. Pengguna memilih DANA, GoPay, OVO, atau ShopeePay dengan saldo contoh. Form menampilkan kewajiban, nominal, dan saldo.
3. **Simulasikan pembayaran** mengurangi saldo contoh jika cukup, menambah riwayat demo, dan menunjukkan label **Dibayar dalam simulasi** pada kewajiban terkait.
4. Jika saldo tidak cukup, kewajiban sudah disimulasikan, atau input tidak valid, state tidak berubah.

## Batas dan konsistensi

- Tidak memanggil penyedia, mentransfer dana, atau memperbarui status kewajiban, saldo profil, atau riwayat aktual di Supabase.
- Status aktual tetap **Belum dibayar** sampai pengguna mencatat pembayaran aktual melalui alur yang tersedia. Laporan akun tetap menggunakan data aktual.
- State simulasi di memori terikat ke akun. Reload dan logout menghapus simulasi serta mengembalikan saldo contoh awal. Tidak dijanjikan sinkronisasi lintas perangkat.
- Kewajiban aktual yang berubah nama, nominal, jatuh tempo, status, atau dihapus membatalkan simulasi terkait dan mengembalikan saldo contoh. Rekonsiliasi dilakukan saat snapshot akun dimuat ulang; edit dalam halaman kewajiban membatalkannya setelah penyimpanan berhasil.
- Daftar kewajiban untuk pemilihan tidak dibatasi 120 bulan; proyeksi keuangan tetap memiliki horizon terpisah yang terbatas.
- Pembayaran berulang untuk kewajiban yang sama ditolak. Reducer murni tidak memutasi input dan diuji dengan ID numerik/string, nilai invalid, saldo tidak cukup, serta pembatalan.

Keputusan agar simulasi tidak mengubah status aktual diambil demi menjaga arti laporan dan memenuhi pilihan **tanpa transfer uang**. Ini merupakan status sementara dalam CICI, bukan bukti pembayaran.
