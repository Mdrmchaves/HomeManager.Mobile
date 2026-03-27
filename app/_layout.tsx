import { Slot } from 'expo-router';
import { AuthProvider } from '../contexts/AuthContext';
import { AuthGuard } from '../components/AuthGuard';
import { HouseholdProvider } from '../contexts/HouseholdContext';

export default function RootLayout() {
  return (
    <AuthProvider>
      <HouseholdProvider>
        <AuthGuard>
          <Slot />
        </AuthGuard>
      </HouseholdProvider>
    </AuthProvider>
  );
}
