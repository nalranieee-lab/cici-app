// filepath: src/pages/FinancialCalendar.tsx
import { useMemo, useRef, useState } from "react";
import type {
  FinancialObligation,
  FinancialSnapshot,
  InstallmentPlan,
} from "../lib/financialTypes";
import { payObligation } from "../lib/obligationPayments";
import { toast } from "../components/Toast";
import { walletLabel } from "../lib/walletDemo";
import { buildCalendarEvents, calendarMonthGrid } from "../lib/financialViews";
import {
  computeProjection,
  monthEnd,
  monthDate,
  money,
} from "../lib/projection";
import "./Finance.css";

type Props = {
  snapshot: FinancialSnapshot;
  scenario: InstallmentPlan | null;
  today: string;
  minMonth: string;
  maxMonth: string;
  onNavigate: (page: "simulation") => void;
  onPayWallet: (id: string | number) => void;
  onPaymentRecorded: (id: string | number) => Promise<void>;
  simulatedObligationIds: readonly string[];
};
const monthLabel = (month: string) =>
  new Date(`${month}-01T12:00:00`).toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
  });
const weekdays = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

export default function FinancialCalendar({
  snapshot,
  scenario,
  today,
  minMonth,
  maxMonth,
  onNavigate,
  onPayWallet,
  onPaymentRecorded,
  simulatedObligationIds,
}: Props) {
  const busy = useRef(false);
  const [payingId, setPayingId] = useState<string | number | null>(null);
  const markPaid = async (obligation: FinancialObligation) => {
    if (busy.current || obligation.isPaid) return;
    busy.current = true;
    setPayingId(obligation.id);
    try {
      const result = await payObligation(obligation);
      toast(
        result.status === "paid" ? result.notice : result.message,
        result.status === "paid" ? "success" : "error",
      );
      if (result.status !== "failed") await onPaymentRecorded(obligation.id);
    } catch {
      toast(
        "Status pembayaran belum dapat dipastikan. Muat ulang data sebelum mencoba lagi.",
        "error",
      );
    } finally {
      busy.current = false;
      setPayingId(null);
    }
  };
  const [month, setMonth] = useState(today.slice(0, 7));
  const [selectedDate, setSelectedDate] = useState(today);
  const monthStart = `${month}-01`,
    lastDate = monthEnd(monthStart);
  const calendarCells = calendarMonthGrid(month);
  const events = useMemo(
    () => buildCalendarEvents(snapshot, month, scenario),
    [snapshot, month, scenario],
  );
  const byDate = useMemo(() => {
    const map = new Map<string, typeof events>();
    for (const event of events)
      map.set(event.date, [...(map.get(event.date) ?? []), event]);
    return map;
  }, [events]);
  let forecast = new Map<string, number>();
  let forecastError = "";
  if (snapshot.balance !== null && lastDate >= today) {
    try {
      forecast = new Map(
        computeProjection({
          snapshot,
          startDate: today,
          endDate: lastDate,
          scenario: scenario ?? undefined,
        }).daily.map((p) => [p.date, p.balance]),
      );
    } catch (e) {
      forecastError =
        e instanceof Error ? e.message : "Proyeksi belum bisa dimuat.";
    }
  }
  const selectedEvents = byDate.get(selectedDate) ?? [];
  const selectedBalance = forecast.get(selectedDate);
  const canPrevious = month > minMonth;
  const canNext = month < maxMonth;
  const moveMonth = (offset: number) => {
    const next = monthDate(`${month}-01`, offset).slice(0, 7);
    if (next < minMonth || next > maxMonth) return;
    setMonth(next);
    setSelectedDate(`${next}-01`);
  };

  return (
    <div className="finance-page">
      <div>
        <h1>Kalender Keuangan</h1>
        <p>
          Jadwal pemasukan, kewajiban, pembayaran aktual, dan skenario cicilan.
        </p>
      </div>
      <div className="finance-note">
        <strong>Pemasukan bertanda terjadwal adalah estimasi.</strong>
        <p>
          Saldo historis tidak direkonstruksi dari saldo yang tersedia hari ini.
          Skenario cicilan diberi label dan tidak menjadi kewajiban aktual.
        </p>
      </div>
      {snapshot.balance === null && (
        <div className="finance-note">
          Isi saldo di Dashboard agar proyeksi saldo hari ini dan ke depan dapat
          dihitung.
        </div>
      )}
      {forecastError && (
        <div className="finance-note finance-error" role="alert">
          {forecastError}
        </div>
      )}
      <div className="page-heading calendar-controls">
        <div>
          <h2>{monthLabel(month)}</h2>
        </div>
        <div className="finance-actions">
          <button
            type="button"
            className="button secondary"
            aria-label="Bulan sebelumnya"
            disabled={!canPrevious}
            onClick={() => moveMonth(-1)}
          >
            Sebelumnya
          </button>
          <button
            type="button"
            className="button secondary"
            aria-label="Bulan berikutnya"
            disabled={!canNext}
            onClick={() => moveMonth(1)}
          >
            Berikutnya
          </button>
        </div>
      </div>
      <div className="calendar-layout finance-calendar-layout">
        <section
          className="card calendar-card"
          aria-label={`Kalender ${monthLabel(month)}`}
        >
          <div className="calendar-legend">
            <span>
              <i className="dot green-dot" />
              Pemasukan terjadwal / lunas
            </span>
            <span>
              <i className="dot yellow-dot" />
              Jatuh tempo / pengeluaran / simulasi
            </span>
            <span>
              <i className="dot red-dot" />
              Potensi defisit
            </span>
          </div>
          <div className="week-row">
            {weekdays.map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>
          <div className="calendar-grid">
            {calendarCells.map((date, index) => {
              if (!date)
                return (
                  <div
                    className="calendar-day muted"
                    key={`empty-${index}`}
                    aria-hidden="true"
                  />
                );
              const day = Number(date.slice(-2));
              const dayEvents = byDate.get(date) ?? [];
              const negative = (forecast.get(date) ?? 0) < 0;
              const kind = negative ? "risk" : dayEvents.length ? "event" : "";
              const summary = dayEvents
                .slice(0, 2)
                .map((e) => e.title)
                .join(", ");
              return (
                <button
                  key={date}
                  type="button"
                  aria-label={`${day} ${monthLabel(month)}${summary ? `: ${summary}` : ""}${negative ? ", potensi defisit" : ""}`}
                  aria-pressed={selectedDate === date}
                  className={`calendar-day ${selectedDate === date ? "selected" : ""} ${kind}`}
                  onClick={() => setSelectedDate(date)}
                >
                  <span>{day}</span>
                  <div>
                    {dayEvents.slice(0, 2).map((event) => (
                      <i
                        key={event.id}
                        className={
                          event.kind === "income-scheduled" ||
                          event.kind === "obligation-paid"
                            ? "income-event"
                            : ""
                        }
                        title={
                          event.kind === "scenario"
                            ? "Skenario simulasi"
                            : event.kind === "obligation-paid"
                              ? "Pembayaran aktual"
                              : event.kind === "income-scheduled"
                                ? "Pemasukan terjadwal"
                                : event.kind === "expense-recorded"
                                  ? `Pengeluaran e-wallet · ${event.walletId ? walletLabel(event.walletId) : ""}`
                                : "Jatuh tempo"
                        }
                      >
                        {event.title}
                      </i>
                    ))}
                    {dayEvents.length > 2 && (
                      <i>+{dayEvents.length - 2} lainnya</i>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </section>
        <section
          className="card day-panel finance-day-panel"
          aria-live="polite"
        >
          <div className="day-panel-head">
            <div className="big-date">{Number(selectedDate.slice(-2))}</div>
            <div>
              <span>{monthLabel(month)}</span>
              <h2>
                {new Date(`${selectedDate}T12:00:00`).toLocaleDateString(
                  "id-ID",
                  { weekday: "long" },
                )}
              </h2>
            </div>
          </div>
          {selectedBalance !== undefined ? (
            <div
              className={`balance-panel ${selectedBalance < 0 ? "negative-panel" : ""}`}
            >
              <span>Saldo proyeksi akhir hari</span>
              <strong>{money(selectedBalance)}</strong>
              <small>
                Berdasarkan saldo saat ini dan jadwal transaksi tercatat
              </small>
            </div>
          ) : selectedDate < today ? (
            <div className="finance-note">
              Saldo historis untuk tanggal ini tidak dapat direkonstruksi dari
              saldo saat ini.
            </div>
          ) : (
            <div className="finance-note">
              Saldo belum diisi; proyeksi harian belum tersedia.
            </div>
          )}
          {selectedBalance !== undefined && selectedBalance < 0 && (
            <div className="finance-note finance-error" role="status">
              <strong>Potensi benturan pembayaran</strong>
              <p>
                Jadwal transaksi pada atau sebelum hari ini memproyeksikan saldo
                negatif.
              </p>
            </div>
          )}
          <h3>Peristiwa tanggal ini</h3>
          {selectedEvents.length === 0 ? (
            <p className="finance-empty">
              Tidak ada pemasukan atau kewajiban tercatat pada tanggal ini.
            </p>
          ) : (
            <ul className="finance-list">
              {selectedEvents.map((event) => {
                const obligation =
                  event.kind === "obligation-due"
                    ? snapshot.obligations.find(
                        (item) =>
                          item.id === event.obligationId && !item.isPaid,
                      )
                    : undefined;
                const simulated =
                  obligation &&
                  simulatedObligationIds.includes(String(obligation.id));
                return (
                  <li className="finance-row calendar-event" key={event.id}>
                    <div className="calendar-event-summary">
                      <div>
                        <strong>{event.title}</strong>
                        <small>
                          {event.kind === "income-scheduled"
                            ? "Pemasukan terjadwal · estimasi"
                            : event.kind === "obligation-paid"
                              ? "Pembayaran aktual"
                              : event.kind === "scenario"
                                ? "Skenario simulasi · bukan kewajiban aktual"
                            : event.kind === "expense-recorded"
                              ? `Pengeluaran e-wallet · ${event.walletId ? walletLabel(event.walletId) : ""}`
                                : "Kewajiban belum dibayar"}
                        </small>
                      </div>
                      <strong
                        className={`finance-number ${event.amount > 0 ? "finance-positive" : "finance-negative"}`}
                      >
                        {event.amount > 0 ? "+" : "−"}
                        {money(Math.abs(event.amount))}
                      </strong>
                    </div>
                    {obligation && (
                      <div className="calendar-payment-actions">
                        <button
                          type="button"
                          className="button secondary"
                          disabled={payingId !== null}
                          onClick={() => void markPaid(obligation)}
                        >
                          {payingId === obligation.id
                            ? "Mencatat..."
                            : "Tandai dibayar"}
                        </button>
                        <button
                          type="button"
                          className="button primary"
                          disabled={payingId !== null || !!simulated}
                          onClick={() => onPayWallet(obligation.id)}
                        >
                          {simulated
                            ? "Sudah disimulasikan"
                            : "Bayar via e-wallet"}
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          {scenario && (
            <button
              type="button"
              className="button secondary"
              onClick={() => onNavigate("simulation")}
            >
              Lihat skenario cicilan
            </button>
          )}
        </section>
      </div>
    </div>
  );
}
