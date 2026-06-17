import { Stack } from 'expo-router';
import { PertencesProvider } from '../../../contexts/PertencesContext';

export default function InventoryLayout() {
  return (
    <PertencesProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </PertencesProvider>
  );
}
