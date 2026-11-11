import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Income = {
  id: string | number;
  name: string;
  amount: number;
  expected_date: string | null;
};

type FormState = { name: string; amount: string; expected_date: string };
type FormErrors = Partial<Record<keyof FormState, string>>;

const COLUMNS = "id, name, amount, expected_date";
const emptyForm: FormState = { name: "", amount: "", expected_date: "" };

const rupiah = (value: number) => `Rp${Math.round(value).toLocaleString("id-ID")}`;
const formatDate = (value: string | null) =>
  value
    ? new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString("id-ID", {
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
  if (!form.expected_date) errors.expected_date = "Tanggal wajib diisi";
  return errors;
}

export default function Incomes() {
  const [items, setItems] = useState<Income[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<Income["id"] | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<Income["id"] | null>(null);

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
      .from("incomes")
      .select(COLUMNS)
      .eq("user_id", userData.user.id)
      .order("expected_date", { ascending: true });
    if (error) setLoadError(`Gagal memuat pemasukan: ${error.message}`);
    else setItems((data ?? []) as Income[]);
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

  const openEdit = (item: Income) => {
    setEditingId(item.id);
    setForm({ name: item.name, amount: String(item.amount), expected_date: item.expected_date?.slice(0, 10) ?? "" });
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
      expected_date: form.expected_date,
    };
    // user_id default auth.uid() di database, jadi tidak dikirim saat insert.
    const { error } =
      editingId !== null
        ? await supabase.from("incomes").update(payload).eq("id", editingId)
        : await supabase.from("incomes").insert(payload);
    if (error) {
      setActionError(`Gagal menyimpan pemasukan: ${error.message}`);
    } else {
      closeForm();
      await load();
    }
    setSaving(false);
  };

  const remove = async (item: Income) => {
    if (!window.confirm(`Hapus pemasukan "${item.name}"? Tindakan ini tidak dapat dibatalkan.`)) return;
    setBusyId(item.id);
    setActionError("");
    const { error } = await supabase.from("incomes").delete().eq("id", item.id);
    if (error) setActionError(`Gagal menghapus: ${error.message}`);
    else setItems((prev) => prev.filter((row) => row.id !== item.id));
    setBusyId(null);
  };

  return (
    <>
      <div className="page-heading" style={{ marginTop: 24 }}>
        <div>
          <div className="eyebrow">Data tersimpan di akunmu</div>
          <h1>Pemasukan Saya</h1>
          <p>Catat pemasukan yang kamu perkirakan, seperti gaji, uang saku, atau bayaran freelance.</p>
        </div>
        <button type="button" className="button primary" onClick={openAdd}>
          + Tambah pemasukan
        </button>
      </div>

      {showForm && (
        <section className="card add-form">
          <div className="card-title">
            <div>
              <h2>{editingId !== null ? "Ubah pemasukan" : "Pemasukan baru"}</h2>
              <p>Nama, nominal, dan tanggal wajib diisi.</p>
            </div>
            <button type="button" className="button ghost" onClick={closeForm}>
              Tutup
            </button>
          </div>
          <form onSubmit={submit} noValidate>
            <div className="form-grid">
              <label className="field">
                <span>Nama pemasukan</span>
                <input value={form.name} onChange={(e) => setField("name", e.target.value)} />
                {errors.name && <small>{errors.name}</small>}
              </label>
              <label className="field">
                <span>Nominal (Rp)</span>
                <input type="number" min={0} value={form.amount} onChange={(e) => setField("amount", e.target.value)} />
                {errors.amount && <small>{errors.amount}</small>}
              </label>
              <label className="field">
                <span>Tanggal perkiraan</span>
                <input type="date" value={form.expected_date} onChange={(e) => setField("expected_date", e.target.value)} />
                {errors.expected_date && <small>{errors.expected_date}</small>}
              </label>
            </div>
            <button type="submit" className="button primary" disabled={saving}>
              {saving ? "Menyimpan..." : editingId !== null ? "Simpan perubahan" : "Simpan pemasukan"}
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
            <p>Memuat pemasukan...</p>
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
            <strong>Belum ada pemasukan</strong>
            <p>Tambahkan pemasukan pertamamu dengan tombol "Tambah pemasukan".</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {items.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <strong className="block text-sm">{item.name}</strong>
                  <span className="block text-xs text-slate-500">
                    {rupiah(item.amount)} · {formatDate(item.expected_date)}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
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
