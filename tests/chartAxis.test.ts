import test from 'node:test';
import assert from 'node:assert/strict';
import { axisFor, clampZoom, labelEvery } from '../utils/chartAxis.ts';

test('strict 50 interval up to ₱500', () => {
  assert.deepEqual(axisFor(0), { step: 50, sections: 3 });
  assert.deepEqual(axisFor(120), { step: 50, sections: 3 });
  assert.deepEqual(axisFor(260), { step: 50, sections: 6 });
  assert.deepEqual(axisFor(500), { step: 50, sections: 10 });
});

test('above ₱500 the interval is adjusted to a round step', () => {
  assert.deepEqual(axisFor(501), { step: 100, sections: 6 });
  assert.deepEqual(axisFor(1000), { step: 100, sections: 10 });
  assert.deepEqual(axisFor(1300), { step: 200, sections: 7 });
  assert.deepEqual(axisFor(5000), { step: 500, sections: 10 });
  assert.deepEqual(axisFor(48000), { step: 5000, sections: 10 });
});

test('axis top always covers the max value', () => {
  for (const v of [1, 49, 51, 499, 501, 999, 1001, 7777, 123456]) {
    const { step, sections } = axisFor(v);
    assert.ok(step * sections >= v, `${v}`);
  }
});

test('zoom clamps and label interval is at least 2 days', () => {
  assert.equal(clampZoom(0.01), 0.15);
  assert.equal(clampZoom(99), 2.5);
  assert.equal(labelEvery(44), 2);
  assert.equal(labelEvery(100), 2);
  assert.ok(labelEvery(6.6) >= 7);
});