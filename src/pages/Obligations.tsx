// filepath: src/pages/Obligations.tsx
import FinanceEntries from './FinanceEntries';
import type { DemoPayment } from '../lib/walletPayments';
export default function Obligations({ simulatedPayments, onPayDemo }: { simulatedPayments: readonly DemoPayment[]; onPayDemo: (id: string | number) => void; onInvalidateDemo: (id: string | number) => void }) {
  return <FinanceEntries kind="obligation" simulatedPayments={simulatedPayments} onPayWallet={onPayDemo} />;
}
