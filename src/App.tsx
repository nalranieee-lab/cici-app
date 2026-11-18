import { Suspense, lazy, useEffect, useMemo, useRef, useState } from "react"

import MoneyInput from "./components/MoneyInput"

import { toast, useToastMessage } from "./components/Toast"
import DismissButton from "./components/DismissButton"

import { localFinance, localError, useLocalFinance } from './lib/localFinance';

import ObligationsLive from "./pages/Obligations"

import Incomes from "./pages/Incomes"
import Expenses from './pages/Expenses'

import { useDashboardSummary } from "./lib/useDashboardSummary"

import { useProfile, initialsOf, type Profile } from "./lib/useProfile"

import ProfileOnboarding from "./pages/ProfileOnboarding"

import { useCashflowData } from "./lib/useCashflowData"

import { computeCashflow, toDateString, type DailyPoint } from "./lib/cashflow"

import {
  useUpcomingObligations,
  type UpcomingObligation,
} from "./lib/useUpcomingObligations"

import { computeRadar, dueBadge, RADAR_WINDOW_DAYS } from "./lib/radar"

import { payObligation } from "./lib/obligationPayments"

const Wallet = lazy(() => import("./pages/Wallet"))

const SimulationLive = lazy(() => import("./pages/Simulation"))

const ReportsLive = lazy(() => import("./pages/Reports"))

import { useFinancialData } from "./lib/useFinancialData"

import { isoToday, monthDate, monthEnd } from "./lib/projection"

import type { InstallmentPlan } from "./lib/financialTypes"

import type { FinancialObligation } from "./lib/financialTypes"

import type { WalletId } from "./lib/walletDemo"

const FinancialCalendar = lazy(() => import("./pages/FinancialCalendar"))

const DailyBudget = lazy(() => import("./pages/DailyBudget"))

type Page = "dashboard" | "wallet" | "simulation" | "calendar" | "obligations" | "budget" | "reports" | "settings"

const formatRupiah = (value: number) =>
  `Rp${Math.abs(Math.round(value)).toLocaleString("id-ID")}`

/** Saldo yang terakhir diperbarui lebih dari sekian hari lalu memunculkan pengingat di kartu Saldo. */

const STALE_BALANCE_DAYS = 7

const INCOME = 4_200_000

const LOWER_INCOME = 3_300_000

const navItems: { id: Page; label: string; icon: string }[] = [
  { id: "dashboard", label: "Dashboard", icon: "grid" },

  { id: "wallet", label: "E-wallet", icon: "wallet" },

  { id: "simulation", label: "Simulasi Cicilan", icon: "spark" },

  { id: "calendar", label: "Kalender Keuangan", icon: "calendar" },

  { id: "obligations", label: "Kewajiban Saya", icon: "receipt" },

  { id: "budget", label: "Anggaran Harian", icon: "wallet" },

  { id: "reports", label: "Laporan Keuangan", icon: "chart" },

  { id: "settings", label: "Pengaturan", icon: "settings" },
]

function Icon({ name, size = 20 }: { name: string; size?: number }) {
  const paths: Record<string, React.ReactNode> = {
    grid: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="2" />
        <rect x="14" y="3" width="7" height="7" rx="2" />
        <rect x="3" y="14" width="7" height="7" rx="2" />
        <rect x="14" y="14" width="7" height="7" rx="2" />
      </>
    ),

    spark: (
      <>
        <path d="M12 3v3M12 18v3M3 12h3M18 12h3" />
        <circle cx="12" cy="12" r="4" />
        <path d="m4.2 4.2 2.1 2.1m11.4 11.4 2.1 2.1m0-15.6-2.1 2.1M6.3 17.7l-2.1 2.1" />
      </>
    ),

    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="3" />
        <path d="M16 3v4M8 3v4M3 10h18" />
      </>
    ),

    receipt: (
      <>
        <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" />
        <path d="M9 8h6M9 12h6" />
      </>
    ),

    wallet: (
      <>
        <path d="M4 6h14a2 2 0 0 1 2 2v10H4a2 2 0 0 1-2-2V6.5A2.5 2.5 0 0 1 4.5 4H17" />
        <path d="M16 11h4v4h-4a2 2 0 0 1 0-4Z" />
      </>
    ),

    chart: (
      <>
        <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
      </>
    ),

    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" />
      </>
    ),

    bell: (
      <>
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
      </>
    ),

    chevron: <path d="m9 18 6-6-6-6" />,

    plus: <path d="M12 5v14M5 12h14" />,

    check: <path d="m5 12 4 4L19 6" />,

    alert: (
      <>
        <path d="M12 3 2.7 20h18.6L12 3Z" />
        <path d="M12 9v5M12 17.5v.5" />
      </>
    ),

    trash: (
      <>
        <path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14" />
      </>
    ),

    edit: (
      <>
        <path d="m4 20 4.5-1 10-10-3.5-3.5-10 10L4 20Z" />
        <path d="m13.5 7 3.5 3.5" />
      </>
    ),

    close: <path d="M6 6l12 12M18 6 6 18" />,

    arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,

    menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  }

  return (
    <svg
      className="icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  )
}

function Button({
  children,

  variant = "primary",

  icon,

  onClick,

  type = "button",

  disabled = false,
}: {
  children: React.ReactNode

  variant?: "primary" | "secondary" | "ghost" | "danger"

  icon?: string

  onClick?: () => void

  type?: "button" | "submit"

  disabled?: boolean
}) {
  return (
    <button
      className={`button ${variant}`}
      onClick={onClick}
      type={type}
      disabled={disabled}
    >
      {icon && <Icon name={icon} size={17} />}
      {children}
    </button>
  )
}

