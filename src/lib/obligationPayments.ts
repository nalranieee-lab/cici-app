import { supabase } from "./supabase";
import { adjustBalance } from "./useProfile";

/** Format rupiah dengan tanda minus untuk nilai negatif. */
export const rupiah = (value: number) => `${value < 0 ? "-" : ""}Rp${Math.abs(Math.round(value)).toLocaleString("id-ID")}`;

export type PayResult =
  | { status: "failed"; message: string } // pembayaran gagal dicatat; saldo tidak disentuh
  | { status: "paid"; paidAt: string; notice: string } // tercatat; saldo diperbarui (atau dilewati bila belum pernah diisi)
  | { status: "paid_balance_failed"; paidAt: string; message: string }; // tercatat, tetapi saldo gagal diperbarui

/**
 * Menandai kewajiban dibayar. Dipakai bersama oleh halaman Kewajiban Saya dan Dashboard.
 * Urutan: 1) catat pembayaran (is_paid, paid_at), 2) baru kurangi saldo. Jika langkah 1 gagal, saldo tidak disentuh.
 */
export async function payObligation(item: { id: string | number; amount: number }): Promise<PayResult> {
  const paidAt = new Date().toISOString();
  const { error } = await supabase.from("obligations").update({ is_paid: true, paid_at: paidAt }).eq("id", item.id);
  if (error) return { status: "failed", message: `Gagal menandai dibayar: ${error.message}` };
  const result = await adjustBalance(-Number(item.amount));
  if (result.status === "ok") {
    return { status: "paid", paidAt, notice: `Pembayaran dicatat. Saldo berkurang ${rupiah(item.amount)} menjadi ${rupiah(result.after)}.` };
  }
  if (result.status === "skipped") {
    return { status: "paid", paidAt, notice: "Pembayaran dicatat. Saldo belum pernah diisi, jadi saldo tidak diubah." };
  }
  return {
    status: "paid_balance_failed",
    paidAt,
    message: `Pembayaran sudah tercatat, tetapi saldo belum berubah (${result.message}). Perbarui saldo lewat "Ubah saldo" di Dashboard.`,
  };
}
