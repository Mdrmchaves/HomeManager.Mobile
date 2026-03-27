import { useEffect } from 'react';
import { useSegments, useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { useHousehold } from '../contexts/HouseholdContext';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { session, loading: authLoading } = useAuth();
  const { hasHousehold, loading: householdLoading } = useHousehold();
  const segments = useSegments() as string[];
  const router = useRouter();

  const inAuth = segments[0] === '(auth)';
  const inHouseholdSetup = segments[1] === 'household-setup';

  useEffect(() => {
    if (authLoading || (session && householdLoading)) return;

    if (!session && !inAuth) {
      router.replace('/(auth)/login');
      return;
    }

    if (session && hasHousehold === true && inAuth) {
      router.replace('/(app)/dashboard');
      return;
    }

    if (session && hasHousehold === false && householdLoading === false && !inHouseholdSetup) {
      router.replace('/(app)/household-setup');
      return;
    }

    if (session && hasHousehold === true && inHouseholdSetup) {
      router.replace('/(app)/dashboard');
      return;
    }
  }, [authLoading, householdLoading, session, hasHousehold, inAuth, inHouseholdSetup]);

  if (authLoading || (session && householdLoading)) return null;

  return <>{children}</>;
}