# Kalender Keuangan dan Anggaran Harian dengan Data Akun

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menyelesaikan scope Rama untuk Kalender Keuangan dan Anggaran Harian agar memakai snapshot akun yang sama dengan Simulasi dan Laporan.

**Architecture:** Fungsi murni menyusun peristiwa aktual/terjadwal/simulasi kalender dan menghitung batas belanja sampai pemasukan terjadwal berikutnya. Komponen Kalender dan Anggaran menerima `FinancialSnapshot` serta skenario sesi melalui `App`; Supabase hanya dibaca.

**Tech Stack:** React 19, TypeScript, Supabase client existing, Node test runner, Vite, CSS existing.

**Source:** Koreksi scope Rama 17 November 2026: bagian simulasi cicilan mencakup Kalender Keuangan, Anggaran Harian, dan Laporan Keuangan. Ketika sumber tanggal historis hanya berisi saldo terkini, jangan mengarang saldo historis.

**Pembaruan setelah review Rama:** aksi pembayaran kalender kini terhubung ke pencatatan pembayaran existing dan pilihan e-wallet. Ketentuan awal untuk tidak menyediakan tombol pembayaran digantikan permintaan tersebut. Lihat `docs/reviews/2026-11-17-calendar-payment-actions.md` untuk perilaku dan bukti terbaru.

## Global Constraints

- Aktual, jadwal pemasukan/kewajiban, dan skenario simulasi diberi label terpisah.
- Pembayaran simulasi tidak mengubah data aktual, saldo akun, atau laporan pengeluaran yang sudah dibayar.
- Kalender memperlihatkan pemasukan sebagai terjadwal, kewajiban sebagai jatuh tempo atau sudah dibayar, dan rencana cicilan sebagai skenario.
- Hanya tampilkan saldo proyeksi untuk hari ini dan masa depan. Saldo historis tidak dapat direkonstruksi dari saldo akun saat ini.
- Anggaran harian memakai saldo terkini dan kewajiban sampai pemasukan terjadwal berikutnya. Pengeluaran harian/kategori belum dicatat; jangan buat kategori atau alokasi contoh yang terlihat sebagai data akun.
- Kalender menandai potensi benturan dengan saldo proyeksi di bawah nol.
- Pertahankan identitas visual CICI, aksesibilitas, kontrol sentuh minimum 44px, dan tanpa overflow 320/390/1440.
- Jangan mengubah saldo/kewajiban Supabase selama test. Skenario di sesi App tetap tidak persisten setelah refresh.
- Lonceng tetap opsional dan tidak termasuk.

## Review Focus

- Bulan pendek/kabisat dan navigasi batas rentang data: tanggal minggu dan jumlah hari akurat.
- Kewajiban lunas versus belum lunas: jangan mengurangi saldo dua kali; pembayaran aktual memakai paidAt, jatuh tempo belum lunas memakai dueDate.
- Pemasukan: tampil sebagai perkiraan, tidak disamakan dengan uang diterima.
- Hari historis: tampilkan peristiwa yang dikenal, jangan hitung saldo historis dari saldo sekarang.
- Simulasi: overlay pada kalender/anggaran ditandai skenario dan hilang setelah reset; tidak menjadi kewajiban aktual.
- Pemasukan berikutnya hari ini, tidak ada pemasukan, saldo kosong, dan biaya skenario sebelum pemasukan: rumus daily safe-to-spend dapat dijelaskan.

## File Map

| File | Responsibility |
| --- | --- |
| `src/lib/financialViews.ts` | Pemetaan snapshot ke CalendarEvent dan kalkulasi DailyBudget murni. |
| `src/lib/financialViews.test.ts` | Tes peristiwa, batas tanggal, histori, kewajiban, skenario, dan budget. |
| `src/pages/FinancialCalendar.tsx` | Kalender bulan nyata, navigasi, transaksi tanggal terpilih, saldo/risiko hari ini ke depan. |
| `src/pages/DailyBudget.tsx` | Batas harian dengan rincian reservasi dan dampak skenario. |
| `src/pages/Finance.css` | Gaya scoped halaman yang ditambah, jika kelas baru dibutuhkan. |
| `src/App.tsx` | Mengganti CalendarPage/BudgetPage demo dengan komponen data akun. |
| `package.json` | Menambahkan financialViews.test.ts ke script test. |

## F-01: Model peristiwa dan safe-to-spend

**Interfaces:**

