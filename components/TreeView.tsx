import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/constants/theme';
import { NodeCard, NodeAction } from './NodeCard';
import { WalletNode, availableOf, childrenOf } from '@/utils/budget';

type Props = {
  node: WalletNode; level: number; nodes: WalletNode[]; scale: number;
  onAction: (node: WalletNode, level: number, a: NodeAction) => void;
};

/** Renders a wallet and (recursively) its children as an org-chart with connector lines, at the given zoom. */
export function Branch({ node, level, nodes, scale, onAction }: Props) {
  const kids = childrenOf(nodes, node.id);
  const lw = Math.max(1, 2 * scale); // connector line thickness
  const line = COLORS.line;
  return (
    <View style={{ alignItems: 'center' }}>
      <NodeCard
        node={node} level={level} hasChildren={kids.length > 0} scale={scale}
        available={availableOf(nodes, node.id)}
        onAction={(a) => onAction(node, level, a)}
      />
      {kids.length > 0 && (
        <>
          <View style={{ width: lw, height: 14 * scale, backgroundColor: line }} />
          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            {kids.map((k, i) => (
              <View key={k.id} style={{ alignItems: 'center' }}>
                {/* horizontal rail: left half hidden for the first child, right half for the last */}
                <View style={{ flexDirection: 'row', alignSelf: 'stretch', height: lw }}>
                  <View style={{ flex: 1, backgroundColor: i === 0 ? 'transparent' : line }} />
                  <View style={{ flex: 1, backgroundColor: i === kids.length - 1 ? 'transparent' : line }} />
                </View>
                <View style={{ width: lw, height: 10 * scale, backgroundColor: line }} />
                <Ionicons name="caret-down" size={Math.max(8, 14 * scale)} color={line} style={{ marginTop: -4 * scale, marginBottom: -2 * scale }} />
                <Branch node={k} level={level + 1} nodes={nodes} scale={scale} onAction={onAction} />
              </View>
            ))}
          </View>
        </>
      )}
    </View>
  );
}