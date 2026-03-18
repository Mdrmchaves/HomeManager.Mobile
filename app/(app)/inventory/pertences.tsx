import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
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

const DESTINATION_STYLES: Record<string, { bg: string; text: string }> = {
  Manter: { bg: '#d1fae5', text: '#065f46' },
  Vender: { bg: '#dbeafe', text: '#1e40af' },
  Doar: { bg: '#ede9fe', text: '#5b21b6' },
  Descartar: { bg: '#fee2e2', text: '#991b1b' },
};

const DESTINATION_FILTER_OPTIONS = ['Todos', 'Manter', 'Vender', 'Doar', 'Descartar'];

function getDestinationLabel(destination?: string): string | null {
  if (!destination || destination === 'Undecided') return null;
  return DESTINATION_MAP[destination] ?? null;
}

// ─── Group builder ────────────────────────────────────────────────────────────

interface Group {
  id: string | null;
  name: string;
  items: InventoryItem[];
}

function buildGroups(
  items: InventoryItem[],
  locations: Location[],
  searchQuery: string,
  selectedDestination: string
): Group[] {
  const filtered = items.filter((item) => {
    const matchSearch =
      !searchQuery || item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchDestination =
      selectedDestination === 'Todos' ||
      getDestinationLabel(item.destination) === selectedDestination;
    return matchSearch && matchDestination;
  });

  const locationOrder = new Map(locations.map((l, i) => [l.id, i]));
  const groupMap = new Map<string, Group>();

  for (const item of filtered) {
    const key = item.locationId ?? '__none__';
    if (!groupMap.has(key)) {
      const name = item.locationId
        ? (locations.find((l) => l.id === item.locationId)?.name ?? item.locationName ?? 'Sem local')
        : 'Sem local';
      groupMap.set(key, { id: item.locationId ?? null, name, items: [] });
    }
    groupMap.get(key)!.items.push(item);
  }

  return [...groupMap.values()].sort((a, b) => {
    if (a.id === null) return 1;
    if (b.id === null) return -1;
    return (locationOrder.get(a.id) ?? 999) - (locationOrder.get(b.id) ?? 999);
  });
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
  const destStyle = destLabel ? DESTINATION_STYLES[destLabel] : null;
  const signedUrl = item.photoUrl ? photoUrls[item.photoUrl] : null;

  return (
    <View style={[itemStyles.row, !isLast && itemStyles.rowBorder]}>
      {/* Photo */}
      {signedUrl ? (
        <Image
          source={{ uri: signedUrl }}
          style={{ width: 44, height: 44, borderRadius: 8 }}
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

        <View style={itemStyles.tags}>
          {item.categoryName && (
            <View style={itemStyles.categoryChip}>
              <Text style={itemStyles.categoryChipText}>{item.categoryName}</Text>
            </View>
          )}
          {item.value != null && (
            <Text style={itemStyles.value}>€{item.value.toFixed(2)}</Text>
          )}
          {destLabel && destStyle && (
            <View style={[itemStyles.destBadge, { backgroundColor: destStyle.bg }]}>
              <Text style={[itemStyles.destBadgeText, { color: destStyle.text }]}>
                {destLabel}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Edit button */}
      <TouchableOpacity style={itemStyles.editButton} onPress={onEdit}>
        <Text style={itemStyles.editButtonText}>Editar</Text>
      </TouchableOpacity>
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

  const groups = buildGroups(items, locations, searchQuery, selectedDestination);
  const hasResults = groups.some((g) => g.items.length > 0);

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
        {!hasResults && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📦</Text>
            <Text style={styles.emptyText}>Nenhum item encontrado</Text>
          </View>
        )}

        {/* Groups */}
        {groups.map((group) =>
          group.items.length === 0 ? null : (
            <View key={group.id ?? '__none__'}>
              <Text style={styles.groupHeader}>{group.name.toUpperCase()}</Text>
              <View style={styles.groupCard}>
                {group.items.map((item, idx) => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    isLast={idx === group.items.length - 1}
                    photoUrls={photoUrls}
                    onEdit={() => {
                      setEditingItem(item);
                      setPreselectedLocationId(undefined);
                      setShowItemForm(true);
                    }}
                  />
                ))}
              </View>
            </View>
          )
        )}
      </ScrollView>

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

      {/* Item form */}
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

  // Groups
  groupHeader: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 16,
  },
  groupCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 8,
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

const itemStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 10,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },

  // Photo
  photo: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
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
    fontSize: 22,
  },

  // Info
  info: {
    flex: 1,
    gap: 4,
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
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  categoryChip: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  categoryChipText: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  value: {
    fontSize: 12,
    color: Colors.textSecondary,
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

  // Edit
  editButton: {
    padding: 8,
  },
  editButtonText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '500',
  },
});
