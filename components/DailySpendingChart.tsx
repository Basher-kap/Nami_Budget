import React, { useRef, useState } from 'react';
import { Animated, LayoutChangeEvent, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop, Text as SvgText } from 'react-native-svg';
import { COLORS } from '@/constants/theme';
import { peso } from '@/utils/format';
import { MAX_ZOOM, MIN_ZOOM, ZOOM_FACTOR, axisFor, clampZoom, labelEvery } from '@/utils/chartAxis';

export type DayPoint = { value: number; label: string };

const BASE_BAND_H = 38; // px per y-axis band at 100% zoom
const MIN_BAND_H = 18; // bands never get thinner than this when zoomed out
const MAX_VIEW_H = 240; // taller than this and the plot scrolls vertically
const BASE_DAY_W = 44; // px per day at 100% zoom
const PAD_X = 24; // side padding so the first/last date labels stay inside the box
const PAD_T = 16;
const PAD_B = 8;
const Y_W = 50; // width of the ₱ column
const X_LABEL_H = 24;
const X_LABEL_W = 44;

/**
 * Line chart drawn with SVG, laid out so that:
 *  - the ₱ column stays put horizontally and scrolls vertically together with the plot,
 *  - the date labels stay put vertically and scroll horizontally together with the plot,
 *  - everything is clipped inside the box.
 * data[0] is the newest day (drawn on the left).
 * Zoom (− / + / Fit) scales the day width and band height. The y-axis uses a strict ₱50 interval up to ₱500
 * and an adjusted round interval above that (see utils/chartAxis.ts).
 */
