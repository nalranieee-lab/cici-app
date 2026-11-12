import { useEffect, useMemo, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./lib/supabase";
import Auth from "./pages/Auth";
import ObligationsLive from "./pages/Obligations";
import Incomes from "./pages/Incomes";
import { useDashboardSummary } from "./lib/useDashboardSummary";
import { useProfile, initialsOf, type Profile } from "./lib/useProfile";
import ProfileOnboarding from "./pages/ProfileOnboarding";
import { useCashflowData } from "./lib/useCashflowData";
import { computeCashflow, toDateString, type DailyPoint } from "./lib/cashflow";
import { useUpcomingObligations, type UpcomingObligation } from "./lib/useUpcomingObligations";
import { computeRadar, dueBadge, RADAR_WINDOW_DAYS } from "./lib/radar";
import { payObligation } from "./lib/obligationPayments";

type Page =
  | "dashboard"
  | "simulation"
  | "calendar"
  | "obligations"
  | "budget"
  | "reports"
  | "settings";

type Obligation = {
  id: number;
  name: string;
  provider: string;
  amount: number;
  outstanding: number;
  dueDay: number;
  frequency: string;
  remaining: number;
  category: string;
};

const formatRupiah = (value: number) =>
  `Rp${Math.abs(Math.round(value)).toLocaleString("id-ID")}`;

const DEMO_YEAR = 2026;
const DEMO_MONTH = 10;
const BASE_BALANCE = 3_400_000;
/** Saldo yang terakhir diperbarui lebih dari sekian hari lalu memunculkan pengingat di kartu Saldo. */
const STALE_BALANCE_DAYS = 7;
const INCOME = 4_200_000;
const LOWER_INCOME = 3_300_000;

const initialObligations: Obligation[] = [
  { id: 1, name: "Sewa kos", provider: "Pemilik Kos", amount: 800_000, outstanding: 0, dueDay: 5, frequency: "Bulanan", remaining: 0, category: "Tempat tinggal" },
  { id: 2, name: "Internet & telepon", provider: "Telkomsel", amount: 250_000, outstanding: 0, dueDay: 8, frequency: "Bulanan", remaining: 0, category: "Tagihan" },
  { id: 3, name: "PayLater", provider: "Aplikasi penyedia", amount: 450_000, outstanding: 1_350_000, dueDay: 10, frequency: "Bulanan", remaining: 3, category: "Cicilan" },
  { id: 4, name: "Cicilan UKT", provider: "Universitas", amount: 600_000, outstanding: 1_200_000, dueDay: 15, frequency: "Bulanan", remaining: 2, category: "Pendidikan" },
  { id: 5, name: "Cicilan laptop", provider: "Toko Elektronik", amount: 350_000, outstanding: 2_100_000, dueDay: 18, frequency: "Bulanan", remaining: 6, category: "Cicilan" },
];

const fixedExpenses = [
  { day: 7, label: "Belanja mingguan", amount: 250_000 },
  { day: 14, label: "Transportasi & makan", amount: 300_000 },
  { day: 22, label: "Belanja mingguan", amount: 250_000 },
  { day: 29, label: "Transportasi & makan", amount: 300_000 },
];

const navItems: { id: Page; label: string; icon: string }[] = [
  { id: "dashboard", label: "Dashboard", icon: "grid" },
  { id: "simulation", label: "Simulasi Cicilan", icon: "spark" },
  { id: "calendar", label: "Kalender Keuangan", icon: "calendar" },
  { id: "obligations", label: "Kewajiban Saya", icon: "receipt" },
  { id: "budget", label: "Anggaran Harian", icon: "wallet" },
  { id: "reports", label: "Laporan Keuangan", icon: "chart" },
  { id: "settings", label: "Pengaturan", icon: "settings" },
];

function Icon({ name, size = 20 }: { name: string; size?: number }) {
  const paths: Record<string, React.ReactNode> = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="2" /><rect x="14" y="3" width="7" height="7" rx="2" /><rect x="3" y="14" width="7" height="7" rx="2" /><rect x="14" y="14" width="7" height="7" rx="2" /></>,
    spark: <><path d="M12 3v3M12 18v3M3 12h3M18 12h3" /><circle cx="12" cy="12" r="4" /><path d="m4.2 4.2 2.1 2.1m11.4 11.4 2.1 2.1m0-15.6-2.1 2.1M6.3 17.7l-2.1 2.1" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M16 3v4M8 3v4M3 10h18" /></>,
    receipt: <><path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" /><path d="M9 8h6M9 12h6" /></>,
    wallet: <><path d="M4 6h14a2 2 0 0 1 2 2v10H4a2 2 0 0 1-2-2V6.5A2.5 2.5 0 0 1 4.5 4H17" /><path d="M16 11h4v4h-4a2 2 0 0 1 0-4Z" /></>,
    chart: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" /></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></>,
    chevron: <path d="m9 18 6-6-6-6" />,
    plus: <path d="M12 5v14M5 12h14" />,
    check: <path d="m5 12 4 4L19 6" />,
    alert: <><path d="M12 3 2.7 20h18.6L12 3Z" /><path d="M12 9v5M12 17.5v.5" /></>,
    trash: <><path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14" /></>,
    edit: <><path d="m4 20 4.5-1 10-10-3.5-3.5-10 10L4 20Z" /><path d="m13.5 7 3.5 3.5" /></>,
    close: <path d="M6 6l12 12M18 6 6 18" />,
    arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
    menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  };
  return <svg className="icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function Button({ children, variant = "primary", icon, onClick, type = "button", disabled = false }: { children: React.ReactNode; variant?: "primary" | "secondary" | "ghost" | "danger"; icon?: string; onClick?: () => void; type?: "button" | "submit"; disabled?: boolean }) {
  return <button className={`button ${variant}`} onClick={onClick} type={type} disabled={disabled}>{icon && <Icon name={icon} size={17} />}{children}</button>;
}

function Field({ label, value, onChange, type = "text", min, error, placeholder }: { label: string; value: string | number; onChange: (value: string) => void; type?: string; min?: number; error?: string; placeholder?: string }) {
  return <label className="field"><span>{label}</span><input value={value} type={type} min={min} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />{error && <small>{error}</small>}</label>;
}

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return <label className="field"><span>{label}</span><select value={value} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option key={option}>{option}</option>)}</select></label>;
}

function Badge({ children, tone = "blue" }: { children: React.ReactNode; tone?: "blue" | "green" | "yellow" | "red" | "gray" }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`card ${className}`}>{children}</section>;
}

function PageHeading({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description: string; action?: React.ReactNode }) {
  return <div className="page-heading"><div>{eyebrow && <div className="eyebrow">{eyebrow}</div>}<h1>{title}</h1><p>{description}</p></div>{action}</div>;
}

function MetricCard({ label, value, icon, tone = "blue", helper }: { label: string; value: string; icon: string; tone?: string; helper: string }) {
  return <Card className="metric-card"><div className={`metric-icon ${tone}`}><Icon name={icon} /></div><div className="metric-copy"><span>{label}</span><strong>{value}</strong><small>{helper}</small></div></Card>;
}

