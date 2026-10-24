import test from 'node:test';
import assert from 'node:assert/strict';
import * as B from '../utils/budget.ts';
import { evaluate } from '../utils/calc.ts';
import { parseAmount, peso } from '../utils/format.ts';

const byName = (s: B.BudgetState, n: string) => s.nodes.find((x) => x.name === n)!;

/** Builds the exact diagram: Total 100 → GCash 50 (→ Shopping 10, Gaming 40), Personal 20 */
function diagram() {
  let s = B.setTotalBudget(B.emptyState, 100);
  const root = B.getRoot(s)!;
  s = B.addWallet(s, root.id, 'GCash', 50);
  s = B.addWallet(s, root.id, 'Personal', 20);
  s = B.addWallet(s, byName(s, 'GCash').id, 'For Online Shopping', 10);
  s = B.addWallet(s, byName(s, 'GCash').id, 'For Gaming', 40);
  return s;
}

test('diagram scenario builds as drawn', () => {
  const s = diagram();
  assert.equal(B.getRoot(s)!.amount, 100);
  assert.equal(byName(s, 'GCash').amount, 50);
  assert.equal(B.availableOf(s.nodes, B.getRoot(s)!.id), 30);
  assert.equal(B.availableOf(s.nodes, byName(s, 'GCash').id), 0);
  assert.equal(B.validateState(s), null);
});

test('expense on Personal: 20 - 10 = 10 and Total Budget becomes 90', () => {
  const s0 = diagram();
  const s1 = B.addExpense(s0, byName(s0, 'Personal').id, 'Dinner', 10);
  assert.equal(byName(s1, 'Personal').amount, 10);
  assert.equal(B.getRoot(s1)!.amount, 90);
  assert.equal(s1.transactions[0].type, 'expense');
  assert.equal(s1.transactions[0].description, 'Dinner');
});

test('sub-child expense cascades to child and total', () => {
  const s0 = diagram();
  const s1 = B.addExpense(s0, byName(s0, 'For Gaming').id, 'Game', 15);
  assert.equal(byName(s1, 'For Gaming').amount, 25);
  assert.equal(byName(s1, 'GCash').amount, 35);
  assert.equal(B.getRoot(s1)!.amount, 85);
  assert.equal(B.validateState(s1), null);
});

test('cannot overspend a wallet or spend money allocated to sub-wallets', () => {
  const s0 = diagram();
  assert.throws(() => B.addExpense(s0, byName(s0, 'Personal').id, 'x', 20.01), B.BudgetError);
  assert.throws(() => B.addExpense(s0, byName(s0, 'GCash').id, 'x', 1), B.BudgetError); // all 50 allocated
  assert.throws(() => B.addExpense(s0, B.getRoot(s0)!.id, 'x', 1), B.BudgetError);
});

test('cannot allocate more than the parent has available', () => {
  const s0 = diagram(); // 30 unallocated in Total Budget
  assert.throws(() => B.addWallet(s0, B.getRoot(s0)!.id, 'Savings', 30.01), B.BudgetError);
  const s1 = B.addWallet(s0, B.getRoot(s0)!.id, 'Savings', 30);
  assert.equal(B.availableOf(s1.nodes, B.getRoot(s1)!.id), 0);
  assert.throws(() => B.deposit(s1, byName(s1, 'Personal').id, 1, 'parent'), B.BudgetError);
});

test('deposit from parent moves money, total unchanged', () => {
  const s0 = diagram();
  const s1 = B.deposit(s0, byName(s0, 'Personal').id, 25, 'parent');
  assert.equal(byName(s1, 'Personal').amount, 45);
  assert.equal(B.getRoot(s1)!.amount, 100);
  assert.equal(B.availableOf(s1.nodes, B.getRoot(s1)!.id), 5);
});

test('new-money deposit cascades up to Total Budget', () => {
  const s0 = diagram();
  const s1 = B.deposit(s0, byName(s0, 'For Online Shopping').id, 5, 'new');
  assert.equal(byName(s1, 'For Online Shopping').amount, 15);
  assert.equal(byName(s1, 'GCash').amount, 55);
  assert.equal(B.getRoot(s1)!.amount, 105);
  assert.equal(B.validateState(s1), null);
});

test('Total Budget deposit (edit) adds money', () => {
  const s0 = diagram();
  const s1 = B.deposit(s0, B.getRoot(s0)!.id, 50, 'new');
  assert.equal(B.getRoot(s1)!.amount, 150);
  assert.equal(B.availableOf(s1.nodes, B.getRoot(s1)!.id), 80);
});

test('max depth, duplicate names, rename, delete', () => {
  const s0 = diagram();
  assert.throws(() => B.addWallet(s0, byName(s0, 'For Gaming').id, 'Deep', 0), B.BudgetError);
  assert.throws(() => B.addWallet(s0, B.getRoot(s0)!.id, 'gcash', 0), B.BudgetError);
  const s1 = B.renameWallet(s0, byName(s0, 'Personal').id, 'Pocket');
  assert.ok(byName(s1, 'Pocket'));
  const s2 = B.deleteWallet(s0, byName(s0, 'GCash').id);
  assert.equal(s2.nodes.length, 2);
  assert.equal(B.availableOf(s2.nodes, B.getRoot(s2)!.id), 80); // 50 returns to pool
  assert.equal(B.validateState(s2), null);
});

test('invalid amounts are rejected', () => {
  const s0 = diagram();
  for (const bad of [0, -5, NaN, Infinity]) assert.throws(() => B.addExpense(s0, byName(s0, 'Personal').id, 'x', bad), B.BudgetError);
});

test('calculator evaluates safely', () => {
  assert.equal(evaluate('2+3×4'), 14);
  assert.equal(evaluate('(2+3)×4'), 20);
  assert.equal(evaluate('10÷4'), 2.5);
  assert.equal(evaluate('0.1+0.2'), 0.3);
  assert.equal(evaluate('50%'), 0.5);
  assert.equal(evaluate('-3+5'), 2);
  assert.throws(() => evaluate('1÷0'));
  assert.throws(() => evaluate('2+'));
  assert.throws(() => evaluate('alert(1)'));
});

test('format helpers', () => {
  assert.equal(peso(1234.5), '₱1,234.50');
  assert.ok(Number.isNaN(parseAmount('abc')));
  assert.equal(parseAmount('1,200.5'), 1200.5);
});