export function DailySpendingChart({ data }: { data: DayPoint[] }) {
  const [scrollY] = useState(() => new Animated.Value(0));
  const [negY] = useState(() => Animated.multiply(scrollY, -1));
  const vRef = useRef<React.ComponentRef<typeof ScrollView>>(null);

  const [zoom, setZoom] = useState(1);
  const [boxW, setBoxW] = useState(0);

  const maxVal = Math.max(...data.map((d) => d.value), 0);
  const { step, sections } = axisFor(maxVal);
  const top = sections * step;
  const dayW = BASE_DAY_W * zoom;
  const bandH = Math.max(MIN_BAND_H, BASE_BAND_H * zoom);
  const plotH = sections * bandH;
  const svgH = PAD_T + plotH + PAD_B;
  const viewH = Math.min(svgH, MAX_VIEW_H);
  const scrollable = svgH > MAX_VIEW_H;
  const svgW = PAD_X * 2 + (data.length - 1) * dayW;
  const baseY = PAD_T + plotH;
  const every = labelEvery(dayW);

  const xOf = (i: number) => PAD_X + i * dayW;
  const yOf = (v: number) => baseY - (v / top) * plotH;

  const zoomOut = () => setZoom((z) => clampZoom(z / ZOOM_FACTOR));
  const zoomIn = () => setZoom((z) => clampZoom(z * ZOOM_FACTOR));
  // Fit: scale so every day is visible at once (never bigger than 100%)
  const fit = () => {
    if (boxW <= 0 || data.length < 2) return;
    setZoom(clampZoom(Math.min(1, (boxW - Y_W - PAD_X * 2) / ((data.length - 1) * BASE_DAY_W))));
  };
  const onBoxLayout = (e: LayoutChangeEvent) => setBoxW(e.nativeEvent.layout.width);

  let line = `M ${xOf(0)} ${yOf(data[0].value)}`;
  for (let i = 1; i < data.length; i++) {
    const mid = (xOf(i - 1) + xOf(i)) / 2;
    line += ` C ${mid} ${yOf(data[i - 1].value)} ${mid} ${yOf(data[i].value)} ${xOf(i)} ${yOf(data[i].value)}`;
  }
  const area = `${line} L ${xOf(data.length - 1)} ${baseY} L ${xOf(0)} ${baseY} Z`;
  const ticks = Array.from({ length: sections + 1 }, (_, k) => k);

  return (
    <View>
      <View style={styles.toolbar}>
        {/* <Text style={styles.axisInfo}>Y-axis every {peso(step).replace('.00', '')}</Text> */}
        <View style={styles.zoomRow}>
          <TouchableOpacity onPress={zoomOut} disabled={zoom <= MIN_ZOOM} style={[styles.zBtn, zoom <= MIN_ZOOM && styles.zOff]} accessibilityLabel="Zoom out" hitSlop={6}>
            <Ionicons name="remove" size={18} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.zoomText}>{Math.round(zoom * 100)}%</Text>
          <TouchableOpacity onPress={zoomIn} disabled={zoom >= MAX_ZOOM} style={[styles.zBtn, zoom >= MAX_ZOOM && styles.zOff]} accessibilityLabel="Zoom in" hitSlop={6}>
            <Ionicons name="add" size={18} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={fit} style={[styles.zBtn, styles.fitBtn]} accessibilityLabel="Fit all days">
            <Ionicons name="scan" size={14} color="#fff" />
            <Text style={styles.fitText}>Fit</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setZoom(1)} style={styles.reset} accessibilityLabel="Reset zoom" hitSlop={6}>
            <Text style={styles.resetText}>100%</Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.box} onLayout={onBoxLayout}>
        {/* ₱ column: clipped, and shifted by the plot's vertical scroll offset */}
        <View style={{ width: Y_W, height: viewH, overflow: 'hidden' }}>
          <Animated.View style={{ height: svgH, transform: [{ translateY: negY }] }}>
            {ticks.map((k) => (
              <Text key={k} style={[styles.yLabel, { top: baseY - k * bandH - 7 }]}>
                {peso(k * step).replace('.00', '')}
              </Text>
            ))}
          </Animated.View>
        </View>

        {/* horizontal scroller: plot (vertical scroller) on top, date labels underneath */}
        <ScrollView horizontal nestedScrollEnabled showsHorizontalScrollIndicator style={styles.hScroll}>
          <View style={{ width: svgW }}>
            <Animated.ScrollView
              ref={vRef}
              nestedScrollEnabled
              showsVerticalScrollIndicator={scrollable}
              scrollEnabled={scrollable}
              style={{ width: svgW, height: viewH }}
              scrollEventThrottle={16}
              onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
              onContentSizeChange={(_w, h) => {
                // start at the bottom so the ₱0 baseline and recent small amounts are visible
                vRef.current?.scrollToEnd({ animated: false });
                scrollY.setValue(Math.max(0, h - viewH));
              }}
            >
              <Svg width={svgW} height={svgH}>
                <Defs>
                  <LinearGradient id="spendArea" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0" stopColor={COLORS.primary} stopOpacity={0.4} />
                    <Stop offset="1" stopColor={COLORS.primary} stopOpacity={0.05} />
                  </LinearGradient>
                </Defs>
                {ticks.map((k) => (
                  <Line
                    key={k} x1={0} x2={svgW} y1={baseY - k * bandH} y2={baseY - k * bandH}
                    stroke={k === 0 ? COLORS.line : COLORS.border} strokeWidth={k === 0 ? 1.5 : 1} strokeOpacity={k === 0 ? 1 : 0.6}
                  />
                ))}
                <Path d={area} fill="url(#spendArea)" />
                <Path d={line} stroke={COLORS.primary} strokeWidth={3} fill="none" strokeLinecap="round" />
                {data.map((d, i) => (
                  <Circle key={i} cx={xOf(i)} cy={yOf(d.value)} r={d.value > 0 ? 3.5 : 2} fill={d.value > 0 ? COLORS.accent : COLORS.primary} />
                ))}
                {data.map((d, i) =>
                  d.value > 0 ? (
                    <SvgText key={`t${i}`} x={xOf(i)} y={yOf(d.value) - 8} fontSize={9} fontWeight="bold" fill={COLORS.accent} textAnchor="middle">
                      {Math.round(d.value)}
                    </SvgText>
                  ) : null
                )}
              </Svg>
            </Animated.ScrollView>

            {/* date labels: outside the vertical scroller, so vertical scrolling never moves them */}
            <View style={{ width: svgW, height: X_LABEL_H }}>
              {data.map((d, i) =>
                i % every === 0 ? (
                  <Text key={i} style={[styles.xLabel, { left: xOf(i) - X_LABEL_W / 2, width: X_LABEL_W }]} numberOfLines={1}>
                    {d.label}
                  </Text>
                ) : null
              )}
            </View>
          </View>
        </ScrollView>
      </View>
      {scrollable}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flexDirection: 'row', alignItems: 'flex-start', overflow: 'hidden', borderRadius: 12 },
  hScroll: { flex: 1 },
  yLabel: { position: 'absolute', left: 0, width: Y_W - 6, textAlign: 'right', fontSize: 9, color: COLORS.primary, fontWeight: '600' },
  xLabel: { position: 'absolute', top: 6, textAlign: 'center', fontSize: 9, color: COLORS.muted },
  toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 6 },
  axisInfo: { fontSize: 11, color: COLORS.muted, fontWeight: '600' },
  zoomRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  zBtn: { backgroundColor: COLORS.primary, borderRadius: 14, minWidth: 30, height: 28, alignItems: 'center', justifyContent: 'center' },
  zOff: { opacity: 0.35 },
  fitBtn: { flexDirection: 'row', gap: 4, paddingHorizontal: 10, backgroundColor: COLORS.blue },
  fitText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  zoomText: { minWidth: 42, textAlign: 'center', fontWeight: '800', color: COLORS.navy, fontSize: 12 },
  reset: { paddingHorizontal: 4 },
  resetText: { color: COLORS.accent, fontWeight: '700', fontSize: 11, textDecorationLine: 'underline' },
  hint: { textAlign: 'center', color: COLORS.muted, fontSize: 10, fontStyle: 'italic', marginTop: 4 },
});