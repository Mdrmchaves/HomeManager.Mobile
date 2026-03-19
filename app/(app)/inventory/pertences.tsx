import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  StyleSheet,
} from 'react-native';
import { useHousehold } from '../_layout';
import ItemForm from './item-form';
import { LocationService } from '../../../services/location.service';
import { Colors } from '../../../constants/colors';
import { useInventory } from '@/hooks/useInventory';
import SearchBar from '@/components/inventory/SearchBar';
import DestinationFilter from '@/components/inventory/DestinationFilter';
import LocationGroupCard, { type Group } from '@/components/inventory/LocationGroupCard';
import { getDestinationLabel } from '@/components/inventory/InventoryItemRow';
import AddLocationModal from '@/components/inventory/modals/AddLocationModal';
import EditLocationModal from '@/components/inventory/modals/EditLocationModal';
import DeleteLocationConfirmModal from '@/components/inventory/modals/DeleteLocationConfirmModal';
import type { InventoryItem } from '../../../types/inventory-item';
import type { Location } from '../../../types/location';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DESTINATION_FILTER_OPTIONS = ['Todos', 'Manter', 'Vender', 'Doar', 'Descartar'];

// ─── Group builder ────────────────────────────────────────────────────────────

function buildGroups(
  items: InventoryItem[],
  locations: Location[],
  searchQuery: string,
  selectedDestination: string
): Group[] {
  const filteredItems = items.filter((item) => {
    const matchSearch =
      !searchQuery || item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchDestination =
      selectedDestination === 'Todos' ||
      getDestinationLabel(item.destination) === selectedDestination;
    return matchSearch && matchDestination;
  });

  const locationGroups: Group[] = locations.map((loc) => ({
    locationId: loc.id,
    locationName: loc.name,
    locationIcon: loc.icon,
    location: loc,
    items: filteredItems.filter((i) => i.locationId === loc.id),
  }));

  const noLocationItems = filteredItems.filter((i) => !i.locationId);
  if (noLocationItems.length > 0) {
    locationGroups.push({
      locationId: null,
      locationName: 'Sem Local',
      locationIcon: undefined,
      location: null,
      items: noLocationItems,
    });
  }

  return locationGroups;
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function PertencesTab() {
  const { selectedHousehold } = useHousehold();
  const { items, locations, loading, error, reloading, loadData, photoUrls } =
    useInventory(selectedHousehold);

  // ── UI state ──
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDestination, setSelectedDestination] = useState('Todos');
  const [showItemForm, setShowItemForm] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | undefined>(undefined);
  const [preselectedLocationId, setPreselectedLocationId] = useState<string | undefined>(undefined);
  const [collapsedLocations, setCollapsedLocations] = useState<Set<string>>(new Set());

  // Location menu
  const [activeLocationMenu, setActiveLocationMenu] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; right: number } | null>(null);

  // Add location modal
  const [showNewLocationModal, setShowNewLocationModal] = useState(false);

  // Edit location modal
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [showEditLocationModal, setShowEditLocationModal] = useState(false);

  // Delete location modal
  const [showDeleteLocationConfirm, setShowDeleteLocationConfirm] = useState(false);
  const [locationToDelete, setLocationToDelete] = useState<Location | null>(null);

  // Saving / deleting flags
  const [savingLocation, setSavingLocation] = useState(false);
  const [deletingLocation, setDeletingLocation] = useState(false);

  useEffect(() => {
    setSelectedDestination('Todos');
  }, [selectedHousehold?.id]);

  // ── Helpers ──

  function toggleLocation(locationId: string | null) {
    const key = locationId ?? '__sem_local__';
    setCollapsedLocations((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  function isCollapsed(locationId: string | null) {
    return collapsedLocations.has(locationId ?? '__sem_local__');
  }

  // ── CRUD handlers ──

  async function createLocation(name: string, icon: string) {
    if (!selectedHousehold) return;
    setSavingLocation(true);
    try {
      await LocationService.createLocation(
        selectedHousehold.id,
        name.trim(),
        icon.trim() || undefined
      );
      setShowNewLocationModal(false);
      loadData(true);
    } catch {
      // erro silencioso por agora
    } finally {
      setSavingLocation(false);
    }
  }

  async function saveEditLocation(name: string, icon: string) {
    if (!editingLocation) return;
    setSavingLocation(true);
    try {
      await LocationService.updateLocation(
        editingLocation.id,
        name.trim(),
        icon.trim() || undefined
      );
      setShowEditLocationModal(false);
      setEditingLocation(null);
      loadData(true);
    } catch {
      // erro silencioso por agora
    } finally {
      setSavingLocation(false);
    }
  }

  async function deleteLocation() {
    if (!locationToDelete) return;
    setDeletingLocation(true);
    try {
      await LocationService.deleteLocation(locationToDelete.id);
      setShowDeleteLocationConfirm(false);
      setLocationToDelete(null);
      loadData(true);
    } catch {
      // erro silencioso por agora
    } finally {
      setDeletingLocation(false);
    }
  }

  // ── Derived state ──

  const groups = buildGroups(items, locations, searchQuery, selectedDestination);
  const isEmpty = locations.length === 0 && items.length === 0;

  // ── Skeleton ──
  if (loading) {
    return (
      <View style={styles.container}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={styles.skeleton} />
        ))}
      </View>
    );
  }

  // ── Error ──
  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => loadData()}>
          <Text style={styles.retryButtonText}>Tentar novamente</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView
        style={[styles.scroll, reloading && styles.scrollReloading]}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Search bar */}
        <SearchBar value={searchQuery} onChange={setSearchQuery} />

        {/* Destination filters */}
        <DestinationFilter
          selected={selectedDestination}
          options={DESTINATION_FILTER_OPTIONS}
          onChange={setSelectedDestination}
        />

        {/* Empty state */}
        {isEmpty && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📦</Text>
            <Text style={styles.emptyText}>Nenhum item encontrado</Text>
          </View>
        )}

        {/* Groups */}
        {groups.map((group) => (
          <LocationGroupCard
            key={group.locationId ?? '__none__'}
            group={group}
            collapsed={isCollapsed(group.locationId)}
            photoUrls={photoUrls}
            onToggle={() => toggleLocation(group.locationId)}
            onEditItem={(item: InventoryItem) => {
              setEditingItem(item);
              setPreselectedLocationId(undefined);
              setShowItemForm(true);
            }}
            onAddItem={() => {
              setEditingItem(undefined);
              setPreselectedLocationId(group.locationId ?? undefined);
              setShowItemForm(true);
            }}
            onOpenMenu={(top: number) => {
              setActiveLocationMenu(group.locationId);
              setMenuPosition({ top, right: 16 });
            }}
          />
        ))}

        {/* Adicionar local */}
        <TouchableOpacity
          style={styles.addLocationButton}
          onPress={() => setShowNewLocationModal(true)}
        >
          <Text style={styles.addLocationButtonText}>+ Adicionar local</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Dropdown menu — Modal para garantir zIndex acima de tudo */}
      <Modal
        visible={activeLocationMenu !== null}
        transparent
        animationType="none"
        onRequestClose={() => { setActiveLocationMenu(null); setMenuPosition(null); }}
      >
        <TouchableOpacity
          style={StyleSheet.absoluteFillObject}
          activeOpacity={1}
          onPress={() => { setActiveLocationMenu(null); setMenuPosition(null); }}
        >
          {menuPosition && (
            <View style={[styles.dropdownMenu, { top: menuPosition.top, right: menuPosition.right }]}>
              <TouchableOpacity
                style={styles.dropdownOption}
                onPress={() => {
                  const group = groups.find((g) => g.locationId === activeLocationMenu);
                  if (!group?.location) return;
                  setEditingLocation(group.location);
                  setShowEditLocationModal(true);
                  setActiveLocationMenu(null);
                  setMenuPosition(null);
                }}
              >
                <Text style={styles.dropdownOptionText}>Editar local</Text>
              </TouchableOpacity>
              <View style={styles.dropdownDivider} />
              <TouchableOpacity
                style={styles.dropdownOption}
                onPress={() => {
                  const group = groups.find((g) => g.locationId === activeLocationMenu);
                  if (!group?.location) return;
                  setLocationToDelete(group.location);
                  setShowDeleteLocationConfirm(true);
                  setActiveLocationMenu(null);
                  setMenuPosition(null);
                }}
              >
                <Text style={[styles.dropdownOptionText, { color: Colors.error }]}>
                  Excluir local
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </TouchableOpacity>
      </Modal>

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => {
          setEditingItem(undefined);
          setPreselectedLocationId(undefined);
          setShowItemForm(true);
        }}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* ── Novo local modal ── */}
      <AddLocationModal
        visible={showNewLocationModal}
        onClose={() => setShowNewLocationModal(false)}
        onConfirm={createLocation}
        saving={savingLocation}
      />

      {/* ── Editar local modal ── */}
      <EditLocationModal
        visible={showEditLocationModal}
        onClose={() => { setShowEditLocationModal(false); setEditingLocation(null); }}
        onConfirm={saveEditLocation}
        saving={savingLocation}
        initialName={editingLocation?.name ?? ''}
        initialIcon={editingLocation?.icon ?? ''}
      />

      {/* ── Confirmar exclusão de local ── */}
      <DeleteLocationConfirmModal
        visible={showDeleteLocationConfirm}
        onClose={() => setShowDeleteLocationConfirm(false)}
        onConfirm={deleteLocation}
        deleting={deletingLocation}
        locationName={locationToDelete?.name ?? ''}
      />

      {/* ── Item form ── */}
      {selectedHousehold && (
        <ItemForm
          visible={showItemForm}
          householdId={selectedHousehold.id}
          locations={locations}
          item={editingItem}
          preselectedLocationId={preselectedLocationId}
          onClose={() => setShowItemForm(false)}
          onSaved={() => {
            setShowItemForm(false);
            loadData(true);
          }}
        />
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
    padding: 16,
  },
  skeleton: {
    height: 80,
    backgroundColor: '#e5e7eb',
    borderRadius: 12,
    marginBottom: 12,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    color: Colors.error,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: Colors.primary,
    borderRadius: 10,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },

  // Scroll
  scroll: {
    flex: 1,
  },
  scrollReloading: {
    opacity: 0.6,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },

  // Empty
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 15,
    color: Colors.textSecondary,
  },

  // Add location button
  addLocationButton: {
    marginTop: 8,
    marginBottom: 32,
    alignItems: 'center',
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    borderStyle: 'dashed',
  },
  addLocationButtonText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
  },

  // Dropdown menu (rendered via Modal)
  dropdownMenu: {
    position: 'absolute',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 4,
    width: 160,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
  },
  dropdownOption: {
    padding: 12,
  },
  dropdownOptionText: {
    fontSize: 14,
    color: Colors.textPrimary,
  },
  dropdownDivider: {
    height: 1,
    backgroundColor: Colors.border,
  },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  fabText: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '300',
    lineHeight: 32,
  },
});
