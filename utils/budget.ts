/**
 * Core budgeting logic for Nami Budget — a tree of wallets.
 *
 *   Total Budget (level 0, origin parent)
 *     └─ Wallet (level 1, child)
 *          └─ Wallet (level 2, sub-child)
 *
 * Rules
 *  - A node's `amount` is the money in its whole branch (its own spare money plus
 *    everything allocated to its children). So Total Budget = everything you own.
 *  - "Available" of a node = amount − sum(children amounts): the money that is not yet
 *    handed to a child wallet. Only available money can be spent or allocated.
 *  - Expense: deducts from the wallet AND every ancestor up to Total Budget.
 *  - Deposit "from parent": moves available money from the parent into the wallet.
 *  - Deposit "new money": adds to the wallet AND every ancestor up to Total Budget.
 *
 * All functions are pure: they return a new state or throw a BudgetError.
 */

export type WalletNode = {
  id: string;
  parentId: string | null; // null = Total Budget (origin parent node)
  name: string;
  amount: number;
  createdAt: string;
};

export type TxType = 'expense' | 'deposit';

export type Transaction = {
  id: string;
  type: TxType;
  walletId: string;
  walletName: string; // snapshot so history survives wallet deletion
  description: string; // expense name; for deposits a short note
  amount: number;
  date: string; // ISO
};

export type BudgetState = { nodes: WalletNode[]; transactions: Transaction[] };

export const emptyState: BudgetState = { nodes: [], transactions: [] };
export const ROOT_NAME = 'Total Budget';
export const MAX_LEVEL = 2; // 0 = Total Budget, 1 = child, 2 = sub-child
const MAX_AMOUNT = 1_000_000_000_000;
const EPS = 0.005;

export class BudgetError extends Error {}
const fail = (msg: string): never => {
  throw new BudgetError(msg);
};

export const round2 = (n: number) => Math.round(n * 100) / 100;
export const genId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

// ---------- Queries ----------
export const getRoot = (s: BudgetState) => s.nodes.find((n) => n.parentId === null) ?? null;
export const getNode = (s: BudgetState, id: string) => s.nodes.find((n) => n.id === id) ?? null;
export const childrenOf = (nodes: WalletNode[], id: string) => nodes.filter((n) => n.parentId === id);

export function levelOf(nodes: WalletNode[], id: string): number {
  let level = 0;
  let cur = nodes.find((n) => n.id === id);
  while (cur && cur.parentId) {
    level++;
    const pid: string = cur.parentId;
    cur = nodes.find((n) => n.id === pid);
  }
  return level;
}

/** Parent, grandparent … up to the Total Budget. */
export function ancestorsOf(nodes: WalletNode[], id: string): WalletNode[] {
  const out: WalletNode[] = [];
  let cur = nodes.find((n) => n.id === id);
  while (cur && cur.parentId) {
    const pid: string = cur.parentId;
    const p = nodes.find((n) => n.id === pid);
    if (!p) break;
    out.push(p);
    cur = p;
  }
  return out;
}

export const allocatedOf = (nodes: WalletNode[], id: string) =>
  round2(childrenOf(nodes, id).reduce((s, c) => s + c.amount, 0));

export const availableOf = (nodes: WalletNode[], id: string) => {
  const n = nodes.find((x) => x.id === id);
  return n ? round2(n.amount - allocatedOf(nodes, id)) : 0;
};

// ---------- Helpers ----------
function checkAmount(amount: number, allowZero = false) {
  if (!Number.isFinite(amount)) fail('Please enter a valid amount.');
  if (amount < 0 || (!allowZero && amount === 0)) fail('Amount must be greater than 0.');
  if (amount > MAX_AMOUNT) fail('Amount is too large.');
}

function checkName(s: BudgetState, name: string, ignoreId?: string): string {
  const trimmed = name.trim();
  if (!trimmed) fail('Please enter a wallet name.');
  if (trimmed.length > 40) fail('Wallet name is too long (max 40 characters).');
  const dup = s.nodes.some(
    (n) => n.id !== ignoreId && n.name.toLowerCase() === trimmed.toLowerCase()
  );
  if (dup) fail(`A wallet named "${trimmed}" already exists.`);
  return trimmed;
}

function mapAmounts(nodes: WalletNode[], ids: Set<string>, delta: number): WalletNode[] {
  return nodes.map((n) => (ids.has(n.id) ? { ...n, amount: round2(n.amount + delta) } : n));
}

function tx(
  type: TxType,
  node: WalletNode,
  amount: number,
  description = ''
): Transaction {
  return {
    id: genId(),
    type,
    walletId: node.id,
    walletName: node.name,
    description,
    amount,
    date: new Date().toISOString(),
  };
}

// ---------- Operations ----------
export function setTotalBudget(s: BudgetState, amount: number): BudgetState {
  if (getRoot(s)) fail('Total Budget already exists. Use Deposit to add money.');
  checkAmount(amount);
  const root: WalletNode = {
    id: genId(),
    parentId: null,
    name: ROOT_NAME,
    amount: round2(amount),
    createdAt: new Date().toISOString(),
  };
  return { nodes: [root], transactions: [tx('deposit', root, root.amount, 'Initial budget')] };
}

