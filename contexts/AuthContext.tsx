import { createContext, useContext, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../services/auth.service';
import { HouseholdService } from '../services/household.service';

interface AuthContextValue {
  session: Session | null;
  hasHousehold: boolean | null;
  loading: boolean;
  refreshHouseholds: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [hasHousehold, setHasHousehold] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') supabase.auth.startAutoRefresh();
      else supabase.auth.stopAutoRefresh();
    });

    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session) {
        try {
          const households = await HouseholdService.getMyHouseholds();
          setHasHousehold(households.length > 0);
        } catch {
          setHasHousehold(false);
        }
      }
      setSession(data.session);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(async (event, newSession) => {
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
      appStateSubscription.remove();
      listener.subscription.unsubscribe();
    };
  }, []);

  async function refreshHouseholds() {
    try {
      const households = await HouseholdService.getMyHouseholds();
      setHasHousehold(households.length > 0);
    } catch {}
  }

  return (
    <AuthContext.Provider value={{ session, hasHousehold, loading, refreshHouseholds }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
