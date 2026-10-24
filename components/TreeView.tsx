import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/constants/theme';
import { NodeCard, NodeAction } from './NodeCard';
import { WalletNode, availableOf, childrenOf } from '@/utils/budget';

type Props = {
  node: WalletNode; level: number; nodes: WalletNode[];
  onAction: (node: WalletNode, level: number, a: NodeAction) => void;
};

/** Renders a wallet and (recursively) its children as an org-chart with connector lines. */
export function Branch({ node, level, nodes, onAction }: Props) {
  const kids = childrenOf(nodes, node.id);
  return (
    <View style={styles.col}>
      <NodeCard
        node={node} level={level} hasChildren={kids.length > 0}
        available={availableOf(nodes, node.id)}
        onAction={(a) => onAction(node, level, a)}
      />
      {kids.length > 0 && (
        <>
          <View style={styles.stem} />
          <View style={styles.row}>
            {kids.map((k, i) => (
              <View key={k.id} style={styles.col}>
                {/* horizontal rail: left half hidden for first child, right half for last */}
                <View style={styles.rail}>
                  <View style={[styles.half, i === 0 && styles.hidden]} />
                  <View style={[styles.half, i === kids.length - 1 && styles.hidden]} />
                </View>
                <View style={styles.drop} />
                <Ionicons name="caret-down" size={14} color={COLORS.line} style={styles.arrow} />
                <Branch node={k} level={level + 1} nodes={nodes} onAction={onAction} />
              </View>
            ))}
          </View>
        </>
      )}
    </View>
  );
}

const LINE = 2;
const styles = StyleSheet.create({
  col: { alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  stem: { width: LINE, height: 14, backgroundColor: COLORS.line },
  rail: { flexDirection: 'row', alignSelf: 'stretch', height: LINE },
  half: { flex: 1, backgroundColor: COLORS.line },
  hidden: { backgroundColor: 'transparent' },
  drop: { width: LINE, height: 10, backgroundColor: COLORS.line },
  arrow: { marginTop: -4, marginBottom: -2 },
});
