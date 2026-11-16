# Kontrak integrasi simulasi dan laporan

Rama mendelegasikan keputusan teknis dan pelaksanaan seluruh task pada 16 November 2026. Keputusan berikut diambil agen untuk implementasi awal kompetisi dan dapat direview Rama.

- Skenario aktif dibagi antarhalaman selama sesi React, terikat user login. Refresh menghapus skenario; tidak ada tabel baru atau perubahan skema.
- Saldo adalah saldo tersedia saat ini, bertanggal pembaruan profil. Saldo null berbeda dari nol. Jangan merekonstruksi saldo historis dari saldo sekarang.
- Pemasukan merupakan jadwal/estimasi pada tanggal expected_date, bukan bukti penerimaan uang. Pengeluaran aktual pada laporan dibatasi kewajiban lunas berdasarkan paid_at; tanpa paid_at diberi label tidak diketahui dan tidak dikarang tanggalnya.
- Transaksi existing hanya muncul pada tanggal yang tercatat, tidak otomatis berulang. Peringatan keterbatasan proyeksi beberapa bulan selalu terlihat. Tidak ada asumsi pemasukan rendah atau skor kemampuan numerik buatan.
- Cicilan: nama, harga, uang muka, tanggal uang muka, cicilan bulanan, biaya per bulan, tenor 1 sampai 120 bulan, dan jatuh tempo pertama. Nominal integer rupiah maksimal 1 triliun; cicilan positif; uang muka tidak melebihi harga.
- Uang muka hanya sekali. Pembayaran bulanan = cicilan + biaya per bulan; dibentuk sepanjang tenor. Tanggal 31 dijepit ke akhir bulan pendek lalu kembali ke tanggal jangkar pada bulan selanjutnya.
- Saldo harian memakai pemasukan dan pengeluaran bersih pada hari sama; urutan jam tidak dimodelkan. Kewajiban terlambat yang belum lunas dihitung pada awal proyeksi. Kewajiban lunas tidak dikurangkan lagi.
- Risiko: saldo terendah negatif = Berisiko; saldo terendah kurang dari 20 persen pembayaran tersisa dalam horizon = Waspada; selebihnya Terkendali. Hasil berupa estimasi, bukan jaminan.
- Simulasi tidak mengubah saldo, kewajiban, atau riwayat transaksi. Laporan menunjukkan ringkasan akun dan perbandingan baseline versus skenario untuk periode yang dipilih.
- Query tetap memakai user_id/id user login dan RLS existing. RLS database belum diaudit atau diubah; status ini tidak boleh dipromosikan menjadi bukti isolasi antar akun.

Contoh hitung: saldo Rp1.000.000; uang muka Rp100.000; cicilan Rp200.000 dan biaya Rp10.000 selama 3 bulan, tanpa transaksi lain. Saldo akhir = Rp270.000. Tenor 2 bulan pada horizon yang sama menghasilkan Rp480.000. Saldo akhir bulan pertama boleh sama ketika tenor berubah, tetapi jumlah pembayaran dan horizon berbeda.

Hambatan environment: penulisan .env.local ditolak hook CC Safety Net walau sudah diizinkan pengguna. Tidak ada upaya melewati hook. Pengujian fungsi dan komponen terisolasi tetap dilanjutkan; E2E autentikasi lokal menunggu environment yang dapat digunakan.
