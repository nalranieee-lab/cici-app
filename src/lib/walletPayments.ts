// filepath: src/lib/walletPayments.ts
import { demoWallets, type WalletId } from "./walletDemo.ts"

export type DemoObligation = {
  id: string | number
  name: string
  amount: number
  isPaid: boolean
  dueDate: string
}
export type DemoPayment = {
  obligationId: string
  obligationName: string
  dueDate: string
  walletId: WalletId
  amount: number
  at: string
}
export type DemoPaymentState = {
  balances: Record<WalletId, number>
  payments: DemoPayment[]
}
export type DemoPaymentResult = { status: "ok"; state: DemoPaymentState } | {
  status: "invalid" | "insufficient" | "already_simulated"
}

export function createDemoPaymentState(): DemoPaymentState {
  return {
    balances: Object.fromEntries(
      demoWallets.map((w) => [w.id, 0]),
    ) as Record<WalletId, number>,
    payments: [],
  }
}

export function simulatePayment(
  state: DemoPaymentState,
  input: { walletId: WalletId; obligation: DemoObligation; at: string },
): DemoPaymentResult {
  const { walletId, obligation, at } = input
  if (
    !Object.prototype.hasOwnProperty.call(state.balances, walletId) ||
    obligation.isPaid ||
    !obligation.name.trim() ||
    !Number.isSafeInteger(obligation.amount) ||
    obligation.amount <= 0 ||
    !Number.isFinite(Date.parse(at))
  )
    return { status: "invalid" }
  const obligationId = String(obligation.id)
  if (state.payments.some((p) => p.obligationId === obligationId))
    return { status: "already_simulated" }
  if (state.balances[walletId] < obligation.amount)
    return { status: "insufficient" }
  const payment: DemoPayment = {
    obligationId,
    obligationName: obligation.name,
    dueDate: obligation.dueDate,
    walletId,
    amount: obligation.amount,
    at,
  }
  return {
    status: "ok",
    state: {
      balances: {
        ...state.balances,
        [walletId]: state.balances[walletId] - obligation.amount,
      },
      payments: [payment, ...state.payments],
    },
  }
}

export function invalidatePayment(
  state: DemoPaymentState,
  id: string | number,
): DemoPaymentState {
  const payment = state.payments.find((p) => p.obligationId === String(id))
  if (!payment) return state
  return {
    balances: {
      ...state.balances,
      [payment.walletId]: state.balances[payment.walletId] + payment.amount,
    },
    payments: state.payments.filter((p) => p !== payment),
  }
}

export function reconcilePayments(
  state: DemoPaymentState,
  obligations: readonly DemoObligation[],
): DemoPaymentState {
  return state.payments.reduce((next, payment) => {
    const item = obligations.find((o) => String(o.id) === payment.obligationId)
    return !item ||
      item.isPaid ||
      item.amount !== payment.amount ||
      item.name !== payment.obligationName ||
      item.dueDate !== payment.dueDate
      ? invalidatePayment(next, payment.obligationId)
      : next
  }, state)
}
