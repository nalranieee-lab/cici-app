// filepath: src/pages/Wallet.tsx
import { useState } from "react"
import MoneyInput from "../components/MoneyInput"
import DismissButton from "../components/DismissButton"
import { toast, useToastMessage } from "../components/Toast"
import { demoWallets, type WalletId, type DemoTransaction } from "../lib/walletDemo"
import { money } from "../lib/projection"
import type { FinancialObligation } from "../lib/financialTypes"
import type { DemoPaymentResult, DemoPaymentState } from "../lib/walletPayments"
import "./Finance.css"

type Props = {
  transactions?: readonly DemoTransaction[];
  state: DemoPaymentState
  obligations: FinancialObligation[]
  loading: boolean
  error: string | null
  reload: () => Promise<void>
  initialObligationId: string
  onPay: (
    walletId: WalletId,
    obligation: FinancialObligation,
  ) => DemoPaymentResult
  onBalanceChange: (
    walletId: WalletId,
    amount: number,
    mode: "add" | "set",
  ) => string | null
}
export default function Wallet({
  transactions: history = [],
  state,
  obligations,
  loading,
  error,
  reload,
  initialObligationId,
  onPay,
  onBalanceChange,
}: Props) {
  const [editingWallet, setEditingWallet] = useState<WalletId | null>(null)
  const [balanceAmount, setBalanceAmount] = useState("")
  const [balanceMode, setBalanceMode] = useState<"add" | "set">("add")
  const [filter, setFilter] = useState<"all" | WalletId>("all")
  const transactions = history.filter(item => filter === 'all' || item.walletId === filter);
  const [walletId, setWalletId] = useState<WalletId>("dana")
  const [obligationId, setObligationId] = useState(initialObligationId)
  const [notice, setNotice] = useState<{ text: string; error: boolean } | null>(
    null,
  )
  useToastMessage(notice?.text, notice?.error ? "error" : "success")
  const simulated = state.payments.filter(
    (p) => filter === "all" || p.walletId === filter,
  )
  const available = obligations.filter(
    (o) =>
      !o.isPaid && !state.payments.some((p) => p.obligationId === String(o.id)),
  )
  const selected = available.find((o) => String(o.id) === obligationId)
  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!selected) {
      setNotice({
        text: "Pilih kewajiban yang belum dibayar untuk disimulasikan.",
        error: true,
      })
      return
    }
    const result = onPay(walletId, selected)
    if (result.status === "ok") {
      setNotice({
        text: `Simulasi pembayaran ${selected.name} berhasil dicatat.`,
        error: false,
      })
      setObligationId("")
    } else
      setNotice({
        text:
          result.status === "insufficient"
            ? "Saldo dompet tidak cukup. Tambahkan saldo atau pilih dompet lain."
            : result.status === "already_simulated"
              ? "Kewajiban ini sudah dibayar dalam simulasi."
              : "Simulasi gagal. Periksa data kewajiban.",
        error: true,
      })
  }
  return (
    <div className="finance-page">
      <div>
        <h1>E-wallet</h1>
        <p>Kenali saldo dan aktivitas dompet digitalmu dalam satu tempat.</p>
      </div>
      <section className="finance-panel" aria-label="Ringkasan saldo">
        <span>Total saldo e-wallet</span>
        <strong className="finance-large finance-number">
          {money(demoWallets.reduce((sum, w) => sum + state.balances[w.id], 0))}
        </strong>
        <small>Saldo yang kamu catat di CICI</small>
      </section>
      <section aria-labelledby="wallets-title">
        <h2 id="wallets-title">Dompet saya</h2>
        <div className="finance-grid">
          {demoWallets.map((wallet) => (
            <article
              className="finance-panel"
              key={wallet.id}
              aria-label={wallet.name}
            >
              <div className={`wallet-logo wallet-logo-${wallet.id}`}>
                <img
                  src={wallet.logo}
                  alt={`Logo ${wallet.name}`}
                  onError={(e) => {
                    e.currentTarget.hidden = true
                  }}
                />
              </div>
              <h3>{wallet.name}</h3>
              <p>Saldo tercatat</p>
              <strong className="finance-large finance-number">
                {money(state.balances[wallet.id])}
              </strong>
              {editingWallet === wallet.id ? (
                <form
                  className="wallet-balance-form"
                  onSubmit={(event) => {
                    event.preventDefault()
                    if (!balanceAmount) {
                      toast("Isi nominal saldo.", "error")
                      return
                    }
                    const error = onBalanceChange(
                      wallet.id,
                      Number(balanceAmount),
                      balanceMode,
                    )
                    if (error) {
                      toast(error, "error")
                      return
                    }
                    toast(
                      `Saldo ${wallet.name} ${
                        balanceMode === "add" ? "ditambahkan" : "diperbarui"
                      }.`,
                    )
                    setEditingWallet(null)
                    setBalanceAmount("")
                  }}
                >
                  <label className="finance-field">
                    Tindakan
                    <select
                      value={balanceMode}
                      onChange={(event) => {
                        setBalanceMode(event.target.value as "add" | "set")
                        setBalanceAmount("")
                      }}
                    >
                      <option value="add">Tambah saldo</option>
                      <option value="set">Ubah saldo akhir</option>
                    </select>
                  </label>
                  <label className="finance-field">
                    Nominal (Rp)
                    <MoneyInput
                      value={balanceAmount}
                      onValueChange={setBalanceAmount}
                      required
                    />
                  </label>
                  <div className="finance-actions">
                    <button className="button primary" type="submit">
                      Simpan saldo
                    </button>
                    <button
                      className="button secondary"
                      type="button"
                      onClick={() => setEditingWallet(null)}
                    >
                      Batal
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  type="button"
                  className="button secondary"
                  style={{ marginTop: 16 }}
                  onClick={() => {
                    setEditingWallet(wallet.id)
                    setBalanceAmount("")
                    setBalanceMode("add")
                  }}
                >
                  Kelola saldo
                </button>
              )}
            </article>
          ))}
        </div>
      </section>
      <section className="finance-panel" aria-labelledby="simulate-payment">
        <h2 id="simulate-payment">Simulasikan pembayaran cicilan</h2>
        <p>
          Pilih kewajiban dan dompet untuk menghitung pembayaran. CICI belum
          terhubung ke penyedia e-wallet; aksi ini tidak mentransfer uang atau
          melunasi tagihan. Saldo dan riwayat tersimpan di browser ini.
        </p>
        {loading ? (
          <p role="status">Memuat kewajiban...</p>
        ) : error ? (
          <div role="alert">
            <p>Gagal memuat kewajiban: {error}</p>
            <button
              className="button secondary"
              type="button"
              onClick={() => void reload()}
            >
              Coba lagi
            </button>
          </div>
        ) : available.length === 0 ? (
          <p className="finance-empty">
            {obligations.some((o) => !o.isPaid)
              ? "Semua kewajiban yang belum lunas sudah memiliki simulasi pembayaran."
              : "Tidak ada kewajiban belum lunas. Tambahkan kewajiban di menu Kewajiban Saya."}
          </p>
        ) : (
          <form onSubmit={submit}>
            <div className="finance-grid">
              <label className="finance-field">
                Kewajiban
                <select
                  value={obligationId}
                  onChange={(e) => {
                    setObligationId(e.target.value)
                    setNotice(null)
                  }}
                >
                  <option value="">Pilih kewajiban</option>
                  {available.map((o) => (
                    <option key={o.id} value={String(o.id)}>
                      {o.name} · {money(o.amount)} · {o.dueDate}
                    </option>
                  ))}
                </select>
              </label>
              <label className="finance-field">
                E-wallet
                <select
                  value={walletId}
                  onChange={(e) => {
                    setWalletId(e.target.value as WalletId)
                    setNotice(null)
                  }}
                >
                  {demoWallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} · saldo {money(state.balances[w.id])}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <button
              className="button primary"
              style={{ marginTop: 16 }}
              type="submit"
              disabled={!selected}
            >
              Simulasikan pembayaran
            </button>
          </form>
        )}
        {notice && (
          <div
            role={notice.error ? "alert" : "status"}
            className={`alert compact ${notice.error ? "danger" : "success"}`}
          >
            <p className="alert-copy">{notice.text}</p>
            <DismissButton
              label="Tutup pemberitahuan"
              onDismiss={() => setNotice(null)}
            />
          </div>
        )}
      </section>
      <section className="finance-panel" aria-labelledby="transactions-title">
        <h2 id="transactions-title">Riwayat transaksi</h2>
        <p>Pilih dompet untuk melihat riwayat aktivitas dan simulasi pembayaran.</p>
        <div
          className="finance-filters"
          role="group"
          aria-label="Filter dompet"
        >
          <button
            type="button"
            aria-pressed={filter === "all"}
            onClick={() => setFilter("all")}
          >
            Semua
          </button>
          {demoWallets.map((w) => (
            <button
              type="button"
              key={w.id}
              aria-pressed={filter === w.id}
              onClick={() => setFilter(w.id)}
            >
              {w.name}
            </button>
          ))}
        </div>
        <div aria-live="polite">
          <small>{simulated.length + transactions.length} aktivitas dompet</small>
          {simulated.length + transactions.length === 0 ? (
            <p className="finance-empty">
              Belum ada simulasi pembayaran untuk dompet ini.
            </p>
          ) : (
            <ul className="finance-list">
              {simulated.map((p) => (
                <li key={`payment-${p.obligationId}`} className="finance-row">
                  <div>
                    <strong>Pembayaran simulasi: {p.obligationName}</strong>
                    <small>
                      {demoWallets.find((w) => w.id === p.walletId)?.name} ·{" "}
                      {new Date(p.at).toLocaleDateString("id-ID")}
                    </small>
                  </div>
                  <strong className="finance-number finance-negative">
                    −{money(p.amount)}
                  </strong>
                </li>
              ))}
              {transactions.map(item => <li key={item.id} className="finance-row"><div><strong>{item.description}</strong><small>{demoWallets.find(wallet => wallet.id === item.walletId)?.name} · {new Date(`${item.date}T12:00:00`).toLocaleDateString('id-ID')}</small></div><strong className={`finance-number ${item.direction === 'in' ? 'finance-positive' : 'finance-negative'}`}>{item.direction === 'in' ? '+' : '−'}{money(item.amount)}</strong></li>)}
            </ul>
          )}
        </div>
      </section>
    </div>
  )
}
