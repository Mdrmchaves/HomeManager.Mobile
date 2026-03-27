import { useEffect } from 'react';
import { Slot } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts, Nunito_700Bold, Nunito_800ExtraBold } from '@expo-google-fonts/nunito';
import { AuthProvider } from '../contexts/AuthContext';
import { AuthGuard } from '../components/AuthGuard';
import { HouseholdProvider } from '../contexts/HouseholdContext';
import { useAuth } from '../contexts/AuthContext';

SplashScreen.preventAutoHideAsync();

// ─── Inner layout (inside AuthProvider, can use useAuth) ──────────────────────

function RootLayoutInner() {
  const { loading: authLoading } = useAuth();
  const [fontsLoaded] = useFonts({ Nunito_700Bold, Nunito_800ExtraBold });

  useEffect(() => {
    if (!authLoading && fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [authLoading, fontsLoaded]);

  if (!fontsLoaded || authLoading) return null;

  return (
    <HouseholdProvider>
      <AuthGuard>
        <Slot />
      </AuthGuard>
    </HouseholdProvider>
  );
}

// ─── Root layout ──────────────────────────────────────────────────────────────

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutInner />
    </AuthProvider>
  );
}
