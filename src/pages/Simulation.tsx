// filepath: src/pages/Simulation.tsx
import { useState } from 'react';
import type { FinancialSnapshot, InstallmentPlan } from '../lib/financialTypes';
import { buildInstallmentSchedule, computeProjection, isoToday, money, monthDate, monthEnd } from '../lib/projection';
import './Finance.css';

type Props = { snapshot: FinancialSnapshot; scenario: InstallmentPlan | null; onScenarioChange: (plan: InstallmentPlan | null) => void; onReports: () => void };
type Form = { [K in keyof InstallmentPlan]: string };
const initialForm = (): Form => ({ name: '', price: '', downPayment: '0', purchaseDate: isoToday(), monthly: '', fees: '0', tenor: '6', firstDueDate: monthDate(isoToday(), 1) });

export default function Simulation({ snapshot, scenario, onScenarioChange, onReports }: Props) {
  const [form, setForm] = useState<Form>(() => scenario ? Object.fromEntries(Object.entries(scenario).map(([k, v]) => [k, String(v)])) as Form : initialForm());
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({});
  const [error, setError] = useState('');
  const [dirty, setDirty] = useState(false);
  const today = isoToday();
  const horizon = scenario ? monthEnd(monthDate(scenario.firstDueDate, scenario.tenor - 1)) : monthEnd(today);
  let results: { before: ReturnType<typeof computeProjection>; after: ReturnType<typeof computeProjection> } | null = null;
  let calculationError = '';
  if (scenario && snapshot.balance !== null) {
    try { results = { before: computeProjection({ snapshot, startDate: today, endDate: horizon }), after: computeProjection({ snapshot, startDate: today, endDate: horizon, scenario }) }; }
    catch (e) { calculationError = e instanceof Error ? e.message : 'Proyeksi tidak dapat dihitung.'; }
  }
  const field = (key: keyof Form, label: string, type = 'number') => <label className="finance-field">{label}<input name={key} type={type} value={form[key]} min={type === 'date' ? today : key === 'tenor' ? 1 : 0} max={key === 'tenor' ? 120 : undefined} step={type === 'number' ? 1 : undefined} required={key !== 'fees' && key !== 'downPayment'} aria-invalid={!!errors[key]} aria-describedby={errors[key] ? `error-${key}` : undefined} onChange={e => { setForm(f => ({ ...f, [key]: e.target.value })); setDirty(true); setErrors(v => ({ ...v, [key]: undefined })); }} />{errors[key] && <small id={`error-${key}`}>{errors[key]}</small>}</label>;
  const submit = (event: React.FormEvent) => {
    event.preventDefault(); setError('');
    const found: typeof errors = {};
    const plan: InstallmentPlan = { name: form.name.trim(), price: Number(form.price), downPayment: Number(form.downPayment), purchaseDate: form.purchaseDate, monthly: Number(form.monthly), fees: Number(form.fees), tenor: Number(form.tenor), firstDueDate: form.firstDueDate };
    if (!plan.name) found.name = 'Isi nama barang atau cicilan.';
    for (const key of ['price', 'downPayment', 'monthly', 'fees', 'tenor'] as const) if (form[key].trim() === '' || !Number.isSafeInteger(plan[key]) || plan[key] < 0) found[key] = 'Gunakan bilangan bulat rupiah yang valid.';
    if (plan.downPayment > plan.price) found.downPayment = 'Uang muka melebihi harga pembelian.';
    if (plan.monthly <= 0) found.monthly = 'Cicilan bulanan harus lebih dari nol.';
    if (plan.price <= 0) found.price = 'Harga harus lebih dari nol.';
    if (plan.tenor < 1 || plan.tenor > 120) found.tenor = 'Tenor harus 1 sampai 120 bulan.';
    if (plan.purchaseDate < today) found.purchaseDate = 'Tanggal uang muka tidak boleh sebelum hari ini.';
    setErrors(found); if (Object.keys(found).length) return;
    try { buildInstallmentSchedule(plan); computeProjection({ snapshot, startDate: today, endDate: monthEnd(monthDate(plan.firstDueDate, plan.tenor - 1)), scenario: plan }); onScenarioChange(plan); setDirty(false); }
    catch (e) { setError(e instanceof Error ? e.message : 'Periksa kembali rencana cicilan.'); }
  };
  return <div className="finance-page"><div><h1>Simulasi Cicilan</h1><p>Bandingkan arus kas akunmu sebelum mengambil komitmen baru.</p></div>
    <div className="finance-note"><strong>Proyeksi berdasarkan jadwal tercatat</strong><p>Pemasukan dan kewajiban tidak otomatis diulang setiap bulan. Lengkapi jadwal sepanjang tenor agar estimasi lebih berguna. Simulasi tidak mengubah saldo atau kewajiban akun.</p></div>
    {snapshot.balance === null && <div className="finance-note">Saldo belum diisi. Isi saldo di Dashboard sebelum menghitung simulasi.</div>}
    <form className="finance-panel" onSubmit={submit} noValidate><h2>Rencana cicilan</h2><div className="finance-grid">{field('name', 'Nama barang atau cicilan', 'text')}{field('price', 'Harga pembelian (Rp)')}{field('downPayment', 'Uang muka (Rp)')}{field('purchaseDate', 'Tanggal uang muka', 'date')}{field('monthly', 'Cicilan per bulan (Rp)')}{field('fees', 'Biaya tambahan per bulan (Rp)')}{field('tenor', 'Tenor (bulan)')}{field('firstDueDate', 'Jatuh tempo pertama', 'date')}</div>
      {error && <p role="alert" className="finance-negative">{error}</p>}<div className="finance-actions" style={{ marginTop: 20 }}><button className="button primary" disabled={snapshot.balance === null} type="submit">Hitung dampak cicilan</button><button className="button secondary" type="button" onClick={() => { setForm(initialForm()); setErrors({}); setError(''); setDirty(false); onScenarioChange(null); }}>Reset simulasi</button></div>
    </form>
    {dirty && scenario && <p role="status">Input berubah. Hasil di bawah masih memakai perhitungan terakhir; tekan Hitung untuk memperbarui.</p>}
    {calculationError && <p role="alert" className="finance-negative">{calculationError}</p>}
    {results && scenario && <><section><h2>Hasil sampai {horizon}</h2><div className="finance-grid">{([{ title: 'Tanpa cicilan baru', result: results.before }, { title: `Dengan ${scenario.name}`, result: results.after }]).map(({ title, result }) => <article className="finance-panel" key={title}><h3>{title}</h3><p>Saldo akhir proyeksi</p><strong className={`finance-large finance-number ${result.ending < 0 ? 'finance-negative' : ''}`}>{money(result.ending)}</strong><p>Status: <strong>{result.risk}</strong></p><small>Saldo harian terendah {money(result.lowest.balance)} pada {result.lowest.date}</small></article>)}</div></section>
      <div className={`finance-note ${results.after.firstDeficit ? 'finance-error' : ''}`}><strong>{results.after.firstDeficit ? `Defisit pertama: ${results.after.firstDeficit}` : 'Tidak ada defisit pada jadwal yang dihitung'}</strong><p>Hasil merupakan estimasi berdasarkan kelengkapan data, bukan jaminan kemampuan membayar.</p></div>
      <section className="finance-panel"><h2>Jadwal cicilan ({scenario.tenor} bulan)</h2><details><summary>Lihat uang muka dan seluruh pembayaran</summary><ul className="finance-list">{buildInstallmentSchedule(scenario).map((e, i) => <li className="finance-row" key={i}><span>{e.date}<small>{e.label}</small></span><strong className="finance-number">{money(e.amount)}</strong></li>)}</ul></details><button type="button" className="button primary" onClick={onReports}>Lihat perbandingan di laporan</button><p><small>Skenario tersimpan selama sesi ini. Memuat ulang halaman atau keluar akun menghapus skenario.</small></p></section>
    </>}
  </div>;
}