function Field({
  label,

  value,

  onChange,

  type = "text",

  min,

  error,

  placeholder,
}: {
  label: string

  value: string | number

  onChange: (value: string) => void

  type?: string

  min?: number

  error?: string

  placeholder?: string
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {type === "number" ? (
        <MoneyInput value={String(value)} onValueChange={onChange} />
      ) : (
        <input
          value={value}
          type={type}
          min={min}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
      {error && <small>{error}</small>}
    </label>
  )
}

function SelectField({
  label,

  value,

  options,

  onChange,
}: {
  label: string

  value: string

  options: string[]

  onChange: (value: string) => void
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  )
}

function Badge({
  children,

  tone = "blue",
}: {
  children: React.ReactNode

  tone?: "blue" | "green" | "yellow" | "red" | "gray"
}) {
  return <span className={`badge ${tone}`}>{children}</span>
}

function Card({
  children,

  className = "",
}: {
  children: React.ReactNode

  className?: string
}) {
  return <section className={`card ${className}`}>{children}</section>
}

function PageHeading({
  eyebrow,

  title,

  description,

  action,
}: {
  eyebrow?: string

  title: string

  description: string

  action?: React.ReactNode
}) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  )
}

function MetricCard({
  label,

  value,

  icon,

  tone = "blue",

  helper,
}: {
  label: string

  value: string

  icon: string

  tone?: string

  helper: string
}) {
  return (
    <Card className="metric-card">
      <div className={`metric-icon ${tone}`}>
        <Icon name={icon} />
      </div>
      <div className="metric-copy">
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{helper}</small>
      </div>
    </Card>
  )
}

function CashFlowChart({ points }: { points: DailyPoint[] }) {
  const values = points.map((point) => point.balance)

  const hi = Math.max(...values, 1)

  const lo = Math.min(...values, 0)

  const range = hi - lo || 1

  const x = (index: number) =>
    points.length > 1 ? 8 + (index / (points.length - 1)) * 91.8 : 54

  const y = (value: number) => 82 - ((value - lo) / range) * 62

  const line = points

    .map((point, index) => `${x(index)},${y(point.balance)}`)

    .join(" ")

  const labelIndexes = [
    ...new Set(
      Array.from({ length: Math.min(7, points.length) }, (_, i) =>
        Math.round(
          (i * (points.length - 1)) /
            Math.max(1, Math.min(7, points.length) - 1),
        ),
      ),
    ),
  ]

  const label = (date: string) =>
    new Date(`${date}T12:00:00`).toLocaleDateString("id-ID", {
      day: "numeric",

      month: "short",
    })

  return (
    <div className="chart-wrap">
      <div className="chart-legend">
        <span>
          <i className="dot blue-dot" />
          Saldo proyeksi
        </span>
        <span>
          <i className="dot yellow-dot" />
          Hari ada pemasukan atau kewajiban
        </span>
      </div>
      <svg
        className="line-chart"
        viewBox="0 0 100 90"
        preserveAspectRatio="none"
        aria-label="Grafik proyeksi saldo harian bulan berjalan"
      >
        <defs>
          <linearGradient id="area" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#1769E0" stopOpacity=".22" />
            <stop offset="1" stopColor="#1769E0" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[20, 40, 60, 80].map((gridY) => (
          <line
            key={gridY}
            x1="0"
            x2="100"
            y1={gridY}
            y2={gridY}
            className="grid-line"
          />
        ))}
        {lo < 0 && (
          <line
            x1="0"
            x2="100"
            y1={y(0)}
            y2={y(0)}
            className="grid-line"
            strokeDasharray="2 2"
          />
        )}
        {points.length > 1 && (
          <polygon
            points={`${x(0)},82 ${line} ${x(points.length - 1)},82`}
            fill="url(#area)"
          />
        )}
        {points.length > 1 && (
          <polyline points={line} className="balance-line" />
        )}
        {points.map(
          (point, index) =>
            (point.hasEvent || points.length === 1) && (
              <circle
                key={point.date}
                cx={x(index)}
                cy={y(point.balance)}
                r="1.5"
                className="chart-point"
              />
            ),
        )}
      </svg>
      <div className="chart-labels">
        {labelIndexes.map((index) => (
          <span key={points[index].date}>{label(points[index].date)}</span>
        ))}
      </div>
    </div>
  )
}

const shortDate = (date: string) =>
  new Date(`${date}T12:00:00`).toLocaleDateString("id-ID", {
    day: "numeric",

    month: "short",
  })

const signedRupiah = (value: number) =>
  `${value < 0 ? "-" : ""}${formatRupiah(value)}`

const formatLongDate = (date: string) =>
  new Date(`${date.slice(0, 10)}T12:00:00`).toLocaleDateString("id-ID", {
    day: "numeric",

    month: "long",

    year: "numeric",
  })

