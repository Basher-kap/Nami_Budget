import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { BudgetProvider } from '@/context/BudgetContext';
import { COLORS } from '@/constants/theme';

export default function RootLayout() {
  return (
    <BudgetProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: COLORS.primary },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: '800' },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="history" options={{ title: 'Transaction History' }} />
      </Stack>
    </BudgetProvider>
  );
}
