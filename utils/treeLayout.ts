import type { WalletNode } from './budget';

/** Sizing and zoom rules for the Budget map (pure, so they can be unit-tested). */
export const CARD_WIDTH = 172;
export const CARD_MARGIN = 8;
export const SLOT = CARD_WIDTH + CARD_MARGIN * 2; // horizontal space one card occupies at 100%

export const MIN_ZOOM = 0.4;
export const MAX_ZOOM = 1.6;
export const ZOOM_FACTOR = 1.2;
/** Below this zoom the cards switch to an "overview" look (buttons hidden — too small to tap). */
export const COMPACT_BELOW = 0.6;

export const clampZoom = (z: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));

/** Width of a node's whole branch at 100% zoom: the wider of its own card or its children side by side. */
export function treeWidth(nodes: WalletNode[], id: string): number {
  const kids = nodes.filter((n) => n.parentId === id);
  if (kids.length === 0) return SLOT;
  return Math.max(SLOT, kids.reduce((sum, k) => sum + treeWidth(nodes, k.id), 0));
}

/** Zoom level at which the whole map fits the given width (never above 100%). */
export function fitZoom(nodes: WalletNode[], rootId: string, containerWidth: number, padding = 16): number {
  if (containerWidth <= 0) return 1;
  return clampZoom(Math.min(1, (containerWidth - padding) / treeWidth(nodes, rootId)));
}