```ts
type CalendarEvent = {
  id: string;
  date: string;
  title: string;
  amount: number;
  kind: 'income-scheduled' | 'obligation-due' | 'obligation-paid' | 'scenario';
  status: 'scheduled' | 'actual' | 'simulated';
};
type DailyBudget = {
  amount: number;
  availableBeforeIncome: number;
  reservedObligations: number;
  reservedScenario: number;
  days: number;
  nextIncomeDate: string | null;
  boundaryDate: string;
  insufficient: boolean;
  shortfall: number;
};
buildCalendarEvents(snapshot, month, scenario?): CalendarEvent[]
calculateDailyBudget(snapshot, today, scenario?): DailyBudget
```

- [x] Tulis tes gagal untuk pemasukan terjadwal, jatuh tempo, pembayaran paidAt, skenario uang muka/tenor, ID stabil, dan urutan tanggal.
- [x] Tulis tes gagal untuk daily budget dengan/ tanpa pemasukan, pemasukan hari ini, reservasi kewajiban sebelum tanggal pemasukan, skenario cicilan sebelum pemasukan, saldo null/negatif.
- [x] Pastikan pembayaran simulasi wallet tidak menjadi event kewajiban aktual atau pengeluaran laporan.
- [x] Jalankan suite financialViews merah dengan kegagalan karena fungsi belum ada.
- [x] Implementasikan fungsi pure minimal; saldo historis tidak dihitung dari saldo yang hanya tersedia hari ini.
- [x] Jalankan tes hingga hijau.

**Selesai jika:** label, tanggal, saldo historis dan formula daily budget cocok dengan kontrak serta seluruh tes murni lulus.

## F-02: Kalender Keuangan

**Props:** `{ snapshot: FinancialSnapshot; scenario: InstallmentPlan | null; today: string; minMonth: string; maxMonth: string }`.

- [x] Ganti kalender statis November/fixedExpenses dengan bulan kalender yang dipilih; tombol bulan sebelumnya/berikutnya aktif hanya dalam rentang data.
- [x] Render event bertanggal dari F-01 dengan label terjadwal/aktual/simulasi dan saldo akhir hanya untuk tanggal hari ini/masa depan.
- [x] Tampilkan potensi benturan apabila saldo proyeksi pada hari tersebut negatif, bukan berdasarkan nomor tanggal hard-coded.
- [x] Hari lampau menampilkan transaksi yang tanggalnya diketahui dan pesan bahwa saldo historis tidak direkonstruksi.
- [x] Pilih tanggal dengan keyboard/pointer; tampilkan rincian dan empty state. Jangan menyertakan tombol Pay Now atau tombol tandai bayar fiktif.
- [x] Jalankan typecheck/build; unit test mencakup bulan 28/29/30/31 hari, sementara browser fixture memeriksa Februari 2027/2028, batas navigasi, dan pemilihan tanggal.

**Selesai jika:** kalender tidak lagi memakai tanggal/transaksi contoh dan label setiap tipe peristiwa terbaca.

## F-03: Anggaran Harian

**Props:** `{ snapshot: FinancialSnapshot; scenario: InstallmentPlan | null; today: string }`.

- [x] Ganti saldo, cadangan, 21 hari, kategori, dan tanggal hard-coded dengan kalkulasi F-01.
- [x] Tampilkan formula saldo tersedia dikurangi kewajiban serta simulasi sampai pemasukan berikutnya; hasilnya tidak mengurangi saldo aktual.
- [x] Jika saldo belum diisi, pemasukan kosong, atau kewajiban melebihi dana, tampilkan keadaan penjelasan yang relevan.
- [x] Jelaskan estimasi pemasukan bukan penerimaan aktual dan data pengeluaran harian/kategori belum tersedia.
- [x] Tampilkan dampak skenario terpisah bila aktif, dan tunjukkan 0 atau kekurangan tanpa mengubah state keuangan akun.
- [x] Jalankan typecheck/build dan browser fixture pada 320/390/1440, saldo kosong, no income, actual obligation dan simulated scenario.

**Selesai jika:** Anggaran memakai data akun dan rumus yang dapat diperiksa, tanpa angka/kategori demo yang diklaim sebagai data pengguna.

## F-04: Integrasi shell dan serah-terima

- [x] Hubungkan dua halaman ke FinancialSnapshot, range date dan scenario sesi yang sudah ada.
- [x] Gunakan test runner `npm test`: 22 tes sebelumnya ditambah 8 tes financialViews, total 30.
- [x] Jalankan `npm run typecheck` dan `npm run build`.
- [x] Browser fixture memeriksa navigasi Kalender, Simulasi, Laporan, Anggaran, overlay/reset skenario, serta tidak menulis data akun pada pengujian fixture lokal.
- [x] Catat bukti dan batas verifikasi; production/deployment tetap berstatus belum diuji.

**Selesai jika:** seluruh empat fitur scope Rama (Simulasi, Kalender, Anggaran, Laporan) membaca sumber akun yang sama dan aktual/skedul/skenario dapat dibedakan.
