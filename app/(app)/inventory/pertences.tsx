import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  StyleSheet,
} from 'react-native';
import { Eye, EyeOff, ChevronsUpDown, ChevronsDownUp } from 'lucide-react-native';
import { useHousehold } from '../../../contexts/HouseholdContext';
import ItemForm from './item-form';
import { LocationService } from '../../../services/location.service';
import { HouseholdService } from '../../../services/household.service';
import { InventoryService } from '../../../services/inventory.service';
import { Colors } from '../../../constants/colors';
import { DESTINATION_FILTER_OPTIONS, DESTINATION_RESOLVE_OPTIONS, getDestinationMeta, getDestinationLabel } from '../../../constants/destinations';
import { useInventory } from '@/hooks/useInventory';
import SearchBar from '@/components/inventory/SearchBar';
import DestinationFilter from '@/components/inventory/DestinationFilter';
import LocationGroupCard, { type Group } from '@/components/inventory/LocationGroupCard';
import AddLocationModal from '@/components/inventory/modals/AddLocationModal';
import EditLocationModal from '@/components/inventory/modals/EditLocationModal';
import DeleteLocationConfirmModal from '@/components/inventory/modals/DeleteLocationConfirmModal';
import ItemMenuProvider from '@/components/ItemMenuProvider';
import type { MenuAction } from '@/contexts/ItemMenuContext';
import type { InventoryItem } from '../../../types/inventory-item';
import type { Location } from '../../../types/location';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTHS_PT = ['jan.', 'fev.', 'mar.', 'abr.', 'mai.', 'jun.', 'jul.', 'ago.', 'set.', 'out.', 'nov.', 'dez.'];

