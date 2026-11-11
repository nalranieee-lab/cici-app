import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase";

export type Profile = { full_name: string | null; occupation: string | null };

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
      .select("full_name, occupation")
      .eq("id", userId)
      .maybeSingle();
    if (queryError) {
      setError(`Gagal memuat profil: ${queryError.message}`);
      setProfile(null);
    } else {
      // Jika baris belum ada, anggap profil kosong (onboarding akan muncul; simpan akan gagal dengan pesan jelas).
      setProfile((data as Profile | null) ?? { full_name: null, occupation: null });
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  /** Mengembalikan pesan error, atau null jika berhasil. */
  const save = useCallback(
    async (fullName: string, occupation: string): Promise<string | null> => {
      if (!userId) return "Sesi login tidak ditemukan. Silakan masuk kembali.";
      const next = { full_name: fullName.trim(), occupation: occupation.trim() || null };
      const { data, error: updateError } = await supabase
        .from("profiles")
        .update(next)
        .eq("id", userId)
        .select("full_name, occupation");
      if (updateError) return `Gagal menyimpan profil: ${updateError.message}`;
      if (!data || data.length === 0) return "Gagal menyimpan profil: baris profil tidak ditemukan atau tidak boleh diubah.";
      setProfile(data[0] as Profile);
      return null;
    },
    [userId],
  );

  return { profile, loading, error, reload: load, save };
}

export const initialsOf = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "?";
