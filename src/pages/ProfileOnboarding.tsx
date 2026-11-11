import { useState } from "react";
import type { Profile } from "../lib/useProfile";

type Props = {
  initial: Profile | null;
  onSave: (fullName: string, occupation: string) => Promise<string | null>;
  /** Hanya diberikan saat onboarding diulang; onboarding pertama tidak bisa ditutup. */
  onClose?: () => void;
  onSaved?: () => void;
};

export default function ProfileOnboarding({ initial, onSave, onClose, onSaved }: Props) {
  const [fullName, setFullName] = useState(initial?.full_name ?? "");
  const [occupation, setOccupation] = useState(initial?.occupation ?? "");
  const [nameError, setNameError] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (!fullName.trim()) {
      setNameError("Nama lengkap wajib diisi");
      return;
    }
    setSaving(true);
    const message = await onSave(fullName, occupation);
    setSaving(false);
    if (message) setError(message);
    else onSaved?.();
  };

  return (
    <div className="onboarding">
      <div className="onboarding-brand">
        <div className="logo">
          <div className="logo-mark"><span>C</span><i /></div>
          <div><strong>CICI</strong><small>Cicilan Cerdas</small></div>
        </div>
        <div className="onboarding-visual">
          <div className="mascot big">
            <div className="mascot-ear left" /><div className="mascot-ear right" />
            <div className="mascot-face"><i /><i /><span /></div>
            <div className="mascot-body">C</div>
          </div>
          <h2>Mulai kendalikan arus kasmu.</h2>
          <p>Proyeksi lebih awal. Putuskan lebih tenang.</p>
        </div>
        <small>Datamu disimpan di akun CICI-mu.</small>
      </div>
      <div className="onboarding-content">
        <h1>Kenalan dulu, yuk</h1>
        <p>Nama membantu CICI menyapamu dengan pas. Hanya itu yang kami butuhkan.</p>
        <form onSubmit={submit} noValidate>
          <label className="field">
            <span>Nama lengkap</span>
            <input value={fullName} autoFocus onChange={(e) => { setFullName(e.target.value); setNameError(""); }} />
            {nameError && <small>{nameError}</small>}
          </label>
          <label className="field" style={{ marginTop: 14 }}>
            <span>Pekerjaan atau status</span>
            <input value={occupation} placeholder="Opsional, contoh: Mahasiswa" onChange={(e) => setOccupation(e.target.value)} />
          </label>
          {error && (
            <div className="alert danger compact" role="alert">
              <div><strong>Terjadi kendala</strong><p>{error}</p></div>
            </div>
          )}
          <div className="onboarding-actions">
            {onClose && <button type="button" className="button secondary" onClick={onClose} disabled={saving}>Batal</button>}
            <button type="submit" className="button primary" disabled={saving}>{saving ? "Menyimpan..." : "Simpan dan lanjut"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
