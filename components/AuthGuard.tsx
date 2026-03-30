import { useEffect, useRef } from 'react';
import { useSegments, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useAuth } from '../contexts/AuthContext';
import { useHousehold } from '../contexts/HouseholdContext';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { session, loading: authLoading } = useAuth();
  const { hasHousehold, loading: householdLoading, selectedHousehold } = useHousehold();
  const segments = useSegments() as string[];
  const router = useRouter();
  const splashHidden = useRef(false);

  const inAuth = segments[0] === '(auth)';
  const inHouseholdSetup = segments[1] === 'household-setup';

  useEffect(() => {
    if (authLoading || (session && householdLoading)) return;

    if (!session && !inAuth) {
      router.replace('/(auth)/login');
    } else if (session && hasHousehold === true && inAuth) {
      router.replace('/(app)/dashboard');
    } else if (session && hasHousehold === false && householdLoading === false && !inHouseholdSetup) {
      router.replace('/(app)/household-setup');
    } else if (session && hasHousehold === true && inHouseholdSetup) {
      router.replace('/(app)/dashboard');
    }

    if (!splashHidden.current) {
      splashHidden.current = true;
      SplashScreen.hideAsync();
    }
  }, [authLoading, householdLoading, session, hasHousehold, inAuth, inHouseholdSetup]);

  if (authLoading || (session && householdLoading)) return null;

  return <>{children}</>;
}
