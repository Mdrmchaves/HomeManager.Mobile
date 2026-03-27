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

  const selectedRef = useRef<Household | null>(null);
  selectedRef.current = selectedHousehold;

  const refreshHouseholds = useCallback(async () => {
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
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (session) {
      refreshHouseholds();
    } else if(!authLoading) {
      //LogOut cleaning
      setHouseholds([]);
      setSelectedHousehold(null);
      setLoading(false);
    }
  }, [session, authLoading]);

  return (
    <HouseholdContext.Provider value={{
      households,
      selectedHousehold,
      hasHousehold: loading ? null : households.length > 0,
      loading,
      setSelectedHousehold,
      refreshHouseholds,
    }}>
      {children}
    </HouseholdContext.Provider>
  );
}