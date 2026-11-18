// filepath: src/lib/financeRepository.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { FinanceRepository, FINANCE_STORAGE_KEY } from './financeRepository.ts';
import { createStarterFinance, mergeStarterFinance } from './starterFinance.ts';
const makeStorage = () => {
  const values = new Map<string,string>();
  return { values, getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
};
test('data awal mengembalikan profil, empat pemasukan, lima kewajiban dan saldo dompet', () => {
  const repo = new FinanceRepository(makeStorage(), { initialData: createStarterFinance, upgrade: mergeStarterFinance });
  const data = repo.getSnapshot().data;
  assert.equal(repo.getSnapshot().error, null);
  assert.equal(data.profile.full_name, 'Nalranie'); assert.equal(data.profile.balance, 8000000);
  assert.equal(data.incomes.length, 4); assert.equal(data.incomes.reduce((s,i)=>s+i.amount,0),10000000);
  assert.equal(data.obligations.length, 5);
  assert.equal(data.obligations.filter(o=>o.is_paid).reduce((s,o)=>s+o.amount,0),500000);
  assert.equal(data.obligations.filter(o=>!o.is_paid && o.due_date.startsWith('2026-11')).reduce((s,o)=>s+o.amount,0),1400000);
  assert.equal(Object.values(data.wallet.balances).reduce((s,n)=>s+n,0),1650000);
  assert.equal(data.walletTransactions?.length,4);
  assert.equal(data.expenses?.length, 3);
  assert.equal(data.expenses?.reduce((sum,item)=>sum+item.amount,0), 105000);
});
test('data awal pengeluaran e-wallet berasal dari riwayat lama tanpa mengurangi saldo snapshot', () => {
  const repo = new FinanceRepository(makeStorage(), { initialData: createStarterFinance, upgrade: mergeStarterFinance });
  const data = repo.getSnapshot().data;
  assert.equal(data.expenses?.length, 3);
  assert.equal(data.expenses?.reduce((sum,item)=>sum+item.amount,0),105000);
  assert.equal(data.expenses?.find(item=>item.name==='Transportasi')?.wallet_id,'gopay');
  assert.equal(data.wallet.balances.gopay,450000);
});
test('data awal ditambahkan sekali ke browser kosong lama tanpa duplikasi atau pengisian ulang setelah dihapus', () => {
  const storage=makeStorage(), emptyRepo=new FinanceRepository(storage); emptyRepo.saveProfile('Pengguna CICI','');
  const repo=new FinanceRepository(storage,{initialData:createStarterFinance,upgrade:mergeStarterFinance});
  assert.equal(repo.getSnapshot().data.profile.balance,8000000);
  assert.equal(repo.getSnapshot().data.incomes.length,4);
  const id=repo.getSnapshot().data.incomes[0].id;repo.removeIncome(id);repo.refresh();
  assert.equal(repo.getSnapshot().data.incomes.length,3);
  assert.equal(new FinanceRepository(storage,{initialData:createStarterFinance,upgrade:mergeStarterFinance}).getSnapshot().data.incomes.length,3);
});
test('migrasi mempertahankan edit saldo, dompet dan transaksi lokal serta tidak menggandakan data yang sama', () => {
  const storage=makeStorage(), before=new FinanceRepository(storage);
  before.saveProfile('Nama sendiri','Bekerja'); before.saveBalance(750000);
  before.updateWalletBalance('dana',900000,'set');
  before.saveIncome({name:'gaji',amount:4200000,expected_date:'2026-11-25'});
  const repo=new FinanceRepository(storage,{initialData:createStarterFinance,upgrade:mergeStarterFinance}), data=repo.getSnapshot().data;
  assert.equal(data.profile.full_name,'Nama sendiri');assert.equal(data.profile.balance,750000);
  assert.equal(data.wallet.balances.dana,900000);assert.equal(data.incomes.length,4);
});
test('riwayat lunas sebelum saldo awal tidak dikurangkan ulang dan pembatalannya tidak menambah saldo awal', () => {
  const repo=new FinanceRepository(makeStorage(),{initialData:createStarterFinance,upgrade:mergeStarterFinance});
  repo.cancelPayment('starter-bill-hp');assert.equal(repo.getSnapshot().data.profile.balance,8000000);
});
const addBill = (repo: FinanceRepository, amount = 300000) => { repo.saveObligation({ name: 'Tagihan', amount, due_date: '2026-11-20', note: null }); return repo.getSnapshot().data.obligations.at(-1)!; };
test('browser baru dimulai kosong, penyimpanan lain terisolasi dan refresh mempertahankan data', () => {
  const storage = makeStorage(), repo = new FinanceRepository(storage);
  assert.equal(repo.getSnapshot().data.profile.balance_updated_at, null);
  repo.saveBalance(1000000); repo.saveProfile('Rama', 'Mahasiswa');
  repo.saveIncome({name:'Pemasukan',amount:2000000,expected_date:'2026-11-25'});
  const loaded = new FinanceRepository(storage).getSnapshot().data;
  assert.equal(loaded.profile.balance, 1000000); assert.equal(loaded.profile.full_name, 'Rama'); assert.equal(loaded.incomes.length, 1);
  assert.equal(new FinanceRepository(makeStorage()).getSnapshot().data.incomes.length, 0);
});
test('CRUD pemasukan dan kewajiban menggunakan ID stabil', () => {
  const repo = new FinanceRepository(makeStorage());
  repo.saveIncome({name:'Gaji',amount:100,expected_date:'2026-11-25'});
  const id = repo.getSnapshot().data.incomes[0].id;
  repo.saveIncome({name:'Gaji baru',amount:200,expected_date:'2026-11-26'},id);
  assert.equal(repo.getSnapshot().data.incomes[0].amount,200);
  repo.removeIncome(id); assert.equal(repo.getSnapshot().data.incomes.length,0);
  const bill = addBill(repo); repo.saveObligation({...bill,name:'Revisi'},bill.id);
  assert.equal(repo.getSnapshot().data.obligations[0].name,'Revisi');
  repo.removeObligation(bill.id); assert.equal(repo.getSnapshot().data.obligations.length,0);
});
test('pencatatan dan pembatalan pembayaran mengubah saldo tepat sekali', () => {
  const repo = new FinanceRepository(makeStorage()); repo.saveBalance(1000000);
  const bill = addBill(repo), previous = repo.getSnapshot();
  repo.pay(bill.id); assert.equal(repo.getSnapshot().data.profile.balance,700000);
  assert.equal(previous.data.profile.balance,1000000);
  assert.throws(()=>repo.pay(bill.id),/sudah dibayar/);
  repo.cancelPayment(bill.id); assert.equal(repo.getSnapshot().data.profile.balance,1000000);
  assert.throws(()=>repo.cancelPayment(bill.id),/tidak ditemukan/);
});
test('saldo yang belum diisi tidak dikurangi atau dikreditkan saat pembatalan', () => {
  const repo = new FinanceRepository(makeStorage()), bill = addBill(repo);
  repo.pay(bill.id); repo.saveBalance(1000); repo.cancelPayment(bill.id);
  assert.equal(repo.getSnapshot().data.profile.balance,1000);
});
test('kuota storage gagal tidak meninggalkan pembayaran atau saldo setengah tersimpan', () => {
  const storage = makeStorage(), repo = new FinanceRepository(storage); repo.saveBalance(1000000);
  const bill = addBill(repo), raw = storage.getItem(FINANCE_STORAGE_KEY);
  storage.setItem = () => { throw new Error('quota'); };
  assert.throws(()=>repo.pay(bill.id),/belum tersimpan/);
  assert.equal(repo.getSnapshot().data.profile.balance,1000000);
  assert.equal(repo.getSnapshot().data.obligations[0].is_paid,false);
  assert.equal(storage.getItem(FINANCE_STORAGE_KEY),raw);
});
test('storage rusak atau versi berbeda tidak ditimpa saat penyimpanan', () => {
  for(const raw of ['broken', '{"version":2}', '{"version":1}']) {
    const storage = makeStorage(); storage.setItem(FINANCE_STORAGE_KEY,raw);
    const repo = new FinanceRepository(storage); assert.ok(repo.getSnapshot().error);
    assert.throws(()=>repo.saveBalance(1)); assert.equal(storage.getItem(FINANCE_STORAGE_KEY),raw);
  }
});
test('tanggal, nominal, dan perubahan nominal kewajiban lunas ditolak', () => {
  const repo = new FinanceRepository(makeStorage());
  assert.throws(()=>repo.saveIncome({name:'X',amount:1,expected_date:'2026-02-30'}));
  assert.throws(()=>repo.saveBalance(Number.MAX_SAFE_INTEGER));
  const bill=addBill(repo);repo.pay(bill.id);
  assert.throws(()=>repo.saveObligation({...bill,amount:1},bill.id),/Batalkan pembayaran/);
});
test('pengeluaran e-wallet menambah riwayat, mengurangi saldo, lalu edit dan hapus merekonsiliasi saldo', () => {
  const repo=new FinanceRepository(makeStorage());repo.updateWalletBalance('dana',500000,'set');repo.updateWalletBalance('ovo',300000,'set');
  repo.saveExpense({name:'Makan',amount:100000,occurred_on:'2026-11-20',wallet_id:'dana'});
  let data=repo.getSnapshot().data;
  const id=data.expenses![0].id;
  assert.equal(data.wallet.balances.dana,400000);assert.equal(data.walletTransactions?.[0].description,'Makan');
  repo.saveExpense({name:'Belanja',amount:80000,occurred_on:'2026-11-21',wallet_id:'ovo'},id);
  data=repo.getSnapshot().data;
  assert.equal(data.wallet.balances.dana,500000);assert.equal(data.wallet.balances.ovo,220000);assert.equal(data.expenses![0].wallet_id,'ovo');
  repo.removeExpense(id);data=repo.getSnapshot().data;
  assert.equal(data.wallet.balances.ovo,300000);assert.equal(data.expenses!.length,0);assert.equal(data.walletTransactions!.length,0);
});
test('pengeluaran awal wallet dicatat tanpa mengurangi saldo snapshot dua kali', () => {
  const repo=new FinanceRepository(makeStorage(),{initialData:createStarterFinance,upgrade:mergeStarterFinance});
  assert.equal(repo.getSnapshot().data.wallet.balances.dana,600000);
  const transport=repo.getSnapshot().data.expenses!.find(item=>item.name==='Transportasi')!;
  repo.removeExpense(transport.id);
  assert.equal(repo.getSnapshot().data.wallet.balances.gopay,450000);
  assert.equal(repo.getSnapshot().data.walletTransactions!.some(item=>item.description==='Transportasi'),false);
});
test('pengeluaran baru gagal tanpa perubahan saat saldo sumber tidak cukup', () => {
  const repo=new FinanceRepository(makeStorage());
  const before=repo.getSnapshot().data.wallet.balances.dana;
  assert.throws(()=>repo.saveExpense({name:'Belanja',amount:1,occurred_on:'2026-11-20',wallet_id:'dana'}),/tidak cukup/);
  assert.equal(repo.getSnapshot().data.wallet.balances.dana,before);
  assert.equal(repo.getSnapshot().data.expenses!.length,0);
});

test('data awal e-wallet dicatat sebagai pengeluaran tanpa mengurangi snapshot saldo dua kali', () => {
  const repo = new FinanceRepository(makeStorage(), { initialData: createStarterFinance, upgrade: mergeStarterFinance });
  const expense = repo.getSnapshot().data.expenses!.find(item => item.name === 'Transportasi')!;
  assert.equal(expense.wallet_id, 'gopay');
  assert.equal(repo.getSnapshot().data.wallet.balances.gopay, 450000);
});

test('CRUD pengeluaran mengurangi sumber saldo, memperbarui riwayat dan mengembalikan saldo saat dihapus', () => {
  const repo = new FinanceRepository(makeStorage());
  repo.updateWalletBalance('dana', 500000, 'set');
  repo.saveExpense({ name: 'Makan', amount: 100000, occurred_on: '2026-11-20', wallet_id: 'dana' });
  const id = repo.getSnapshot().data.expenses![0].id;
  assert.equal(repo.getSnapshot().data.wallet.balances.dana, 400000);
  assert.equal(repo.getSnapshot().data.walletTransactions?.some(item => item.description === 'Makan'), true);
  repo.saveExpense({ name: 'Belanja', amount: 80000, occurred_on: '2026-11-21', wallet_id: 'dana' }, id);
  assert.equal(repo.getSnapshot().data.wallet.balances.dana, 420000);
  repo.removeExpense(id);
  assert.equal(repo.getSnapshot().data.wallet.balances.dana, 500000);
  assert.equal(repo.getSnapshot().data.expenses!.length, 0);
  assert.equal(repo.getSnapshot().data.walletTransactions?.some(item => item.description === 'Belanja'), false);
});
test('CRUD pengeluaran mengubah saldo sumber dan riwayat dompet secara bersama', () => {
  const repo=new FinanceRepository(makeStorage());
  repo.updateWalletBalance('dana',500000,'set');
  repo.updateWalletBalance('ovo',300000,'set');
  repo.saveExpense({name:'Makan',amount:100000,occurred_on:'2026-11-20',wallet_id:'dana'});
  let data=repo.getSnapshot().data;const id=data.expenses![0].id;
  assert.equal(data.wallet.balances.dana,400000);
  assert.equal(data.walletTransactions?.[0].description,'Makan');
  repo.saveExpense({name:'Belanja',amount:80000,occurred_on:'2026-11-21',wallet_id:'ovo'},id);
  data=repo.getSnapshot().data;
  assert.equal(data.wallet.balances.dana,500000);
  assert.equal(data.wallet.balances.ovo,220000);
  repo.removeExpense(id);data=repo.getSnapshot().data;
  assert.equal(data.wallet.balances.ovo,300000);
  assert.equal(data.expenses?.length,0);
  assert.equal(data.walletTransactions?.length,0);
});
test('dompet tersimpan setelah reload dan simulasi tidak melunasi kewajiban', () => {
  const storage = makeStorage(), repo = new FinanceRepository(storage), bill=addBill(repo);
  repo.saveBalance(500000);
  repo.updateWalletBalance('dana',500000,'add','transfer');
  assert.equal(repo.simulateWalletPayment('dana',{...bill,dueDate:bill.due_date,isPaid:false}).status,'ok');
  const loaded = new FinanceRepository(storage);
  assert.equal(loaded.getSnapshot().data.wallet.balances.dana,200000);
  assert.equal(loaded.getSnapshot().data.obligations[0].is_paid,false);
  assert.equal(loaded.simulateWalletPayment('dana',{...bill,dueDate:bill.due_date,isPaid:false}).status,'already_simulated');
  loaded.removeObligation(bill.id);
  assert.equal(loaded.getSnapshot().data.wallet.balances.dana,500000);
});
test('penambahan dompet membedakan pemasukan baru dan pemindahan dana', () => {
  const storage = makeStorage(), repo = new FinanceRepository(storage);
  repo.saveBalance(8000000);
  repo.updateWalletBalance('gopay', 400000, 'add', 'income');
  repo.updateWalletBalance('gopay', 100000, 'add', 'transfer');
  repo.updateWalletBalance('gopay', 700000, 'set');
  const loaded = new FinanceRepository(storage).getSnapshot().data;
  assert.equal(loaded.wallet.balances.gopay, 700000);
  assert.equal(loaded.profile.balance, 7900000);
  assert.equal(loaded.incomes.length, 1);
  assert.equal(loaded.incomes[0].name, 'Pemasukan GoPay');
  assert.equal(loaded.incomes[0].amount, 400000);
  assert.throws(() => repo.updateWalletBalance('gopay', 10, 'add'), /Pilih sumber/);
  assert.throws(() => repo.updateWalletBalance('gopay', 8000000, 'add', 'transfer'), /tidak cukup/);
  assert.equal(repo.getSnapshot().data.profile.balance, 7900000);
  assert.equal(repo.getSnapshot().data.wallet.balances.gopay, 700000);
});
test('instance kedua membaca data terkini sebelum menulis', () => {
  const storage=makeStorage(), first=new FinanceRepository(storage), second=new FinanceRepository(storage);
  first.saveBalance(1000);second.saveIncome({name:'Gaji',amount:500,expected_date:'2026-11-25'});
  first.refresh();assert.equal(first.getSnapshot().data.incomes.length,1);assert.equal(first.getSnapshot().data.profile.balance,1000);
});
