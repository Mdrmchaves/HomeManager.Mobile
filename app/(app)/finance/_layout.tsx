import { Stack } from 'expo-router';
import { FinanceProvider } from '../../../contexts/FinanceContext';

export default function FinanceLayout() {
  return (
    <FinanceProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </FinanceProvider>
  );
}
