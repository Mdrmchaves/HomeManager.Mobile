import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useHousehold } from './HouseholdContext';
import { InventoryService } from '../services/inventory.service';
import { LocationService } from '../services/location.service';
import type { LocationCount, DestinationCount } from '../types/inventory-counts';
import type { Location } from '../types/location';
import type { InventoryItem } from '../types/inventory-item';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DetailCache {
  key: string; // 'loc:{locationId}:{chip}' | 'dest:{destination}'
  items: InventoryItem[];
  photoUrls: Record<string, string>;
  page: number;
  hasMore: boolean;
}

interface PertencesContextValue {
  // Dados partilhados (Tela 1)
  locations: Location[];
  locationCounts: LocationCount[];
  destinationCounts: DestinationCount[];
  countsLoading: boolean;
  countsError: string | null;

  // Actions chamadas após mutações
  refreshCounts: () => Promise<void>;
  refreshLocations: () => Promise<void>;

  // Cache da última tela de detalhe visitada (Tela 2)
  detailCache: DetailCache | null;
  setDetailCache: (cache: DetailCache | null) => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const PertencesContext = createContext<PertencesContextValue | null>(null);

export function usePertences(): PertencesContextValue {
  const ctx = useContext(PertencesContext);
  if (!ctx) throw new Error('usePertences must be used within PertencesProvider');
  return ctx;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function PertencesProvider({ children }: { children: React.ReactNode }) {
  const { selectedHousehold } = useHousehold();

  const [locations, setLocations] = useState<Location[]>([]);
  const [locationCounts, setLocationCounts] = useState<LocationCount[]>([]);
  const [destinationCounts, setDestinationCounts] = useState<DestinationCount[]>([]);
  const [countsLoading, setCountsLoading] = useState(true);
  const [countsError, setCountsError] = useState<string | null>(null);
  const [detailCache, setDetailCache] = useState<DetailCache | null>(null);

  const refreshLocations = useCallback(async () => {
    if (!selectedHousehold) return;
    try {
      const locs = await LocationService.getLocations(selectedHousehold.id);
      setLocations(locs);
    } catch {
      // não crítico
    }
  }, [selectedHousehold?.id]);

  const refreshCounts = useCallback(async () => {
    if (!selectedHousehold) return;
    setCountsLoading(true);
    setCountsError(null);
    try {
      const [locCounts, destCounts] = await Promise.all([
        InventoryService.getCountsByLocation(selectedHousehold.id),
        InventoryService.getCountsByDestination(selectedHousehold.id),
      ]);
      setLocationCounts(locCounts);
      setDestinationCounts(destCounts);
    } catch (err) {
      setCountsError(err instanceof Error ? err.message : 'Erro ao carregar contadores.');
    } finally {
      setCountsLoading(false);
    }
  }, [selectedHousehold?.id]);

  // Recarrega tudo quando o household muda
  useEffect(() => {
    setLocationCounts([]);
    setDestinationCounts([]);
    setLocations([]);
    setDetailCache(null);
    if (selectedHousehold) {
      refreshLocations();
      refreshCounts();
    } else {
      setCountsLoading(false);
    }
  }, [selectedHousehold?.id]);

  return (
    <PertencesContext.Provider
      value={{
        locations,
        locationCounts,
        destinationCounts,
        countsLoading,
        countsError,
        refreshCounts,
        refreshLocations,
        detailCache,
        setDetailCache,
      }}
    >
      {children}
    </PertencesContext.Provider>
  );
}