function CashFlowChart({ points }: { points: DailyPoint[] }) {
  const values = points.map((point) => point.balance);
  const hi = Math.max(...values, 1);
  const lo = Math.min(...values, 0);
  const range = hi - lo || 1;
  const x = (index: number) => (points.length > 1 ? 8 + (index / (points.length - 1)) * 91.8 : 54);
  const y = (value: number) => 82 - ((value - lo) / range) * 62;
  const line = points.map((point, index) => `${x(index)},${y(point.balance)}`).join(" ");
  const labelIndexes = [...new Set(Array.from({ length: Math.min(7, points.length) }, (_, i) => Math.round((i * (points.length - 1)) / Math.max(1, Math.min(7, points.length) - 1))))];
  const label = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
  return <div className="chart-wrap">
    <div className="chart-legend"><span><i className="dot blue-dot" />Saldo proyeksi</span><span><i className="dot yellow-dot" />Hari ada pemasukan atau kewajiban</span></div>
    <svg className="line-chart" viewBox="0 0 100 90" preserveAspectRatio="none" aria-label="Grafik proyeksi saldo harian bulan berjalan">
      <defs><linearGradient id="area" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#1769E0" stopOpacity=".22" /><stop offset="1" stopColor="#1769E0" stopOpacity="0" /></linearGradient></defs>
      {[20, 40, 60, 80].map((gridY) => <line key={gridY} x1="0" x2="100" y1={gridY} y2={gridY} className="grid-line" />)}
      {lo < 0 && <line x1="0" x2="100" y1={y(0)} y2={y(0)} className="grid-line" strokeDasharray="2 2" />}
      {points.length > 1 && <polygon points={`${x(0)},82 ${line} ${x(points.length - 1)},82`} fill="url(#area)" />}
      {points.length > 1 && <polyline points={line} className="balance-line" />}
      {points.map((point, index) => (point.hasEvent || points.length === 1) && <circle key={point.date} cx={x(index)} cy={y(point.balance)} r="1.5" className="chart-point" />)}
    </svg>
    <div className="chart-labels">{labelIndexes.map((index) => <span key={points[index].date}>{label(points[index].date)}</span>)}</div>
  </div>;
}

function PaymentModal({ obligation, onClose, onPaid, currentBalance }: { obligation: Obligation; onClose: () => void; onPaid: () => void; currentBalance: number }) {
  const after = currentBalance - obligation.amount;
  return <div className="modal-backdrop" role="presentation" onMouseDown={onClose}><div className="modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
    <div className="modal-head"><div><Badge tone="blue">Navigasi pembayaran</Badge><h2>Bayar {obligation.name}</h2></div><Button variant="ghost" icon="close" onClick={onClose}>Tutup</Button></div>
    <div className="payment-summary"><div><span>Jumlah pembayaran</span><strong>{formatRupiah(obligation.amount)}</strong></div><div><span>Jatuh tempo</span><strong>{obligation.dueDay} November 2026</strong></div><div><span>Penyedia</span><strong>{obligation.provider}</strong></div><div><span>Saldo setelah pembayaran</span><strong>{formatRupiah(after)}</strong></div></div>
    {after < 800_000 && <div className="alert danger"><Icon name="alert" /><div><strong>Periksa arus kas Anda</strong><p>Pembayaran ini dapat menyebabkan saldo tidak mencukupi untuk kewajiban berikutnya.</p></div></div>}
    <div className="manual-note"><strong>Pembayaran manual</strong><p>Belum ada tautan pembayaran terverifikasi untuk penyedia ini. Buka aplikasi atau situs resmi {obligation.provider}, lalu selesaikan pembayaran. CICI tidak meminta PIN, kata sandi, atau OTP.</p></div>
    <div className="modal-actions"><Button variant="secondary" onClick={onClose}>Kembali</Button><Button icon="check" onClick={onPaid}>Saya sudah membayar</Button></div>
    <p className="fine-print">Konfirmasi ini dicatat manual dan belum diverifikasi oleh penyedia pembayaran.</p>
  </div></div>;
}

const shortDate = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
const signedRupiah = (value: number) => `${value < 0 ? "-" : ""}${formatRupiah(value)}`;
const formatLongDate = (date: string) => new Date(`${date.slice(0, 10)}T12:00:00`).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });

function BalanceCard({ profile, onSave }: { profile: Profile | null; onSave: (balance: number) => Promise<string | null> }) {
  const filled = !!profile?.balance_updated_at;
  const ageDays = filled && profile?.balance_updated_at ? (Date.now() - new Date(profile.balance_updated_at).getTime()) / 86_400_000 : 0;
  const stale = filled && ageDays > STALE_BALANCE_DAYS;
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const startEdit = () => { setValue(filled && (profile?.balance ?? 0) >= 0 ? String(profile?.balance ?? 0) : ""); setError(""); setSuccess(""); setEditing(true); };
  const submit = async () => {
    const amount = Number(value);
    if (value.trim() === "" || Number.isNaN(amount)) { setError("Saldo wajib diisi dengan angka"); return; }
    if (amount < 0) { setError("Saldo tidak boleh minus"); return; }
    setSaving(true);
    const message = await onSave(amount);
    setSaving(false);
    if (message) setError(message);
    else { setEditing(false); setError(""); setSuccess("Saldo berhasil disimpan."); }
  };
  return <Card className="metric-card balance-card"><div className="metric-icon blue"><Icon name="wallet" /></div><div className="metric-copy"><span>Saldo tersedia</span><strong>{filled ? signedRupiah(profile?.balance ?? 0) : "Belum diisi"}</strong><small>{filled && profile?.balance_updated_at ? `Diperbarui ${formatLongDate(profile.balance_updated_at)}` : "Belum diisi"}</small>
    {editing ? <div style={{ marginTop: 8 }}><Field label="Saldo (Rp)" value={value} onChange={(next) => { setValue(next); setError(""); }} type="number" min={0} error={error || undefined} /><div style={{ display: "flex", gap: 8, marginTop: 8 }}><Button onClick={submit} disabled={saving}>{saving ? "Menyimpan..." : "Simpan"}</Button><Button variant="secondary" onClick={() => setEditing(false)} disabled={saving}>Batal</Button></div></div>
      : <div style={{ marginTop: 8 }}>{stale && <small role="status" style={{ display: "block", marginBottom: 6, color: "#775918" }}>Saldo terakhir diperbarui {Math.floor(ageDays)} hari lalu. Cocokkan dengan saldo rekeningmu.</small>}<Button variant="secondary" onClick={startEdit}>{filled ? "Ubah saldo" : "Isi saldo"}</Button>{success && <small role="status" style={{ display: "block", marginTop: 6 }}>{success}</small>}{error && <small role="alert" style={{ display: "block", marginTop: 6, color: "var(--red)" }}>{error}</small>}</div>}
  </div></Card>;
}

