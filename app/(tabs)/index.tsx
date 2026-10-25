import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { BarChart, LineChart, PieChart } from 'react-native-gifted-charts';
import { CHART_COLORS, COLORS, cardShadow } from '@/constants/theme';
import { useBudget } from '@/context/BudgetContext';
import { allocatedOf, childrenOf, getRoot, round2, spentByWallet, totalSpent } from '@/utils/budget';
import { dayKey, peso, shortDay } from '@/utils/format';
import { exportToExcel, pickExcel } from '@/utils/files';

// Daily-spending line graph
const LINE_STEP = 50; // y-axis interval (₱)
const LINE_MIN_DAYS = 7; // always show at least a week so a single expense still looks like a graph
const LINE_DAY_SPACING = 44; // px between days
const LINE_SECTION_H = 38; // px per 50-peso band: the chart grows taller as spending grows
const LINE_MIN_SECTIONS = 3;
const LINE_MAX_SECTIONS = 12; // beyond this the step grows in multiples of 50 so the chart stays usable

export default function Dashboard() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { state, ready, replaceAll, resetAll } = useBudget();
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const chartWidth = width - 32 - 40 - 40; // screen − section margin − padding − y-axis space

  const root = getRoot(state);
  const topLevel = root ? childrenOf(state.nodes, root.id) : [];
  const spentMap = useMemo(() => spentByWallet(state), [state]);
  const colorOf = useMemo(() => {
    const m: Record<string, string> = {};
    // order: children first, then sub-children under each, for stable legend colours
    state.nodes.filter((n) => n.parentId !== null).forEach((n, i) => (m[n.id] = CHART_COLORS[i % CHART_COLORS.length]));
    return m;
  }, [state.nodes]);

  // ---- Cards ----
  const total = root?.amount ?? 0;
  const allocated = root ? allocatedOf(state.nodes, root.id) : 0;
  const unallocated = round2(total - allocated);
  const spent = totalSpent(state);
  const topSpender = Object.entries(spentMap).sort((a, b) => b[1] - a[1])[0];
  const topSpenderName = topSpender ? state.transactions.find((t) => t.walletId === topSpender[0])?.walletName ?? '—' : '—';

  // ---- Pie: wallet amounts vs Total Budget ----
  const pieSlices = [
    ...topLevel.filter((n) => n.amount > 0).map((n) => ({ label: n.name, value: n.amount, color: colorOf[n.id] })),
    ...(unallocated > 0 ? [{ label: 'Unallocated', value: unallocated, color: COLORS.unallocated }] : []),
  ];
  const pieData = pieSlices.map((s) => ({
    value: s.value, color: s.color, text: total > 0 ? `${Math.round((s.value / total) * 100)}%` : '',
  }));

  // ---- Line: daily spending, newest day on the LEFT, continuous back to the first expense ----
  const line = useMemo(() => {
    const perDay: Record<string, number> = {};
    let earliestMs = Infinity;
    state.transactions.forEach((t) => {
      if (t.type !== 'expense') return;
      const d = new Date(t.date);
      perDay[dayKey(d)] = (perDay[dayKey(d)] ?? 0) + t.amount;
      earliestMs = Math.min(earliestMs, d.getTime());
    });
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let days = LINE_MIN_DAYS;
    if (Number.isFinite(earliestMs)) {
      const first = new Date(earliestMs);
      first.setHours(0, 0, 0, 0);
      days = Math.max(days, Math.round((today.getTime() - first.getTime()) / 86_400_000) + 1);
    }
    const data: { value: number; label: string }[] = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i); // i = 0 is today (left), larger i = older (right)
      data.push({
        value: round2(perDay[dayKey(d)] ?? 0),
        label: i % 2 === 0 ? (i === 0 ? 'Today' : shortDay(d)) : '', // a label every 2 days
      });
    }
    const maxVal = Math.max(...data.map((d) => d.value), 0);
    let step = LINE_STEP;
    let sections = Math.max(LINE_MIN_SECTIONS, Math.ceil(maxVal / step));
    if (sections > LINE_MAX_SECTIONS) {
      // too many 50-peso bands: use the smallest round step (100, 200, 250, 500, 1000…) that fits
      let mag = 100;
      step = 0;
      while (!step) {
        step = [1, 2, 2.5, 5].map((m) => m * mag).find((s) => Math.ceil(maxVal / s) <= LINE_MAX_SECTIONS) ?? 0;
        mag *= 10;
      }
      sections = Math.ceil(maxVal / step);
    }
    return { data, step, sections, days };
  }, [state.transactions]);
  const hasSpending = spent > 0;

  // ---- Clustered bars: each child wallet = a cluster; its own spending + each sub-wallet ----
  const BAR_W = 22;
  const barData = useMemo(() => {
    const items: any[] = [];
    topLevel.forEach((c) => {
      const members = [
        { id: c.id, value: spentMap[c.id] ?? 0 },
        ...childrenOf(state.nodes, c.id).map((s) => ({ id: s.id, value: spentMap[s.id] ?? 0 })),
      ];
      const groupWidth = members.length * BAR_W + (members.length - 1) * 4;
      members.forEach((m, i) => {
        items.push({
          value: m.value,
          frontColor: colorOf[m.id],
          spacing: i === members.length - 1 ? 28 : 4,
          ...(i === 0
            ? { label: c.name.length > 12 ? c.name.slice(0, 11) + '…' : c.name, labelWidth: Math.max(groupWidth, 56), labelTextStyle: { color: COLORS.navy, fontSize: 10, textAlign: 'center' as const } }
            : {}),
          topLabelComponent: () => (m.value > 0 ? <Text style={styles.barTop}>{Math.round(m.value)}</Text> : null),
        });
      });
    });
    return items;
  }, [state.nodes, spentMap, colorOf]); // eslint-disable-line react-hooks/exhaustive-deps
  const barMax = Math.max(...Object.values(spentMap), 1) * 1.15;

  // ---- Actions ----
  const onExport = async () => {
    if (!root) return Alert.alert('Nothing to export', 'Set up your Total Budget first.');
    try { setBusy(true); await exportToExcel(state); }
    catch (e) { Alert.alert('Export failed', e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  };
  const onImport = async () => {
    try {
      setBusy(true);
      const imported = await pickExcel();
      if (!imported) return;
      Alert.alert(
        'Replace all data?',
        `This file has ${imported.nodes.length} wallet(s) and ${imported.transactions.length} transaction(s). Your current data will be replaced.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Import', style: 'destructive', onPress: () => { replaceAll(imported); Alert.alert('Imported', 'Your data has been restored.'); } },
        ]
      );
    } catch (e) {
      Alert.alert('Import failed', e instanceof Error ? e.message : String(e));
    } finally { setBusy(false); }
  };
  const onReset = () =>
    Alert.alert('🚨 Reset all data', 'Delete your Total Budget, all wallets and history? This cannot be undone. Tip: export first!', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete everything', style: 'destructive', onPress: resetAll },
    ]);
  const onRefresh = useCallback(async () => { setRefreshing(true); setTimeout(() => setRefreshing(false), 400); }, []);

  if (!ready) return <View style={styles.center}><ActivityIndicator color={COLORS.primary} size="large" /></View>;

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}>
      <View style={styles.header}>
        <Text style={styles.title}>🍊 Nami Budget</Text>
        <Text style={styles.subtitle}>{"Navigator's treasure dashboard"}</Text>
        <View style={styles.headerButtons}>
          <HeaderBtn icon="share-outline" label="Export" onPress={onExport} />
          <HeaderBtn icon="download-outline" label="Import" onPress={onImport} />
          <HeaderBtn icon="trash-outline" label="Reset" onPress={onReset} danger />
        </View>
        {busy && <ActivityIndicator color="#fff" style={{ marginTop: 8 }} />}
      </View>

      {!root ? (
        <View style={[styles.section, { alignItems: 'center' }]}>
          <Text style={{ fontSize: 44 }}>🗺️</Text>
          <Text style={styles.sectionTitle}>No treasure map yet</Text>
          <Text style={[styles.sectionSub, { textAlign: 'center', marginVertical: 8 }]}>Set your Total Budget in the Budget tab, or import an Excel backup.</Text>
          <TouchableOpacity style={styles.cta} onPress={() => router.push('/budget')}>
            <Text style={styles.ctaText}>Go to Budget</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={styles.cards}>
            <Card icon="wallet" label="Total Budget" value={peso(total)} bg="#FFF4E6" tint={COLORS.primary} />
            <Card icon="git-branch" label="In Wallets" value={peso(allocated)} bg="#E8F4FF" tint={COLORS.blue} />
            <Card icon="cart" label="Total Spent" value={peso(spent)} bg="#FFE8E0" tint={COLORS.accent} />
            <Card icon="cash" label="Unallocated" value={peso(unallocated)} bg="#EAF7EE" tint={COLORS.success} />
            <Card icon="trophy" label="Biggest Splurge" value={topSpender ? `${topSpenderName} • ${peso(topSpender[1])}` : '—'} bg="#FFF0E0" tint="#FFA94D" wide />
          </View>

          <Section title="🍊 Treasure Distribution" sub="How your Total Budget is split across wallets">
            {pieData.length === 0 ? <Empty text="Create wallets to see the split." /> : (
              <View style={{ alignItems: 'center' }}>
                <PieChart
                  data={pieData} donut radius={100} innerRadius={55} showText textColor="#fff" textSize={11} focusOnPress
                  centerLabelComponent={() => (
                    <View style={{ alignItems: 'center' }}>
                      <Text style={{ fontSize: 11, color: COLORS.muted }}>Total</Text>
                      <Text style={{ fontSize: 15, fontWeight: '900', color: COLORS.accent }}>{peso(total)}</Text>
                    </View>
                  )}
                />
                <View style={styles.legend}>
                  {pieSlices.map((s) => (
                    <View key={s.label} style={styles.legendItem}>
                      <View style={[styles.dot, { backgroundColor: s.color }]} />
                      <Text style={styles.legendText}>{s.label} ({peso(s.value)})</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </Section>

          <Section title="⚓ Daily Spending" sub="Expenses per day • newest on the left, swipe right for older days">
            {!hasSpending ? <Empty text="No expenses logged yet." /> : (
              <>
                <LineChart
                  data={line.data} width={chartWidth} height={line.sections * LINE_SECTION_H}
                  spacing={LINE_DAY_SPACING} initialSpacing={10} endSpacing={24}
                  color={COLORS.primary} thickness={3} curved areaChart startFillColor={COLORS.primary} endFillColor={COLORS.cream}
                  startOpacity={0.4} endOpacity={0.05} dataPointsColor={COLORS.accent} dataPointsRadius={3}
                  noOfSections={line.sections} maxValue={line.sections * line.step} hideRules yAxisThickness={0} xAxisColor={COLORS.border}
                  yAxisLabelWidth={44} yAxisTextStyle={{ color: COLORS.primary, fontSize: 9 }}
                  xAxisLabelTextStyle={{ color: COLORS.muted, fontSize: 9, width: 40, textAlign: 'center' }}
                  yAxisLabelPrefix="₱"
                />
                <Text style={styles.avg}>Average per day: {peso(spent / Math.max(1, new Set(state.transactions.filter((t) => t.type === 'expense').map((t) => dayKey(new Date(t.date)))).size))} (days with spending)</Text>
              </>
            )}
          </Section>

          <Section title="⚡ Spending by Wallet" sub="Each cluster is a child wallet; its bars are itself + its sub-wallets">
            {topLevel.length === 0 ? <Empty text="Create wallets to compare spending." /> : (
              <>
                <ScrollView horizontal showsHorizontalScrollIndicator>
                  <BarChart
                    data={barData} barWidth={BAR_W} initialSpacing={12} height={190} noOfSections={4} maxValue={barMax}
                    barBorderRadius={5} hideRules yAxisThickness={0} xAxisColor={COLORS.border} isAnimated={false}
                    yAxisTextStyle={{ color: COLORS.primary, fontSize: 9 }} yAxisLabelPrefix="₱"
                    width={Math.max(chartWidth, barData.length * 30 + 40)}
                  />
                </ScrollView>
                <View style={styles.legend}>
                  {state.nodes.filter((n) => n.parentId !== null).map((n) => (
                    <View key={n.id} style={styles.legendItem}>
                      <View style={[styles.dot, { backgroundColor: colorOf[n.id] }]} />
                      <Text style={styles.legendText}>{n.name}{state.nodes.find((p) => p.id === n.parentId)?.parentId ? ' (sub)' : ''}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}
          </Section>
        </>
      )}

      <View style={styles.quote}>
        <Text style={styles.quoteText}>{"“Look at you guys go! Meanwhile, I'll be collecting some treasure.”"}</Text>
        <Text style={styles.quoteBy}>— Nami, Navigator 🍊</Text>
      </View>
    </ScrollView>
  );
}

function Card({ icon, label, value, bg, tint, wide }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; bg: string; tint: string; wide?: boolean }) {
  return (
    <View style={[styles.card, { backgroundColor: bg }, wide && { width: '100%' }]}>
      <View style={styles.iconCircle}><Ionicons name={icon} size={22} color={tint} /></View>
      <Text style={styles.cardLabel}>{label}</Text>
      <Text style={styles.cardValue} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
    </View>
  );
}

function Section({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionSub}>{sub}</Text>
      <View style={{ marginTop: 14 }}>{children}</View>
    </View>
  );
}

function Empty({ text }: { text: string }) {
  return <Text style={styles.noData}>{text}</Text>;
}

function HeaderBtn({ icon, label, onPress, danger }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; danger?: boolean }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.hBtn, danger && { backgroundColor: 'rgba(231,76,60,0.9)' }]}>
      <Ionicons name={icon} size={16} color="#fff" />
      <Text style={styles.hBtnText}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.bg },
  header: { backgroundColor: COLORS.primary, padding: 20, paddingTop: 56, paddingBottom: 24, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, ...cardShadow },
  title: { fontSize: 28, fontWeight: '900', color: '#fff' },
  subtitle: { color: COLORS.cream, fontStyle: 'italic', marginTop: 2, marginBottom: 14 },
  headerButtons: { flexDirection: 'row', gap: 8 },
  hBtn: { flex: 1, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.25)', borderWidth: 2, borderColor: '#fff', borderRadius: 20, paddingVertical: 9 },
  hBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  cards: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', padding: 16, paddingBottom: 0 },
  card: { width: '48%', borderRadius: 20, padding: 16, marginBottom: 14, ...cardShadow },
  iconCircle: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  cardLabel: { fontSize: 11, color: COLORS.navy, fontWeight: '700', textTransform: 'uppercase', opacity: 0.75 },
  cardValue: { fontSize: 19, fontWeight: '900', color: COLORS.navy, marginTop: 4 },
  section: { backgroundColor: '#fff', margin: 16, marginBottom: 0, padding: 20, borderRadius: 20, borderWidth: 2, borderColor: COLORS.cream, ...cardShadow },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: COLORS.primary },
  sectionSub: { fontSize: 12, color: COLORS.muted, fontStyle: 'italic', marginTop: 2 },
  noData: { textAlign: 'center', color: COLORS.muted, fontStyle: 'italic', paddingVertical: 24 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: 16, gap: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 12, height: 12, borderRadius: 6, marginRight: 6 },
  legendText: { fontSize: 11, color: COLORS.navy, fontWeight: '600' },
  avg: { textAlign: 'center', color: COLORS.accent, fontWeight: '700', fontSize: 12, marginTop: 12 },
  barTop: { fontSize: 8, color: COLORS.accent, fontWeight: '700' },
  cta: { backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 22, marginTop: 6 },
  ctaText: { color: '#fff', fontWeight: '800' },
  quote: { backgroundColor: '#FFE8D6', margin: 16, padding: 18, borderRadius: 20, borderLeftWidth: 5, borderLeftColor: COLORS.primary, alignItems: 'center' },
  quoteText: { fontSize: 15, color: COLORS.navy, fontStyle: 'italic', fontWeight: '600', textAlign: 'center' },
  quoteBy: { fontSize: 12, color: COLORS.accent, fontWeight: '700', marginTop: 6 },
});