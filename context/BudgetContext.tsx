import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { storage } from '@/utils/storage';
import { loadLegacyState } from '@/utils/migrate';
import * as B from '@/utils/budget';

const KEY = 'nami_budget_v2';

type Ctx = {
  state: B.BudgetState;
  ready: boolean;
  setTotalBudget: (amount: number) => void;
  addWallet: (parentId: string, name: string, amount: number) => void;
  deposit: (id: string, amount: number, source: B.DepositSource) => void;
  addExpense: (id: string, description: string, amount: number) => void;
  renameWallet: (id: string, name: string) => void;
  deleteWallet: (id: string) => void;
  replaceAll: (next: B.BudgetState) => void;
  resetAll: () => void;
};

const BudgetContext = createContext<Ctx | null>(null);

export function BudgetProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<B.BudgetState>(B.emptyState);
  const [ready, setReady] = useState(false);
  const ref = useRef(state); // always the latest state, avoids stale closures

  // Load once. Data is only written AFTER loading finishes, so we never overwrite saved data.
  useEffect(() => {
    (async () => {
      let loaded: B.BudgetState = B.emptyState;
      try {
        const saved = await storage.getItem<B.BudgetState>(KEY);
        if (saved && Array.isArray(saved.nodes) && Array.isArray(saved.transactions) && !B.validateState(saved)) {
          loaded = saved;
        } else if (!saved) {
          loaded = await loadLegacyState(); // upgrade from v1 if present
          if (loaded.nodes.length) await storage.setItem(KEY, loaded);
        }
      } catch (e) {
        console.error('Failed to load data', e);
      }
      ref.current = loaded;
      setState(loaded);
      setReady(true);
    })();
  }, []);

  const commit = useCallback((next: B.BudgetState) => {
    ref.current = next;
    setState(next);
    storage.setItem(KEY, next).catch((e) => console.error('Failed to save data', e));
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      state,
      ready,
      setTotalBudget: (a) => commit(B.setTotalBudget(ref.current, a)),
      addWallet: (p, n, a) => commit(B.addWallet(ref.current, p, n, a)),
      deposit: (id, a, s) => commit(B.deposit(ref.current, id, a, s)),
      addExpense: (id, d, a) => commit(B.addExpense(ref.current, id, d, a)),
      renameWallet: (id, n) => commit(B.renameWallet(ref.current, id, n)),
      deleteWallet: (id) => commit(B.deleteWallet(ref.current, id)),
      replaceAll: (next) => commit(next),
      resetAll: () => commit(B.emptyState),
    }),
    [state, ready, commit]
  );

  return <BudgetContext.Provider value={value}>{children}</BudgetContext.Provider>;
}

export function useBudget(): Ctx {
  const ctx = useContext(BudgetContext);
  if (!ctx) throw new Error('useBudget must be used inside <BudgetProvider>');
  return ctx;
}
