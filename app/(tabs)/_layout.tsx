import { ColorValue, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/constants/theme';

type IconName = keyof typeof Ionicons.glyphMap;
const icon = (on: IconName, off: IconName) => {
  const TabIcon = ({ focused, color }: { focused: boolean; color: ColorValue }) => (
    <Ionicons name={focused ? on : off} size={24} color={color as string} />
  );
  TabIcon.displayName = 'TabIcon';
  return TabIcon;
};

function HistoryHeaderButton() {
  const router = useRouter();
  return (
    <TouchableOpacity style={styles.historyBtn} onPress={() => router.push('/history')} accessibilityLabel="Open transaction history">
      <Ionicons name="receipt" size={16} color="#fff" />
      <Text style={styles.historyText}>History</Text>
    </TouchableOpacity>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: COLORS.accent,
        tabBarInactiveTintColor: COLORS.muted,
        tabBarStyle: { backgroundColor: COLORS.bg, borderTopColor: COLORS.border },
        tabBarLabelStyle: { fontWeight: '700' },
        headerStyle: { backgroundColor: COLORS.primary },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '800' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Dashboard', headerShown: false, tabBarIcon: icon('bar-chart', 'bar-chart-outline') }} />
      <Tabs.Screen name="budget" options={{ title: 'Budget', headerTitle: '🍊 Budget Map', headerRight: () => <HistoryHeaderButton />, tabBarIcon: icon('git-network', 'git-network-outline') }} />
      <Tabs.Screen name="calculator" options={{ title: 'Calculator', headerTitle: '🧮 Calculator', tabBarIcon: icon('calculator', 'calculator-outline') }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  historyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginRight: 14, paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 16, borderWidth: 2, borderColor: '#fff', backgroundColor: 'rgba(255,255,255,0.25)',
  },
  historyText: { color: '#fff', fontWeight: '800', fontSize: 13 },
});