function Dashboard({ displayName, profile, onSaveBalance, onRefreshProfile, onNavigate }: { displayName: string; profile: Profile | null; onSaveBalance: (balance: number) => Promise<string | null>; onRefreshProfile: () => Promise<void>; onNavigate: (page: Page) => void }) {
  // Data asli dari Supabase untuk kartu Pemasukan, Total pengeluaran, dan Kewajiban cicilan.
  const { summary, loading: summaryLoading, error: summaryError, reload: reloadSummary } = useDashboardSummary();
  const hasRealData = !!summary && (summary.incomeCount > 0 || summary.unpaidCount > 0 || summary.paidCount > 0);
  const realValue = (pick: (data: NonNullable<typeof summary>) => string) => (summaryLoading ? "Memuat..." : summary ? pick(summary) : "—");
  // Data asli untuk proyeksi: saldo dari profil + incomes/obligations lewat fungsi murni di src/lib/cashflow.ts.
  const { data: cashData, loading: cashLoading, error: cashError, reload: reloadCash } = useCashflowData();
  const hasBalance = !!profile?.balance_updated_at;
  const cash = hasBalance && cashData ? computeCashflow({ balance: profile?.balance ?? 0, today: toDateString(new Date()), incomes: cashData.incomes, obligations: cashData.obligations }) : null;
  const cashValue = (pick: (data: NonNullable<typeof cash>) => string) => (!hasBalance ? "—" : cashLoading ? "Memuat..." : cash ? pick(cash) : "—");
  const [showCalc, setShowCalc] = useState(false);
  // Pembayaran mendatang dan Radar risiko: kewajiban belum dibayar milik user.
  const { items: upcoming, loading: upcomingLoading, error: upcomingError, reload: reloadUpcoming } = useUpcomingObligations();
  const todayString = toDateString(new Date());
  const radar = upcomingError ? null : computeRadar({ today: todayString, obligations: upcoming, balance: hasBalance ? profile?.balance ?? 0 : null });
  const [payingId, setPayingId] = useState<UpcomingObligation["id"] | null>(null);
  const [payNotice, setPayNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const handlePay = async (item: UpcomingObligation) => {
    setPayingId(item.id);
    setPayNotice(null);
    const result = await payObligation(item); // fungsi yang sama dengan halaman Kewajiban Saya
    if (result.status === "failed") setPayNotice({ tone: "error", text: result.message });
    else {
      setPayNotice(result.status === "paid" ? { tone: "success", text: result.notice } : { tone: "error", text: result.message });
      await Promise.all([reloadUpcoming(), reloadCash(), reloadSummary(), onRefreshProfile()]);
    }
    setPayingId(null);
  };
  const monthLabel = new Date().toLocaleDateString("id-ID", { month: "long", year: "numeric" });
  const riskTone = cash?.risk === "Berisiko" ? "red" : cash?.risk === "Waspada" ? "yellow" : "green";
  const needleAngle = cash?.risk === "Berisiko" ? -30 : cash?.risk === "Waspada" ? -90 : -150;
  return <>
    <PageHeading eyebrow={`Ringkasan ${monthLabel}`} title={`Selamat pagi, ${displayName.split(" ")[0]}`} description="Berikut kondisi keuangan dan kewajiban yang perlu kamu perhatikan hari ini." action={<Button icon="spark" onClick={() => onNavigate("simulation")}>Simulasikan Cicilan Baru</Button>} />
    {(summaryError || cashError || upcomingError) && <div className="alert danger compact" role="alert"><div><strong>Sebagian data belum bisa dimuat</strong><p>{summaryError || cashError || upcomingError}</p><Button variant="secondary" onClick={() => { reloadSummary(); reloadCash(); reloadUpcoming(); }}>Coba lagi</Button></div></div>}
    {!hasBalance && <div className="alert warning compact"><Icon name="alert" /><div><strong>Isi saldo untuk melihat proyeksi</strong><p>Proyeksi akhir bulan, status risiko, grafik, dan uang aman hari ini dihitung dari saldomu.</p></div></div>}
    {!summaryLoading && !summaryError && !hasRealData && <div className="alert warning compact"><Icon name="alert" /><div><strong>Belum ada data bulan ini</strong><p>Tambahkan kewajiban di menu Kewajiban Saya dan pemasukan di Pengaturan agar ringkasan terisi.</p></div></div>}
    <div className="metrics-grid">
      <BalanceCard profile={profile} onSave={onSaveBalance} />
      {/* DATA ASLI: incomes bulan berjalan. */}
      <MetricCard label="Pemasukan bulan ini" value={realValue((d) => formatRupiah(d.incomeTotal))} icon="chart" tone="green" helper={summary ? `${summary.incomeCount} pemasukan bulan ini` : "Dari data pemasukanmu"} />
      {/* DATA ASLI: obligations is_paid=true, due_date bulan berjalan. */}
      <MetricCard label="Total pengeluaran" value={realValue((d) => formatRupiah(d.paidTotal))} icon="receipt" tone="yellow" helper={summary ? `${summary.paidCount} kewajiban sudah dibayar` : "Kewajiban yang sudah dibayar"} />
      {/* DATA ASLI: obligations is_paid=false, due_date bulan berjalan. */}
      <MetricCard label="Kewajiban cicilan" value={realValue((d) => formatRupiah(d.unpaidTotal))} icon="calendar" tone="purple" helper={summary ? `${summary.unpaidCount} pembayaran mendatang` : "Kewajiban belum dibayar"} />
      {/* DATA ASLI: saldo + pemasukan sisa - kewajiban sisa (src/lib/cashflow.ts). */}
      <MetricCard label="Proyeksi akhir bulan" value={cashValue((c) => signedRupiah(c.projectedEnd))} icon="spark" tone="blue" helper={cash ? `Sampai ${formatLongDate(cash.endOfMonth)}` : "Sampai akhir bulan"} />
      {/* DATA ASLI: status dari saldo harian terendah. */}
      <Card className="metric-card risk-card"><div className="risk-gauge"><span style={{ transform: `rotate(${needleAngle}deg)` }} /></div><div className="metric-copy"><span>Status risiko</span><strong>{cashValue((c) => c.risk)}</strong><small>{cash ? `Saldo terendah ${signedRupiah(cash.lowest.balance)} pada ${formatLongDate(cash.lowest.date)}` : "Berdasarkan saldo harian terendah"}</small></div></Card>
    </div>
    <div className="dashboard-grid">
      <Card className="chart-card"><div className="card-title"><div><h2>Proyeksi arus kas</h2><p>Saldo harian dari hari ini sampai akhir bulan</p></div><Badge tone="blue">{monthLabel}</Badge></div>{!hasBalance ? <div className="empty-state"><Icon name="chart" /><p>Isi saldo untuk melihat proyeksi.</p></div> : cashLoading ? <div className="empty-state" role="status"><p>Memuat proyeksi...</p></div> : cash ? <CashFlowChart points={cash.daily} /> : <div className="empty-state"><p>Proyeksi belum bisa ditampilkan.</p></div>}</Card>
      <Card className="safe-card"><div className="mascot" aria-label="Maskot CICI"><div className="mascot-ear left" /><div className="mascot-ear right" /><div className="mascot-face"><i /><i /><span /></div><div className="mascot-body">C</div></div><Badge tone={cash ? riskTone : "gray"}>{cash ? cash.risk : "Belum ada saldo"}</Badge><h2>Uang aman hari ini</h2><strong className="safe-value">{cashValue((c) => formatRupiah(c.safe.amount))}</strong>
        {cash ? <p>Setelah menyisihkan {formatRupiah(cash.safe.needs)} untuk kebutuhan hingga pemasukan berikutnya.{cash.safe.insufficient && " Saldo belum cukup untuk kewajiban sebelum pemasukan berikutnya."}</p> : <p>Isi saldo untuk melihat proyeksi.</p>}
        {cash && <Button variant="secondary" onClick={() => setShowCalc(!showCalc)}>{showCalc ? "Sembunyikan perhitungan" : "Lihat perhitungan"} <Icon name="arrow" /></Button>}
        {cash && showCalc && <div className="calculation" style={{ marginTop: 12 }}><div><span>Saldo tersedia</span><strong>{signedRupiah(profile?.balance ?? 0)}</strong></div><div className="minus"><span>Kewajiban belum dibayar sebelum {cash.safe.hasNextIncome ? `pemasukan ${formatLongDate(cash.safe.boundaryDate)}` : `${formatLongDate(cash.safe.boundaryDate)} (akhir bulan + 1 hari)`}</span><strong>-{formatRupiah(cash.safe.needs)}</strong></div><div className="equals"><span>Dibagi {cash.safe.days} hari</span><strong>{formatRupiah(cash.safe.amount)}/hari</strong></div></div>}
      </Card>
    </div>
    {payNotice && <div className={`alert ${payNotice.tone === "success" ? "success" : "danger"} compact`} role={payNotice.tone === "success" ? "status" : "alert"}><div><p>{payNotice.text}</p></div></div>}
    <div className="lower-grid">
      <Card><div className="card-title"><div><h2>Pembayaran mendatang</h2><p>Kewajiban terdekat yang belum dibayar</p></div><Button variant="ghost" onClick={() => onNavigate("obligations")}>Lihat semua</Button></div>
        {upcomingLoading ? <div className="empty-state" role="status"><p>Memuat pembayaran mendatang...</p></div>
          : upcomingError ? <div className="empty-state"><p>Pembayaran mendatang belum bisa dimuat.</p></div>
          : upcoming.length === 0 ? <div className="empty-state"><Icon name="check" /><strong>Tidak ada kewajiban yang belum dibayar</strong><p>Semua beres, atau kamu belum menambahkannya di Kewajiban Saya.</p></div>
          : <div className="payment-list">{upcoming.slice(0, 4).map((item) => {
            const badge = dueBadge(item.dueDate, todayString);
            const due = new Date(`${item.dueDate}T12:00:00`);
            return <div className="payment-row" key={item.id}><div className="date-block"><strong>{due.getDate()}</strong><span>{due.toLocaleDateString("id-ID", { month: "short" })}</span></div><div className="payment-info"><strong>{item.name}</strong><span>{formatRupiah(item.amount)} · {formatLongDate(item.dueDate)}</span></div><Badge tone={badge.tone}>{badge.label}</Badge><div className="row-actions"><Button variant="secondary" disabled={payingId === item.id} onClick={() => handlePay(item)}>{payingId === item.id ? "Memproses..." : "Tandai dibayar"}</Button></div></div>;
          })}</div>}
      </Card>
      <Card className="risk-panel"><div className="card-title"><div><h2>Radar risiko</h2><p>Kewajiban {RADAR_WINDOW_DAYS} hari ke depan</p></div><div className={`pulse-dot ${radar?.warn ? "" : "green"}`} /></div>
        {upcomingLoading ? <div className="empty-state" role="status"><p>Memuat radar risiko...</p></div>
          : upcomingError || !radar ? <div className="empty-state"><p>Radar risiko belum bisa dimuat.</p></div>
          : <>
            {radar.warn
              ? <div className="alert warning"><Icon name="alert" /><div><strong>{formatRupiah(radar.total)} jatuh tempo dalam {RADAR_WINDOW_DAYS} hari</strong><p>{radar.count} kewajiban{radar.rangeStart && radar.rangeEnd ? `, ${shortDate(radar.rangeStart)}${radar.rangeStart !== radar.rangeEnd ? ` – ${shortDate(radar.rangeEnd)}` : ""}` : ""}. {radar.reasons.join("; ")}.</p></div></div>
              : <div className="alert success"><Icon name="check" /><div><strong>Tidak ada penumpukan kewajiban dalam {RADAR_WINDOW_DAYS} hari ke depan</strong>{radar.count > 0 && <p>{formatRupiah(radar.total)} untuk {radar.count} kewajiban{radar.rangeStart && radar.rangeEnd ? `, ${shortDate(radar.rangeStart)}${radar.rangeStart !== radar.rangeEnd ? ` – ${shortDate(radar.rangeEnd)}` : ""}` : ""}.</p>}</div></div>}
            {!hasBalance && <p style={{ marginTop: 10 }}>Isi saldo untuk analisis lebih akurat.</p>}
            {radar.timeline.length > 0 && <div className="collision-line">{radar.timeline.map((item) => <div key={item.id} className="collision-item"><i /><span>{shortDate(item.dueDate)}</span><strong>{formatRupiah(item.amount)}</strong></div>)}</div>}
          </>}
        <Button variant="secondary" onClick={() => onNavigate("calendar")}>Lihat di kalender <Icon name="arrow" /></Button></Card>
    </div>
  </>;
}

function Simulation({ obligations, paid, currentBalance }: { obligations: Obligation[]; paid: Set<number>; currentBalance: number }) {
  const [name, setName] = useState("Ponsel baru");
  const [price, setPrice] = useState("6000000");
  const [downPayment, setDownPayment] = useState("1000000");
  const [monthly, setMonthly] = useState("850000");
  const [tenor, setTenor] = useState("6");
  const [dueDate, setDueDate] = useState("2026-11-18");
  const [fees, setFees] = useState("50000");
  const [simulated, setSimulated] = useState(true);
  const installment = Number(monthly) + Number(fees);
  const day = new Date(`${dueDate}T12:00:00`).getDate() || 18;
  const existing = obligations.filter((item) => !paid.has(item.id)).reduce((sum, item) => sum + item.amount, 0);
  const endingA = currentBalance + INCOME - existing - fixedExpenses.reduce((sum, item) => sum + item.amount, 0);
  const endingB = endingA - Number(downPayment) - installment;
  const risk = endingB < 0 ? "Tinggi" : endingB < 800_000 ? "Sedang" : "Rendah";
  const shortfall = Math.max(0, -endingB);
  const formValid = name.trim() && Number(price) > 0 && installment > 0 && Number(tenor) > 0;
  return <>
    <PageHeading eyebrow="Fitur utama CICI" title="Simulasi Cicilan" description="Uji dampak cicilan baru terhadap arus kas sebelum kamu membuat komitmen." />
    <div className="simulation-layout">
      <Card className="sim-form"><div className="card-title"><div><h2>Rencana cicilan baru</h2><p>Lengkapi detail untuk mendapatkan proyeksi</p></div><span className="step-pill">1</span></div>
        <div className="form-grid"><Field label="Nama cicilan atau barang" value={name} onChange={setName} error={!name.trim() ? "Nama wajib diisi" : undefined} /><Field label="Harga pembelian" value={price} onChange={setPrice} type="number" min={0} /><Field label="Uang muka" value={downPayment} onChange={setDownPayment} type="number" min={0} /><Field label="Cicilan per bulan" value={monthly} onChange={setMonthly} type="number" min={0} /><Field label="Tenor (bulan)" value={tenor} onChange={setTenor} type="number" min={1} /><Field label="Jatuh tempo pertama" value={dueDate} onChange={setDueDate} type="date" /><Field label="Biaya tambahan per bulan" value={fees} onChange={setFees} type="number" min={0} /></div>
        <div className="form-note"><Icon name="alert" /><p>Perhitungan menggunakan pemasukan normal {formatRupiah(INCOME)}. Skenario konservatif memakai {formatRupiah(LOWER_INCOME)}.</p></div><Button icon="spark" disabled={!formValid} onClick={() => setSimulated(true)}>Hitung dampak cicilan</Button>
      </Card>
      <Card className="sim-insight"><Badge tone={risk === "Tinggi" ? "red" : risk === "Sedang" ? "yellow" : "green"}>Risiko {risk}</Badge><h2>{risk === "Tinggi" ? "Rencana ini belum aman untuk arus kasmu" : "Periksa ruang aman arus kasmu"}</h2><p>CICI membandingkan seluruh pemasukan, kebutuhan, dan kewajiban pada tanggal jatuh tempo.</p><div className="score-ring"><div><strong>{risk === "Tinggi" ? "38" : risk === "Sedang" ? "62" : "84"}</strong><span>/100</span></div></div><small>Skor kemampuan finansial</small></Card>
    </div>
    {simulated && <><div className="scenario-grid">
      <Card><div className="scenario-head"><div><span>Skenario A</span><h2>Kondisi saat ini</h2></div><Badge tone="green">Tanpa cicilan baru</Badge></div><div className="scenario-values"><div><span>Saldo tersedia</span><strong>{formatRupiah(currentBalance)}</strong></div><div><span>Kewajiban bulanan</span><strong>{formatRupiah(existing)}</strong></div><div><span>Proyeksi akhir bulan</span><strong>{formatRupiah(endingA)}</strong></div></div></Card>
      <Card className={risk === "Tinggi" ? "danger-border" : ""}><div className="scenario-head"><div><span>Skenario B</span><h2>Dengan {name}</h2></div><Badge tone={risk === "Tinggi" ? "red" : "yellow"}>Risiko {risk}</Badge></div><div className="scenario-values"><div><span>Kewajiban baru</span><strong>+{formatRupiah(installment)}</strong></div><div><span>Total komitmen</span><strong>{formatRupiah(existing + installment)}</strong></div><div><span>Proyeksi akhir bulan</span><strong className={endingB < 0 ? "negative" : ""}>{endingB < 0 ? "-" : ""}{formatRupiah(endingB)}</strong></div></div></Card>
    </div>
    <Card className="comparison-card"><div className="card-title"><div><h2>Perbandingan proyeksi saldo</h2><p>Dampak cicilan terhadap saldo sepanjang November</p></div><div className="chart-legend"><span><i className="dot blue-dot" />Saat ini</span><span><i className="dot red-dot" />Setelah cicilan</span></div></div><div className="comparison-bars"><div><span>Kondisi saat ini</span><i><b style={{ width: `${Math.max(4, Math.min(100, endingA / 20_000))}%` }} /></i><strong>{formatRupiah(endingA)}</strong></div><div><span>Setelah cicilan</span><i><b className="red-bar" style={{ width: `${Math.max(4, Math.min(100, Math.abs(endingB) / 20_000))}%` }} /></i><strong className={endingB < 0 ? "negative" : ""}>{endingB < 0 ? "-" : ""}{formatRupiah(endingB)}</strong></div></div></Card>
    <div className={`result-banner ${risk === "Tinggi" ? "danger" : "warning"}`}><Icon name="alert" size={26} /><div><strong>{risk === "Tinggi" ? "Berisiko:" : "Perlu dipertimbangkan:"}</strong><p>{endingB < 0 ? `Jika cicilan ini diambil, saldo diproyeksikan tidak mencukupi setelah jatuh tempo ${day} November 2026, dengan estimasi kekurangan ${formatRupiah(shortfall)}.` : `Saldo akhir diperkirakan ${formatRupiah(endingB)}. Pastikan dana cadangan tetap cukup untuk kebutuhan penting.`}</p></div></div>
    <Card><div className="card-title"><div><h2>Rekomendasi bertanggung jawab</h2><p>Pilihan untuk menjaga kewajiban penting tetap terpenuhi</p></div></div><div className="recommendations"><div><span>01</span><div><strong>Tunda pembelian</strong><p>Kumpulkan uang muka lebih besar sebelum berkomitmen.</p></div></div><div><span>02</span><div><strong>Turunkan cicilan</strong><p>Targetkan cicilan di bawah {formatRupiah(Math.max(200_000, Math.floor((endingA - 500_000) / 100_000) * 100_000))} per bulan.</p></div></div><div><span>03</span><div><strong>Jaga kebutuhan esensial</strong><p>Hindari cicilan bila sewa, pendidikan, dan makan tidak dapat tertutup.</p></div></div></div></Card></>}
  </>;
}

function CalendarPage({ obligations, paid, currentBalance, onPay, onPaid }: { obligations: Obligation[]; paid: Set<number>; currentBalance: number; onPay: (item: Obligation) => void; onPaid: (id: number) => void }) {
  const [selectedDay, setSelectedDay] = useState(10);
  const monthStart = new Date(DEMO_YEAR, DEMO_MONTH, 1).getDay();
  const days = Array.from({ length: 35 }, (_, index) => index - monthStart + 1);
  const dayObligations = obligations.filter((item) => item.dueDay === selectedDay);
  const dayExpenses = fixedExpenses.filter((item) => item.day === selectedDay);
  const projectedAtDay = currentBalance + (selectedDay >= 25 ? INCOME : 0) - obligations.filter((item) => !paid.has(item.id) && item.dueDay <= selectedDay).reduce((sum, item) => sum + item.amount, 0) - fixedExpenses.filter((item) => item.day <= selectedDay).reduce((sum, item) => sum + item.amount, 0);
  return <>
    <PageHeading eyebrow="November 2026" title="Kalender Keuangan" description="Lihat jadwal transaksi dan saldo proyeksi pada setiap tanggal." action={<div className="month-control"><Button variant="ghost">‹</Button><strong>November 2026</strong><Button variant="ghost">›</Button></div>} />
    <div className="calendar-layout">
      <Card className="calendar-card"><div className="calendar-legend"><span><i className="dot green-dot" />Dana cukup</span><span><i className="dot yellow-dot" />Dana mengetat</span><span><i className="dot red-dot" />Benturan</span></div><div className="week-row">{["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"].map((day) => <span key={day}>{day}</span>)}</div><div className="calendar-grid">{days.map((day, index) => {
        if (day < 1 || day > 30) return <div className="calendar-day muted" key={index} />;
        const obs = obligations.filter((item) => item.dueDay === day);
        const exp = fixedExpenses.filter((item) => item.day === day);
        const hasIncome = day === 25;
        const tone = day === 18 ? "risk" : obs.length || exp.length ? "event" : "";
        return <button key={day} className={`calendar-day ${selectedDay === day ? "selected" : ""} ${tone}`} onClick={() => setSelectedDay(day)}><span>{day}</span><div>{obs.slice(0, 2).map((item) => <i key={item.id} className={paid.has(item.id) ? "paid-event" : ""}>{item.name}</i>)}{exp.map((item) => <i key={item.label}>{item.label}</i>)}{hasIncome && <i className="income-event">Pemasukan</i>}</div></button>;
      })}</div></Card>
      <Card className="day-panel"><div className="day-panel-head"><div className="big-date">{selectedDay}</div><div><span>November 2026</span><h2>{new Date(DEMO_YEAR, DEMO_MONTH, selectedDay).toLocaleDateString("id-ID", { weekday: "long" })}</h2></div></div><div className={`balance-panel ${projectedAtDay < 0 ? "negative-panel" : ""}`}><span>Proyeksi saldo akhir hari</span><strong>{projectedAtDay < 0 ? "-" : ""}{formatRupiah(projectedAtDay)}</strong><small>Berdasarkan transaksi tercatat</small></div><h3>Transaksi terjadwal</h3><div className="day-transactions">
        {!dayObligations.length && !dayExpenses.length && selectedDay !== 25 && <div className="empty-state"><Icon name="calendar" /><p>Tidak ada transaksi pada tanggal ini.</p></div>}
        {dayObligations.map((item) => <div className="day-transaction" key={item.id}><div className="transaction-icon expense"><Icon name="receipt" /></div><div><strong>{item.name}</strong><span>{item.provider}</span></div><strong>-{formatRupiah(item.amount)}</strong>{paid.has(item.id) ? <Badge tone="green">Dibayar</Badge> : <div className="transaction-actions"><Button variant="ghost" onClick={() => onPaid(item.id)}>Tandai dibayar</Button><Button variant="secondary" onClick={() => onPay(item)}>Pay Now</Button></div>}</div>)}
        {dayExpenses.map((item) => <div className="day-transaction" key={item.label}><div className="transaction-icon expense"><Icon name="wallet" /></div><div><strong>{item.label}</strong><span>Pengeluaran rutin</span></div><strong>-{formatRupiah(item.amount)}</strong></div>)}
        {selectedDay === 25 && <div className="day-transaction"><div className="transaction-icon income"><Icon name="chart" /></div><div><strong>Pemasukan bulanan</strong><span>Estimasi pemasukan</span></div><strong className="positive">+{formatRupiah(INCOME)}</strong></div>}
      </div>{projectedAtDay < 500_000 && <div className="alert danger compact"><Icon name="alert" /><div><strong>Dana berisiko tidak cukup</strong><p>Kurangi pengeluaran atau tambah dana sebelum tanggal ini.</p></div></div>}</Card>
    </div>
  </>;
}

function ObligationsPage({ obligations, paid, onAdd, onDelete, onPay, onPaid }: { obligations: Obligation[]; paid: Set<number>; onAdd: (item: Obligation) => void; onDelete: (id: number) => void; onPay: (item: Obligation) => void; onPaid: (id: number) => void }) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [day, setDay] = useState("20");
  const [provider, setProvider] = useState("");
  const submit = () => {
    if (!name.trim() || Number(amount) <= 0) return;
    onAdd({ id: Date.now(), name, amount: Number(amount), outstanding: Number(amount), dueDay: Math.min(30, Math.max(1, Number(day))), provider: provider || "Pembayaran manual", frequency: "Bulanan", remaining: 1, category: "Lainnya" });
    setName(""); setAmount(""); setProvider(""); setShowForm(false);
  };
  return <>
    <PageHeading eyebrow="Komitmen aktif" title="Kewajiban Saya" description="Kelola tagihan dan cicilan; setiap perubahan langsung memperbarui proyeksi." action={<Button icon="plus" onClick={() => setShowForm(!showForm)}>Tambah kewajiban</Button>} />
    {showForm && <Card className="add-form"><div className="card-title"><div><h2>Kewajiban baru</h2><p>Masukkan detail pembayaran rutin</p></div><Button variant="ghost" icon="close" onClick={() => setShowForm(false)}>Tutup</Button></div><div className="form-grid four"><Field label="Nama kewajiban" value={name} onChange={setName} error={!name ? "Nama wajib diisi" : undefined} /><Field label="Jumlah pembayaran" value={amount} onChange={setAmount} type="number" min={1} /><Field label="Tanggal jatuh tempo" value={day} onChange={setDay} type="number" min={1} /><Field label="Penyedia" value={provider} onChange={setProvider} placeholder="Opsional" /></div><Button onClick={submit} disabled={!name || Number(amount) <= 0}>Simpan kewajiban</Button></Card>}
    <div className="obligation-summary"><MetricCard label="Total pembayaran bulan ini" value={formatRupiah(obligations.filter((item) => !paid.has(item.id)).reduce((sum, item) => sum + item.amount, 0))} icon="receipt" helper="Belum dibayar" /><MetricCard label="Sudah dibayar" value={`${paid.size} kewajiban`} icon="check" tone="green" helper="Konfirmasi manual" /><MetricCard label="Sisa pokok cicilan" value={formatRupiah(obligations.reduce((sum, item) => sum + item.outstanding, 0))} icon="chart" tone="purple" helper="Tidak termasuk tagihan rutin" /></div>
    <Card className="table-card"><div className="table-header"><span>Kewajiban</span><span>Jatuh tempo</span><span>Pembayaran</span><span>Sisa</span><span>Status</span><span>Aksi</span></div>{obligations.map((item) => <div className="obligation-row" key={item.id}><div className="obligation-name"><div className="transaction-icon expense"><Icon name="receipt" /></div><div><strong>{item.name}</strong><span>{item.provider} · {item.frequency}</span></div></div><div><strong>{item.dueDay} Nov 2026</strong><span>{item.remaining ? `${item.remaining} kali tersisa` : "Berulang"}</span></div><strong>{formatRupiah(item.amount)}</strong><span>{item.outstanding ? formatRupiah(item.outstanding) : "—"}</span><div>{paid.has(item.id) ? <Badge tone="green">Dibayar</Badge> : <Badge tone="yellow">Mendatang</Badge>}</div><div className="table-actions">{!paid.has(item.id) && <><Button variant="secondary" onClick={() => onPay(item)}>Pay Now</Button><Button variant="ghost" onClick={() => onPaid(item.id)}><Icon name="check" /></Button></>}<Button variant="ghost"><Icon name="edit" /></Button><Button variant="ghost" onClick={() => onDelete(item.id)}><Icon name="trash" /></Button></div></div>)}</Card>
  </>;
}

