import * as XLSX from 'xlsx';
import {
  BudgetState, WalletNode, Transaction, levelOf, validateState, round2, ROOT_NAME,
} from './budget';
import { formatDateTime } from './format';

const WALLETS = 'Wallets';
const EXPENSES = 'Expenses';
const DEPOSITS = 'Deposits';

/** Builds the workbook: Wallets (the tree), Expenses and Deposits tables. */
export function buildWorkbook(state: BudgetState): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();
  const nameOf = (id: string | null) => state.nodes.find((n) => n.id === id)?.name ?? '';

  const wallets = state.nodes.map((n) => ({
    'Wallet Name': n.name,
    Level: levelOf(state.nodes, n.id) === 0 ? 'Total Budget' : levelOf(state.nodes, n.id) === 1 ? 'Child' : 'Sub-Child',
    'Parent Wallet': nameOf(n.parentId),
    Amount: n.amount,
    Created: formatDateTime(n.createdAt),
    'Wallet ID': n.id,
    'Parent ID': n.parentId ?? '',
  }));
  const expenses = state.transactions
    .filter((t) => t.type === 'expense')
    .map((t) => ({
      'Wallet Name': t.walletName, Expense: t.description, Amount: t.amount,
      Date: formatDateTime(t.date), 'Wallet ID': t.walletId, 'ID': t.id,
    }));
  const deposits = state.transactions
    .filter((t) => t.type === 'deposit')
    .map((t) => ({
      'Wallet Name': t.walletName, Amount: t.amount, Date: formatDateTime(t.date),
      Note: t.description, 'Wallet ID': t.walletId, 'ID': t.id,
    }));

  const add = (rows: object[], name: string, headers: string[]) => {
    const ws = XLSX.utils.json_to_sheet(rows, { header: headers });
    ws['!cols'] = headers.map((h) => ({ wch: Math.max(12, h.length + 2) }));
    XLSX.utils.book_append_sheet(wb, ws, name);
  };
  add(wallets, WALLETS, ['Wallet Name', 'Level', 'Parent Wallet', 'Amount', 'Created', 'Wallet ID', 'Parent ID']);
  add(expenses, EXPENSES, ['Wallet Name', 'Expense', 'Amount', 'Date', 'Wallet ID', 'ID']);
  add(deposits, DEPOSITS, ['Wallet Name', 'Amount', 'Date', 'Note', 'Wallet ID', 'ID']);
  return wb;
}

export const workbookToBase64 = (state: BudgetState) =>
  XLSX.write(buildWorkbook(state), { type: 'base64', bookType: 'xlsx' }) as string;

const str = (v: unknown) => (v == null ? '' : String(v).trim());
const num = (v: unknown) => (typeof v === 'number' ? v : Number(String(v ?? '').replace(/,/g, '')));
function toIso(v: unknown): string {
  let d: Date;
  if (v instanceof Date) d = v;
  else if (typeof v === 'number') d = new Date(Math.round((v - 25569) * 86400 * 1000)); // Excel serial
  else d = new Date(str(v).replace(' ', 'T'));
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}
const uid = (prefix: string, i: number) => `${prefix}${Date.now().toString(36)}${i}`;

/** Parses a workbook produced by `buildWorkbook` (or hand-edited in Excel). Throws on bad data. */
export function parseWorkbook(wb: XLSX.WorkBook): BudgetState {
  const sheet = (name: string) => {
    const ws = wb.Sheets[name];
    return ws ? (XLSX.utils.sheet_to_json(ws, { defval: '', raw: true }) as Record<string, unknown>[]) : [];
  };
  const walletRows = sheet(WALLETS);
  if (walletRows.length === 0) throw new Error('No "Wallets" sheet found. Use a file exported from Nami Budget.');

  // Allow rows without IDs by falling back to wallet names.
  const idByName: Record<string, string> = {};
  const nodes: WalletNode[] = walletRows.map((r, i) => {
    const name = str(r['Wallet Name']);
    const id = str(r['Wallet ID']) || uid('w', i);
    idByName[name.toLowerCase()] = id;
    return { id, parentId: null, name, amount: round2(num(r['Amount'])), createdAt: toIso(r['Created']) };
  });
  walletRows.forEach((r, i) => {
    const pid = str(r['Parent ID']);
    const pname = str(r['Parent Wallet']);
    nodes[i].parentId = pid || (pname ? idByName[pname.toLowerCase()] ?? `missing:${pname}` : null);
    if (!nodes[i].name) throw new Error(`Wallets row ${i + 2} has no name.`);
    if (nodes[i].parentId === null) nodes[i].name = ROOT_NAME;
  });

  const idFor = (r: Record<string, unknown>) => str(r['Wallet ID']) || idByName[str(r['Wallet Name']).toLowerCase()] || '';
  const transactions: Transaction[] = [];
  sheet(EXPENSES).forEach((r, i) => {
    const amount = num(r['Amount']);
    if (!Number.isFinite(amount) || amount <= 0) throw new Error(`Expenses row ${i + 2} has an invalid amount.`);
    transactions.push({
      id: str(r['ID']) || uid('e', i), type: 'expense', walletId: idFor(r), walletName: str(r['Wallet Name']),
      description: str(r['Expense']), amount: round2(amount), date: toIso(r['Date']),
    });
  });
  sheet(DEPOSITS).forEach((r, i) => {
    const amount = num(r['Amount']);
    if (!Number.isFinite(amount) || amount <= 0) throw new Error(`Deposits row ${i + 2} has an invalid amount.`);
    transactions.push({
      id: str(r['ID']) || uid('d', i), type: 'deposit', walletId: idFor(r), walletName: str(r['Wallet Name']),
      description: str(r['Note']), amount: round2(amount), date: toIso(r['Date']),
    });
  });
  transactions.sort((a, b) => b.date.localeCompare(a.date));

  const state = { nodes, transactions };
  const problem = validateState(state);
  if (problem) throw new Error(problem);
  return state;
}

export const base64ToState = (b64: string) => parseWorkbook(XLSX.read(b64, { type: 'base64', cellDates: true }));
export const bufferToState = (buf: ArrayBuffer) => parseWorkbook(XLSX.read(buf, { type: 'array', cellDates: true }));
