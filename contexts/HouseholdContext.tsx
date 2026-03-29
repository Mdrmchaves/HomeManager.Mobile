import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { HouseholdService } from '../services/household.service';
import { useAuth } from './AuthContext';
import type { Household } from '../types/household';

interface HouseholdContextValue {
  households: Household[];
  selectedHousehold: Household | null;
  hasHousehold: boolean | null;
  loading: boolean;
  setSelectedHousehold: (h: Household) => void;
  refreshHouseholds: () => Promise<void>;
}

const HouseholdContext = createContext<HouseholdContextValue | null>(null);

export function useHousehold(): HouseholdContextValue {
  const ctx = useContext(HouseholdContext);
  if (!ctx) throw new Error('useHousehold must be used within HouseholdProvider');
  return ctx;
}

export function HouseholdProvider({ children }: { children: React.ReactNode }) {
  const { session, loading: authLoading } = useAuth();
  const [households, setHouseholds] = useState<Household[]>([]);
  const [selectedHousehold, setSelectedHousehold] = useState<Household | null>(null);
  const [loading, setLoading] = useState(true);
  // Tracks the session ID for which data was last loaded.
  // Used to detect the render-before-effect gap: when a new session arrives,
  // session.user.id !== lastLoadedSessionId synchronously → pendingLoad = true.
  const [lastLoadedSessionId, setLastLoadedSessionId] = useState<string | null>(null);

  const selectedRef = useRef<Household | null>(null);
  selectedRef.current = selectedHousehold;

  const refreshHouseholds = useCallback(async () => {
    setLoading(true);
    if (!session) return;
    try {
      const list = await HouseholdService.getMyHouseholds();
      setHouseholds(list);
      if (list.length > 0 && !selectedRef.current) {
        setSelectedHousehold(list[0]);
      }
    } catch {
      setHouseholds([]);
    } finally {
      setLastLoadedSessionId(session.user.id);
      setLoading(false);
    }
  }, [session]);

  const signOutClean = () => {
      setHouseholds([]);
      setSelectedHousehold(null);
      setLastLoadedSessionId(null);
      setLoading(false);
  };

  useEffect(() => {
    if (session) {
      refreshHouseholds();
    } else if (!authLoading) {
      signOutClean();
    }
  }, [session, authLoading]);

  // True when a session exists but we haven't loaded its data yet.
  // Computed synchronously during render (before effects), so AuthGuard
  // never sees session + empty households + loading=false at the same time.
  const pendingLoad = !!session && session.user.id !== lastLoadedSessionId;
  const effectiveLoading = loading || pendingLoad;

  return (
    <HouseholdContext.Provider value={{
      households,
      selectedHousehold,
      hasHousehold: effectiveLoading ? null : households.length > 0,
      loading: effectiveLoading,
      setSelectedHousehold,
      refreshHouseholds,
    }}>
      {children}
    </HouseholdContext.Provider>
  );
}