function BudgetPage({ obligations, paid, currentBalance }: { obligations: Obligation[]; paid: Set<number>; currentBalance: number }) {
  const reserve = obligations.filter((item) => !paid.has(item.id) && item.dueDay < 25).reduce((sum, item) => sum + item.amount, 0) + fixedExpenses.filter((item) => item.day < 25).reduce((sum, item) => sum + item.amount, 0);
  const flexible = Math.max(0, currentBalance - reserve);
  const daily = Math.floor(flexible / 21 / 1000) * 1000;
  const categories = [{ name: "Makan", share: .5, color: "blue" }, { name: "Transportasi", share: .3, color: "yellow" }, { name: "Pribadi", share: .2, color: "purple" }];
  return <>
    <PageHeading eyebrow="Safe-to-Spend" title="Anggaran Harian" description="Belanja dengan tenang tanpa mengorbankan kewajiban yang akan datang." />
    <div className="budget-hero"><div><Badge tone="green">Rekomendasi hari ini</Badge><h1>{formatRupiah(daily)}</h1><p>Batas pengeluaran fleksibel yang disarankan untuk hari ini.</p></div><div className="budget-orbit"><span>{Math.round((reserve / currentBalance) * 100)}%</span><small>dana dicadangkan</small></div></div>
    <div className="budget-grid"><Card><div className="card-title"><div><h2>Bagaimana angka ini dihitung?</h2><p>Transparan berdasarkan data keuanganmu</p></div></div><div className="calculation"><div><span>Saldo tersedia</span><strong>{formatRupiah(currentBalance)}</strong></div><div className="minus"><span>Dana untuk kewajiban hingga 25 Nov</span><strong>-{formatRupiah(reserve)}</strong></div><div><span>Anggaran fleksibel tersisa</span><strong>{formatRupiah(flexible)}</strong></div><div className="equals"><span>Dibagi 21 hari hingga pemasukan</span><strong>{formatRupiah(daily)}/hari</strong></div></div></Card><Card><div className="card-title"><div><h2>Saran alokasi harian</h2><p>Sesuaikan dengan kebutuhanmu</p></div></div><div className="category-list">{categories.map((item) => <div key={item.name}><div><span>{item.name}</span><strong>{formatRupiah(daily * item.share)}</strong></div><i><b className={item.color} style={{ width: `${item.share * 100}%` }} /></i></div>)}</div><p className="disclaimer">Estimasi bergantung pada kelengkapan data yang kamu masukkan. Ini bukan jaminan kondisi keuangan aktual.</p></Card></div>
  </>;
}

