// filepath: src/pages/DailyBudget.tsx
import { useMemo } from "react";
import type { FinancialSnapshot, InstallmentPlan } from "../lib/financialTypes";
import { calculateDailyBudget } from "../lib/financialViews";
import { isoToday, money } from "../lib/projection";
import "./Finance.css";

export default function DailyBudget({
  snapshot,
  scenario,
  today = isoToday(),
}: {
  snapshot: FinancialSnapshot;
  scenario: InstallmentPlan | null;
  today?: string;
}) {
  const base = useMemo(
    () =>
      snapshot.balance === null
        ? null
        : calculateDailyBudget({ snapshot, today }),
    [snapshot, today],
  );
  const planned = useMemo(
    () =>
      snapshot.balance === null
        ? null
        : scenario
          ? calculateDailyBudget({ snapshot, today, scenario })
          : base,
    [snapshot, today, scenario, base],
  );
  if (!base || !planned)
    return (
      <div className="finance-page">
        <div>
          <h1>Anggaran Harian</h1>
          <p>Perkiraan batas belanja sebelum pemasukan terjadwal berikutnya.</p>
        </div>
        <div className="finance-note">
          Isi saldo di Dashboard untuk menghitung anggaran berdasarkan kewajiban
          yang tercatat.
        </div>
      </div>
    );
  return (
    <div className="finance-page">
      <div>
        <h1>Anggaran Harian</h1>
        <p>
          Belanja dengan tenang tanpa mengorbankan kewajiban yang akan datang.
        </p>
      </div>
      <section
        className={`finance-panel daily-budget-hero ${
          planned.insufficient ? "daily-budget-warning" : ""
        }`}
      >
        <span>Batas pengeluaran fleksibel yang disarankan untuk hari ini.</span>
        <strong className="finance-large finance-number">
          {money(planned.amount)}
        </strong>
        <p>
          {planned.insufficient
            ? `Dana terjadwal melampaui saldo sebesar ${money(planned.shortfall)} sebelum pemasukan berikutnya.`
            : `Untuk ${planned.days} hari hingga ${planned.nextIncomeDate ?? planned.boundaryDate} (batas akhir periode jika pemasukan belum dicatat).`}
        </p>
      </section>
      <div className="finance-grid">
        <section className="finance-panel">
          <h2>Rincian perhitungan</h2>
          <ul className="finance-list">
            <li className="finance-row">
              <span>Saldo tersedia</span>
              <strong className="finance-number">
                {money(snapshot.balance ?? 0)}
              </strong>
            </li>
            <li className="finance-row">
              <span>Kewajiban belum lunas sebelum batas</span>
              <strong className="finance-number finance-negative">
                −{money(base.reservedObligations)}
              </strong>
            </li>
            {scenario && (
              <li className="finance-row">
                <span>Skenario cicilan sebelum batas</span>
                <strong className="finance-number finance-negative">
                  −{money(planned.reservedScenario)}
                </strong>
              </li>
            )}
            <li className="finance-row">
              <span>Sisa sebelum pemasukan</span>
              <strong className="finance-number">
                {money(planned.availableBeforeIncome)}
              </strong>
            </li>
            <li className="finance-row">
              <span>Dibagi hari sampai batas</span>
              <strong className="finance-number">{planned.days} hari</strong>
            </li>
          </ul>
        </section>
        <section className="finance-panel">
          <h2>Dampak skenario</h2>
          {scenario ? (
            <>
              <p>
                <strong>{scenario.name}</strong> mengurangi dana yang disisihkan
                sebelum pemasukan sebesar {money(planned.reservedScenario)}.
              </p>
              <div className="finance-row">
                <span>Tanpa skenario</span>
                <strong className="finance-number">
                  {money(base.amount)}/hari
                </strong>
              </div>
              <div className="finance-row">
                <span>Dengan skenario</span>
                <strong className="finance-number">
                  {money(planned.amount)}/hari
                </strong>
              </div>
              <p>
                Skenario hanya aktif selama sesi. Reset atau refresh
                menghapusnya dan tidak mengubah saldo atau kewajiban aktual.
              </p>
            </>
          ) : (
            <p>
              Belum ada skenario cicilan aktif. Buat simulasi untuk melihat
              dampaknya pada anggaran harian.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
