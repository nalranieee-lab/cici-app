// filepath: src/lib/obligationPayments.ts
import { localFinance, localError } from './localFinance';
export const rupiah = (value: number) => `${value < 0 ? '-' : ''}Rp${Math.abs(Math.round(value)).toLocaleString('id-ID')}`;
export type PayResult = { status: 'failed'; message: string } | { status: 'paid'; paidAt: string; notice: string };
export async function payObligation(item: { id: string | number; amount: number }): Promise<PayResult> {
  try {
    const paidAt = localFinance.pay(item.id);
    const deducted = localFinance.getSnapshot().data.obligations.find(o => o.id === String(item.id))?.balance_deducted;
    return { status: 'paid', paidAt, notice: deducted ? 'Pembayaran dicatat dan saldo diperbarui.' : 'Pembayaran dicatat. Saldo belum diisi sehingga tidak diubah.' };
  } catch (error) { return { status: 'failed', message: localError(error) }; }
}
