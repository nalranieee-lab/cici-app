// filepath: src/pages/Reports.tsx
import { useState } from 'react';
import type { FinancialSnapshot, InstallmentPlan } from '../lib/financialTypes';
import { computeProjection, isoToday, money, monthDate, monthEnd } from '../lib/projection';
import { summarizeReport, reportPeriods } from '../lib/reportSummary';
import './Finance.css';

export default function Reports({ snapshot, scenario }: { snapshot: FinancialSnapshot; scenario: InstallmentPlan | null }) {
  const today = isoToday();
  const [period, setPeriod] = useState(today.slice(0, 7));
  const first = `${period}-01`, end = monthEnd(first);
  const summary = summarizeReport({ snapshot, startDate: first, endDate: end });
  const options = reportPeriods(today);
  const label = (month: string) => new Date(`${month}-01T12:00:00`).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  let forecast: { before: ReturnType<typeof computeProjection>; after: ReturnType<typeof computeProjection> | null } | null = null;
  let error = '';
  if (snapshot.balance !== null && end >= today) {
    try { forecast = { before: computeProjection({ snapshot, startDate: today, endDate: end }), after: scenario ? computeProjection({ snapshot, startDate: today, endDate: end, scenario }) : null }; }
    catch (e) { error = e instanceof Error ? e.message : 'Proyeksi tidak dapat dihitung.'; }
  }
  return <div className="finance-page"><div><h1>Laporan Keuangan</h1><p>Ringkasan akun dan dampak skenario cicilan pada periode pilihanmu.</p></div>
    <label className="finance-field">Periode laporan<select value={period} onChange={e => setPeriod(e.target.value)}>{options.map(m => <option value={m} key={m}>{label(m)}</option>)}</select></label>
    <div className="finance-grid">
      <section className="finance-panel"><h2>Pemasukan terjadwal</h2><strong className="finance-large finance-number">{money(summary.plannedIncome)}</strong><p>Estimasi pada tanggal yang tercatat, bukan konfirmasi uang diterima.</p></section>
      <section className="finance-panel"><h2>Kewajiban dibayar</h2><strong className="finance-large finance-number">{money(summary.paidExpenses)}</strong><p>{summary.paidCount} pembayaran berdasarkan tanggal konfirmasi. Tidak mencakup seluruh belanja di luar kewajiban.</p></section>
      <section className="finance-panel"><h2>Jatuh tempo belum lunas</h2><strong className="finance-large finance-number">{money(summary.unpaidDue)}</strong><p>Kewajiban belum dibayar yang jatuh tempo dalam periode ini.</p></section>
      <section className="finance-panel"><h2>Saldo tersedia saat ini</h2><strong className="finance-large finance-number">{snapshot.balance === null ? 'Belum diisi' : money(snapshot.balance)}</strong><p>{snapshot.balanceUpdatedAt ? `Terakhir diperbarui ${new Date(snapshot.balanceUpdatedAt).toLocaleString('id-ID')}` : 'Isi saldo di Dashboard untuk melihat proyeksi.'}</p></section>
    </div>
    {summary.paidWithoutDate > 0 && <div className="finance-note">Ada {summary.paidWithoutDate} kewajiban lunas tanpa tanggal pembayaran yang valid. Nilainya tidak dimasukkan sebagai pengeluaran periode tertentu.</div>}
    <section className="finance-panel"><h2>Perbandingan proyeksi</h2><p>Saldo saat ini, ditambah pemasukan terjadwal dan dikurangi kewajiban belum lunas. Jadwal tidak diulang otomatis setiap bulan.</p>
      {end < today ? <p className="finance-empty">Saldo historis tidak dapat direkonstruksi dari saldo saat ini. Pilih bulan berjalan atau bulan mendatang untuk proyeksi.</p> : snapshot.balance === null ? <p className="finance-empty">Isi saldo akun di Dashboard untuk melihat proyeksi.</p> : error ? <p role="alert" className="finance-note finance-error">{error}</p> : forecast && <>
        <div className="finance-scroll"><table className="finance-table"><caption>Saldo proyeksi hingga {label(period)}</caption><thead><tr><th scope="col">Bulan</th><th scope="col">Tanpa cicilan baru</th>{forecast.after && <th scope="col">Dengan {scenario?.name}</th>}</tr></thead><tbody>{forecast.before.months.map((m, i) => <tr key={m.month}><th scope="row">{label(m.month)}</th><td>{money(m.closing)}</td>{forecast.after && <td>{money(forecast.after.months[i].closing)}</td>}</tr>)}</tbody></table></div>
        {forecast.after && <div className={`finance-note ${forecast.after.firstDeficit ? 'finance-error' : ''}`}><strong>{forecast.after.risk}</strong><p>Saldo terendah {money(forecast.after.lowest.balance)} pada {forecast.after.lowest.date}. {forecast.after.firstDeficit ? `Defisit pertama ${forecast.after.firstDeficit}.` : 'Tidak ada defisit pada jadwal yang dihitung.'}</p></div>}
      </>}
      {!scenario && <p>Belum ada skenario aktif. Hitung rencana di Simulasi Cicilan untuk membandingkannya di sini.</p>}
      {scenario && <p><strong>Skenario aktif: {scenario.name}</strong>, {scenario.tenor} bulan, {money(scenario.monthly + scenario.fees)} per bulan. Skenario terpisah dari pembayaran aktual dan dihapus saat halaman dimuat ulang atau akun keluar.</p>}
    </section>
    <section className="finance-panel"><h2>Pembayaran pada periode ini</h2>{summary.payments.length ? <ul className="finance-list">{summary.payments.map(p => <li className="finance-row" key={p.id}><div><strong>{p.name}</strong><small>{p.paidDate}</small></div><strong className="finance-number">{money(p.amount)}</strong></li>)}</ul> : <p className="finance-empty">Belum ada pembayaran bertanggal pada periode ini.</p>}</section>
    <p>Hasil proyeksi adalah estimasi berdasarkan data yang tercatat, bukan jaminan kemampuan finansial.</p>
  </div>;
}