function ReportsPage({ obligations, paid, currentBalance }: { obligations: Obligation[]; paid: Set<number>; currentBalance: number }) {
  const total = obligations.reduce((sum, item) => sum + item.amount, 0);
  const end = currentBalance + INCOME - obligations.filter((item) => !paid.has(item.id)).reduce((sum, item) => sum + item.amount, 0) - 1_100_000;
  return <>
    <PageHeading eyebrow="Insight finansial" title="Laporan Keuangan" description="Pahami pola arus kas dan periode risiko dalam satu tampilan." action={<SelectField label="Periode" value="November 2026" options={["November 2026", "Oktober 2026", "September 2026"]} onChange={() => {}} />} />
    <div className="report-metrics"><MetricCard label="Pemasukan" value={formatRupiah(INCOME)} icon="chart" tone="green" helper="Estimasi normal" /><MetricCard label="Pengeluaran + kewajiban" value={formatRupiah(total + 1_100_000)} icon="receipt" tone="yellow" helper="Bulan berjalan" /><MetricCard label="Proyeksi saldo akhir" value={formatRupiah(end)} icon="wallet" helper="Setelah transaksi terjadwal" /><MetricCard label="Pembayaran selesai" value={`${paid.size}/${obligations.length}`} icon="check" tone="purple" helper="Konfirmasi manual" /></div>
    <div className="report-grid"><Card><div className="card-title"><div><h2>Pemasukan vs pengeluaran</h2><p>Enam bulan terakhir</p></div></div><div className="bar-chart">{["Jun", "Jul", "Agu", "Sep", "Okt", "Nov"].map((month, index) => <div key={month}><div className="bars"><i style={{ height: `${55 + index * 5}%` }} /><b style={{ height: `${42 + index * 7}%` }} /></div><span>{month}</span></div>)}</div><div className="chart-legend centered"><span><i className="dot blue-dot" />Pemasukan</span><span><i className="dot yellow-dot" />Pengeluaran</span></div></Card><Card><div className="card-title"><div><h2>Komposisi kewajiban</h2><p>Berdasarkan kategori</p></div></div><div className="donut-wrap"><div className="donut"><div><strong>{formatRupiah(total)}</strong><span>Total</span></div></div><div className="donut-legend"><div><i className="blue-dot" /><span>Tempat tinggal</span><strong>33%</strong></div><div><i className="yellow-dot" /><span>Pendidikan</span><strong>24%</strong></div><div><i className="purple-dot" /><span>Cicilan</span><strong>33%</strong></div><div><i className="green-dot" /><span>Tagihan</span><strong>10%</strong></div></div></div></Card></div>
    <Card className="insights-card"><div className="card-title"><div><h2>Insight CICI</h2><p>Hal penting dari data bulan ini</p></div></div><div className="insight-list"><div><span className="insight-icon warning"><Icon name="alert" /></span><div><strong>Waspadai minggu kedua</strong><p>Pengeluaran dan cicilan 8–18 November menyerap porsi terbesar dana tersedia.</p></div></div><div><span className="insight-icon good"><Icon name="check" /></span><div><strong>Arus kas kembali pulih setelah 25 November</strong><p>Pemasukan normal menaikkan saldo proyeksi, tetapi sisakan dana darurat.</p></div></div><div><span className="insight-icon info"><Icon name="spark" /></span><div><strong>Skenario konservatif</strong><p>Dengan pemasukan lebih rendah {formatRupiah(LOWER_INCOME)}, proyeksi akhir turun {formatRupiah(INCOME - LOWER_INCOME)}.</p></div></div></div></Card>
  </>;
}

