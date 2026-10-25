import React, { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { COLORS } from '@/constants/theme';
import { useBudget } from '@/context/BudgetContext';
import { SegmentedControl } from '@/components/SegmentedControl';
import { Transaction } from '@/utils/budget';
import { formatDate, peso } from '@/utils/format';

type Tab = 'expense' | 'deposit';

/** Text columns wrap onto extra lines; the amount column stays on one line (shrinking slightly if needed). */
function Cell({ children, flex, style, singleLine }: { children: React.ReactNode; flex: number; style?: object; singleLine?: boolean }) {
  return (
    <Text
      style={[styles.cell, { flex }, style]}
      {...(singleLine ? { numberOfLines: 1, adjustsFontSizeToFit: true, minimumFontScale: 0.75 } : {})}
    >
      {children}
    </Text>
  );
}

export default function History() {
  const { state } = useBudget();
  const [tab, setTab] = useState<Tab>('expense');

  const rows = useMemo(
    () => state.transactions.filter((t) => t.type === tab).sort((a, b) => b.date.localeCompare(a.date)),
    [state.transactions, tab]
  );
  const total = rows.reduce((s, t) => s + t.amount, 0);
  const isExp = tab === 'expense';

  const header = (
    <View style={[styles.row, styles.headerRow]}>
      <Cell flex={1.4} style={styles.headerCell}>Wallet Name</Cell>
      {isExp && <Cell flex={2} style={styles.headerCell}>Expense</Cell>}
      <Cell flex={1.2} style={styles.headerCell}>Amount</Cell>
      <Cell flex={1.2} style={styles.headerCell}>Date</Cell>
    </View>
  );

  const renderItem = ({ item, index }: { item: Transaction; index: number }) => (
    <View style={[styles.row, index % 2 === 1 && styles.zebra]}>
      <Cell flex={1.4}>{item.walletName}</Cell>
      {isExp && <Cell flex={2}>{item.description}</Cell>}
      <Cell flex={1.2} singleLine style={{ color: isExp ? COLORS.danger : COLORS.success, fontWeight: '700' }}>{peso(item.amount)}</Cell>
      <Cell flex={1.2}>{formatDate(item.date)}</Cell>
    </View>
  );

  return (
    <View style={styles.container}>
      <SegmentedControl
        options={[
          { key: 'expense', label: 'Expenses', icon: 'cash-outline' },
          { key: 'deposit', label: 'Deposits', icon: 'add-circle-outline' },
        ]}
        value={tab}
        onChange={setTab}
      />
      <Text style={styles.summary}>
        {rows.length} record{rows.length === 1 ? '' : 's'} • Total {peso(total)}
      </Text>
      <FlatList
        data={rows}
        keyExtractor={(t) => t.id}
        renderItem={renderItem}
        ListHeaderComponent={rows.length ? header : undefined}
        ListEmptyComponent={<Text style={styles.empty}>No {isExp ? 'expenses' : 'deposits'} recorded yet.</Text>}
        contentContainerStyle={styles.table}
        stickyHeaderIndices={rows.length ? [0] : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, padding: 16 },
  summary: { color: COLORS.navy, fontWeight: '600', marginVertical: 12, textAlign: 'center' },
  table: { backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border },
  row: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 12, paddingHorizontal: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border, backgroundColor: '#fff' },
  zebra: { backgroundColor: COLORS.bg },
  headerRow: { backgroundColor: COLORS.primary, borderBottomWidth: 0 },
  headerCell: { color: '#fff', fontWeight: '800' },
  cell: { fontSize: 13, lineHeight: 18, color: COLORS.navy, paddingHorizontal: 4 },
  empty: { textAlign: 'center', color: COLORS.muted, fontStyle: 'italic', padding: 30 },
});