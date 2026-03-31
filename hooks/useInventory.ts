import { useEffect, useRef, useState } from 'react';
import { InventoryService } from '@/services/inventory.service';
import { LocationService } from '@/services/location.service';
import { StorageService } from '@/services/storage.service';
import type { InventoryItem } from '@/types/inventory-item';
import type { Location } from '@/types/location';
import type { Household } from '@/types/household';

export function useInventory(selectedHousehold: Household | null) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [reloading, setReloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [historyItems, setHistoryItems] = useState<InventoryItem[]>([]);
  const [historyHasMore, setHistoryHasMore] = useState(false);
  const lastHouseholdId = useRef<string | null>(null);

  async function loadData(isReload = false) {
    if (!selectedHousehold) return;
    lastHouseholdId.current = selectedHousehold.id;
    if (isReload) setReloading(true);
    else setLoading(true);
    setError(null);

    try {
      const [pagedItems, fetchedLocations] = await Promise.all([
        InventoryService.getItems({ householdId: selectedHousehold.id }),
        LocationService.getLocations(selectedHousehold.id),
      ]);

      const fetchedItems = pagedItems.items;
      setItems(fetchedItems);
      setLocations(fetchedLocations);

      const paths = fetchedItems
        .filter((i) => i.photoUrl && !photoUrls[i.photoUrl])
        .map((i) => i.photoUrl!);
      if (paths.length > 0) {
        StorageService.getSignedUrls(paths).then((urls) => {
          setPhotoUrls((prev) => ({ ...prev, ...urls }));
        });
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados.');
    } finally {
      setLoading(false);
      setReloading(false);
    }
  }

  useEffect(() => {
    if (selectedHousehold?.id !== lastHouseholdId.current) {
      setItems([]);
      setLocations([]);
      setHistoryItems([]);
      setPhotoUrls({});
      loadData(false);
    } else {
      loadData(true);
    }
  }, [selectedHousehold?.id]);

  async function loadHistory() {
    if (!selectedHousehold) return;
    try {
      const paged = await InventoryService.getResolvedItems(selectedHousehold.id);
      setHistoryItems(paged.items);
      setHistoryHasMore(paged.hasMore);
    } catch {
      // deixa historyItems inalterados em caso de erro
    }
  }

  return {
    items,
    locations,
    loading,
    error,
    reloading,
    loadData,
    photoUrls,
    historyItems,
    historyHasMore,
    loadHistory,
  };
}
