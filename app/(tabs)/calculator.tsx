import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/constants/theme';
import { evaluate } from '@/utils/calc';

const ROWS = [
  ['C', '(', ')', '÷'],
  ['7', '8', '9', '×'],
  ['4', '5', '6', '-'],
  ['1', '2', '3', '+'],
  ['0', '.', '⌫', '='],
];
const OPS = ['+', '-', '×', '÷'];

// The calculator is fully independent: it never reads or writes budget data.
export default function Calculator() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState('');
  const [justEvaluated, setJustEvaluated] = useState(false);

  const press = (v: string) => {
    if (v === 'C') { setInput(''); setResult(''); setJustEvaluated(false); return; }
    if (v === '⌫') { setInput((p) => p.slice(0, -1)); setJustEvaluated(false); return; }
    if (v === '=') {
      if (!input) return;
      try {
        setResult(String(evaluate(input)));
        setJustEvaluated(true);
      } catch (e) {
        Alert.alert('Error', e instanceof Error ? e.message : 'Invalid expression');
      }
      return;
    }
    const isOp = OPS.includes(v);
    // After "=", an operator continues from the result; anything else starts fresh.
    let base = input;
    if (justEvaluated) {
      base = isOp && result ? result : '';
      setJustEvaluated(false);
    }
    if (isOp) {
      if (base === '' && v !== '-') return; // can't start with × ÷ +
      if (OPS.includes(base.slice(-1))) { setInput(base.slice(0, -1) + v); return; } // replace operator
    }
    setInput(base + v);
  };

  const copy = async () => {
    if (!result) return Alert.alert('Nothing to copy', 'Calculate something first.');
    await Clipboard.setStringAsync(result);
  };

  return (
    <View style={styles.container}>
      <View style={styles.display}>
        <Text style={styles.input} numberOfLines={1} adjustsFontSizeToFit>{input || '0'}</Text>
        <View style={styles.resultRow}>
          {!!result && (
            <>
              <Text style={styles.result} numberOfLines={1} adjustsFontSizeToFit>= {result}</Text>
              <TouchableOpacity onPress={copy} hitSlop={8}>
                <Ionicons name="clipboard-outline" size={22} color={COLORS.accent} />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
      {ROWS.map((row, i) => (
        <View key={i} style={styles.row}>
          {row.map((b) => {
            const op = OPS.includes(b);
            return (
              <TouchableOpacity
                key={b}
                style={[styles.btn, op && styles.opBtn, b === '=' && styles.eqBtn, b === 'C' && styles.clearBtn]}
                onPress={() => press(b)}
                activeOpacity={0.7}
              >
                <Text style={[styles.btnText, (op || b === '=' || b === 'C') && { color: '#fff' }]}>{b}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, padding: 16, justifyContent: 'flex-end' },
  display: { backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 16, minHeight: 130, justifyContent: 'space-between', borderWidth: 2, borderColor: COLORS.cream },
  input: { fontSize: 38, fontWeight: '700', color: COLORS.navy, textAlign: 'right' },
  resultRow: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 10, minHeight: 32 },
  result: { fontSize: 26, color: COLORS.accent, fontWeight: '800', flexShrink: 1 },
  row: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  btn: { flex: 1, aspectRatio: 1.25, borderRadius: 18, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: COLORS.border },
  opBtn: { backgroundColor: COLORS.blue, borderColor: COLORS.blue },
  eqBtn: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  clearBtn: { backgroundColor: COLORS.danger, borderColor: COLORS.danger },
  btnText: { fontSize: 26, fontWeight: '700', color: COLORS.navy },
});
