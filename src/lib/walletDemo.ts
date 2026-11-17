// filepath: src/lib/walletDemo.ts
export type WalletId = "dana" | "gopay" | "ovo" | "shopeepay";
export type DemoWallet = {
  id: WalletId;
  name: string;
  logo: string;
  balance: number;
};
export type DemoTransaction = {
  id: string;
  walletId: WalletId;
  date: string;
  description: string;
  direction: "in" | "out";
  amount: number;
};
export const demoWallets: readonly DemoWallet[] = [
  { id: "dana", name: "DANA", logo: "/wallet-logos/dana.png", balance: 600000 },
  {
    id: "gopay",
    name: "GoPay",
    logo: "/wallet-logos/gopay.webp",
    balance: 450000,
  },
  { id: "ovo", name: "OVO", logo: "/wallet-logos/ovo.png", balance: 350000 },
  {
    id: "shopeepay",
    name: "ShopeePay",
    logo: "/wallet-logos/shopeepay.svg",
    balance: 250000,
  },
];
export const walletLabel = (walletId: string) =>
  demoWallets.find((wallet) => wallet.id === walletId)?.name ?? walletId;

export const demoTransactions: readonly DemoTransaction[] = [
  {
    id: "demo-1",
    walletId: "dana",
    date: "2026-11-16",
    description: "Isi saldo contoh",
    direction: "in",
    amount: 200000,
  },
  {
    id: "demo-2",
    walletId: "gopay",
    date: "2026-11-15",
    description: "Transportasi contoh",
    direction: "out",
    amount: 25000,
  },
  {
    id: "demo-3",
    walletId: "ovo",
    date: "2026-11-14",
    description: "Makan siang contoh",
    direction: "out",
    amount: 30000,
  },
  {
    id: "demo-4",
    walletId: "dana",
    date: "2026-11-13",
    description: "Kebutuhan harian contoh",
    direction: "out",
    amount: 50000,
  },
];
