import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  StyleSheet,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { useHousehold } from '../_layout';
import ItemForm from './item-form';
import { InventoryService } from '../../../services/inventory.service';
import { LocationService } from '../../../services/location.service';
import { StorageService } from '../../../services/storage.service';
import { Colors } from '../../../constants/colors';
import type { InventoryItem } from '../../../types/inventory-item';
import type { Location } from '../../../types/location';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const DESTINATION_MAP: Record<string, string> = {
  Keep: 'Manter',
  Sell: 'Vender',
  Donate: 'Doar',
  Trash: 'Descartar',
};

const DESTINATION_BADGE_STYLES: Record<string, { bg: string; text: string }> = {
  Manter: { bg: '#d1fae5', text: '#065f46' },
  Vender: { bg: '#dbeafe', text: '#1e40af' },
  Doar: { bg: '#ede9fe', text: '#5b21b6' },
  Descartar: { bg: '#fee2e2', text: '#991b1b' },
};

const DESTINATION_BAR_COLORS: Record<string, string> = {
  Keep: '#059669',
  Sell: '#2563eb',
  Donate: '#7c3aed',
  Trash: '#dc2626',
};

const DESTINATION_FILTER_OPTIONS = ['Todos', 'Manter', 'Vender', 'Doar', 'Descartar'];

function getDestinationLabel(destination?: string): string | null {
  if (!destination || destination === 'Undecided') return null;
  return DESTINATION_MAP[destination] ?? null;
}

function getDestinationBarColor(destination?: string): string {
  if (!destination || destination === 'Undecided') return '#d1d5db';
  return DESTINATION_BAR_COLORS[destination] ?? '#d1d5db';
}

// ─── Group builder ────────────────────────────────────────────────────────────

interface Group {
  locationId: string | null;
  locationName: string;
  locationIcon?: string;
  location: Location | null;
  items: InventoryItem[];
}

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

// ─── Item row ─────────────────────────────────────────────────────────────────

