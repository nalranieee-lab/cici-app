import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase";

export type UpcomingObligation = { id: string | number; name: string; amount: number; dueDate: string };

/** Semua kewajiban belum dibayar milik user, urut due_date terdekat (yang lewat jatuh tempo paling awal). */
export function useUpcomingObligations() {
  const [items, setItems] = useState<UpcomingObligation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      setError("Sesi login tidak ditemukan. Silakan masuk kembali.");
      setLoading(false);
      return;
    }
    const { data, error: queryError } = await supabase
      .from("obligations")
      .select("id, name, amount, due_date")
      .eq("user_id", userData.user.id)
      .eq("is_paid", false)
      .order("due_date", { ascending: true });
    if (queryError) {
      setError(`Gagal memuat kewajiban mendatang: ${queryError.message}`);
      setItems([]);
    } else {
      setItems((data ?? []).map((row) => ({ id: row.id, name: row.name, amount: Number(row.amount), dueDate: String(row.due_date).slice(0, 10) })));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { items, loading, error, reload: load };
}