function BalanceCard({
  profile,

  onSave,
}: {
  profile: Profile | null

  onSave: (balance: number) => Promise<string | null>
}) {
  const filled = !!profile?.balance_updated_at

  const ageDays =
    filled && profile?.balance_updated_at
      ? (Date.now() - new Date(profile.balance_updated_at).getTime()) /
        86_400_000
      : 0

  const stale = filled && ageDays > STALE_BALANCE_DAYS

  const [editing, setEditing] = useState(false)

  const [value, setValue] = useState("")

  const [error, setError] = useState("")

  const [saving, setSaving] = useState(false)

  const [success, setSuccess] = useState("")

  useToastMessage(success)

  useToastMessage(error, "error")

  const startEdit = () => {
    setValue(
      filled && (profile?.balance ?? 0) >= 0
        ? String(profile?.balance ?? 0)
        : "",
    )

    setError("")

    setSuccess("")

    setEditing(true)
  }

  const submit = async () => {
    const amount = Number(value)

    if (
      value.trim() === "" ||
      !Number.isSafeInteger(amount) ||
      amount > 1_000_000_000_000
    ) {
      setError("Saldo wajib diisi dengan angka")

      return
    }

    if (amount < 0) {
      setError("Saldo tidak boleh minus")

      return
    }

    setSaving(true)

    const message = await onSave(amount)

    setSaving(false)

    if (message) setError(message)
    else {
      setEditing(false)

      setError("")

      setSuccess("Saldo berhasil disimpan.")
    }
  }

  return (
    <Card className="metric-card balance-card">
      <div className="metric-icon blue">
        <Icon name="wallet" />
      </div>
      <div className="metric-copy">
        <span>Saldo tersedia</span>
        <strong>
          {filled ? signedRupiah(profile?.balance ?? 0) : "Belum diisi"}
        </strong>
        <small>
          {filled && profile?.balance_updated_at
            ? `Diperbarui ${formatLongDate(profile.balance_updated_at)}`
            : "Belum diisi"}
        </small>
        {editing ? (
          <div style={{ marginTop: 8 }}>
            <Field
              label="Saldo (Rp)"
              value={value}
              onChange={(next) => {
                setValue(next)

                setError("")
              }}
              type="number"
              min={0}
              error={error || undefined}
            />
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <Button onClick={submit} disabled={saving}>
                {saving ? "Menyimpan..." : "Simpan"}
              </Button>
              <Button
                variant="secondary"
                onClick={() => setEditing(false)}
                disabled={saving}
              >
                Batal
              </Button>
            </div>
          </div>
        ) : (
          <div style={{ marginTop: 8 }}>
            {stale && (
              <small
                role="status"
                style={{ display: "block", marginBottom: 6, color: "#775918" }}
              >
                Saldo terakhir diperbarui {Math.floor(ageDays)} hari lalu.
                Cocokkan dengan saldo rekeningmu.
              </small>
            )}
            <Button variant="secondary" onClick={startEdit}>
              {filled ? "Ubah saldo" : "Isi saldo"}
            </Button>
            {success && (
              <small role="status" style={{ display: "block", marginTop: 6 }}>
                {success}
              </small>
            )}
            {error && (
              <small
                role="alert"
                style={{ display: "block", marginTop: 6, color: "var(--red)" }}
              >
                {error}
              </small>
            )}
          </div>
        )}
      </div>
    </Card>
  )
}

