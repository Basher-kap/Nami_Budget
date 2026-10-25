import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/constants/theme';
import { peso } from '@/utils/format';
import { MAX_LEVEL, WalletNode } from '@/utils/budget';

export type NodeAction = 'expense' | 'deposit' | 'addWallet' | 'rename' | 'delete';

export const CARD_WIDTH = 172;

function Btn({ icon, color, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; color: string; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.btn} accessibilityLabel={label} hitSlop={4}>
      <Ionicons name={icon} size={20} color={color} />
    </TouchableOpacity>
  );
}

export function NodeCard({
  node, level, available, hasChildren, onAction,
}: {
  node: WalletNode; level: number; available: number; hasChildren: boolean;
  onAction: (a: NodeAction) => void;
}) {
  const isRoot = level === 0;
  return (
    <View style={[styles.card, isRoot ? styles.root : styles.dashed]}>
      <Text style={styles.name} numberOfLines={1}>{node.name}</Text>
      <Text style={styles.amount} numberOfLines={1} adjustsFontSizeToFit>{peso(node.amount)}</Text>
      {hasChildren && <Text style={styles.free}>Unallocated {peso(available)}</Text>}
      <View style={styles.actions}>
        {!isRoot && <Btn onPress={() => onAction('expense')} icon="remove-circle" color={COLORS.danger} label="Add expense" />}
        <Btn onPress={() => onAction('deposit')} icon="add-circle" color={COLORS.success} label="Deposit" />
        {level < MAX_LEVEL && <Btn onPress={() => onAction('addWallet')} icon="git-branch" color={COLORS.blue} label="Add wallet" />}
        {!isRoot && <Btn onPress={() => onAction('rename')} icon="pencil" color={COLORS.navy} label="Rename" />}
        {!isRoot && <Btn onPress={() => onAction('delete')} icon="trash" color={COLORS.muted} label="Delete" />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { width: CARD_WIDTH, marginHorizontal: 8, borderRadius: 22, paddingVertical: 10, paddingHorizontal: 10, alignItems: 'center', backgroundColor: '#fff' },
  root: { borderWidth: 2.5, borderColor: COLORS.primary, backgroundColor: COLORS.cream },
  dashed: { borderWidth: 2, borderColor: COLORS.accent, borderStyle: 'dashed' },
  name: { fontSize: 14, fontWeight: '700', color: COLORS.navy, maxWidth: '100%' },
  amount: { fontSize: 20, fontWeight: '900', color: COLORS.accent, marginTop: 2, maxWidth: '100%' },
  free: { fontSize: 10, color: COLORS.blue, fontWeight: '600', marginTop: 2 },
  actions: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 8 },
  btn: { padding: 2 },
});