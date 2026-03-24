import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { Slot, useRouter, useSegments } from 'expo-router';
import type { Session } from '@supabase/supabase-js';
import { AuthService, supabase } from '../services/auth.service';
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
        } catch (err) {
          if (err instanceof Error && err.message === 'SESSION_EXPIRED') {
            // api.ts já chamou signOut(); onAuthStateChange trata SIGNED_OUT
            if (!cancelled) setLoading(false);
            return;
          }
          if (!cancelled) setHasHousehold(false);
        }
      }
      if (!cancelled) {
        setSession(data.session);
        setLoading(false);
      }
    });

    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') supabase.auth.startAutoRefresh();
      else supabase.auth.stopAutoRefresh();
    });

    const { data: listener } = AuthService.onAuthStateChange(async (event, newSession) => {
      // Token refresh falhou — forçar logout limpo
      if (event === 'TOKEN_REFRESHED' && !newSession) {
        setSession(null);
        setHasHousehold(null);
        return;
      }

      if (event === 'SIGNED_OUT' || !newSession) {
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
      appStateSubscription.remove();
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
