import { useEffect, useState } from 'react';
import { InventoryService } from '@/services/inventory.service';
import { LocationService } from '@/services/location.service';
import { StorageService } from '@/services/storage.service';
import type { InventoryItem } from '@/types/inventory-item';
import type { Location } from '@/types/location';
import type { Household } from '@/types/household';

// ─── useInventory ─────────────────────────────────────────────────────────────

export function useInventory(selectedHousehold: Household | null) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [reloading, setReloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [historyItems, setHistoryItems] = useState<InventoryItem[]>([]);

  async function loadData(isReload = false) {
    if (!selectedHousehold) return;
    if (isReload) setReloading(true);
    else setLoading(true);
    setError(null);

    try {
      const [fetchedItems, fetchedLocations] = await Promise.all([
        InventoryService.getItems(selectedHousehold.id),
        LocationService.getLocations(selectedHousehold.id),
      ]);
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
    const isFirstLoad = items.length === 0 && !error;
    loadData(!isFirstLoad);
  }, [selectedHousehold?.id]);

  async function loadHistory() {
    if (!selectedHousehold) return;
    try {
      const resolved = await InventoryService.getResolvedItems(selectedHousehold.id);
      setHistoryItems(resolved);
    } catch {
      // deixa historyItems inalterados em caso de erro
    }
  }

  return { items, locations, loading, error, reloading, loadData, photoUrls, historyItems, loadHistory };
}
