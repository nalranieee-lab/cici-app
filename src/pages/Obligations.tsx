import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Obligation = {
  id: string | number;
  name: string;
  amount: number;
  due_date: string;
  is_paid: boolean;
  paid_at: string | null;
  note: string | null;
};

type FormState = { name: string; amount: string; due_date: string; note: string };
type FormErrors = Partial<Record<keyof FormState, string>>;

const COLUMNS = "id, name, amount, due_date, is_paid, paid_at, note";
const emptyForm: FormState = { name: "", amount: "", due_date: "", note: "" };

const rupiah = (value: number) => `Rp${Math.round(value).toLocaleString("id-ID")}`;
const formatDate = (value: string | null) =>
  value
    ? new Date(value.length === 10 ? `${value}T12:00:00` : value).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "-";

function validate(form: FormState): FormErrors {
  const errors: FormErrors = {};
  if (!form.name.trim()) errors.name = "Nama wajib diisi";
  if (form.amount.trim() === "" || Number.isNaN(Number(form.amount))) errors.amount = "Nominal wajib diisi";
  else if (Number(form.amount) < 0) errors.amount = "Nominal tidak boleh minus";
  if (!form.due_date) errors.due_date = "Tanggal jatuh tempo wajib diisi";
  return errors;
}

export default function Obligations() {
  const [items, setItems] = useState<Obligation[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<Obligation["id"] | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<Obligation["id"] | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      setLoadError("Sesi login tidak ditemukan. Silakan masuk kembali.");
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from("obligations")
      .select(COLUMNS)
      .eq("user_id", userData.user.id)
      .order("due_date", { ascending: true });
    if (error) setLoadError(`Gagal memuat kewajiban: ${error.message}`);
    else setItems((data ?? []) as Obligation[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const setField = (key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setErrors({});
    setActionError("");
    setShowForm(true);
  };

  const openEdit = (item: Obligation) => {
    setEditingId(item.id);
    setForm({ name: item.name, amount: String(item.amount), due_date: item.due_date, note: item.note ?? "" });
    setErrors({});
    setActionError("");
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
    setErrors({});
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length) return;
    setSaving(true);
    setActionError("");
    const payload = {
      name: form.name.trim(),
      amount: Number(form.amount),
      due_date: form.due_date,
      note: form.note.trim() || null,
    };
    if (editingId !== null) {
      const { error } = await supabase.from("obligations").update(payload).eq("id", editingId);
      if (error) setActionError(`Gagal menyimpan perubahan: ${error.message}`);
      else {
        closeForm();
        await load();
      }
    } else {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        setActionError("Sesi login tidak ditemukan. Silakan masuk kembali.");
      } else {
        const { error } = await supabase.from("obligations").insert({ ...payload, user_id: userData.user.id });
        if (error) setActionError(`Gagal menambah kewajiban: ${error.message}`);
        else {
          closeForm();
          await load();
        }
      }
    }
    setSaving(false);
  };

  const remove = async (item: Obligation) => {
    if (!window.confirm(`Hapus kewajiban "${item.name}"? Tindakan ini tidak dapat dibatalkan.`)) return;
    setBusyId(item.id);
    setActionError("");
    const { error } = await supabase.from("obligations").delete().eq("id", item.id);
    if (error) setActionError(`Gagal menghapus: ${error.message}`);
    else setItems((prev) => prev.filter((row) => row.id !== item.id));
    setBusyId(null);
  };

  const markPaid = async (item: Obligation) => {
    setBusyId(item.id);
    setActionError("");
    const paidAt = new Date().toISOString();
    const { error } = await supabase.from("obligations").update({ is_paid: true, paid_at: paidAt }).eq("id", item.id);
    if (error) setActionError(`Gagal menandai dibayar: ${error.message}`);
    else setItems((prev) => prev.map((row) => (row.id === item.id ? { ...row, is_paid: true, paid_at: paidAt } : row)));
    setBusyId(null);
  };

  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">Data tersimpan di akunmu</div>
          <h1>Kewajiban Saya</h1>
          <p>Catat tagihan dan cicilan, lalu tandai saat sudah dibayar.</p>
        </div>
        <button type="button" className="button primary" onClick={openAdd}>
          + Tambah kewajiban
        </button>
      </div>

      {showForm && (
        <section className="card add-form">
          <div className="card-title">
            <div>
              <h2>{editingId !== null ? "Ubah kewajiban" : "Kewajiban baru"}</h2>
              <p>Nama, nominal, dan tanggal jatuh tempo wajib diisi.</p>
            </div>
            <button type="button" className="button ghost" onClick={closeForm}>
              Tutup
            </button>
          </div>
          <form onSubmit={submit} noValidate>
            <div className="form-grid">
              <label className="field">
                <span>Nama kewajiban</span>
                <input value={form.name} onChange={(e) => setField("name", e.target.value)} />
                {errors.name && <small>{errors.name}</small>}
              </label>
              <label className="field">
                <span>Nominal (Rp)</span>
                <input type="number" min={0} value={form.amount} onChange={(e) => setField("amount", e.target.value)} />
                {errors.amount && <small>{errors.amount}</small>}
              </label>
              <label className="field">
                <span>Tanggal jatuh tempo</span>
                <input type="date" value={form.due_date} onChange={(e) => setField("due_date", e.target.value)} />
                {errors.due_date && <small>{errors.due_date}</small>}
              </label>
              <label className="field">
                <span>Catatan</span>
                <input placeholder="Opsional" value={form.note} onChange={(e) => setField("note", e.target.value)} />
              </label>
            </div>
            <button type="submit" className="button primary" disabled={saving}>
              {saving ? "Menyimpan..." : editingId !== null ? "Simpan perubahan" : "Simpan kewajiban"}
            </button>
          </form>
        </section>
      )}

      {actionError && (
        <div className="alert danger compact" role="alert">
          <div>
            <strong>Terjadi kendala</strong>
            <p>{actionError}</p>
          </div>
        </div>
      )}

      <section className="card" style={{ marginTop: 17 }}>
        {loading ? (
          <div className="empty-state" role="status">
            <p>Memuat kewajiban...</p>
          </div>
        ) : loadError ? (
          <div className="empty-state" role="alert">
            <p>{loadError}</p>
            <button type="button" className="button secondary" style={{ marginTop: 12 }} onClick={load}>
              Coba lagi
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="empty-state">
            <strong>Belum ada kewajiban</strong>
            <p>Mulai catat tagihan atau cicilan pertamamu dengan tombol "Tambah kewajiban".</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {items.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <strong className="block text-sm">{item.name}</strong>
                  <span className="block text-xs text-slate-500">
                    {rupiah(item.amount)} · Jatuh tempo {formatDate(item.due_date)}
                    {item.is_paid && ` · Dibayar ${formatDate(item.paid_at)}`}
                  </span>
                  {item.note && <span className="block text-xs text-slate-400">{item.note}</span>}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`badge ${item.is_paid ? "green" : "yellow"}`}>{item.is_paid ? "Dibayar" : "Belum dibayar"}</span>
                  {!item.is_paid && (
                    <button type="button" className="button secondary" disabled={busyId === item.id} onClick={() => markPaid(item)}>
                      Tandai dibayar
                    </button>
                  )}
                  <button type="button" className="button ghost" disabled={busyId === item.id} onClick={() => openEdit(item)}>
                    Ubah
                  </button>
                  <button type="button" className="button danger" disabled={busyId === item.id} onClick={() => remove(item)}>
                    Hapus
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
