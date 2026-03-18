import { useEffect, useState } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import type { Session } from '@supabase/supabase-js';
import { AuthService } from '../services/auth.service';
import { HouseholdService } from '../services/household.service';

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [hasHousehold, setHasHousehold] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    let cancelled = false;

    AuthService.getSession().then(async ({ data }) => {
      if (cancelled) return;
      if (data.session) {
        try {
          const households = await HouseholdService.getMyHouseholds();
          if (!cancelled) setHasHousehold(households.length > 0);
        } catch {
          if (!cancelled) setHasHousehold(false);
        }
      }
      if (!cancelled) {
        setSession(data.session);
        setLoading(false);
      }
    });

    const { data: listener } = AuthService.onAuthStateChange(async (_event, newSession) => {
      if (!newSession) {
        setSession(null);
        setHasHousehold(null);
        return;
      }
      try {
        const households = await HouseholdService.getMyHouseholds();
        setHasHousehold(households.length > 0);
      } catch {
        setHasHousehold(false);
      }
      setSession(newSession);
    });

    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, []);

  // Re-check households on navigation so layout stays in sync after household setup
  useEffect(() => {
    if (!session) return;
    HouseholdService.getMyHouseholds()
      .then((h) => setHasHousehold(h.length > 0))
      .catch(() => {});
  }, [segments]);

  useEffect(() => {
    if (loading) return;
    const inAuth = segments[0] === '(auth)';
    const inHouseholdSetup = segments[1] === 'household-setup';

    if (!session && !inAuth) {
      router.replace('/(auth)/login');
    } else if (session && inAuth) {
      router.replace('/(app)/dashboard');
    } else if (session && hasHousehold === false && !inHouseholdSetup) {
      router.replace('/(app)/household-setup');
    } else if (session && hasHousehold === true && inHouseholdSetup) {
      router.replace('/(app)/dashboard');
    }
  }, [session, loading, hasHousehold, segments]);

  return <Slot />;
}
