import { ColorValue } from 'react-native';
import { Tabs } from 'expo-router';
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
      <Tabs.Screen name="budget" options={{ title: 'Budget', headerTitle: '🍊 Budget Map', tabBarIcon: icon('git-network', 'git-network-outline') }} />
      <Tabs.Screen name="calculator" options={{ title: 'Calculator', headerTitle: '🧮 Calculator', tabBarIcon: icon('calculator', 'calculator-outline') }} />
    </Tabs>
  );
}