function ProfileCard({ profile, onSave }: { profile: Profile | null; onSave: (fullName: string, occupation: string) => Promise<string | null> }) {
  const name = profile?.full_name ?? "";
  const occupation = profile?.occupation ?? "";
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState(name);
  const [job, setJob] = useState(occupation);
  const [nameError, setNameError] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const startEdit = () => { setFullName(name); setJob(occupation); setNameError(""); setMessage(null); setEditing(true); };
  const submit = async () => {
    if (!fullName.trim()) { setNameError("Nama lengkap wajib diisi"); return; }
    setSaving(true);
    const error = await onSave(fullName, job);
    setSaving(false);
    if (error) setMessage({ type: "error", text: error });
    else { setMessage({ type: "success", text: "Profil berhasil disimpan." }); setEditing(false); }
  };
  return <>
    <div className="profile-settings"><div className="avatar large">{initialsOf(name)}</div><div><strong>{name}</strong>{occupation && <span>{occupation}</span>}{!editing && <Button variant="ghost" onClick={startEdit}>Ubah profil</Button>}</div></div>
    {editing && <div className="form-grid"><Field label="Nama lengkap" value={fullName} onChange={(value) => { setFullName(value); setNameError(""); }} error={nameError || undefined} /><Field label="Pekerjaan atau status" value={job} onChange={setJob} placeholder="Opsional" /><div style={{ display: "flex", gap: 8 }}><Button onClick={submit} disabled={saving}>{saving ? "Menyimpan..." : "Simpan profil"}</Button><Button variant="secondary" onClick={() => setEditing(false)} disabled={saving}>Batal</Button></div></div>}
    {message && <div className={`alert ${message.type === "success" ? "warning" : "danger"} compact`} role={message.type === "error" ? "alert" : "status"}><div><p>{message.text}</p></div></div>}
  </>;
}

