import test from 'node:test';
import assert from 'node:assert/strict';
import * as B from '../utils/budget.ts';
import { SLOT, clampZoom, fitZoom, treeWidth } from '../utils/treeLayout.ts';

function diagram() {
  let s = B.setTotalBudget(B.emptyState, 100);
  const root = B.getRoot(s)!;
  s = B.addWallet(s, root.id, 'GCash', 50);
  s = B.addWallet(s, root.id, 'Personal', 20);
  s = B.addWallet(s, s.nodes.find((n) => n.name === 'GCash')!.id, 'Shopping', 10);
  s = B.addWallet(s, s.nodes.find((n) => n.name === 'GCash')!.id, 'Gaming', 40);
  return s;
}

test('tree width = widest row of children side by side', () => {
  const s = diagram();
  // GCash has 2 sub-wallets (2 slots), Personal has none (1 slot) → root branch is 3 slots wide
  assert.equal(treeWidth(s.nodes, s.nodes.find((n) => n.name === 'GCash')!.id), 2 * SLOT);
  assert.equal(treeWidth(s.nodes, B.getRoot(s)!.id), 3 * SLOT);
  const solo = B.setTotalBudget(B.emptyState, 10);
  assert.equal(treeWidth(solo.nodes, B.getRoot(solo)!.id), SLOT);
});

test('fit zoom shrinks to the container but never above 100% or below the minimum', () => {
  const s = diagram();
  const id = B.getRoot(s)!.id;
  const w = treeWidth(s.nodes, id);
  assert.equal(fitZoom(s.nodes, id, 10_000), 1);
  const z = fitZoom(s.nodes, id, 360);
  assert.ok(z < 1 && z >= 0.4);
  assert.ok(w * z <= 360 - 16 + 1e-6 || z === 0.4);
  assert.equal(fitZoom(s.nodes, id, 0), 1);
  assert.equal(clampZoom(0.01), 0.4);
  assert.equal(clampZoom(9), 1.6);
});