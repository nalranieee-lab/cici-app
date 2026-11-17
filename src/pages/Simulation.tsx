// filepath: src/pages/Simulation.tsx
import { useState } from "react";
import MoneyInput from "../components/MoneyInput";
import { toast, useToastMessage } from "../components/Toast";
import type { FinancialSnapshot, InstallmentPlan } from "../lib/financialTypes";
import {
  buildInstallmentSchedule,
  computeProjection,
  isoToday,
  money,
  monthDate,
  monthEnd,
} from "../lib/projection";
import "./Finance.css";

type Props = {
  snapshot: FinancialSnapshot;
  scenario: InstallmentPlan | null;
  onScenarioChange: (plan: InstallmentPlan | null) => void;
  onReports: () => void;
};
type Form = { [K in keyof InstallmentPlan]: string };
const initialForm = (): Form => ({
  name: "",
  price: "",
  downPayment: "",
  purchaseDate: "",
  monthly: "",
  fees: "",
  tenor: "",
  firstDueDate: monthDate(isoToday(), 1),
});

export default function Simulation({
  snapshot,
  scenario,
  onScenarioChange,
  onReports,
}: Props) {
  const [form, setForm] = useState<Form>(() =>
    scenario
      ? (Object.fromEntries(
          Object.entries(scenario).map(([k, v]) => [k, String(v)]),
        ) as Form)
      : initialForm(),
  );
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({});
  const [error, setError] = useState("");
  useToastMessage(error, "error");
  const [dirty, setDirty] = useState(false);
  const today = isoToday();
  const horizon = scenario
    ? monthEnd(monthDate(scenario.firstDueDate, scenario.tenor - 1))
    : monthEnd(today);
  let results: {
    before: ReturnType<typeof computeProjection>;
    after: ReturnType<typeof computeProjection>;
  } | null = null;
  let calculationError = "";
  if (scenario && snapshot.balance !== null) {
    try {
      results = {
        before: computeProjection({
          snapshot,
          startDate: today,
          endDate: horizon,
        }),
        after: computeProjection({
          snapshot,
          startDate: today,
          endDate: horizon,
          scenario,
        }),
      };
    } catch (e) {
      calculationError =
        e instanceof Error ? e.message : "Proyeksi tidak dapat dihitung.";
    }
  }
  const field = (key: keyof Form, label: string, type = "number") => (
    <label className="finance-field">
      {label}
      {key === "tenor" ? (
        <select
          name={key}
          value={form.tenor}
          required
          aria-invalid={!!errors.tenor}
          aria-describedby={errors.tenor ? "error-tenor" : undefined}
          onChange={(e) => {
            setForm((f) => ({ ...f, tenor: e.target.value }));
            setDirty(true);
            setErrors((v) => ({ ...v, tenor: undefined }));
          }}
        >
          <option value="">Pilih tenor</option>
          {[3, 6, 9, 12, 18, 24].map((months) => (
            <option key={months} value={months}>
              {months} bulan
            </option>
          ))}
        </select>
      ) : type === "number" ? (
        <MoneyInput
          name={key}
          value={form[key]}
          onValueChange={(value) => {
            setForm((f) => ({ ...f, [key]: value }));
            setDirty(true);
            setErrors((v) => ({ ...v, [key]: undefined }));
          }}
          aria-invalid={!!errors[key]}
          aria-describedby={errors[key] ? `error-${key}` : undefined}
          required={
            key !== "fees" && key !== "downPayment" && key !== "purchaseDate"
          }
        />
      ) : (
        <input
          name={key}
          type={type}
          value={form[key]}
          min={type === "date" ? today : undefined}
          required={key !== "purchaseDate"}
          aria-invalid={!!errors[key]}
          aria-describedby={errors[key] ? `error-${key}` : undefined}
          onChange={(e) => {
            setForm((f) => ({ ...f, [key]: e.target.value }));
            setDirty(true);
            setErrors((v) => ({ ...v, [key]: undefined }));
          }}
        />
      )}
      {key === "purchaseDate" && (
        <small className="field-hint">
          Jika dikosongkan, uang muka dihitung pada hari ini.
        </small>
      )}
      {errors[key] && <small id={`error-${key}`}>{errors[key]}</small>}
    </label>
  );
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    const found: typeof errors = {};
    const plan: InstallmentPlan = {
      name: form.name.trim(),
      price: Number(form.price),
      downPayment: Number(form.downPayment || 0),
      purchaseDate: form.purchaseDate || today,
      monthly: Number(form.monthly),
      fees: Number(form.fees || 0),
      tenor: form.tenor ? Number(form.tenor) : NaN,
      firstDueDate: form.firstDueDate,
    };
    if (!plan.name) found.name = "Isi nama barang atau cicilan.";
    for (const key of ["price", "monthly"] as const)
      if (
        form[key].trim() === "" ||
        !Number.isSafeInteger(plan[key]) ||
        plan[key] < 0
      )
        found[key] = "Gunakan bilangan bulat rupiah yang valid.";
    for (const key of ["downPayment", "fees"] as const)
      if (
        form[key].trim() !== "" &&
        (!Number.isSafeInteger(plan[key]) || plan[key] < 0)
      )
        found[key] =
          "Gunakan bilangan bulat rupiah yang valid atau biarkan kosong.";
    if (plan.downPayment > plan.price)
      found.downPayment = "Uang muka melebihi harga pembelian.";
    if (plan.monthly <= 0)
      found.monthly = "Cicilan bulanan harus lebih dari nol.";
    if (plan.price <= 0) found.price = "Harga harus lebih dari nol.";
    if (![3, 6, 9, 12, 18, 24].includes(plan.tenor))
      found.tenor = "Pilih tenor yang tersedia.";
    if (plan.purchaseDate < today)
      found.purchaseDate = "Tanggal uang muka tidak boleh sebelum hari ini.";
    setErrors(found);
    if (Object.keys(found).length) {
      toast("Periksa kembali kolom rencana cicilan.", "error");
      return;
    }
    try {
      buildInstallmentSchedule(plan);
      computeProjection({
        snapshot,
        startDate: today,
        endDate: monthEnd(monthDate(plan.firstDueDate, plan.tenor - 1)),
        scenario: plan,
      });
      onScenarioChange(plan);
      toast("Dampak cicilan berhasil dihitung.");
      setDirty(false);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Periksa kembali rencana cicilan.",
      );
    }
  };
  return (
    <div className="finance-page">
      <div>
        <h1>Simulasi Cicilan</h1>
        <p>Bandingkan arus kasmu sebelum mengambil komitmen baru.</p>
      </div>
      <p>
        Lengkapi jadwal pemasukan dan kewajiban sepanjang tenor untuk melihat
        proyeksi arus kas.
      </p>
      {snapshot.balance === null && (
        <div className="finance-note">
          Saldo belum diisi. Isi saldo di Dashboard sebelum menghitung simulasi.
        </div>
      )}
      <form className="finance-panel" onSubmit={submit} noValidate>
        <h2>Rencana cicilan</h2>
        <div className="finance-grid">
          {field("name", "Nama barang atau cicilan", "text")}
          {field("price", "Harga pembelian (Rp)")}
          {field("downPayment", "Uang muka (jika ada) (Rp)")}
          {field("purchaseDate", "Tanggal uang muka", "date")}
          {field("monthly", "Cicilan per bulan (Rp)")}
          {field("fees", "Biaya tambahan per bulan (jika ada) (Rp)")}
          {field("tenor", "Tenor (bulan)")}
          {field("firstDueDate", "Jatuh tempo pertama", "date")}
        </div>
        {error && (
          <p role="alert" className="finance-negative">
            {error}
          </p>
        )}
        <div className="finance-actions" style={{ marginTop: 20 }}>
          <button
            className="button primary"
            disabled={snapshot.balance === null}
            type="submit"
          >
            Hitung dampak cicilan
          </button>
          <button
            className="button secondary"
            type="button"
            onClick={() => {
              setForm(initialForm());
              setErrors({});
              setError("");
              setDirty(false);
              onScenarioChange(null);
              toast("Simulasi direset.");
            }}
          >
            Reset simulasi
          </button>
        </div>
      </form>
      {dirty && scenario && (
        <p role="status">
          Input berubah. Hasil di bawah masih memakai perhitungan terakhir;
          tekan Hitung untuk memperbarui.
        </p>
      )}
      {calculationError && (
        <p role="alert" className="finance-negative">
          {calculationError}
        </p>
      )}
      {results && scenario && (
        <>
          <section>
            <h2>Hasil sampai {horizon}</h2>
            <div className="finance-grid">
              {[
                { title: "Tanpa cicilan baru", result: results.before },
                { title: `Dengan ${scenario.name}`, result: results.after },
              ].map(({ title, result }) => (
                <article className="finance-panel" key={title}>
                  <h3>{title}</h3>
                  <p>Saldo akhir proyeksi</p>
                  <strong
                    className={`finance-large finance-number ${
                      result.ending < 0 ? "finance-negative" : ""
                    }`}
                  >
                    {money(result.ending)}
                  </strong>
                  <p>
                    Status: <strong>{result.risk}</strong>
                  </p>
                  <small>
                    Saldo harian terendah {money(result.lowest.balance)} pada{" "}
                    {result.lowest.date}
                  </small>
                </article>
              ))}
            </div>
          </section>
          <div
            className={`finance-note ${
              results.after.firstDeficit ? "finance-error" : ""
            }`}
          >
            <strong>
              {results.after.firstDeficit
                ? `Defisit pertama: ${results.after.firstDeficit}`
                : "Tidak ada defisit pada jadwal yang dihitung"}
            </strong>
            <p>
              Hasil merupakan estimasi berdasarkan kelengkapan data, bukan
              jaminan kemampuan membayar.
            </p>
          </div>
          <section className="finance-panel">
            <h2>Jadwal cicilan ({scenario.tenor} bulan)</h2>
            <details>
              <summary>Lihat uang muka dan seluruh pembayaran</summary>
              <ul className="finance-list">
                {buildInstallmentSchedule(scenario).map((e, i) => (
                  <li className="finance-row" key={i}>
                    <span>
                      {e.date}
                      <small>{e.label}</small>
                    </span>
                    <strong className="finance-number">
                      {money(e.amount)}
                    </strong>
                  </li>
                ))}
              </ul>
            </details>
            <button
              type="button"
              className="button primary"
              onClick={onReports}
            >
              Lihat perbandingan di laporan
            </button>
            <p>
              <small>
                Skenario aktif selama halaman terbuka. Memuat ulang halaman
                menghapus skenario.
              </small>
            </p>
          </section>
        </>
      )}
    </div>
  );
}
