import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS, cardShadow } from '@/constants/theme';
import { useBudget } from '@/context/BudgetContext';
import { Branch } from '@/components/TreeView';
import { NodeAction } from '@/components/NodeCard';
import { ModalMode, NodeActionModal } from '@/components/NodeActionModal';
import { WalletNode, allocatedOf, availableOf, getRoot, childrenOf } from '@/utils/budget';
import { peso } from '@/utils/format';

export default function BudgetScreen() {
  const router = useRouter();
  const { state, ready, deleteWallet } = useBudget();
  const [modal, setModal] = useState<{ mode: ModalMode; nodeId: string | null } | null>(null);
  const root = getRoot(state);

  const onAction = (node: WalletNode, _level: number, a: NodeAction) => {
    if (a === 'delete') {
      const subs = childrenOf(state.nodes, node.id).length;
      Alert.alert(
        'Delete wallet?',
        `"${node.name}"${subs ? ` and its ${subs} sub-wallet(s)` : ''} will be removed. Their remaining money goes back to the wallet above. Past transactions stay in History.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: () => { try { deleteWallet(node.id); } catch (e) { Alert.alert('Error', String(e instanceof Error ? e.message : e)); } } },
        ]
      );
      return;
    }
    setModal({ mode: a, nodeId: node.id });
  };

  if (!ready) return <View style={styles.container} />;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {!root ? (
          <View style={[styles.empty, cardShadow]}>
            <Text style={styles.emoji}>🍊</Text>
            <Text style={styles.emptyTitle}>Start your voyage!</Text>
            <Text style={styles.emptyText}>
              Enter your Total Budget. It becomes the origin of your map — then branch it into wallets and sub-wallets.
            </Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => setModal({ mode: 'setBudget', nodeId: null })}>
              <Ionicons name="flag" size={18} color="#fff" />
              <Text style={styles.primaryText}>Set Total Budget</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.summary}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Total Budget</Text>
                <Text style={styles.summaryValue}>{peso(root.amount)}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>In wallets</Text>
                <Text style={styles.summaryValue}>{peso(allocatedOf(state.nodes, root.id))}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Unallocated</Text>
                <Text style={[styles.summaryValue, { color: COLORS.blue }]}>{peso(availableOf(state.nodes, root.id))}</Text>
              </View>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={styles.treeScroll}>
              <Branch node={root} level={0} nodes={state.nodes} onAction={onAction} />
            </ScrollView>

            <Text style={styles.legend}>
              <Text style={{ color: COLORS.danger }}>−</Text> expense   <Text style={{ color: COLORS.success }}>+</Text> deposit   <Text style={{ color: COLORS.blue }}>⑂</Text> add wallet
            </Text>
          </>
        )}

        <TouchableOpacity style={styles.historyBtn} onPress={() => router.push('/history')}>
          <Ionicons name="receipt" size={18} color="#fff" />
          <Text style={styles.primaryText}>History Page</Text>
        </TouchableOpacity>
      </ScrollView>

      <NodeActionModal mode={modal?.mode ?? null} nodeId={modal?.nodeId ?? null} onClose={() => setModal(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  summary: { flexDirection: 'row', margin: 14, padding: 14, backgroundColor: '#fff', borderRadius: 18, borderWidth: 2, borderColor: COLORS.cream, ...cardShadow },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryLabel: { fontSize: 11, color: COLORS.muted, fontWeight: '700', textTransform: 'uppercase' },
  summaryValue: { fontSize: 15, fontWeight: '900', color: COLORS.accent, marginTop: 4 },
  treeScroll: { flexGrow: 1, justifyContent: 'center', paddingVertical: 16, paddingHorizontal: 8 },
  legend: { textAlign: 'center', color: COLORS.muted, fontSize: 12, marginBottom: 12 },
  empty: { margin: 20, padding: 24, backgroundColor: '#fff', borderRadius: 22, alignItems: 'center', borderWidth: 2, borderColor: COLORS.cream },
  emoji: { fontSize: 48 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: COLORS.accent, marginTop: 8 },
  emptyText: { textAlign: 'center', color: COLORS.navy, marginVertical: 12, lineHeight: 20 },
  primaryBtn: { flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: COLORS.primary, paddingHorizontal: 22, paddingVertical: 12, borderRadius: 24 },
  historyBtn: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.blue, marginHorizontal: 20, marginTop: 8, paddingVertical: 14, borderRadius: 24 },
  primaryText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
