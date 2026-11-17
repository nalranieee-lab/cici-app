// filepath: src/pages/FinanceEntries.tsx
import { useState } from "react";
import MoneyInput from "../components/MoneyInput";
import { toast } from "../components/Toast";
import DismissButton from "../components/DismissButton";
import { localFinance, localError, useLocalFinance } from "../lib/localFinance";
import type { LocalExpense, LocalIncome, LocalObligation } from "../lib/financeRepository";
import type { DemoPayment } from "../lib/walletPayments";
import { demoWallets, walletLabel, type WalletId } from "../lib/walletDemo";
import { money } from "../lib/projection";
import "./Finance.css";
type Props = {
  kind: "income" | "obligation" | "expense";
  simulatedPayments?: readonly DemoPayment[];
  onPayWallet?: (id: string) => void;
};
const empty = { name: "", amount: "", date: "", note: "", walletId: "dana" as WalletId };
const displayDate = (value: string) =>
  new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
export default function FinanceEntries({
  kind,
  simulatedPayments = [],
  onPayWallet,
}: Props) {
  const { data, error: loadError } = useLocalFinance();
  const income = kind === "income", expense = kind === "expense",
    label = income ? "pemasukan" : expense ? "pengeluaran" : "kewajiban";
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(empty);
  const [opened, setOpened] = useState(false);
  const [error, setError] = useState("");
  const rows: (LocalIncome | LocalObligation | LocalExpense)[] = income ? data.incomes : expense ? data.expenses ?? [] : data.obligations;
  const dateOf = (row: LocalIncome | LocalObligation | LocalExpense) =>
    "expected_date" in row ? row.expected_date : "due_date" in row ? row.due_date : row.occurred_on;
  const items = [...rows].sort((a, b) => dateOf(a).localeCompare(dateOf(b)));
  const run = (action: () => void, success: string) => {
    setError("");
    try {
      action();
      toast(success);
      return true;
    } catch (error) {
      const message = localError(error);
      setError(message);
      toast(message, "error");
      return false;
    }
  };
  const open = (row?: LocalIncome | LocalObligation | LocalExpense) => {
    setEditingId(row?.id ?? null);
    setForm(
      row
        ? {
            name: row.name,
            amount: String(row.amount),
            date: dateOf(row),
            note: "note" in row ? (row.note ?? "") : "",
            walletId: "wallet_id" in row ? row.wallet_id : "dana",
          }
        : empty,
    );
    setError("");
    setOpened(true);
  };
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (
      run(
        () => {
          const amount = Number(form.amount);
          if (
            !form.name.trim() ||
            !form.amount.trim() ||
            !Number.isSafeInteger(amount) ||
            amount < 0 ||
            amount > 1_000_000_000_000 ||
            !form.date
          )
            throw new Error(
              "Isi nama, nominal rupiah, dan tanggal yang valid.",
            );
          if (income)
            localFinance.saveIncome(
              { name: form.name.trim(), amount, expected_date: form.date },
              editingId,
            );
          else if (expense) {
            if (amount === 0) throw new Error("Nominal pengeluaran harus lebih dari nol.");
            localFinance.saveExpense({ name: form.name.trim(), amount, occurred_on: form.date, wallet_id: form.walletId }, editingId);
          } else
            localFinance.saveObligation(
              {
                name: form.name.trim(),
                amount,
                due_date: form.date,
                note: form.note.trim() || null,
              },
              editingId,
            );
        },
        `${income ? "Pemasukan" : expense ? "Pengeluaran" : "Kewajiban"} ${editingId ? "diperbarui" : "ditambahkan"}.`,
      )
    )
      setOpened(false);
  };
  const remove = (row: LocalIncome | LocalObligation | LocalExpense) => {
    if (
      !window.confirm(
        `Hapus ${label} "${row.name}"? Catatan ini tidak dapat dikembalikan.${"is_paid" in row && row.is_paid ? " Saldo pembayaran tidak dikembalikan." : ""}`,
      )
    )
      return;
    run(
      () => income ? localFinance.removeIncome(row.id) : expense ? localFinance.removeExpense(row.id) : localFinance.removeObligation(row.id),
      "Catatan dihapus.",
    );
  };
  return (
    <>
      <div
        className="page-heading"
        style={income ? { marginTop: 24 } : undefined}
      >
        <div>
          <h1>{income ? "Pemasukan Saya" : expense ? "Pengeluaran Saya" : "Kewajiban Saya"}</h1>
          <p>
            {income
              ? "Catat pemasukan yang kamu perkirakan, seperti gaji, uang saku, atau bayaran freelance."
              : expense ? "Catat pengeluaran dari dompet e-wallet yang kamu gunakan." : "Catat tagihan dan cicilan, lalu tandai saat sudah dibayar."}
          </p>
        </div>
        <button type="button" className="button primary" onClick={() => open()}>
          + Tambah {label}
        </button>
      </div>
      {opened && (
        <section className="card add-form">
          <div className="card-title">
            <div>
              <h2>
                {editingId
                  ? `Ubah ${label}`
                  : `${income ? "Pemasukan" : expense ? "Pengeluaran" : "Kewajiban"} baru`}
              </h2>
              <p>Nama, nominal, dan tanggal wajib diisi.</p>
            </div>
            <button
              type="button"
              className="button ghost"
              onClick={() => setOpened(false)}
            >
              Tutup
            </button>
          </div>
          <form onSubmit={submit} noValidate>
            <div className="form-grid">
              <label className="field">
                <span>Nama {label}</span>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  maxLength={1000}
                />
              </label>
              <label className="field">
                <span>Nominal (Rp)</span>
                <MoneyInput
                  value={form.amount}
                  onValueChange={(amount) => setForm({ ...form, amount })}
                  required
                />
              </label>
              <label className="field">
                <span>
                  {income ? "Tanggal perkiraan" : expense ? "Tanggal kejadian" : "Tanggal jatuh tempo"}
                </span>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  required
                />
              </label>
              {expense && <label className="field"><span>Sumber e-wallet</span><select value={form.walletId} onChange={e => setForm({ ...form, walletId: e.target.value as WalletId })}>{demoWallets.map(wallet => <option key={wallet.id} value={wallet.id}>{wallet.name}</option>)}</select></label>}
              {!income && (
                <label className="field">
                  <span>Catatan</span>
                  <input
                    placeholder="Opsional"
                    value={form.note}
                    onChange={(e) => setForm({ ...form, note: e.target.value })}
                    maxLength={1000}
                  />
                </label>
              )}
            </div>
            <button type="submit" className="button primary">
              {editingId ? "Simpan perubahan" : `Simpan ${label}`}
            </button>
          </form>
        </section>
      )}
      {(error || loadError) && (
        <div className="alert danger compact" role="alert">
          <p>{error || loadError}</p>
          {error && (
            <DismissButton
              label="Tutup pemberitahuan"
              onDismiss={() => setError("")}
            />
          )}
        </div>
      )}
      {expense && <section className="finance-panel expense-total"><span>Total pengeluaran tercatat</span><strong className="finance-large finance-number">{money(items.reduce((sum, item) => sum + item.amount, 0))}</strong><small>Dari {items.length} transaksi yang tercatat</small></section>}
      <section className="card" style={{ marginTop: 17 }}>
        {items.length === 0 ? (
          <div className="empty-state">
            <strong>Belum ada {label}</strong>
            <p>
              Tambahkan {label} pertama untuk melihat perhitungan keuanganmu.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {items.map((row) => {
              const obligation = "is_paid" in row ? row : null;
              const walletExpense = "wallet_id" in row ? row : null;
              const simulated = simulatedPayments.some(
                (p) => p.obligationId === row.id,
              );
              return (
                <li
                  key={row.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3"
                >
                  <div className="min-w-0">
                    <strong className="block text-sm break-words">
                      {row.name}
                    </strong>
                    <span className="block text-sm text-slate-600">
                      {money(row.amount)} · {displayDate(dateOf(row))}
                      {walletExpense && ` · ${walletLabel(walletExpense.wallet_id)}`}
                      {obligation?.is_paid && obligation.paid_at
                        ? ` · Dibayar ${new Date(obligation.paid_at).toLocaleDateString("id-ID")}`
                        : ""}
                    </span>
                    {obligation?.note && (
                      <span className="block text-sm text-slate-600 break-words">
                        {obligation.note}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {obligation && (
                      <>
                        <span
                          className={`badge ${obligation.is_paid ? "green" : "yellow"}`}
                        >
                          {obligation.is_paid ? "Dibayar" : "Belum dibayar"}
                        </span>
                        {!obligation.is_paid && (
                          <>
                            <button
                              type="button"
                              className="button secondary"
                              disabled={simulated}
                              onClick={() => onPayWallet?.(row.id)}
                            >
                              {simulated
                                ? "Sudah disimulasikan"
                                : "Simulasikan dengan E-wallet"}
                            </button>
                            <button
                              type="button"
                              className="button secondary"
                              onClick={() =>
                                run(() => {
                                  localFinance.pay(row.id);
                                }, "Pembayaran dicatat.")
                              }
                            >
                              Tandai dibayar
                            </button>
                          </>
                        )}
                        {obligation.is_paid && (
                          <button
                            type="button"
                            className="button secondary"
                            onClick={() => {
                              if (
                                window.confirm(
                                  "Batalkan pembayaran? Saldo yang sebelumnya dikurangi akan dikembalikan.",
                                )
                              )
                                run(
                                  () => localFinance.cancelPayment(row.id),
                                  "Pembayaran dibatalkan.",
                                );
                            }}
                          >
                            Batalkan pembayaran
                          </button>
                        )}
                      </>
                    )}
                    <button
                      type="button"
                      className="button ghost"
                      onClick={() => open(row)}
                    >
                      Ubah
                    </button>
                    <button
                      type="button"
                      className="button danger"
                      onClick={() => remove(row)}
                    >
                      Hapus
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}