function SettingsPage({ onOnboarding, profile, onSaveProfile }: { onOnboarding: () => void; profile: Profile | null; onSaveProfile: (fullName: string, occupation: string) => Promise<string | null> }) {
  const [income, setIncome] = useState(String(INCOME));
  const [lower, setLower] = useState(String(LOWER_INCOME));
  const [saved, setSaved] = useState(false);
  return <>
    <PageHeading eyebrow="Preferensi akun" title="Pengaturan" description="Kelola profil, asumsi pemasukan, dan preferensi notifikasi." action={<Button variant="secondary" onClick={onOnboarding}>Ulangi onboarding</Button>} />
    <div className="settings-grid"><Card><div className="card-title"><div><h2>Profil finansial</h2><p>Informasi untuk personalisasi proyeksi</p></div></div><ProfileCard profile={profile} onSave={onSaveProfile} /><div className="form-grid"><Field label="Pemasukan normal" value={income} onChange={setIncome} type="number" /><Field label="Estimasi pemasukan terendah" value={lower} onChange={setLower} type="number" /></div><Button icon="check" onClick={() => setSaved(true)}>{saved ? "Tersimpan" : "Simpan perubahan"}</Button></Card><Card><div className="card-title"><div><h2>Notifikasi risiko</h2><p>Pilih pengingat yang ingin diterima</p></div></div><div className="toggle-list">{["Pengingat 3 hari sebelum jatuh tempo", "Peringatan saldo diproyeksikan rendah", "Ringkasan keuangan mingguan", "Insight anggaran harian"].map((label, index) => <label key={label} className="toggle-row"><span>{label}</span><input type="checkbox" defaultChecked={index < 3} /><i /></label>)}</div><div className="privacy-note"><Icon name="alert" /><p>CICI tidak terhubung ke rekening bank atau skor kredit. Semua proyeksi bergantung pada data yang kamu masukkan.</p></div></Card></div>
    <Incomes />
  </>;
}