export function addWallet(
  s: BudgetState,
  parentId: string,
  name: string,
  amount: number
): BudgetState {
  const parent = getNode(s, parentId) ?? fail('Parent wallet not found.');
  if (levelOf(s.nodes, parentId) >= MAX_LEVEL) fail('Sub-child wallets cannot have wallets of their own.');
  const clean = checkName(s, name);
  checkAmount(amount, true);
  const free = availableOf(s.nodes, parentId);
  if (amount > free + EPS)
    fail(`Not enough money in ${parent!.name}. Available to allocate: ₱${free.toFixed(2)}.`);
  const node: WalletNode = {
    id: genId(),
    parentId,
    name: clean,
    amount: round2(amount),
    createdAt: new Date().toISOString(),
  };
  const transactions = amount > 0 ? [tx('deposit', node, node.amount, `From ${parent!.name}`), ...s.transactions] : s.transactions;
  return { nodes: [...s.nodes, node], transactions };
}

export type DepositSource = 'parent' | 'new';

export function deposit(
  s: BudgetState,
  id: string,
  amount: number,
  source: DepositSource
): BudgetState {
  const node = getNode(s, id) ?? fail('Wallet not found.');
  checkAmount(amount);
  const isRoot = node!.parentId === null;
  let nodes: WalletNode[];
  let note: string;
  if (source === 'parent' && !isRoot) {
    const parent = getNode(s, node!.parentId!)!;
    const free = availableOf(s.nodes, parent.id);
    if (amount > free + EPS)
      fail(`Not enough money in ${parent.name}. Available to allocate: ₱${free.toFixed(2)}.`);
    nodes = mapAmounts(s.nodes, new Set([id]), amount);
    note = `From ${parent.name}`;
  } else {
    const ids = new Set([id, ...ancestorsOf(s.nodes, id).map((a) => a.id)]);
    nodes = mapAmounts(s.nodes, ids, amount);
    note = isRoot ? 'Added to budget' : 'New money';
  }
  return { nodes, transactions: [tx('deposit', node!, round2(amount), note), ...s.transactions] };
}

export function addExpense(
  s: BudgetState,
  id: string,
  description: string,
  amount: number
): BudgetState {
  const node = getNode(s, id) ?? fail('Wallet not found.');
  if (node!.parentId === null) fail('Expenses are made from wallets, not the Total Budget.');
  const desc = description.trim();
  if (!desc) fail('Please describe what you spent on.');
  checkAmount(amount);
  const free = availableOf(s.nodes, id);
  if (amount > free + EPS)
    fail(
      `Not enough money in ${node!.name}. Available: ₱${free.toFixed(2)}` +
        (childrenOf(s.nodes, id).length ? ' (the rest is allocated to its sub-wallets).' : '.')
    );
  const ids = new Set([id, ...ancestorsOf(s.nodes, id).map((a) => a.id)]);
  return {
    nodes: mapAmounts(s.nodes, ids, -amount),
    transactions: [tx('expense', node!, round2(amount), desc), ...s.transactions],
  };
}

export function renameWallet(s: BudgetState, id: string, name: string): BudgetState {
  const node = getNode(s, id) ?? fail('Wallet not found.');
  if (node!.parentId === null) fail('The Total Budget cannot be renamed.');
  const clean = checkName(s, name, id);
  return {
    nodes: s.nodes.map((n) => (n.id === id ? { ...n, name: clean } : n)),
    transactions: s.transactions.map((t) => (t.walletId === id ? { ...t, walletName: clean } : t)),
  };
}

/** Deletes a wallet and its sub-wallets. Their money returns to the parent's available pool. */
export function deleteWallet(s: BudgetState, id: string): BudgetState {
  const node = getNode(s, id) ?? fail('Wallet not found.');
  if (node!.parentId === null) fail('The Total Budget cannot be deleted. Use Reset instead.');
  const doomed = new Set<string>([id]);
  childrenOf(s.nodes, id).forEach((c) => doomed.add(c.id));
  return { ...s, nodes: s.nodes.filter((n) => !doomed.has(n.id)) };
}

/** Returns an error message if the state is not a consistent wallet tree, otherwise null. */
export function validateState(s: BudgetState): string | null {
  if (s.nodes.length === 0) return null;
  const roots = s.nodes.filter((n) => n.parentId === null);
  if (roots.length !== 1) return 'There must be exactly one Total Budget.';
  const ids = new Set(s.nodes.map((n) => n.id));
  if (ids.size !== s.nodes.length) return 'Duplicate wallet IDs found.';
  for (const n of s.nodes) {
    if (!Number.isFinite(n.amount) || n.amount < 0) return `Invalid amount for "${n.name}".`;
    if (n.parentId !== null && !ids.has(n.parentId)) return `"${n.name}" has a missing parent.`;
    if (levelOf(s.nodes, n.id) > MAX_LEVEL) return `"${n.name}" is nested too deeply.`;
    if (allocatedOf(s.nodes, n.id) > n.amount + EPS)
      return `Wallets under "${n.name}" hold more than "${n.name}" has.`;
  }
  return null;
}

// ---------- Aggregates for the dashboard ----------
export function totalSpent(s: BudgetState) {
  return round2(s.transactions.filter((t) => t.type === 'expense').reduce((a, t) => a + t.amount, 0));
}

export function spentByWallet(s: BudgetState): Record<string, number> {
  const out: Record<string, number> = {};
  s.transactions.forEach((t) => {
    if (t.type === 'expense') out[t.walletId] = round2((out[t.walletId] ?? 0) + t.amount);
  });
  return out;
}
