# Verifikasi simulasi pembayaran e-wallet

Tanggal: 16 November 2026. Scope W-01 berdasarkan pilihan Rama: simulasi pembayaran, bukan transfer uang. Implementasi hanya lokal; branch `main`, belum commit/push/deploy.

## Fitur

- Kewajiban belum lunas dapat dipilih dari halaman E-wallet, atau lewat tombol **Simulasikan dengan E-wallet** pada Kewajiban Saya.
- Simulasi berhasil mengurangi saldo contoh dompet, menambah riwayat demo, dan menandai baris kewajiban **Dibayar dalam simulasi**. Status sebenarnya tetap **Belum dibayar**.
- Saldo tidak cukup, nilai invalid, kewajiban sudah lunas, dan simulasi ganda ditolak tanpa perubahan saldo contoh.
- Simulasi hanya tersimpan selama sesi dan terhapus saat refresh/logout. Perubahan data penting kewajiban, penghapusan, atau pencatatan pembayaran aktual membatalkan simulasi terkait dan mengembalikan saldo contoh.
- Tidak ada API provider, transaksi uang, perubahan saldo profil, atau penulisan status pembayaran aktual dalam jalur simulasi.

## Bukti

- `npm test`: 22 tes lulus, exit 0. Tujuh tes mencakup pembayaran demo, saldo tidak cukup, invalid, duplikasi, pembatalan, dan rekonsiliasi ketika kewajiban berubah.
- `npm run typecheck` dan `npm run build`: lulus, exit 0.
- Fixture HTTP: saldo ShopeePay contoh Rp250.000 menolak kewajiban Rp300.000 tanpa perubahan total; DANA Rp600.000 menjadi Rp300.000 pada simulasi berhasil. Status asli tetap belum dibayar dan tombol simulasi ganda dinonaktifkan.
- Pada akun yang Rama login sendiri di preview lokal, kewajiban listrik Rp300.000 disimulasikan menggunakan DANA. Saldo DANA contoh Rp600.000 menjadi Rp300.000, total contoh Rp1.650.000 menjadi Rp1.350.000, dan riwayat simulasi muncul. Saat Kewajiban Saya dimuat kembali dari Supabase, kewajiban tetap **Belum dibayar**, dengan badge tambahan **Dibayar dalam simulasi**. Tidak ada penulisan pembayaran aktual.
- Browser di 320 dan 390 piksel tidak menunjukkan overflow halaman e-wallet. Kontrol filter, pemilihan dompet/kewajiban, dan submit 44px pada 390 piksel. Capture 390/1440 ada di direktori ignored `.impeccable/review/` dengan nama `wallet-payment-mobile.png`, `wallet-payment-desktop.png`, dan `wallet-payment-success-mobile.png`.
- Detector Impeccable pada file UI terkait: `[]`, exit 0. Console pada fixture: 0 error dan 0 warning.

## Review

Review kode independen menemukan dua masalah: simulasi usang setelah kewajiban diubah dan kewajiban di luar 10 tahun tidak tersedia. Simulasi usang kini direkonsiliasi dan saldo dikembalikan; daftar kewajiban tidak dibatasi horizon proyeksi. Review ulang menyatakan kedua temuan tertutup. Tes regresi untuk pembatalan dan perubahan jatuh tempo lulus.

Review visual independen memberikan **ship terbatas pada UI lokal yang diperiksa**. Pesan saat seluruh kewajiban telah disimulasikan diperbaiki dan diuji di browser fixture. Nominal transaksi yang semula terpecah di ponsel juga diperbaiki; pengukuran 320/390 menunjukkan nominal berada pada satu baris dan lebar dokumen sama dengan viewport. Reviewer memeriksa capture terbaru dan memberikan verdict pass untuk perbaikan tersebut.

## Keterbatasan

Tidak ada pembayaran nyata atau integrasi provider. Simulasi tidak persisten antar perangkat atau setelah refresh. Browser nyata menguji jalur simulasi dan pembacaan ulang kewajiban, bukan audit RLS atau transaksi backend. Fitur dapat direview pada preview lokal; commit/push/deployment dan uji deployment belum dilakukan.
