import { useEffect } from 'react';
import { Slot } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts, Nunito_700Bold, Nunito_800ExtraBold } from '@expo-google-fonts/nunito';
import { AuthProvider } from '../contexts/AuthContext';
import { AuthGuard } from '../components/AuthGuard';
import { HouseholdProvider } from '../contexts/HouseholdContext';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ Nunito_700Bold, Nunito_800ExtraBold });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

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
