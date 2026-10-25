import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/constants/theme';
import { peso } from '@/utils/format';
import { MAX_LEVEL, WalletNode } from '@/utils/budget';
import { CARD_MARGIN, CARD_WIDTH, COMPACT_BELOW } from '@/utils/treeLayout';

export type NodeAction = 'expense' | 'deposit' | 'addWallet' | 'rename' | 'delete';

function Btn({ icon, color, label, onPress, size, pad }: { icon: keyof typeof Ionicons.glyphMap; color: string; label: string; onPress: () => void; size: number; pad: number }) {
  return (
    <TouchableOpacity onPress={onPress} style={{ padding: pad }} accessibilityLabel={label} hitSlop={4}>
      <Ionicons name={icon} size={size} color={color} />
    </TouchableOpacity>
  );
}

/** A wallet box. `scale` (zoom) resizes the real layout so the surrounding scroll area stays correct. */
export function NodeCard({
  node, level, available, hasChildren, scale, onAction,
}: {
  node: WalletNode; level: number; available: number; hasChildren: boolean; scale: number;
  onAction: (a: NodeAction) => void;
}) {
  const isRoot = level === 0;
  const s = scale;
  const compact = s < COMPACT_BELOW;
  return (
    <View
      style={[
        styles.card,
        isRoot ? styles.root : styles.dashed,
        {
          width: CARD_WIDTH * s, marginHorizontal: CARD_MARGIN * s, borderRadius: 22 * s,
          paddingVertical: 10 * s, paddingHorizontal: 10 * s, borderWidth: Math.max(1, (isRoot ? 2.5 : 2) * s),
        },
      ]}
    >
      <Text style={[styles.name, { fontSize: 14 * s }]} numberOfLines={1}>{node.name}</Text>
      <Text style={[styles.amount, { fontSize: 20 * s, marginTop: 2 * s }]} numberOfLines={1} adjustsFontSizeToFit>{peso(node.amount)}</Text>
      {hasChildren && !compact && (
        <Text style={[styles.free, { fontSize: 10 * s, marginTop: 2 * s }]}>Unallocated {peso(available)}</Text>
      )}
      {!compact && (
        <View style={[styles.actions, { gap: 6 * s, marginTop: 8 * s }]}>
          {!isRoot && <Btn onPress={() => onAction('expense')} icon="remove-circle" color={COLORS.danger} label="Add expense" size={20 * s} pad={2 * s} />}
          <Btn onPress={() => onAction('deposit')} icon="add-circle" color={COLORS.success} label="Deposit" size={20 * s} pad={2 * s} />
          {level < MAX_LEVEL && <Btn onPress={() => onAction('addWallet')} icon="git-branch" color={COLORS.blue} label="Add wallet" size={20 * s} pad={2 * s} />}
          {!isRoot && <Btn onPress={() => onAction('rename')} icon="pencil" color={COLORS.navy} label="Rename" size={20 * s} pad={2 * s} />}
          {!isRoot && <Btn onPress={() => onAction('delete')} icon="trash" color={COLORS.muted} label="Delete" size={20 * s} pad={2 * s} />}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: 'center', backgroundColor: '#fff' },
  root: { borderColor: COLORS.primary, backgroundColor: COLORS.cream },
  dashed: { borderColor: COLORS.accent, borderStyle: 'dashed' },
  name: { fontWeight: '700', color: COLORS.navy, maxWidth: '100%' },
  amount: { fontWeight: '900', color: COLORS.accent, maxWidth: '100%' },
  free: { color: COLORS.blue, fontWeight: '600' },
  actions: { flexDirection: 'row', justifyContent: 'center' },
});