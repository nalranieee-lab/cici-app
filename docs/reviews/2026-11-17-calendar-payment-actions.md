# Kalender: sel seragam dan aksi pembayaran

Status: selesai lokal, 17 November 2026. Belum commit, push, atau deployment.

## Perubahan

- Semua baris kalender memiliki tinggi seragam: 132 px desktop/tablet, 116 px ponsel. Tujuh kolom menggunakan lebar yang sama; tanggal kosong dan tanggal bertransaksi tidak mengubah ukuran sel.
- Panel tanggal memperlihatkan aksi hanya pada kewajiban belum lunas. Setiap event menyimpan ID kewajiban sehingga dua tagihan bernama sama tetap diarahkan dengan benar.
- **Tandai dibayar** menggunakan layanan pencatatan yang sama dengan Dashboard dan Kewajiban Saya: mencatat is_paid/paid_at, lalu menyesuaikan saldo profil. Ini merupakan pencatatan pembayaran oleh pengguna, tidak memindahkan dana.
- **Bayar via e-wallet** membuka halaman E-wallet dengan kewajiban yang dipilih. Alur e-wallet tetap simulasi pembayaran. Tombol dinonaktifkan bila tagihan sudah disimulasikan pada sesi tersebut.
- Pending state dan pengunci klik melindungi permintaan berulang dari komponen yang sama. Setelah pencatatan berhasil, snapshot dan profil diperbarui tanpa menghilangkan bulan/tanggal yang dipilih. Simulasi e-wallet terkait dibatalkan melalui mekanisme existing.

## Bukti

- 32 tes unit lulus, termasuk identitas tagihan bernama sama; typecheck dan build lulus.
- Fixture browser terisolasi: tautan kalender membuka e-wallet dengan bill-1 terpilih, tanpa penulisan data.
- Pencatatan bill-2 sebesar Rp200.000 mengubah status menjadi lunas dan saldo Rp1.000.000 menjadi Rp800.000. Hanya satu PATCH kewajiban dan satu PATCH profil tercatat. Panel tetap pada 1 Desember 2026 setelah pembaruan.
- Kegagalan PATCH kewajiban: status tetap belum lunas, saldo tetap Rp1.000.000, toast gagal terlihat. Klik dua kali hanya menghasilkan satu permintaan.
- Kegagalan PATCH profil setelah status lunas tersimpan: toast menjelaskan status sudah tercatat dan saldo perlu diperbarui; tombol pencatatan tidak ditampilkan lagi untuk tagihan lunas.
- Viewport 320/390/768/1440: tinggi minimum sama dengan maksimum pada setiap ukuran; sel 320 px berlebar 44 px. Lebar dokumen sama dengan viewport. Kedua tombol tersusun vertikal dan setinggi 44 px pada ponsel.
- Screenshot desktop dan ponsel ditinjau. Konsol fixture sukses 0 error/0 warning. Respons 400 pada fixture kegagalan adalah hasil injeksi kegagalan yang disengaja.
- Detector Impeccable menghasilkan `[]`; pemeriksaan whitespace lulus.

## Batas

- Pengujian HTTP menggunakan backend tiruan di browser, bukan database Supabase. Data UAT tidak ditulis pada pengujian ini.
- Layanan pembayaran existing masih melakukan pembaruan kewajiban dan saldo secara berurutan, bukan transaksi database atomik. Toast mempertahankan informasi kegagalan parsial. Pengunci komponen tidak menjamin deduplikasi lintas tab/perangkat.
- Arahan sebelumnya yang meniadakan tombol pembayaran kalender digantikan permintaan Rama pada 17 November 2026; sumber data, tipe event, dan pemisahan skenario tetap berlaku.
