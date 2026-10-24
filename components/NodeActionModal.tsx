import React, { useState } from 'react';
import {
  KeyboardAvoidingView, Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { COLORS } from '@/constants/theme';
import { useBudget } from '@/context/BudgetContext';
import { SegmentedControl } from './SegmentedControl';
import { DepositSource, availableOf, getNode, getRoot } from '@/utils/budget';
import { parseAmount, peso } from '@/utils/format';

export type ModalMode = 'setBudget' | 'addWallet' | 'deposit' | 'expense' | 'rename';

type Props = { mode: ModalMode | null; nodeId: string | null; onClose: () => void };

/** Remounts the body whenever the target changes, so the form always starts fresh. */
export function NodeActionModal({ mode, nodeId, onClose }: Props) {
  if (!mode) return null;
  return <ModalBody key={`${mode}:${nodeId ?? ''}`} mode={mode} nodeId={nodeId} onClose={onClose} />;
}

function ModalBody({ mode, nodeId, onClose }: { mode: ModalMode; nodeId: string | null; onClose: () => void }) {
  const { state, setTotalBudget, addWallet, deposit, addExpense, renameWallet } = useBudget();
  const node = nodeId ? getNode(state, nodeId) : null;
  const parent = node?.parentId ? getNode(state, node.parentId) : null;
  const isRoot = !!node && node.parentId === null;

  const [name, setName] = useState(mode === 'rename' && node ? node.name : '');
  const [amount, setAmount] = useState('');
  const [source, setSource] = useState<DepositSource>(isRoot ? 'new' : 'parent');
  const [error, setError] = useState('');

  const titles: Record<ModalMode, string> = {
    setBudget: 'Set Your Total Budget',
    addWallet: `New Wallet under ${node?.name ?? ''}`,
    deposit: isRoot ? 'Add to Total Budget' : `Deposit to ${node?.name ?? ''}`,
    expense: `Expense from ${node?.name ?? ''}`,
    rename: 'Rename Wallet',
  };
  const confirmLabel: Record<ModalMode, string> = {
    setBudget: 'Set Budget', addWallet: 'Create Wallet', deposit: 'Deposit', expense: 'Deduct', rename: 'Save',
  };
  const color = mode === 'expense' ? COLORS.danger : mode === 'deposit' ? COLORS.success : COLORS.primary;

  let hint = '';
  if (mode === 'addWallet' && node) hint = `Available to allocate from ${node.name}: ${peso(availableOf(state.nodes, node.id))}`;
  if (mode === 'expense' && node) hint = `Available in ${node.name}: ${peso(availableOf(state.nodes, node.id))}`;
  if (mode === 'deposit' && node && source === 'parent' && parent)
    hint = `Available to take from ${parent.name}: ${peso(availableOf(state.nodes, parent.id))}`;
  if (mode === 'deposit' && node && source === 'new' && !isRoot)
    hint = `New money is also added to every wallet above it, up to ${getRoot(state)?.name}.`;

  const submit = () => {
    try {
      const amt = parseAmount(amount);
      switch (mode) {
        case 'setBudget': setTotalBudget(amt); break;
        case 'addWallet': addWallet(nodeId!, name, amount.trim() === '' ? 0 : amt); break;
        case 'deposit': deposit(nodeId!, amt, source); break;
        case 'expense': addExpense(nodeId!, name, amt); break;
        case 'rename': renameWallet(nodeId!, name); break;
      }
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    }
  };

  const showName = mode === 'addWallet' || mode === 'expense' || mode === 'rename';
  const showAmount = mode !== 'rename';

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.backdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.sheet}>
          <Text style={styles.title}>{titles[mode]}</Text>

          {mode === 'deposit' && !isRoot && (
            <View style={{ marginBottom: 12 }}>
              <SegmentedControl
                options={[{ key: 'parent', label: 'From parent' }, { key: 'new', label: 'New money' }]}
                value={source}
                onChange={(k) => { setSource(k); setError(''); }}
              />
            </View>
          )}
          {!!hint && <Text style={styles.hint}>{hint}</Text>}

          {showName && (
            <TextInput
              style={styles.input} value={name} onChangeText={setName} maxLength={40}
              placeholder={mode === 'expense' ? 'Expense name (e.g. Dinner)' : 'Wallet name (e.g. GCash)'}
              placeholderTextColor={COLORS.muted} autoFocus
            />
          )}
          {showAmount && (
            <TextInput
              style={styles.input} value={amount} onChangeText={setAmount} keyboardType="decimal-pad"
              placeholder={mode === 'addWallet' ? 'Starting amount (optional)' : 'Amount (₱)'}
              placeholderTextColor={COLORS.muted} autoFocus={!showName}
            />
          )}
          {!!error && <Text style={styles.error}>{error}</Text>}

          <View style={styles.row}>
            <TouchableOpacity style={[styles.btn, styles.cancel]} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, { backgroundColor: color }]} onPress={submit}>
              <Text style={styles.btnText}>{confirmLabel[mode]}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(44,62,80,0.55)', justifyContent: 'center', padding: 24 },
  sheet: { backgroundColor: '#fff', borderRadius: 22, padding: 20, borderWidth: 2, borderColor: COLORS.border },
  title: { fontSize: 18, fontWeight: '800', color: COLORS.accent, marginBottom: 12 },
  hint: { fontSize: 12, color: COLORS.blue, fontWeight: '600', marginBottom: 10 },
  input: { borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 16, marginBottom: 10, backgroundColor: COLORS.bg, color: COLORS.navy },
  error: { color: COLORS.danger, fontSize: 13, fontWeight: '600', marginBottom: 8 },
  row: { flexDirection: 'row', gap: 10, marginTop: 6 },
  btn: { flex: 1, paddingVertical: 12, borderRadius: 14, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  cancel: { backgroundColor: COLORS.cream },
  cancelText: { color: COLORS.navy, fontWeight: '700', fontSize: 15 },
});
