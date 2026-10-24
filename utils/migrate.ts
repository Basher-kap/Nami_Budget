import AsyncStorage from '@react-native-async-storage/async-storage';
import { BudgetState, WalletNode, Transaction, ROOT_NAME, genId, round2, emptyState } from './budget';

type OldCategory = { id: string; name: string; deposit: number; balance: number };
type OldExpense = { id: string; name: string; amount: number; categoryName: string; date: string };
type OldDeposit = { id: string; categoryName: string; amount: number; date: string };

const parse = async <T,>(key: string): Promise<T | null> => {
  const raw = await AsyncStorage.getItem(key);
  return raw ? (JSON.parse(raw) as T) : null;
};
const toIso = (s: string) => {
  const d = new Date(s);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
};

/** Converts v1 data (flat categories) into the v2 wallet tree. Returns empty state if none. */
export async function loadLegacyState(): Promise<BudgetState> {
  try {
    const cats = (await parse<OldCategory[]>('categories')) ?? [];
    if (cats.length === 0) return emptyState;
    const exps = (await parse<OldExpense[]>('expenses')) ?? [];
    const deps = (await parse<OldDeposit[]>('deposits')) ?? [];
    const now = new Date().toISOString();
    const rootId = genId();
    const total = round2(cats.reduce((s, c) => s + Math.max(0, c.balance), 0));
    const nodes: WalletNode[] = [{ id: rootId, parentId: null, name: ROOT_NAME, amount: total, createdAt: now }];
    const idByName: Record<string, string> = {};
    cats.forEach((c) => {
      const id = genId();
      idByName[c.name] = id;
      nodes.push({ id, parentId: rootId, name: c.name, amount: round2(Math.max(0, c.balance)), createdAt: now });
    });
    const transactions: Transaction[] = [
      ...exps.map((e) => ({
        id: genId(), type: 'expense' as const, walletId: idByName[e.categoryName] ?? '',
        walletName: e.categoryName, description: e.name, amount: e.amount, date: toIso(e.date),
      })),
      ...deps.map((d) => ({
        id: genId(), type: 'deposit' as const, walletId: idByName[d.categoryName] ?? '',
        walletName: d.categoryName, description: 'Imported from v1', amount: d.amount, date: toIso(d.date),
      })),
    ].sort((a, b) => b.date.localeCompare(a.date));
    return { nodes, transactions };
  } catch {
    return emptyState;
  }
}
