import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useHousehold } from '../../../contexts/HouseholdContext';
import { InventoryService } from '../../../services/inventory.service';
import { LocationService } from '../../../services/location.service';
import { StorageService } from '../../../services/storage.service';
import { Colors } from '../../../constants/colors';
import {
  DESTINATION_ALL_OPTIONS,
  DESTINATION_RESOLVE_OPTIONS,
} from '../../../constants/destinations';
import InventoryItemRow from '@/components/inventory/InventoryItemRow';
import ItemMenuProvider from '@/components/ItemMenuProvider';
import ItemForm from './item-form';
import type { InventoryItem } from '../../../types/inventory-item';
import type { Location } from '../../../types/location';
import type { MenuAction } from '@/contexts/ItemMenuContext';

const PAGE_SIZE = 30;

// Chips de filtro de destino — label visível + valor para a API
const DEST_FILTER_CHIPS = [
  { label: 'Todos', apiValue: undefined as string | undefined },
  { label: 'Indefinido', apiValue: 'null' },
  ...DESTINATION_ALL_OPTIONS
    .filter((o) => o.value !== '')
    .map((o) => ({ label: o.label, apiValue: o.value as string })),
];

export default function LocationDetailScreen() {
  const router = useRouter();
  const { locationId, locationName } = useLocalSearchParams<{ locationId: string; locationName: string }>();
  const { selectedHousehold } = useHousehold();

  const isNullLocation = locationId === 'null';
  const decodedName = decodeURIComponent(locationName ?? '');

  // ── Dados ──
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [locations, setLocations] = useState<Location[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Filtro de destino ──
  const [selectedChip, setSelectedChip] = useState('Todos');

  // ── Item form ──
  const [showItemForm, setShowItemForm] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | undefined>(undefined);

  // ── Resolve / Delete ──
  const [resolveTargetItem, setResolveTargetItem] = useState<InventoryItem | null>(null);
  const [showItemResolvePicker, setShowItemResolvePicker] = useState(false);
  const [deleteTargetItem, setDeleteTargetItem] = useState<InventoryItem | null>(null);
  const [showItemDeleteConfirm, setShowItemDeleteConfirm] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // ── Carregamento ──────────────────────────────────────────────────────────

  async function fetchPhotos(newItems: InventoryItem[]) {
    const paths = newItems
      .filter((i) => i.photoUrl && !photoUrls[i.photoUrl])
      .map((i) => i.photoUrl!);
    if (paths.length === 0) return;
    const urls = await StorageService.getSignedUrls(paths);
    setPhotoUrls((prev) => ({ ...prev, ...urls }));
  }

  async function loadPage(pageNum: number, reset = false) {
    if (!selectedHousehold) return;
    if (pageNum === 1) setLoading(true);
    else setLoadingMore(true);
    setError(null);

    try {
      const chipMeta = DEST_FILTER_CHIPS.find((c) => c.label === selectedChip);
      const paged = await InventoryService.getItems({
        householdId: selectedHousehold.id,
        locationId: isNullLocation ? 'null' : locationId,
        destination: chipMeta?.apiValue,
        page: pageNum,
        pageSize: PAGE_SIZE,
      });

      const newItems = paged.items;
      setItems((prev) => (reset || pageNum === 1 ? newItems : [...prev, ...newItems]));
      setHasMore(paged.hasMore);
      setPage(pageNum);
      await fetchPhotos(newItems);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar itens.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  // Boot
  useEffect(() => {
    LocationService.getLocations(selectedHousehold?.id ?? '').then(setLocations).catch(() => {});
    loadPage(1, true);
  }, [selectedHousehold?.id, locationId]);

  // Reload ao mudar filtro de destino
  useEffect(() => {
    loadPage(1, true);
  }, [selectedChip]);

  // Limpar memória ao sair da tela
  useFocusEffect(
    useCallback(() => {
      return () => {
        setItems([]);
        setPhotoUrls({});
        setPage(1);
        setHasMore(true);
      };
    }, [])
  );

  // ── Item actions ──────────────────────────────────────────────────────────

  async function handleResolveItem(destination: string) {
    if (!resolveTargetItem) return;
    setShowItemResolvePicker(false);
    try {
      await InventoryService.resolveItem(resolveTargetItem.id, destination);
      loadPage(1, true);
    } catch {
      setActionError('Erro ao dar saída ao item.');
    } finally {
      setResolveTargetItem(null);
    }
  }

  async function handleDeleteItem() {
    if (!deleteTargetItem) return;
    setShowItemDeleteConfirm(false);
    try {
      await InventoryService.deleteItem(deleteTargetItem.id);
      loadPage(1, true);
    } catch {
      setActionError('Erro ao apagar item.');
    } finally {
      setDeleteTargetItem(null);
    }
  }

  function menuActionsForItem(item: InventoryItem): MenuAction[] {
    return [
      {
        label: 'Editar',
        onPress: () => { setEditingItem(item); setShowItemForm(true); },
      },
      {
        label: 'Dar saída',
        onPress: () => { setResolveTargetItem(item); setActionError(null); setShowItemResolvePicker(true); },
      },
      {
        label: 'Eliminar',
        destructive: true,
        onPress: () => { setDeleteTargetItem(item); setActionError(null); setShowItemDeleteConfirm(true); },
      },
    ];
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <ItemMenuProvider>
      <View style={styles.root}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{decodedName}</Text>
        </View>

        {/* Chips de destino */}
        <FlatList
          horizontal
          data={DEST_FILTER_CHIPS}
          keyExtractor={(chip) => chip.label}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsContainer}
          renderItem={({ item: chip }) => (
            <TouchableOpacity
              style={[styles.chip, selectedChip === chip.label && styles.chipActive]}
              onPress={() => setSelectedChip(chip.label)}
            >
              <Text style={[styles.chipText, selectedChip === chip.label && styles.chipTextActive]}>
                {chip.label}
              </Text>
            </TouchableOpacity>
          )}
        />

        {!!actionError && (
          <View style={styles.actionErrorBox}>
            <Text style={styles.actionErrorText}>{actionError}</Text>
          </View>
        )}

        {/* Lista */}
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : error ? (
          <View style={styles.centered}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => loadPage(1, true)}>
              <Text style={styles.retryButtonText}>Tentar novamente</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item, index }) => (
              <InventoryItemRow
                item={item}
                isLast={index === items.length - 1}
                photoUrls={photoUrls}
                onEdit={() => { setEditingItem(item); setShowItemForm(true); }}
                menuActions={menuActionsForItem(item)}
              />
            )}
            onEndReachedThreshold={0.3}
            onEndReached={() => {
              if (hasMore && !loadingMore) loadPage(page + 1);
            }}
            ListFooterComponent={
              loadingMore
                ? <ActivityIndicator color={Colors.primary} style={{ padding: 16 }} />
                : hasMore
                ? null
                : items.length > 0
                ? <Text style={styles.endText}>Fim da lista</Text>
                : <Text style={styles.emptyText}>Nenhum item aqui.</Text>
            }
          />
        )}

        {/* FAB */}
        <TouchableOpacity
          style={styles.fab}
          onPress={() => { setEditingItem(undefined); setShowItemForm(true); }}
        >
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>

        {/* Resolve picker */}
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
                {DESTINATION_RESOLVE_OPTIONS.map((opt, idx, arr) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.pickerOption, idx < arr.length - 1 && styles.pickerOptionBorder]}
                    onPress={() => handleResolveItem(opt.value)}
                  >
                    <Text style={styles.pickerOptionText}>{opt.label}</Text>
                  </TouchableOpacity>
                ))}
                <View style={styles.pickerDivider} />
                <TouchableOpacity
                  style={styles.pickerOption}
                  onPress={() => setShowItemResolvePicker(false)}
                >
                  <Text style={[styles.pickerOptionText, { color: Colors.textSecondary }]}>Cancelar</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>

        {/* Delete confirm */}
        <Modal
          visible={showItemDeleteConfirm}
          transparent
          animationType="fade"
          onRequestClose={() => setShowItemDeleteConfirm(false)}
        >
          <View style={styles.confirmBackdrop}>
            <View style={styles.confirmCard}>
              <Text style={styles.confirmTitle}>Apagar «{deleteTargetItem?.name}»?</Text>
              <Text style={styles.confirmBody}>Esta ação não pode ser desfeita.</Text>
              <View style={styles.confirmButtons}>
                <TouchableOpacity
                  style={[styles.confirmBtn, styles.confirmBtnCancel]}
                  onPress={() => setShowItemDeleteConfirm(false)}
                >
                  <Text style={styles.confirmBtnCancelText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.confirmBtn, styles.confirmBtnDelete]}
                  onPress={handleDeleteItem}
                >
                  <Text style={styles.confirmBtnDeleteText}>Apagar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Item form */}
        {selectedHousehold && (
          <ItemForm
            visible={showItemForm}
            householdId={selectedHousehold.id}
            locations={locations}
            item={editingItem}
            preselectedLocationId={isNullLocation ? undefined : locationId}
            onClose={() => setShowItemForm(false)}
            onSaved={() => { setShowItemForm(false); loadPage(1, true); }}
          />
        )}
      </View>
    </ItemMenuProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: { marginRight: 8, padding: 4 },
  backText: { fontSize: 28, color: Colors.primary, lineHeight: 32 },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '600', color: Colors.textPrimary },
  chipsContainer: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },
  chipTextActive: { color: '#fff' },
  listContent: { paddingBottom: 100 },
  actionErrorBox: {
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    padding: 10,
  },
  actionErrorText: { color: Colors.error, fontSize: 13, textAlign: 'center' },
  errorText: { color: Colors.error, fontSize: 14, textAlign: 'center', marginBottom: 12 },
  retryButton: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: Colors.primary, borderRadius: 8 },
  retryButtonText: { color: '#fff', fontSize: 14, fontWeight: '500' },
  endText: { textAlign: 'center', padding: 16, fontSize: 13, color: Colors.textSecondary },
  emptyText: { textAlign: 'center', padding: 32, fontSize: 14, color: Colors.textSecondary },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  fabText: { fontSize: 28, color: '#fff', lineHeight: 32 },
  pickerBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 24 },
  pickerCard: { backgroundColor: Colors.surface, borderRadius: 16, padding: 16 },
  pickerTitle: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary, marginBottom: 12 },
  pickerOption: { paddingVertical: 14 },
  pickerOptionBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  pickerOptionText: { fontSize: 15, color: Colors.textPrimary },
  pickerDivider: { height: 1, backgroundColor: Colors.border, marginVertical: 4 },
  confirmBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 32 },
  confirmCard: { backgroundColor: Colors.surface, borderRadius: 16, padding: 24 },
  confirmTitle: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary, marginBottom: 8 },
  confirmBody: { fontSize: 14, color: Colors.textSecondary, marginBottom: 20 },
  confirmButtons: { flexDirection: 'row', gap: 12 },
  confirmBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  confirmBtnCancel: { backgroundColor: Colors.border },
  confirmBtnDelete: { backgroundColor: Colors.error },
  confirmBtnCancelText: { fontSize: 14, color: Colors.textPrimary, fontWeight: '500' },
  confirmBtnDeleteText: { fontSize: 14, color: '#fff', fontWeight: '600' },
});