function Dashboard({
  displayName,

  profile,

  onSaveBalance,

  onRefreshProfile,

  onNavigate,
}: {
  displayName: string

  profile: Profile | null

  onSaveBalance: (balance: number) => Promise<string | null>

  onRefreshProfile: () => Promise<void>

  onNavigate: (page: Page) => void
}) {
  // Ringkasan dan proyeksi membaca catatan lokal yang sama dengan halaman keuangan.

  const {
    summary,

    loading: summaryLoading,

    error: summaryError,

    reload: reloadSummary,
  } = useDashboardSummary()

  const hasRealData =
    !!summary &&
    (summary.incomeCount > 0 ||
      summary.unpaidCount > 0 ||
      summary.paidCount > 0)

  const realValue = (pick: (data: NonNullable<typeof summary>) => string) =>
    summaryLoading ? "Memuat..." : summary ? pick(summary) : "—"

  // Data asli untuk proyeksi: saldo dari profil + incomes/obligations lewat fungsi murni di src/lib/cashflow.ts.

  const {
    data: cashData,

    loading: cashLoading,

    error: cashError,

    reload: reloadCash,
  } = useCashflowData()

  const hasBalance = !!profile?.balance_updated_at

  const cash =
    hasBalance && cashData
      ? computeCashflow({
          balance: profile?.balance ?? 0,

          today: toDateString(new Date()),

          incomes: cashData.incomes,

          obligations: cashData.obligations,
        })
      : null

  const cashValue = (pick: (data: NonNullable<typeof cash>) => string) =>
    !hasBalance ? "—" : cashLoading ? "Memuat..." : cash ? pick(cash) : "—"

  const [showCalc, setShowCalc] = useState(false)

  // Pembayaran mendatang dan Radar risiko: kewajiban belum dibayar milik user.

  const {
    items: upcoming,

    loading: upcomingLoading,

    error: upcomingError,

    reload: reloadUpcoming,
  } = useUpcomingObligations()

  const todayString = toDateString(new Date())

  const radar = upcomingError
    ? null
    : computeRadar({
        today: todayString,

        obligations: upcoming,

        balance: hasBalance ? (profile?.balance ?? 0) : null,
      })

  const [payingId, setPayingId] = useState<UpcomingObligation["id"] | null>(
    null,
  )

  const [payNotice, setPayNotice] = useState<{
    tone: "success" | "error"

    text: string
  } | null>(null)

  const handlePay = async (item: UpcomingObligation) => {
    setPayingId(item.id)

    setPayNotice(null)

    const result = await payObligation(item) // fungsi yang sama dengan halaman Kewajiban Saya

    toast(
      result.status === "paid" ? result.notice : result.message,
      result.status === "paid" ? "success" : "error",
    )

    if (result.status === "failed")
      setPayNotice({ tone: "error", text: result.message })
    else {
      setPayNotice({ tone: 'success', text: result.notice });

      await Promise.all([
        reloadUpcoming(),

        reloadCash(),

        reloadSummary(),

        onRefreshProfile(),
      ])
    }

    setPayingId(null)
  }

  const monthLabel = new Date().toLocaleDateString("id-ID", {
    month: "long",

    year: "numeric",
  })

  const riskTone =
    cash?.risk === "Berisiko"
      ? "red"
      : cash?.risk === "Waspada"
        ? "yellow"
        : "green"

  const needleAngle =
    cash?.risk === "Berisiko" ? -30 : cash?.risk === "Waspada" ? -90 : -150

  return (
    <>
      <PageHeading
        eyebrow={`Ringkasan ${monthLabel}`}
        title={`Selamat pagi, ${displayName.split(" ")[0]}`}
        description="Berikut kondisi keuangan dan kewajiban yang perlu kamu perhatikan hari ini."
        action={
          <Button icon="spark" onClick={() => onNavigate("simulation")}>
            Simulasikan Cicilan Baru
          </Button>
        }
      />
      {(summaryError || cashError || upcomingError) && (
        <div className="alert danger compact" role="alert">
          <div>
            <strong>Sebagian data belum bisa dimuat</strong>
            <p>{summaryError || cashError || upcomingError}</p>
            <Button
              variant="secondary"
              onClick={() => {
                reloadSummary()

                reloadCash()

                reloadUpcoming()
              }}
            >
              Coba lagi
            </Button>
          </div>
        </div>
      )}
      {!hasBalance && (
        <div className="alert warning compact">
          <Icon name="alert" />
          <div>
            <strong>Isi saldo untuk melihat proyeksi</strong>
            <p>
              Proyeksi akhir bulan, status risiko, grafik, dan uang aman hari
              ini dihitung dari saldomu.
            </p>
          </div>
        </div>
      )}
      {!summaryLoading && !summaryError && !hasRealData && (
        <div className="alert warning compact">
          <Icon name="alert" />
          <div>
            <strong>Belum ada data bulan ini</strong>
            <p>
              Tambahkan kewajiban di menu Kewajiban Saya dan pemasukan di
              Pengaturan agar ringkasan terisi.
            </p>
          </div>
        </div>
      )}
      <div className="metrics-grid">
        <BalanceCard profile={profile} onSave={onSaveBalance} />
        {/* DATA ASLI: incomes bulan berjalan. */}
        <MetricCard
          label="Pemasukan bulan ini"
          value={realValue((d) => formatRupiah(d.incomeTotal))}
          icon="chart"
          tone="green"
          helper={
            summary
              ? `${summary.incomeCount} pemasukan bulan ini`
              : "Dari data pemasukanmu"
          }
        />
        {/* DATA ASLI: obligations is_paid=true, due_date bulan berjalan. */}
        <MetricCard
          label="Total pengeluaran"
          value={realValue((d) => formatRupiah(d.paidTotal + d.walletExpenseTotal))}
          icon="receipt"
          tone="yellow"
          helper={
            summary
              ? `${summary.paidCount} kewajiban dibayar · ${summary.walletExpenseCount} pengeluaran e-wallet`
              : "Kewajiban yang sudah dibayar"
          }
        />
        {/* DATA ASLI: obligations is_paid=false, due_date bulan berjalan. */}
        <MetricCard
          label="Kewajiban cicilan"
          value={realValue((d) => formatRupiah(d.unpaidTotal))}
          icon="calendar"
          tone="purple"
          helper={
            summary
              ? `${summary.unpaidCount} pembayaran mendatang`
              : "Kewajiban belum dibayar"
          }
        />
        {/* DATA ASLI: saldo + pemasukan sisa - kewajiban sisa (src/lib/cashflow.ts). */}
        <MetricCard
          label="Proyeksi akhir bulan"
          value={cashValue((c) => signedRupiah(c.projectedEnd))}
          icon="spark"
          tone="blue"
          helper={
            cash
              ? `Sampai ${formatLongDate(cash.endOfMonth)}`
              : "Sampai akhir bulan"
          }
        />
        {/* DATA ASLI: status dari saldo harian terendah. */}
        <Card className="metric-card risk-card">
          <div className="risk-gauge">
            <span style={{ transform: `rotate(${needleAngle}deg)` }} />
          </div>
          <div className="metric-copy">
            <span>Status risiko</span>
            <strong>{cashValue((c) => c.risk)}</strong>
            <small>
              {cash
                ? `Saldo terendah ${signedRupiah(cash.lowest.balance)} pada ${formatLongDate(cash.lowest.date)}`
                : "Berdasarkan saldo harian terendah"}
            </small>
          </div>
        </Card>
      </div>
      <div className="dashboard-grid">
        <Card className="chart-card">
          <div className="card-title">
            <div>
              <h2>Proyeksi arus kas</h2>
              <p>Saldo harian dari hari ini sampai akhir bulan</p>
            </div>
            <Badge tone="blue">{monthLabel}</Badge>
          </div>
          {!hasBalance ? (
            <div className="empty-state">
              <Icon name="chart" />
              <p>Isi saldo untuk melihat proyeksi.</p>
            </div>
          ) : cashLoading ? (
            <div className="empty-state" role="status">
              <p>Memuat proyeksi...</p>
            </div>
          ) : cash ? (
            <CashFlowChart points={cash.daily} />
          ) : (
            <div className="empty-state">
              <p>Proyeksi belum bisa ditampilkan.</p>
            </div>
          )}
        </Card>
        <Card className="safe-card">
          <div className="mascot" aria-label="Maskot CICI">
            <div className="mascot-ear left" />
            <div className="mascot-ear right" />
            <div className="mascot-face">
              <i />
              <i />
              <span />
            </div>
            <div className="mascot-body">C</div>
          </div>
          <Badge tone={cash ? riskTone : "gray"}>
            {cash ? cash.risk : "Belum ada saldo"}
          </Badge>
          <h2>Uang aman hari ini</h2>
          <strong className="safe-value">
            {cashValue((c) => formatRupiah(c.safe.amount))}
          </strong>
          {cash ? (
            <p>
              Setelah menyisihkan {formatRupiah(cash.safe.needs)} untuk
              kebutuhan hingga pemasukan berikutnya.
              {cash.safe.insufficient &&
                " Saldo belum cukup untuk kewajiban sebelum pemasukan berikutnya."}
            </p>
          ) : (
            <p>Isi saldo untuk melihat proyeksi.</p>
          )}
          {cash && (
            <Button variant="secondary" onClick={() => setShowCalc(!showCalc)}>
              {showCalc ? "Sembunyikan perhitungan" : "Lihat perhitungan"}{" "}
              <Icon name="arrow" />
            </Button>
          )}
          {cash && showCalc && (
            <div className="calculation" style={{ marginTop: 12 }}>
              <div>
                <span>Saldo tersedia</span>
                <strong>{signedRupiah(profile?.balance ?? 0)}</strong>
              </div>
              <div className="minus">
                <span>
                  Kewajiban belum dibayar sebelum{" "}
                  {cash.safe.hasNextIncome
                    ? `pemasukan ${formatLongDate(cash.safe.boundaryDate)}`
                    : `${formatLongDate(cash.safe.boundaryDate)} (akhir bulan + 1 hari)`}
                </span>
                <strong>-{formatRupiah(cash.safe.needs)}</strong>
              </div>
              <div className="equals">
                <span>Dibagi {cash.safe.days} hari</span>
                <strong>{formatRupiah(cash.safe.amount)}/hari</strong>
              </div>
            </div>
          )}
        </Card>
      </div>
      {payNotice && (
        <div
          className={`alert ${
            payNotice.tone === "success" ? "success" : "danger"
          } compact`}
          role={payNotice.tone === "success" ? "status" : "alert"}
        >
          <div className="alert-copy">
            <p>{payNotice.text}</p>
          </div>
          <DismissButton
            label="Tutup pemberitahuan"
            onDismiss={() => setPayNotice(null)}
          />
        </div>
      )}
      <div className="lower-grid">
        <Card>
          <div className="card-title">
            <div>
              <h2>Pembayaran mendatang</h2>
              <p>Kewajiban terdekat yang belum dibayar</p>
            </div>
            <Button variant="ghost" onClick={() => onNavigate("obligations")}>
              Lihat semua
            </Button>
          </div>
          {upcomingLoading ? (
            <div className="empty-state" role="status">
              <p>Memuat pembayaran mendatang...</p>
            </div>
          ) : upcomingError ? (
            <div className="empty-state">
              <p>Pembayaran mendatang belum bisa dimuat.</p>
            </div>
          ) : upcoming.length === 0 ? (
            <div className="empty-state">
              <Icon name="check" />
              <strong>Tidak ada kewajiban yang belum dibayar</strong>
              <p>
                Semua beres, atau kamu belum menambahkannya di Kewajiban Saya.
              </p>
            </div>
          ) : (
            <div className="payment-list">
              {upcoming.slice(0, 4).map((item) => {
                const badge = dueBadge(item.dueDate, todayString)

                const due = new Date(`${item.dueDate}T12:00:00`)

                return (
                  <div className="payment-row" key={item.id}>
                    <div className="date-block">
                      <strong>{due.getDate()}</strong>
                      <span>
                        {due.toLocaleDateString("id-ID", { month: "short" })}
                      </span>
                    </div>
                    <div className="payment-info">
                      <strong>{item.name}</strong>
                      <span>
                        {formatRupiah(item.amount)} ·{" "}
                        {formatLongDate(item.dueDate)}
                      </span>
                    </div>
                    <Badge tone={badge.tone}>{badge.label}</Badge>
                    <div className="row-actions">
                      <Button
                        variant="secondary"
                        disabled={payingId === item.id}
                        onClick={() => handlePay(item)}
                      >
                        {payingId === item.id
                          ? "Memproses..."
                          : "Tandai dibayar"}
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
        <Card className="risk-panel">
          <div className="card-title">
            <div>
              <h2>Radar risiko</h2>
              <p>Kewajiban {RADAR_WINDOW_DAYS} hari ke depan</p>
            </div>
            <div className={`pulse-dot ${radar?.warn ? "" : "green"}`} />
          </div>
          {upcomingLoading ? (
            <div className="empty-state" role="status">
              <p>Memuat radar risiko...</p>
            </div>
          ) : upcomingError || !radar ? (
            <div className="empty-state">
              <p>Radar risiko belum bisa dimuat.</p>
            </div>
          ) : (
            <>
              {radar.warn ? (
                <div className="alert warning">
                  <Icon name="alert" />
                  <div>
                    <strong>
                      {formatRupiah(radar.total)} jatuh tempo dalam{" "}
                      {RADAR_WINDOW_DAYS} hari
                    </strong>
                    <p>
                      {radar.count} kewajiban
                      {radar.rangeStart && radar.rangeEnd
                        ? `, ${shortDate(radar.rangeStart)}${
                            radar.rangeStart !== radar.rangeEnd
                              ? ` – ${shortDate(radar.rangeEnd)}`
                              : ""
                          }`
                        : ""}
                      . {radar.reasons.join("; ")}.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="alert success">
                  <Icon name="check" />
                  <div>
                    <strong>
                      Tidak ada penumpukan kewajiban dalam {RADAR_WINDOW_DAYS}{" "}
                      hari ke depan
                    </strong>
                    {radar.count > 0 && (
                      <p>
                        {formatRupiah(radar.total)} untuk {radar.count}{" "}
                        kewajiban
                        {radar.rangeStart && radar.rangeEnd
                          ? `, ${shortDate(radar.rangeStart)}${
                              radar.rangeStart !== radar.rangeEnd
                                ? ` – ${shortDate(radar.rangeEnd)}`
                                : ""
                            }`
                          : ""}
                        .
                      </p>
                    )}
                  </div>
                </div>
              )}
              {!hasBalance && (
                <p style={{ marginTop: 10 }}>
                  Isi saldo untuk analisis lebih akurat.
                </p>
              )}
              {radar.timeline.length > 0 && (
                <div className="collision-line">
                  {radar.timeline.map((item) => (
                    <div key={item.id} className="collision-item">
                      <i />
                      <span>{shortDate(item.dueDate)}</span>
                      <strong>{formatRupiah(item.amount)}</strong>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
          <Button variant="secondary" onClick={() => onNavigate("calendar")}>
            Lihat di kalender <Icon name="arrow" />
          </Button>
        </Card>
      </div>
    </>
  )
}

function ProfileCard({
  profile,

  onSave,
}: {
  profile: Profile | null

  onSave: (fullName: string, occupation: string) => Promise<string | null>
}) {
  const name = profile?.full_name ?? ""

  const occupation = profile?.occupation ?? ""

  const [editing, setEditing] = useState(false)

  const [fullName, setFullName] = useState(name)

  const [job, setJob] = useState(occupation)

  const [nameError, setNameError] = useState("")

  const [message, setMessage] = useState<{
    type: "success" | "error"

    text: string
  } | null>(null)

  const [saving, setSaving] = useState(false)

  const startEdit = () => {
    setFullName(name)

    setJob(occupation)

    setNameError("")

    setMessage(null)

    setEditing(true)
  }

  const submit = async () => {
    if (!fullName.trim()) {
      setNameError("Nama lengkap wajib diisi")

      return
    }

    setSaving(true)

    const error = await onSave(fullName, job)

    setSaving(false)

    if (error) {
      setMessage({ type: "error", text: error })
      toast(error, "error")
    } else {
      toast("Profil berhasil disimpan.")

      setMessage({ type: "success", text: "Profil berhasil disimpan." })

      setEditing(false)
    }
  }

  return (
    <>
      <div className="profile-settings">
        <div className="avatar large">{initialsOf(name)}</div>
        <div>
          <strong>{name}</strong>
          {occupation && <span>{occupation}</span>}
          {!editing && (
            <Button variant="ghost" onClick={startEdit}>
              Ubah profil
            </Button>
          )}
        </div>
      </div>
      {editing && (
        <div className="form-grid">
          <Field
            label="Nama lengkap"
            value={fullName}
            onChange={(value) => {
              setFullName(value)

              setNameError("")
            }}
            error={nameError || undefined}
          />
          <Field
            label="Pekerjaan atau status"
            value={job}
            onChange={setJob}
            placeholder="Opsional"
          />
          <div style={{ display: "flex", gap: 8 }}>
            <Button onClick={submit} disabled={saving}>
              {saving ? "Menyimpan..." : "Simpan profil"}
            </Button>
            <Button
              variant="secondary"
              onClick={() => setEditing(false)}
              disabled={saving}
            >
              Batal
            </Button>
          </div>
        </div>
      )}
      {message && (
        <div
          className={`alert ${
            message.type === "success" ? "success" : "danger"
          } compact`}
          role={message.type === "error" ? "alert" : "status"}
        >
          <div className="alert-copy">
            <p>{message.text}</p>
          </div>
          <DismissButton
            label="Tutup pesan profil"
            onDismiss={() => setMessage(null)}
          />
        </div>
      )}
    </>
  )
}

function SettingsPage({
  onOnboarding,

  profile,

  onSaveProfile,
}: {
  onOnboarding: () => void

  profile: Profile | null

  onSaveProfile: (
    fullName: string,

    occupation: string,
  ) => Promise<string | null>
}) {
  const [preferences] = useState(() => {
    try {
      const value = JSON.parse(
        localStorage.getItem("cici.preferences.v1") ?? "{}",
      )
      return value && typeof value === "object" ? value : {}
    } catch {
      return {}
    }
  })

  const [income, setIncome] = useState(String(preferences.income ?? INCOME))

  const [lower, setLower] = useState(String(preferences.lower ?? LOWER_INCOME))

  const [reminders, setReminders] = useState<boolean[]>(
    [0, 1, 2, 3].map((index) =>
      typeof preferences.reminders?.[index] === "boolean"
        ? preferences.reminders[index]
        : index < 3,
    ),
  )

  const [saved, setSaved] = useState(false)

  const savePreferences = (nextReminders = reminders) => {
    if (
      ![income, lower].every(
        (value) =>
          value.trim() &&
          Number.isSafeInteger(Number(value)) &&
          Number(value) >= 0 &&
          Number(value) <= 1_000_000_000_000,
      )
    ) {
      toast("Isi nominal preferensi dengan rupiah yang valid.", "error")
      return
    }

    try {
      localStorage.setItem(
        "cici.preferences.v1",
        JSON.stringify({ income, lower, reminders: nextReminders }),
      )
      setSaved(true)
      toast("Preferensi tersimpan di browser ini.")
    } catch {
      toast(
        "Browser tidak dapat menyimpan preferensi. Periksa pengaturan penyimpanan.",
        "error",
      )
    }
  }

  return (
    <>
      <PageHeading
        eyebrow="Preferensi"
        title="Pengaturan"
        description="Kelola profil, asumsi pemasukan, dan preferensi notifikasi."
        action={
          <Button variant="secondary" onClick={onOnboarding}>
            Ulangi onboarding
          </Button>
        }
      />
      <div className="settings-grid">
        <Card>
          <div className="card-title">
            <div>
              <h2>Profil finansial</h2>
              <p>Informasi untuk personalisasi proyeksi</p>
            </div>
          </div>
          <ProfileCard profile={profile} onSave={onSaveProfile} />
          <div className="form-grid">
            <Field
              label="Pemasukan normal"
              value={income}
              onChange={(value) => {
                setIncome(value)
                setSaved(false)
              }}
              type="number"
            />
            <Field
              label="Estimasi pemasukan terendah"
              value={lower}
              onChange={(value) => {
                setLower(value)
                setSaved(false)
              }}
              type="number"
            />
          </div>
          <Button icon="check" onClick={() => savePreferences()}>
            {saved ? "Tersimpan" : "Simpan perubahan"}
          </Button>
        </Card>
        <Card>
          <div className="card-title">
            <div>
              <h2>Notifikasi risiko</h2>
              <p>Pilih pengingat yang ingin diterima</p>
            </div>
          </div>
          <div className="toggle-list">
            {[
              "Pengingat 3 hari sebelum jatuh tempo",

              "Peringatan saldo diproyeksikan rendah",

              "Ringkasan keuangan mingguan",

              "Insight anggaran harian",
            ].map((label, index) => (
              <label key={label} className="toggle-row">
                <span>{label}</span>
                <input
                  type="checkbox"
                  checked={reminders[index]}
                  onChange={(event) => {
                    const next = reminders.map((value, i) =>
                      i === index ? event.target.checked : value,
                    )
                    setReminders(next)
                    savePreferences(next)
                  }}
                />
                <i />
              </label>
            ))}
          </div>
          <div className="privacy-note">
            <Icon name="alert" />
            <p>
              CICI tidak terhubung ke rekening bank atau skor kredit. Semua
              proyeksi bergantung pada data yang kamu masukkan.
            </p>
          </div>
        </Card>
      </div>
      <Incomes />
      <Expenses />
    </>
  )
}

function Logo() {
  return (
    <div className="logo">
      <div className="logo-mark logo-image" aria-hidden="true">
        <img src="/brand/cici-mascot.png" alt="" />
      </div>
      <div>
        <strong>CICI</strong>
        <small>Cicilan Cerdas</small>
      </div>
    </div>
  )
}

export default function App() {
  const workspaceId = 'local-browser';
  const { data: localData, error: storageError } = useLocalFinance();

  const [page, setPage] = useState<Page>("dashboard")

  const [sidebarOpen, setSidebarOpen] = useState(false)

  const [showOnboarding, setShowOnboarding] = useState(false)

  const [scenario, changeScenario] = useState<InstallmentPlan | null>(null);

  const [walletObligationId, setWalletObligationId] = useState("")

  const financialToday = isoToday()

  const financialStartDate = monthDate(`${financialToday.slice(0, 7)}-01`, -6)

  const financialEndDate = monthEnd(monthDate(financialToday, 120))

  const financial = useFinancialData({
    startDate: financialStartDate,

    endDate: financialEndDate,
  })

  const demoWallet = localData.wallet;

  const updateWalletBalance = (
    walletId: WalletId,
    amount: number,
    mode: "add" | "set",
    source?: "income" | "transfer",
  ): string | null => {
    if (
      !Number.isSafeInteger(amount) ||
      amount < 0 ||
      amount > 1_000_000_000_000 ||
      (mode === "add" && amount === 0)
    )
      return "Masukkan nominal rupiah yang valid."

    try { localFinance.updateWalletBalance(walletId, amount, mode, source); } catch (error) { return localError(error); }

    return null
  }

  const simulateWalletPayment = (
    walletId: WalletId,

    obligation: FinancialObligation,
  ) => {
    try { return localFinance.simulateWalletPayment(walletId, obligation); }
    catch (error) { toast(localError(error), 'error'); return { status: 'invalid' as const }; }
  }

  const invalidateWalletPayment = (id: string | number) => {
    if (!localFinance.getSnapshot().data.wallet.payments.some(p => p.obligationId === String(id))) return;
    try { localFinance.invalidateWallet(id); } catch (error) { toast(localError(error), 'error'); }
  }

  const {
    profile,

    save: saveProfile,

    saveBalance,

    refresh: refreshProfile,
  } = useProfile()

  const displayName = profile?.full_name?.trim() || 'Pengguna CICI';

  const navigate = (target: Page) => {
    setPage(target)

    setSidebarOpen(false)

    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  // Saat Dashboard dibuka lagi, ambil profil terbaru (saldo bisa berubah dari Kewajiban Saya) tanpa layar loading.

  const previousPage = useRef(page)

  useEffect(() => {
    if (page === "dashboard" && previousPage.current !== "dashboard")
      refreshProfile()

    if (
      (page === "simulation" ||
        page === "reports" ||
        page === "wallet" ||
        page === "calendar" ||
        page === "budget") &&
      previousPage.current !== page
    )
      void financial.reload()

    previousPage.current = page
  }, [page, refreshProfile, financial.reload])

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-top">
          <Logo />
          <Button
            variant="ghost"
            icon="close"
            onClick={() => setSidebarOpen(false)}
          >
            Tutup
          </Button>
        </div>
        <nav>
          {navItems.map((item) => (
            <button
              key={item.id}
              className={page === item.id ? "active" : ""}
              onClick={() => navigate(item.id)}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
              {page === item.id && <i />}
            </button>
          ))}
        </nav>
        <div className="sidebar-help">
          <div className="mini-mascot"><img src="/brand/cici-mascot.png" alt="" /></div>
          <strong>Butuh panduan?</strong>
          <p>Pelajari cara membaca proyeksi arus kas.</p>
          <Button variant="secondary">Pusat bantuan</Button>
        </div>
        <p className="sidebar-caption">
          CICI membantu perencanaan, bukan menyediakan pinjaman.
        </p>
      </aside>
      {sidebarOpen && (
        <div className="sidebar-scrim" onClick={() => setSidebarOpen(false)} />
      )}
      <div className="main-shell">
        <header>
          <Button
            variant="ghost"
            icon="menu"
            onClick={() => setSidebarOpen(true)}
          >
            Menu
          </Button>
          <div className="mobile-logo">
            <Logo />
          </div>
          <div className="header-tagline">
            Kelola Cicilan. Jaga Cash Flow. Tetap Aman.
          </div>
          <div className="header-actions">
            <button className="icon-button" aria-label="Notifikasi">
              <Icon name="bell" />
              <i />
            </button>
            <div className="profile">
              <div className="avatar">{initialsOf(displayName)}</div>
              <div>
                <strong>{displayName}</strong>
                {profile?.occupation && <span>{profile.occupation}</span>}
              </div>
              <Icon name="chevron" size={16} />
            </div>
          </div>
        </header>
        <main>
          {storageError && <div role="alert" className="finance-note finance-error">{storageError}</div>}
          <Suspense
            fallback={
              <div className="finance-page" role="status">
                Memuat halaman...
              </div>
            }
          >
            {page === "dashboard" && (
              <Dashboard
                displayName={displayName}
                profile={profile}
                onSaveBalance={saveBalance}
                onRefreshProfile={refreshProfile}
                onNavigate={navigate}
              />
            )}
            {page === "wallet" && (
              <Wallet
                key={workspaceId}
                state={demoWallet}
                transactions={localData.walletTransactions ?? []}
                obligations={financial.snapshot?.obligations ?? []}
                loading={financial.loading}
                error={financial.error}
                reload={financial.reload}
                initialObligationId={walletObligationId}
                onPay={simulateWalletPayment}
                onBalanceChange={updateWalletBalance}
              />
            )}
            {(page === "simulation" ||
              page === "reports" ||
              page === "calendar" ||
              page === "budget") && (
              <>
                {financial.loading ? (
                  <div className="finance-page" role="status">
                    Memuat data keuangan...
                  </div>
                ) : financial.error ? (
                  <div className="finance-page">
                    <div className="finance-note finance-error" role="alert">
                      Data belum bisa dimuat: {financial.error}
                    </div>
                    <button
                      type="button"
                      className="button primary"
                      onClick={() => void financial.reload()}
                    >
                      Coba lagi
                    </button>
                  </div>
                ) : financial.snapshot ? (
                  page === "simulation" ? (
                    <SimulationLive
                      key={workspaceId}
                      snapshot={financial.snapshot}
                      scenario={scenario}
                      onScenarioChange={changeScenario}
                      onReports={() => navigate("reports")}
                    />
                  ) : page === "reports" ? (
                    <ReportsLive
                      key={workspaceId}
                      snapshot={financial.snapshot}
                      scenario={scenario}
                    />
                  ) : page === "calendar" ? (
                    <FinancialCalendar
                      snapshot={financial.snapshot}
                      scenario={scenario}
                      today={financialToday}
                      minMonth={financialStartDate.slice(0, 7)}
                      maxMonth={financialEndDate.slice(0, 7)}
                      onNavigate={navigate}
                      onPayWallet={id => { setWalletObligationId(String(id)); navigate('wallet'); }}
                      simulatedObligationIds={demoWallet.payments.map(payment => payment.obligationId)}
                      onPaymentRecorded={async id => {
                        invalidateWalletPayment(id);
                        await Promise.all([financial.reload(true), refreshProfile()]);
                      }}
                    />
                  ) : (
                    <DailyBudget
                      snapshot={financial.snapshot}
                      scenario={scenario}
                      today={financialToday}
                    />
                  )
                ) : (
                  <div className="finance-page">Data keuangan belum tersedia.</div>
                )}
              </>
            )}
            {page === "obligations" && (
              <ObligationsLive
                simulatedPayments={demoWallet.payments}
                onPayDemo={(id) => {
                  setWalletObligationId(String(id))

                  navigate("wallet")
                }}
                onInvalidateDemo={invalidateWalletPayment}
              />
            )}
            {page === "settings" && (
              <SettingsPage
                onOnboarding={() => setShowOnboarding(true)}
                profile={profile}
                onSaveProfile={saveProfile}
              />
            )}
          </Suspense>
        </main>
        <footer>
          <span>© 2026 CICI · Versi beta</span>
          <button onClick={() => setShowOnboarding(true)}>
            Buka onboarding
          </button>
          <span>Privasi · Ketentuan · Bantuan</span>
        </footer>
      </div>
      <div className="mobile-nav">
        {navItems.slice(0, 5).map((item) => (
          <button
            key={item.id}
            className={page === item.id ? "active" : ""}
            onClick={() => navigate(item.id)}
          >
            <Icon name={item.icon} />
            <span>{item.label.split(" ")[0]}</span>
          </button>
        ))}
      </div>
      {showOnboarding && (
        <ProfileOnboarding
          initial={profile}
          onSave={saveProfile}
          onClose={() => setShowOnboarding(false)}
          onSaved={() => {
            setShowOnboarding(false)

            navigate("dashboard")
          }}
        />
      )}
    </div>
  )
}
