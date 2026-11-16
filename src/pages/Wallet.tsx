// filepath: src/pages/Wallet.tsx
import { useState } from 'react';
import { demoTransactions, demoWallets, type WalletId } from '../lib/walletDemo';
import { money } from '../lib/projection';
import type { FinancialObligation } from '../lib/financialTypes';
import type { DemoPaymentResult, DemoPaymentState } from '../lib/walletPayments';
import './Finance.css';

type Props = { state: DemoPaymentState; obligations: FinancialObligation[]; loading: boolean; error: string | null; reload: () => Promise<void>; initialObligationId: string; onPay: (walletId: WalletId, obligation: FinancialObligation) => DemoPaymentResult };
export default function Wallet({ state, obligations, loading, error, reload, initialObligationId, onPay }: Props) {
  const [filter, setFilter] = useState<'all' | WalletId>('all');
  const [walletId, setWalletId] = useState<WalletId>('dana');
  const [obligationId, setObligationId] = useState(initialObligationId);
  const [notice, setNotice] = useState<{ text: string; error: boolean } | null>(null);
  const transactions = demoTransactions.filter(t => filter === 'all' || t.walletId === filter);
  const simulated = state.payments.filter(p => filter === 'all' || p.walletId === filter);
  const available = obligations.filter(o => !o.isPaid && !state.payments.some(p => p.obligationId === String(o.id)));
  const selected = available.find(o => String(o.id) === obligationId);
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!selected) { setNotice({ text: 'Pilih kewajiban yang belum dibayar untuk disimulasikan.', error: true }); return; }
    const result = onPay(walletId, selected);
    if (result.status === 'ok') { setNotice({ text: `Simulasi berhasil: ${selected.name} dicatat sebagai dibayar dalam simulasi. Tidak ada uang ditransfer dan kewajiban asli tidak berubah.`, error: false }); setObligationId(''); }
    else setNotice({ text: result.status === 'insufficient' ? 'Saldo contoh dompet ini tidak cukup. Pilih dompet lain.' : result.status === 'already_simulated' ? 'Kewajiban ini sudah dibayar dalam simulasi.' : 'Simulasi gagal. Periksa data kewajiban.', error: true });
  };
  return <div className="finance-page">
    <div><h1>E-wallet</h1><p>Kenali saldo dan aktivitas dompet digitalmu dalam satu tempat.</p></div>
    <div className="finance-note"><strong>Simulasi pembayaran</strong><p>Saldo dan transaksi adalah contoh. Tidak ada uang yang ditransfer dan kewajiban asli tidak dinyatakan lunas. Simulasi terhapus saat halaman dimuat ulang atau akun keluar. Jika nama, nominal, jatuh tempo, atau status kewajiban berubah, simulasi terkait dibatalkan dan saldo contoh dikembalikan.</p></div>
    <section className="finance-panel" aria-label="Ringkasan saldo demo"><span>Total saldo contoh</span><strong className="finance-large finance-number">{money(demoWallets.reduce((sum, w) => sum + state.balances[w.id], 0))}</strong><small>Dari empat dompet contoh</small></section>
    <section aria-labelledby="wallets-title"><h2 id="wallets-title">Dompet contoh</h2><div className="finance-grid">{demoWallets.map(wallet => <article className="finance-panel" key={wallet.id} aria-label={wallet.name}>
      <div className={`wallet-logo wallet-logo-${wallet.id}`}><img src={wallet.logo} alt={`Logo ${wallet.name}`} onError={e => { e.currentTarget.hidden = true; }} /></div>
      <h3>{wallet.name}</h3><p>Saldo contoh</p><strong className="finance-large finance-number">{money(state.balances[wallet.id])}</strong>
    </article>)}</div></section>
    <section className="finance-panel" aria-labelledby="simulate-payment"><h2 id="simulate-payment">Simulasikan pembayaran cicilan</h2><p>Pilih kewajiban yang sudah dicatat dan dompet contoh. Status pembayaran asli tetap menunggu pembayaran nyata.</p>
      {loading ? <p role="status">Memuat kewajiban akun...</p> : error ? <div role="alert"><p>Gagal memuat kewajiban: {error}</p><button className="button secondary" type="button" onClick={() => void reload()}>Coba lagi</button></div> : available.length === 0 ? <p className="finance-empty">{obligations.some(o => !o.isPaid) ? 'Semua kewajiban yang belum lunas sudah dibayar dalam simulasi sesi ini.' : 'Tidak ada kewajiban belum lunas. Tambahkan kewajiban di menu Kewajiban Saya.'}</p> : <form onSubmit={submit}><div className="finance-grid"><label className="finance-field">Kewajiban<select value={obligationId} onChange={e => { setObligationId(e.target.value); setNotice(null); }}><option value="">Pilih kewajiban</option>{available.map(o => <option key={o.id} value={String(o.id)}>{o.name} · {money(o.amount)} · {o.dueDate}</option>)}</select></label><label className="finance-field">E-wallet contoh<select value={walletId} onChange={e => { setWalletId(e.target.value as WalletId); setNotice(null); }}>{demoWallets.map(w => <option key={w.id} value={w.id}>{w.name} · saldo {money(state.balances[w.id])}</option>)}</select></label></div><button className="button primary" style={{ marginTop: 16 }} type="submit" disabled={!selected}>Simulasikan pembayaran</button></form>}
      {notice && <p role={notice.error ? 'alert' : 'status'} className={notice.error ? 'finance-negative' : 'finance-positive'}>{notice.text}</p>}
    </section>
    <section className="finance-panel" aria-labelledby="transactions-title"><h2 id="transactions-title">Riwayat transaksi contoh</h2><p>Pilih dompet untuk melihat aktivitas contohnya.</p>
      <div className="finance-filters" role="group" aria-label="Filter dompet"><button type="button" aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>Semua</button>{demoWallets.map(w => <button type="button" key={w.id} aria-pressed={filter === w.id} onClick={() => setFilter(w.id)}>{w.name}</button>)}</div>
      <div aria-live="polite"><small>{transactions.length + simulated.length} transaksi contoh dan simulasi</small>{transactions.length + simulated.length === 0 ? <p className="finance-empty">Belum ada transaksi contoh untuk dompet ini.</p> : <ul className="finance-list">{simulated.map(p => <li key={`payment-${p.obligationId}`} className="finance-row"><div><strong>Pembayaran simulasi: {p.obligationName}</strong><small>{demoWallets.find(w => w.id === p.walletId)?.name} · {new Date(p.at).toLocaleDateString('id-ID')}</small></div><strong className="finance-number finance-negative">−{money(p.amount)}</strong></li>)}{transactions.map(t => <li key={t.id} className="finance-row"><div><strong>{t.description}</strong><small>{demoWallets.find(w => w.id === t.walletId)?.name} · {new Date(`${t.date}T12:00:00`).toLocaleDateString('id-ID')}</small></div><strong className={`finance-number ${t.direction === 'in' ? 'finance-positive' : 'finance-negative'}`}>{t.direction === 'in' ? '+' : '−'}{money(t.amount)}</strong></li>)}</ul>}</div>
    </section>
  </div>;
}
