import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase";
import { toDateString, type IncomeItem, type ObligationItem } from "./cashflow";

/** Data mentah untuk perhitungan arus kas: pemasukan dari hari ini dan kewajiban belum dibayar sampai akhir bulan. */
export function useCashflowData() {
  const [data, setData] = useState<{ incomes: IncomeItem[]; obligations: ObligationItem[] } | null>(null);
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
    const userId = userData.user.id;
    const now = new Date();
    const today = toDateString(now);
    const nextMonthStart = toDateString(new Date(now.getFullYear(), now.getMonth() + 1, 1));
    const [incomesRes, obligationsRes] = await Promise.all([
      supabase.from("incomes").select("amount, expected_date").eq("user_id", userId).gte("expected_date", today),
      // Tanpa batas bawah: kewajiban yang sudah lewat jatuh tempo tapi belum dibayar ikut dihitung.
      supabase.from("obligations").select("amount, due_date, is_paid").eq("user_id", userId).eq("is_paid", false).lt("due_date", nextMonthStart),
    ]);
    const failure = incomesRes.error ?? obligationsRes.error;
    if (failure) {
      setError(`Gagal memuat data proyeksi: ${failure.message}`);
      setData(null);
    } else {
      setData({
        incomes: (incomesRes.data ?? []).map((row) => ({ amount: Number(row.amount), date: String(row.expected_date).slice(0, 10) })),
        obligations: (obligationsRes.data ?? []).map((row) => ({ amount: Number(row.amount), dueDate: String(row.due_date).slice(0, 10), isPaid: !!row.is_paid })),
      });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, reload: load };
}