function ItemRow({
  item,
  isLast,
  photoUrls,
  onEdit,
}: {
  item: InventoryItem;
  isLast: boolean;
  photoUrls: Record<string, string>;
  onEdit: () => void;
}) {
  const destLabel = getDestinationLabel(item.destination);
  const destBadgeStyle = destLabel ? DESTINATION_BADGE_STYLES[destLabel] : null;
  const signedUrl = item.photoUrl ? photoUrls[item.photoUrl] : null;
  const barColor = getDestinationBarColor(item.destination);

  return (
    <View style={[itemStyles.row, !isLast && itemStyles.rowBorder]}>
      {/* Colored left bar */}
      <View style={[itemStyles.colorBar, { backgroundColor: barColor }]} />

      {/* Photo */}
      {signedUrl ? (
        <Image
          source={{ uri: signedUrl }}
          style={itemStyles.photo}
          contentFit="cover"
          cachePolicy="memory-disk"
          placeholder={null}
        />
      ) : (
        <View style={itemStyles.photoPlaceholder}>
          <Text style={itemStyles.photoEmoji}>📦</Text>
        </View>
      )}

      {/* Info */}
      <View style={itemStyles.info}>
        <Text style={itemStyles.name} numberOfLines={1}>
          {item.name}
          {item.quantity != null && item.quantity > 1 && (
            <Text style={itemStyles.qty}> ×{item.quantity}</Text>
          )}
        </Text>

        {destLabel && destBadgeStyle && (
          <View style={itemStyles.badges}>
            <View style={[itemStyles.destBadge, { backgroundColor: destBadgeStyle.bg }]}>
              <Text style={[itemStyles.destBadgeText, { color: destBadgeStyle.text }]}>
                {destLabel}
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Edit button */}
      <TouchableOpacity style={itemStyles.editButton} onPress={onEdit}>
        <Text style={itemStyles.editButtonText}>Editar</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Group card ───────────────────────────────────────────────────────────────

function GroupCard({
  group,
  collapsed,
  photoUrls,
  onToggle,
  onEditItem,
  onAddItem,
  onOpenMenu,
}: {
  group: Group;
  collapsed: boolean;
  photoUrls: Record<string, string>;
  onToggle: () => void;
  onEditItem: (item: InventoryItem) => void;
  onAddItem: () => void;
  onOpenMenu: (top: number) => void;
}) {
  const isSemLocal = group.locationId === null;
  const menuButtonRef = useRef<View>(null);

  return (
    <View style={groupStyles.wrapper}>
      <View style={groupStyles.card}>
        {/* Header */}
        <View style={groupStyles.locationHeader}>
          {/* Área clicável para toggle — ocupa todo o espaço menos o ⋮ */}
          <TouchableOpacity
            style={groupStyles.locationHeaderLeft}
            onPress={onToggle}
            activeOpacity={0.7}
          >
            {!!group.locationIcon && (
              <Text style={groupStyles.locationIcon}>{group.locationIcon}</Text>
            )}
            <Text style={[groupStyles.locationHeaderText, isSemLocal && groupStyles.locationHeaderTextMuted]}>
              {group.locationName}
            </Text>
            <View style={groupStyles.locationBadge}>
              <Text style={groupStyles.locationBadgeText}>{group.items.length}</Text>
            </View>
            <Text style={groupStyles.locationChevron}>{collapsed ? '▸' : '▾'}</Text>
          </TouchableOpacity>

          {/* Botão menu — separado, não propaga para o toggle */}
          {group.location && (
            <TouchableOpacity
              ref={menuButtonRef as any}
              style={groupStyles.locationMenuButton}
              onPress={() => {
                menuButtonRef.current?.measure((_x, _y, _width, height, _pageX, pageY) => {
                  onOpenMenu(pageY + height);
                });
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={groupStyles.locationMenuIcon}>⋮</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Items + add button */}
        {!collapsed && (
          <>
            {group.items.map((item, idx) => (
              <ItemRow
                key={item.id}
                item={item}
                isLast={idx === group.items.length - 1}
                photoUrls={photoUrls}
                onEdit={() => onEditItem(item)}
              />
            ))}

            {!isSemLocal && (
              <TouchableOpacity style={groupStyles.addItemBtn} onPress={onAddItem}>
                <Text style={groupStyles.addItemBtnPlus}>+</Text>
                <Text style={groupStyles.addItemBtnText}>Adicionar a {group.locationName}</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
    </View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function PertencesTab() {
  const { selectedHousehold } = useHousehold();

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [reloading, setReloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDestination, setSelectedDestination] = useState('Todos');
  const [showItemForm, setShowItemForm] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | undefined>(undefined);
  const [preselectedLocationId, setPreselectedLocationId] = useState<string | undefined>(undefined);
  const [collapsedLocations, setCollapsedLocations] = useState<Set<string>>(new Set());

  // New location
  const [showNewLocationModal, setShowNewLocationModal] = useState(false);
  const [newLocationName, setNewLocationName] = useState('');
  const [newLocationIcon, setNewLocationIcon] = useState('');

  // Location menu
  const [activeLocationMenu, setActiveLocationMenu] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; right: number } | null>(null);

  // Edit location
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [showEditLocationModal, setShowEditLocationModal] = useState(false);
  const [editLocationName, setEditLocationName] = useState('');
  const [editLocationIcon, setEditLocationIcon] = useState('');

  // Delete location
  const [showDeleteLocationConfirm, setShowDeleteLocationConfirm] = useState(false);
  const [locationToDelete, setLocationToDelete] = useState<Location | null>(null);

  // Saving / deleting flags
  const [savingLocation, setSavingLocation] = useState(false);
  const [deletingLocation, setDeletingLocation] = useState(false);

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
    setSelectedDestination('Todos');
  }, [selectedHousehold?.id]);

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

  async function createLocation() {
    if (!newLocationName.trim() || !selectedHousehold) return;
    setSavingLocation(true);
    try {
      await LocationService.createLocation(
        selectedHousehold.id,
        newLocationName.trim(),
        newLocationIcon.trim() || undefined
      );
      setNewLocationName('');
      setNewLocationIcon('');
      setShowNewLocationModal(false);
      loadData(true);
    } catch {
      // erro silencioso por agora
    } finally {
      setSavingLocation(false);
    }
  }

  async function saveEditLocation() {
    if (!editingLocation || !editLocationName.trim()) return;
    setSavingLocation(true);
    try {
      await LocationService.updateLocation(
        editingLocation.id,
        editLocationName.trim(),
        editLocationIcon.trim() || undefined
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
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Pesquisar pertences..."
            placeholderTextColor={Colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {/* Destination filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersRow}
          style={styles.filtersScroll}
        >
          {DESTINATION_FILTER_OPTIONS.map((dest) => (
            <TouchableOpacity
              key={dest}
              style={[styles.chip, selectedDestination === dest && styles.chipActive]}
              onPress={() => setSelectedDestination(dest)}
            >
              <Text style={[styles.chipText, selectedDestination === dest && styles.chipTextActive]}>
                {dest}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Empty state */}
        {isEmpty && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📦</Text>
            <Text style={styles.emptyText}>Nenhum item encontrado</Text>
          </View>
        )}

        {/* Groups */}
        {groups.map((group) => (
          <GroupCard
            key={group.locationId ?? '__none__'}
            group={group}
            collapsed={isCollapsed(group.locationId)}
            photoUrls={photoUrls}
            onToggle={() => toggleLocation(group.locationId)}
            onEditItem={(item) => {
              setEditingItem(item);
              setPreselectedLocationId(undefined);
              setShowItemForm(true);
            }}
            onAddItem={() => {
              setEditingItem(undefined);
              setPreselectedLocationId(group.locationId ?? undefined);
              setShowItemForm(true);
            }}
            onOpenMenu={(top) => {
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
                  setEditLocationName(group.location.name);
                  setEditLocationIcon(group.location.icon ?? '');
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
      <Modal
        visible={showNewLocationModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowNewLocationModal(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setShowNewLocationModal(false)}
        >
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Novo local</Text>

              <TextInput
                style={styles.modalInput}
                placeholder="Ex: Cozinha, Sala..."
                placeholderTextColor={Colors.textSecondary}
                value={newLocationName}
                onChangeText={setNewLocationName}
                autoCapitalize="sentences"
                autoFocus
              />
              <TextInput
                style={styles.modalInput}
                placeholder="Emoji opcional (ex: 🍳)"
                placeholderTextColor={Colors.textSecondary}
                value={newLocationIcon}
                onChangeText={setNewLocationIcon}
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalBtnCancel]}
                  onPress={() => setShowNewLocationModal(false)}
                >
                  <Text style={styles.modalBtnCancelText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.modalBtn,
                    styles.modalBtnConfirm,
                    (!newLocationName.trim() || savingLocation) && styles.modalBtnDisabled,
                  ]}
                  onPress={createLocation}
                  disabled={!newLocationName.trim() || savingLocation}
                >
                  <Text style={styles.modalBtnConfirmText}>
                    {savingLocation ? 'A adicionar...' : 'Adicionar'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ── Editar local modal ── */}
      <Modal
        visible={showEditLocationModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowEditLocationModal(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setShowEditLocationModal(false)}
        >
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Editar local</Text>

              <TextInput
                style={styles.modalInput}
                placeholder="Nome do local"
                placeholderTextColor={Colors.textSecondary}
                value={editLocationName}
                onChangeText={setEditLocationName}
                autoCapitalize="sentences"
              />
              <TextInput
                style={styles.modalInput}
                placeholder="Emoji opcional (ex: 🍳)"
                placeholderTextColor={Colors.textSecondary}
                value={editLocationIcon}
                onChangeText={setEditLocationIcon}
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalBtnCancel]}
                  onPress={() => setShowEditLocationModal(false)}
                >
                  <Text style={styles.modalBtnCancelText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.modalBtn,
                    styles.modalBtnConfirm,
                    (!editLocationName.trim() || savingLocation) && styles.modalBtnDisabled,
                  ]}
                  onPress={saveEditLocation}
                  disabled={!editLocationName.trim() || savingLocation}
                >
                  <Text style={styles.modalBtnConfirmText}>
                    {savingLocation ? 'A salvar...' : 'Salvar'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ── Confirmar exclusão de local ── */}
      <Modal
        visible={showDeleteLocationConfirm}
        animationType="fade"
        transparent
        onRequestClose={() => setShowDeleteLocationConfirm(false)}
      >
        <View style={styles.confirmBackdrop}>
          <View style={styles.confirmCard}>
            <Text style={styles.confirmIcon}>⚠️</Text>
            <Text style={styles.confirmTitle}>Excluir local?</Text>
            <Text style={styles.confirmBody}>
              Os itens associados ficarão sem local. Esta ação não pode ser desfeita.
            </Text>
            <View style={styles.confirmButtons}>
              <TouchableOpacity
                style={[styles.confirmBtn, styles.confirmBtnCancel]}
                onPress={() => setShowDeleteLocationConfirm(false)}
                disabled={deletingLocation}
              >
                <Text style={styles.confirmBtnCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, styles.confirmBtnDelete]}
                onPress={deleteLocation}
                disabled={deletingLocation}
              >
                <Text style={styles.confirmBtnDeleteText}>
                  {deletingLocation ? 'A excluir...' : 'Excluir'}
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

  // Search
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 12,
    gap: 8,
  },
  searchIcon: {
    fontSize: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.textPrimary,
    padding: 0,
  },

  // Destination chips
  filtersScroll: {
    marginBottom: 16,
  },
  filtersRow: {
    gap: 8,
    paddingRight: 4,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  chipTextActive: {
    color: '#ffffff',
    fontWeight: '600',
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

  // Shared modal backdrop + card
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    gap: 12,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  modalInput: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalBtnCancel: {
    backgroundColor: Colors.border,
  },
  modalBtnCancelText: {
    fontSize: 15,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  modalBtnConfirm: {
    backgroundColor: Colors.primary,
  },
  modalBtnConfirmText: {
    fontSize: 15,
    color: '#ffffff',
    fontWeight: '600',
  },
  modalBtnDisabled: {
    opacity: 0.5,
  },

  // Confirm delete location
  confirmBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  confirmCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  confirmIcon: {
    fontSize: 32,
    marginBottom: 12,
  },
  confirmTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  confirmBody: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  confirmBtnCancel: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
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

// ─── Group card styles ────────────────────────────────────────────────────────

const groupStyles = StyleSheet.create({
  wrapper: {
    marginBottom: 12,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  locationHeaderLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  locationIcon: {
    fontSize: 18,
  },
  locationHeaderText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
    flexShrink: 1,
  },
  locationHeaderTextMuted: {
    color: Colors.textSecondary,
  },
  locationBadge: {
    backgroundColor: Colors.border,
    borderRadius: 11,
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationBadgeText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  locationChevron: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  locationMenuButton: {
    padding: 8,
  },
  locationMenuIcon: {
    fontSize: 18,
    color: Colors.textSecondary,
  },
  addItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  addItemBtnPlus: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '300',
  },
  addItemBtnText: {
    fontSize: 14,
    color: Colors.primary,
  },
});

// ─── Item row styles ──────────────────────────────────────────────────────────

const itemStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  colorBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
  },
  photo: {
    width: 44,
    height: 44,
    borderRadius: 8,
  },
  photoPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoEmoji: {
    fontSize: 20,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  qty: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '400',
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
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
  editButton: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  editButtonText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '500',
  },
});
