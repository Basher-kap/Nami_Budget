import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/constants/theme';

type Option<T extends string> = { key: T; label: string; icon?: keyof typeof Ionicons.glyphMap };

export function SegmentedControl<T extends string>({
  options, value, onChange,
}: { options: Option<T>[]; value: T; onChange: (k: T) => void }) {
  return (
    <View style={styles.wrap}>
      {options.map((o) => {
        const active = o.key === value;
        return (
          <TouchableOpacity key={o.key} style={[styles.seg, active && styles.active]} onPress={() => onChange(o.key)} activeOpacity={0.8}>
            {o.icon && <Ionicons name={o.icon} size={16} color={active ? '#fff' : COLORS.accent} />}
            <Text style={[styles.text, active && styles.activeText]}>{o.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', backgroundColor: COLORS.cream, borderRadius: 14, padding: 4, borderWidth: 1, borderColor: COLORS.border },
  seg: { flex: 1, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 11 },
  active: { backgroundColor: COLORS.primary },
  text: { color: COLORS.accent, fontWeight: '700', fontSize: 14 },
  activeText: { color: '#fff' },
});
