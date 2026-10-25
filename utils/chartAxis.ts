/** Axis and zoom rules for the daily-spending chart (kept pure so they can be unit-tested). */

export const STRICT_STEP = 50; // y-axis interval while the axis stays within STRICT_MAX
export const STRICT_MAX = 500; // above this the interval is adjusted
export const MIN_SECTIONS = 3;
export const MIN_ZOOM = 0.15;
export const MAX_ZOOM = 2.5;
export const ZOOM_FACTOR = 1.25;

const MAX_BANDS = STRICT_MAX / STRICT_STEP; // 10

/**
 * Up to ₱500 the axis uses the strict 50 interval.
 * Above ₱500 the interval becomes the smallest round step (100, 200, 250, 500, 1,000, 2,000…)
 * that keeps the axis within 10 bands.
 */
export function axisFor(maxValue: number): { step: number; sections: number } {
  const bands = Math.ceil(maxValue / STRICT_STEP);
  if (bands <= MAX_BANDS) return { step: STRICT_STEP, sections: Math.max(MIN_SECTIONS, bands) };
  for (let mag = 100; ; mag *= 10) {
    for (const m of [1, 2, 2.5, 5]) {
      const step = m * mag;
      if (Math.ceil(maxValue / step) <= MAX_BANDS) return { step, sections: Math.ceil(maxValue / step) };
    }
  }
}

export const clampZoom = (z: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));

/** Show a date label every N days: at least every 2 days, and never closer than `minPx` apart. */
export function labelEvery(dayWidth: number, minPx = 42): number {
  return Math.max(2, Math.ceil(minPx / dayWidth));
}