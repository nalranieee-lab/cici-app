import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase";

export type Profile = {
  full_name: string | null;
  occupation: string | null;
  balance: number;
  /** Kosong (null) = pengguna belum pernah mengisi saldo. */
  balance_updated_at: string | null;
};

const COLUMNS = "full_name, occupation, balance, balance_updated_at";
const normalize = (row: Record<string, unknown>): Profile => ({
  full_name: (row.full_name as string | null) ?? null,
  occupation: (row.occupation as string | null) ?? null,
  balance: Number(row.balance ?? 0),
  balance_updated_at: (row.balance_updated_at as string | null) ?? null,
});

/** Membaca dan menyimpan baris public.profiles milik user (filter id = user id). */
export function useProfile(userId: string | undefined) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(!!userId);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!userId) {
      setProfile(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    const { data, error: queryError } = await supabase
      .from("profiles")
      .select(COLUMNS)
      .eq("id", userId)
      .maybeSingle();
    if (queryError) {
      setError(`Gagal memuat profil: ${queryError.message}`);
      setProfile(null);
    } else {
      // Jika baris belum ada, anggap profil kosong (onboarding akan muncul; simpan akan gagal dengan pesan jelas).
      setProfile(normalize((data as Record<string, unknown> | null) ?? {}));
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  /** Ambil ulang profil tanpa menampilkan layar loading (mis. saat Dashboard dibuka lagi). Error diabaikan; data lama dipertahankan. */
  const refresh = useCallback(async () => {
    if (!userId) return;
    const { data, error: queryError } = await supabase.from("profiles").select(COLUMNS).eq("id", userId).maybeSingle();
    if (!queryError && data) setProfile(normalize(data as Record<string, unknown>));
  }, [userId]);

  /** Mengembalikan pesan error, atau null jika berhasil. */
  const save = useCallback(
    async (fullName: string, occupation: string): Promise<string | null> => {
      if (!userId) return "Sesi login tidak ditemukan. Silakan masuk kembali.";
      const next = { full_name: fullName.trim(), occupation: occupation.trim() || null };
      const { data, error: updateError } = await supabase
        .from("profiles")
        .update(next)
        .eq("id", userId)
        .select(COLUMNS);
      if (updateError) return `Gagal menyimpan profil: ${updateError.message}`;
      if (!data || data.length === 0) return "Gagal menyimpan profil: baris profil tidak ditemukan atau tidak boleh diubah.";
      setProfile(normalize(data[0] as Record<string, unknown>));
      return null;
    },
    [userId],
  );

  /** Menyimpan saldo dan mengisi balance_updated_at dengan waktu sekarang. Mengembalikan pesan error atau null. */
  const saveBalance = useCallback(
    async (balance: number): Promise<string | null> => {
      if (!userId) return "Sesi login tidak ditemukan. Silakan masuk kembali.";
      const { data, error: updateError } = await supabase
        .from("profiles")
        .update({ balance, balance_updated_at: new Date().toISOString() })
        .eq("id", userId)
        .select(COLUMNS);
      if (updateError) return `Gagal menyimpan saldo: ${updateError.message}`;
      if (!data || data.length === 0) return "Gagal menyimpan saldo: baris profil tidak ditemukan atau tidak boleh diubah.";
      setProfile(normalize(data[0] as Record<string, unknown>));
      return null;
    },
    [userId],
  );

  return { profile, loading, error, reload: load, refresh, save, saveBalance };
}

export const initialsOf = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "?";

export type BalanceAdjustment =
  | { status: "ok"; before: number; after: number }
  | { status: "skipped" } // saldo belum pernah diisi, jadi tidak ada patokan untuk diubah
  | { status: "error"; message: string };

/**
 * Menambah (delta positif) atau mengurangi (delta negatif) saldo di profil user yang login.
 * Saldo dibaca ulang dari database tepat sebelum ditulis, lalu balance_updated_at diisi waktu sekarang.
 * Saldo boleh menjadi negatif. Tidak atomik: lihat catatan kasus yang tidak ditangani.
 */
export async function adjustBalance(delta: number): Promise<BalanceAdjustment> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return { status: "error", message: "Sesi login tidak ditemukan." };
  const userId = userData.user.id;
  const { data, error: readError } = await supabase
    .from("profiles")
    .select("balance, balance_updated_at")
    .eq("id", userId)
    .maybeSingle();
  if (readError) return { status: "error", message: readError.message };
  if (!data) return { status: "error", message: "baris profil tidak ditemukan." };
  if (!data.balance_updated_at) return { status: "skipped" };
  const before = Number(data.balance ?? 0);
  const after = before + delta;
  const { data: updated, error: updateError } = await supabase
    .from("profiles")
    .update({ balance: after, balance_updated_at: new Date().toISOString() })
    .eq("id", userId)
    .select("balance");
  if (updateError) return { status: "error", message: updateError.message };
  if (!updated || updated.length === 0) return { status: "error", message: "baris profil tidak boleh diubah." };
  return { status: "ok", before, after };
}