function Onboarding({ onFinish }: { onFinish: () => void }) {
  const [step, setStep] = useState(1);
  const [nickname, setNickname] = useState("");
  return <div className="onboarding"><div className="onboarding-brand"><Logo /><div className="onboarding-visual"><div className="mascot big"><div className="mascot-ear left" /><div className="mascot-ear right" /><div className="mascot-face"><i /><i /><span /></div><div className="mascot-body">C</div></div><h2>Mulai kendalikan arus kasmu.</h2><p>Proyeksi lebih awal. Putuskan lebih tenang.</p></div><small>Data onboarding ini hanya disimpan sebagai demo lokal.</small></div><div className="onboarding-content"><div className="progress-row">{[1, 2, 3, 4, 5, 6].map((item) => <i key={item} className={item <= step ? "active" : ""} />)}</div><Badge tone="blue">Langkah {step} dari 6</Badge>{step === 1 && <><h1>Kenalan dulu, yuk</h1><p>Nama panggilan membantu CICI membuat pengalamanmu lebih personal.</p><Field label="Nama panggilan" value={nickname} onChange={setNickname} placeholder="Contoh: Naya" /><SelectField label="Profil keuangan" value="Mahasiswa" options={["Mahasiswa", "Fresh graduate", "Pekerja muda", "Freelancer"]} onChange={() => {}} /></>}{step === 2 && <><h1>Ceritakan pemasukanmu</h1><p>Kami memakai estimasi rendah untuk skenario konservatif.</p><Field label="Pemasukan normal per bulan" value={INCOME} onChange={() => {}} type="number" /><Field label="Estimasi pemasukan terendah" value={LOWER_INCOME} onChange={() => {}} type="number" /></>}{step === 3 && <><h1>Kebutuhan esensial</h1><p>Masukkan kebutuhan yang tidak bisa ditunda.</p><Field label="Makan & kebutuhan harian" value="1200000" onChange={() => {}} type="number" /><Field label="Transportasi" value="400000" onChange={() => {}} type="number" /></>}{step === 4 && <><h1>Dana tersedia saat ini</h1><p>Gunakan saldo yang benar-benar dapat dipakai, bukan limit kredit.</p><Field label="Tabungan atau dana tersedia" value={BASE_BALANCE} onChange={() => {}} type="number" /><div className="form-note"><Icon name="alert" /><p>CICI tidak mengakses rekening atau dompet digitalmu.</p></div></>}{step === 5 && <><h1>Kewajiban berjalan</h1><p>Kami sudah menambahkan contoh data. Kamu bisa mengubahnya nanti.</p><div className="mini-obligations">{initialObligations.slice(0, 3).map((item) => <div key={item.id}><Icon name="receipt" /><span>{item.name}</span><strong>{formatRupiah(item.amount)}</strong></div>)}</div></>}{step === 6 && <><h1>Ringkasanmu siap</h1><p>CICI akan memproyeksikan arus kas berdasarkan asumsi berikut.</p><div className="review-box"><div><span>Dana tersedia</span><strong>{formatRupiah(BASE_BALANCE)}</strong></div><div><span>Pemasukan normal</span><strong>{formatRupiah(INCOME)}</strong></div><div><span>Kewajiban tercatat</span><strong>{initialObligations.length}</strong></div></div><div className="alert warning"><Icon name="alert" /><div><strong>Ingat</strong><p>Hasil proyeksi adalah estimasi, bukan jaminan kondisi keuangan aktual.</p></div></div></>}<div className="onboarding-actions">{step > 1 && <Button variant="secondary" onClick={() => setStep(step - 1)}>Kembali</Button>}<Button onClick={() => step < 6 ? setStep(step + 1) : onFinish()} disabled={step === 1 && !nickname}>{step < 6 ? "Lanjutkan" : "Buka dashboard"} <Icon name="arrow" /></Button></div>{step < 5 && <Button variant="ghost" onClick={() => setStep(step + 1)}>Lewati langkah ini</Button>}</div></div>;
}

function Logo() {
  return <div className="logo"><div className="logo-mark"><span>C</span><i /></div><div><strong>CICI</strong><small>Cicilan Cerdas</small></div></div>;
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [page, setPage] = useState<Page>("dashboard");
  const [obligations, setObligations] = useState(initialObligations);
  const [paid, setPaid] = useState<Set<number>>(new Set());
  const [paymentItem, setPaymentItem] = useState<Obligation | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const { profile, loading: profileLoading, error: profileError, reload: reloadProfile, save: saveProfile, saveBalance, refresh: refreshProfile } = useProfile(session?.user.id);
  const displayName = profile?.full_name?.trim() ?? "";
  const paidTotal = [...paid].reduce((sum, id) => sum + (obligations.find((item) => item.id === id)?.amount || 0), 0);
  const currentBalance = BASE_BALANCE - paidTotal;
  const markPaid = (id: number) => setPaid((previous) => new Set(previous).add(id));
  const navigate = (target: Page) => { setPage(target); setSidebarOpen(false); window.scrollTo({ top: 0, behavior: "smooth" }); };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  // Saat Dashboard dibuka lagi, ambil profil terbaru (saldo bisa berubah dari Kewajiban Saya) tanpa layar loading.
  const previousPage = useRef(page);
  useEffect(() => {
    if (page === "dashboard" && previousPage.current !== "dashboard") refreshProfile();
    previousPage.current = page;
  }, [page, refreshProfile]);

  if (authLoading) return <div className="auth-loading">Memuat...</div>;
  if (!session) return <Auth />;
  if (profileLoading) return <div className="auth-loading">Memuat profil...</div>;
  if (profileError) return <div className="auth-loading" role="alert"><div style={{ textAlign: "center" }}><p>{profileError}</p><div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 12 }}><Button onClick={reloadProfile}>Coba lagi</Button><Button variant="secondary" onClick={() => supabase.auth.signOut()}>Keluar</Button></div></div></div>;
  if (!displayName) return <ProfileOnboarding initial={profile} onSave={saveProfile} />;

  return <div className="app-shell">
    <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}><div className="sidebar-top"><Logo /><Button variant="ghost" icon="close" onClick={() => setSidebarOpen(false)}>Tutup</Button></div><nav>{navItems.map((item) => <button key={item.id} className={page === item.id ? "active" : ""} onClick={() => navigate(item.id)}><Icon name={item.icon} /><span>{item.label}</span>{page === item.id && <i />}</button>)}</nav><div className="sidebar-help"><div className="mini-mascot">C</div><strong>Butuh panduan?</strong><p>Pelajari cara membaca proyeksi arus kas.</p><Button variant="secondary">Pusat bantuan</Button></div><p className="sidebar-caption">CICI membantu perencanaan, bukan menyediakan pinjaman.</p></aside>
    {sidebarOpen && <div className="sidebar-scrim" onClick={() => setSidebarOpen(false)} />}
    <div className="main-shell"><header><Button variant="ghost" icon="menu" onClick={() => setSidebarOpen(true)}>Menu</Button><div className="mobile-logo"><Logo /></div><div className="header-tagline">Kelola Cicilan. Jaga Cash Flow. Tetap Aman.</div><div className="header-actions"><button className="icon-button" aria-label="Notifikasi"><Icon name="bell" /><i /></button><div className="profile"><div className="avatar">{initialsOf(displayName)}</div><div><strong>{displayName}</strong>{profile?.occupation && <span>{profile.occupation}</span>}</div><Icon name="chevron" size={16} /></div><Button variant="ghost" onClick={() => supabase.auth.signOut()}>Keluar</Button></div></header>
      <main>
        {page === "dashboard" && <Dashboard displayName={displayName} profile={profile} onSaveBalance={saveBalance} onRefreshProfile={refreshProfile} onNavigate={navigate} />}
        {page === "simulation" && <Simulation obligations={obligations} paid={paid} currentBalance={currentBalance} />}
        {page === "calendar" && <CalendarPage obligations={obligations} paid={paid} currentBalance={currentBalance} onPay={setPaymentItem} onPaid={markPaid} />}
        {page === "obligations" && <ObligationsLive />}
        {page === "budget" && <BudgetPage obligations={obligations} paid={paid} currentBalance={currentBalance} />}
        {page === "reports" && <ReportsPage obligations={obligations} paid={paid} currentBalance={currentBalance} />}
        {page === "settings" && <SettingsPage onOnboarding={() => setShowOnboarding(true)} profile={profile} onSaveProfile={saveProfile} />}
      </main><footer><span>© 2026 CICI · Versi beta</span><button onClick={() => setShowOnboarding(true)}>Buka onboarding</button><span>Privasi · Ketentuan · Bantuan</span></footer>
    </div>
    <div className="mobile-nav">{navItems.slice(0, 5).map((item) => <button key={item.id} className={page === item.id ? "active" : ""} onClick={() => navigate(item.id)}><Icon name={item.icon} /><span>{item.label.split(" ")[0]}</span></button>)}</div>
    {paymentItem && <PaymentModal obligation={paymentItem} currentBalance={currentBalance} onClose={() => setPaymentItem(null)} onPaid={() => { markPaid(paymentItem.id); setPaymentItem(null); }} />}
    {showOnboarding && <ProfileOnboarding initial={profile} onSave={saveProfile} onClose={() => setShowOnboarding(false)} onSaved={() => { setShowOnboarding(false); navigate("dashboard"); }} />}
  </div>;
}