function formatDatePT(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS_PT[d.getMonth()]} ${d.getFullYear()}`;
}

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
  const { items, locations, loading, error, reloading, loadData, photoUrls, historyItems, loadHistory } =
    useInventory(selectedHousehold);

  // ── Members map (userId → name) ──
  const [memberNames, setMemberNames] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!selectedHousehold) { setMemberNames({}); return; }
    HouseholdService.getHousehold(selectedHousehold.id)
      .then((h) => {
        const map: Record<string, string> = {};
        (h.householdUsers ?? []).forEach((hu) => { map[hu.userId] = hu.user.name; });
        setMemberNames(map);
      })
      .catch(() => {});
  }, [selectedHousehold?.id]);

  // ── UI state ──
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDestination, setSelectedDestination] = useState('Todos');
  const [showItemForm, setShowItemForm] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | undefined>(undefined);
  const [preselectedLocationId, setPreselectedLocationId] = useState<string | undefined>(undefined);
  const [expandedLocations, setExpandedLocations] = useState<Set<string>>(new Set());

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

  // Toolbar
  const [hideEmpty, setHideEmpty] = useState(true);

  // History modal
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);

  // Item action state (resolve + delete)
  const [resolveTargetItem, setResolveTargetItem] = useState<InventoryItem | null>(null);
  const [showItemResolvePicker, setShowItemResolvePicker] = useState(false);
  const [deleteTargetItem, setDeleteTargetItem] = useState<InventoryItem | null>(null);
  const [showItemDeleteConfirm, setShowItemDeleteConfirm] = useState(false);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  const [menuActionError, setMenuActionError] = useState<string | null>(null);

  // Saving / deleting flags
  const [savingLocation, setSavingLocation] = useState(false);
  const [deletingLocation, setDeletingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  useEffect(() => {
    setSelectedDestination('Todos');
  }, [selectedHousehold?.id]);

  // ── Helpers ──

  function toggleLocation(locationId: string | null) {
    const key = locationId ?? '__sem_local__';
    setExpandedLocations((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  function isCollapsed(locationId: string | null) {
    return !expandedLocations.has(locationId ?? '__sem_local__');
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
    } catch (err: unknown) {
      setLocationError(err instanceof Error ? err.message : 'Ocorreu um erro. Tenta novamente.');
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
    } catch (err: unknown) {
      setLocationError(err instanceof Error ? err.message : 'Ocorreu um erro. Tenta novamente.');
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
    } catch (err: unknown) {
      setLocationError(err instanceof Error ? err.message : 'Ocorreu um erro. Tenta novamente.');
    } finally {
      setDeletingLocation(false);
    }
  }

  // ── History handlers ──

  async function openHistory() {
    setHistoryError(null);
    setShowHistoryModal(true);
    await loadHistory();
  }

  async function handleRestore(id: string) {
    setRestoringId(id);
    try {
      await InventoryService.restoreItem(id);
      await loadHistory();
      loadData(true);
    } catch {
      setHistoryError('Erro ao restaurar item.');
    } finally {
      setRestoringId(null);
    }
  }

  // ── Item action handlers ──

  async function handleResolveItem(destination: string) {
    if (!resolveTargetItem) return;
    setShowItemResolvePicker(false);
    try {
      await InventoryService.resolveItem(resolveTargetItem.id, destination);
      loadData(true);
    } catch {
      setMenuActionError('Erro ao dar saída ao item.');
    } finally {
      setResolveTargetItem(null);
    }
  }

  async function handleDeleteItem() {
    if (!deleteTargetItem) return;
    setShowItemDeleteConfirm(false);
    setDeletingItemId(deleteTargetItem.id);
    try {
      await InventoryService.deleteItem(deleteTargetItem.id);
      loadData(true);
    } catch {
      setMenuActionError('Erro ao apagar item.');
    } finally {
      setDeletingItemId(null);
      setDeleteTargetItem(null);
    }
  }

  // ── Menu actions factory ──

  function menuActionsForItem(item: InventoryItem): MenuAction[] {
    return [
      {
        label: 'Editar',
        onPress: () => {
          setEditingItem(item);
          setPreselectedLocationId(undefined);
          setShowItemForm(true);
        },
      },
      {
        label: 'Dar saída',
        onPress: () => {
          setResolveTargetItem(item);
          setMenuActionError(null);
          setShowItemResolvePicker(true);
        },
      },
      {
        label: 'Eliminar',
        destructive: true,
        onPress: () => {
          setDeleteTargetItem(item);
          setMenuActionError(null);
          setShowItemDeleteConfirm(true);
        },
      },
    ];
  }

  // ── Derived state ──

  const enrichedItems = items.map((item) => ({
    ...item,
    ownerName: item.ownerId ? memberNames[item.ownerId] : undefined,
  }));
  const groups = buildGroups(enrichedItems, locations, searchQuery, selectedDestination);

  // ── Collapse/expand all (depende de groups) ──

  function collapseAll() {
    setExpandedLocations(new Set());
  }

  function expandAll() {
    setExpandedLocations(new Set(groups.map((g) => g.locationId ?? '__sem_local__')));
  }

  const allCollapsed = groups.length > 0 && expandedLocations.size === 0;
  const isEmpty = locations.length === 0 && items.length === 0;
  const visibleGroups = (hideEmpty || !!searchQuery)
    ? groups.filter((g) => g.items.length > 0)
    : groups;

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
    <ItemMenuProvider>
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

          {/* Toolbar: histórico + ocultar vazios + colapsar tudo */}
          <View style={styles.toolbar}>
            <TouchableOpacity onPress={openHistory}>
              <Text style={styles.historyLink}>Histórico ({historyItems.length})</Text>
            </TouchableOpacity>

            <View style={styles.toolbarIcons}>
              {!searchQuery && (
                <TouchableOpacity onPress={() => setHideEmpty((v) => !v)}>
                  {hideEmpty
                    ? <EyeOff size={20} color={Colors.textSecondary} />
                    : <Eye size={20} color={Colors.textSecondary} />}
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={allCollapsed ? expandAll : collapseAll}>
                {allCollapsed
                  ? <ChevronsDownUp size={20} color={Colors.textSecondary} />
                  : <ChevronsUpDown size={20} color={Colors.textSecondary} />}
              </TouchableOpacity>
            </View>
          </View>

          {/* Empty state */}
          {isEmpty && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📦</Text>
              <Text style={styles.emptyText}>Nenhum item encontrado</Text>
            </View>
          )}

          {/* Groups */}
          {visibleGroups.map((group) => (
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
              menuActionsForItem={menuActionsForItem}
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
            onPress={() => { setLocationError(null); setShowNewLocationModal(true); }}
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
                    setLocationError(null);
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
                    setLocationError(null);
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
          error={locationError}
        />

        {/* ── Editar local modal ── */}
        <EditLocationModal
          visible={showEditLocationModal}
          onClose={() => { setShowEditLocationModal(false); setEditingLocation(null); }}
          onConfirm={saveEditLocation}
          saving={savingLocation}
          initialName={editingLocation?.name ?? ''}
          initialIcon={editingLocation?.icon ?? ''}
          error={locationError}
        />

        {/* ── Confirmar exclusão de local ── */}
        <DeleteLocationConfirmModal
          visible={showDeleteLocationConfirm}
          onClose={() => setShowDeleteLocationConfirm(false)}
          onConfirm={deleteLocation}
          deleting={deletingLocation}
          locationName={locationToDelete?.name ?? ''}
          error={locationError}
        />

        {/* ── Modal Histórico ── */}
        <Modal visible={showHistoryModal} transparent animationType="slide">
          <View style={styles.historyBackdrop}>
            <View style={styles.historySheet}>
              <View style={styles.historyHeader}>
                <Text style={styles.historyTitle}>Histórico</Text>
                <TouchableOpacity onPress={() => setShowHistoryModal(false)}>
                  <Text style={styles.historyClose}>Fechar</Text>
                </TouchableOpacity>
              </View>

              {historyError && (
                <Text style={styles.historyError}>{historyError}</Text>
              )}

              <ScrollView contentContainerStyle={styles.historyList}>
                {historyItems.length === 0 ? (
                  <Text style={styles.historyEmpty}>Nenhum item no histórico.</Text>
                ) : (
                  historyItems.map((item) => {
                    const badge = getDestinationMeta(item.destination);
                    return (
                      <View key={item.id} style={styles.historyItem}>
                        <View style={styles.historyItemInfo}>
                          <Text style={styles.historyItemName}>{item.name}</Text>
                          <View style={styles.historyItemMeta}>
                            {badge && (
                              <View style={[styles.destBadge, { backgroundColor: badge.badge.bg }]}>
                                <Text style={[styles.destBadgeText, { color: badge.badge.text }]}>
                                  {badge.label}
                                </Text>
                              </View>
                            )}
                            {item.resolvedAt && (
                              <Text style={styles.historyDate}>{formatDatePT(item.resolvedAt)}</Text>
                            )}
                          </View>
                        </View>
                        <TouchableOpacity
                          style={styles.restoreButton}
                          onPress={() => handleRestore(item.id)}
                          disabled={restoringId === item.id}
                        >
                          <Text style={styles.restoreButtonText}>
                            {restoringId === item.id ? '...' : 'Restaurar'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    );
                  })
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* ── Item action error ── */}
        {!!menuActionError && (
          <View style={styles.menuActionErrorBox}>
            <Text style={styles.menuActionErrorText}>{menuActionError}</Text>
          </View>
        )}

        {/* ── Item resolve picker ── */}
        <Modal
          visible={showItemResolvePicker}
          transparent
          animationType="fade"
          onRequestClose={() => setShowItemResolvePicker(false)}
        >
          <TouchableOpacity
            style={styles.pickerBackdrop}
            activeOpacity={1}
            onPress={() => setShowItemResolvePicker(false)}
          >
            <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
              <View style={styles.pickerCard}>
                <Text style={styles.pickerTitle}>Dar saída — escolher destino</Text>
                {DESTINATION_RESOLVE_OPTIONS.map((opt, idx, arr) => {
                  const isPreselected = resolveTargetItem?.destination === opt.value;
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      style={[
                        styles.pickerOption,
                        idx < arr.length - 1 && styles.pickerOptionBorder,
                      ]}
                      onPress={() => handleResolveItem(opt.value)}
                    >
                      <View style={styles.resolveOptionRow}>
                        <Text style={styles.pickerOptionText}>{opt.label}</Text>
                        {isPreselected && (
                          <Text style={{ color: Colors.primary, fontSize: 16 }}>✓</Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
                <View style={styles.pickerDivider} />
                <TouchableOpacity
                  style={styles.pickerOption}
                  onPress={() => setShowItemResolvePicker(false)}
                >
                  <Text style={[styles.pickerOptionText, { color: Colors.textSecondary }]}>
                    Cancelar
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>

        {/* ── Item delete confirm ── */}
        <Modal
          visible={showItemDeleteConfirm}
          transparent
          animationType="fade"
          onRequestClose={() => setShowItemDeleteConfirm(false)}
        >
          <View style={styles.confirmBackdrop}>
            <View style={styles.confirmCard}>
              <Text style={styles.confirmTitle}>
                Apagar «{deleteTargetItem?.name}»?
              </Text>
              <Text style={styles.confirmBody}>Esta ação não pode ser desfeita.</Text>
              <View style={styles.confirmButtons}>
                <TouchableOpacity
                  style={[styles.confirmBtn, styles.confirmBtnCancel]}
                  onPress={() => setShowItemDeleteConfirm(false)}
                  disabled={deletingItemId !== null}
                >
                  <Text style={styles.confirmBtnCancelText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.confirmBtn, styles.confirmBtnDelete]}
                  onPress={handleDeleteItem}
                  disabled={deletingItemId !== null}
                >
                  <Text style={styles.confirmBtnDeleteText}>
                    {deletingItemId !== null ? 'A apagar...' : 'Apagar'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

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
    </ItemMenuProvider>
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

  // Toolbar
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  historyLink: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '500',
  },
  toolbarIcons: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },

  // History modal
  historyBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  historySheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '75%',
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  historyClose: {
    fontSize: 15,
    color: Colors.primary,
  },
  historyError: {
    fontSize: 13,
    color: Colors.error,
    padding: 12,
    textAlign: 'center',
  },
  historyList: {
    padding: 16,
    paddingBottom: 32,
    gap: 12,
  },
  historyEmpty: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 24,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  historyItemInfo: {
    flex: 1,
    gap: 4,
  },
  historyItemName: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  historyItemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  destBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  destBadgeText: {
    fontSize: 11,
    fontWeight: '500',
  },
  historyDate: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  restoreButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: Colors.primary,
    borderRadius: 8,
  },
  restoreButtonText: {
    fontSize: 13,
    color: '#ffffff',
    fontWeight: '500',
  },

  // Item action error
  menuActionErrorBox: {
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    padding: 10,
  },
  menuActionErrorText: {
    color: Colors.error,
    fontSize: 13,
    textAlign: 'center',
  },

  // Resolve picker option row
  resolveOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  // Picker (resolve)
  pickerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 24,
  },
  pickerCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
  },
  pickerTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  pickerOption: {
    paddingVertical: 14,
  },
  pickerOptionBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  pickerOptionText: {
    fontSize: 15,
    color: Colors.textPrimary,
  },
  pickerDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 4,
  },

  // Delete confirm
  confirmBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 32,
  },
  confirmCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 24,
  },
  confirmTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  confirmBody: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 24,
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  confirmBtnCancel: {
    backgroundColor: Colors.border,
  },
  confirmBtnCancelText: {
    fontSize: 15,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  confirmBtnDelete: {
    backgroundColor: Colors.error,
  },
  confirmBtnDeleteText: {
    fontSize: 15,
    color: '#ffffff',
    fontWeight: '600',
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
