// filepath: src/lib/financialTypes.ts
export type FinancialIncome = {
  id: string | number;
  name: string;
  amount: number;
  date: string;
};
export type FinancialObligation = {
  id: string | number;
  name: string;
  amount: number;
  dueDate: string;
  isPaid: boolean;
  paidAt: string | null;
};
export type FinancialSnapshot = {
  userId: string;
  balance: number | null;
  balanceUpdatedAt: string | null;
  incomes: FinancialIncome[];
  obligations: FinancialObligation[];
  expenses?: FinancialExpense[];
};
export type FinancialExpense = { id: string; name: string; amount: number; date: string; walletId: string };
export type InstallmentPlan = {
  name: string;
  price: number;
  downPayment: number;
  purchaseDate: string;
  monthly: number;
  fees: number;
  tenor: number;
  firstDueDate: string;
};
export type ScheduledCashEvent = {
  date: string;
  amount: number;
  label: string;
};
export type ProjectionResult = {
  daily: { date: string; balance: number }[];
  months: { month: string; closing: number }[];
  ending: number;
  lowest: { date: string; balance: number };
  firstDeficit: string | null;
  risk: "Berisiko" | "Waspada" | "Terkendali";
};
