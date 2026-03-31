import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ActivityIndicator,
  SectionList,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useHousehold } from '../../../contexts/HouseholdContext';
import { InventoryService } from '../../../services/inventory.service';
import { LocationService } from '../../../services/location.service';
import { StorageService } from '../../../services/storage.service';
import { Colors } from '../../../constants/colors';
import { DESTINATION_RESOLVE_OPTIONS } from '../../../constants/destinations';
import InventoryItemRow from '@/components/inventory/InventoryItemRow';
import ItemMenuProvider from '@/components/ItemMenuProvider';
import ItemForm from './item-form';
import type { InventoryItem } from '../../../types/inventory-item';
import type { Location } from '../../../types/location';
import type { MenuAction } from '@/contexts/ItemMenuContext';

const PAGE_SIZE = 30;

export default function DestinationDetailScreen() {
  const router = useRouter();
  const { destination, label } = useLocalSearchParams<{ destination: string; label: string }>();
  const { selectedHousehold } = useHousehold();

  const isNullDestination = destination === 'null';
  const decodedLabel = decodeURIComponent(label ?? '');

  // ── Dados ──
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [locations, setLocations] = useState<Location[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      const paged = await InventoryService.getItems({
        householdId: selectedHousehold.id,
        destination: isNullDestination ? 'null' : destination,
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

  useEffect(() => {
    LocationService.getLocations(selectedHousehold?.id ?? '').then(setLocations).catch(() => {});
    loadPage(1, true);
  }, [selectedHousehold?.id, destination]);

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

  // ── Agrupar itens por localização para divisores estáticos ────────────────

  type Section = { title: string; data: InventoryItem[] };

  function buildSections(allItems: InventoryItem[]): Section[] {
    const map = new Map<string, InventoryItem[]>();
    for (const item of allItems) {
      const key = item.locationName ?? 'Sem localização';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }
    return Array.from(map.entries()).map(([title, data]) => ({ title, data }));
  }

  const sections = buildSections(items);

  // ── Item actions ──────────────────────────────────────────────────────────

  async function handleResolveItem(dest: string) {
    if (!resolveTargetItem) return;
    setShowItemResolvePicker(false);
    try {
      await InventoryService.resolveItem(resolveTargetItem.id, dest);
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
          <Text style={styles.headerTitle}>{decodedLabel}</Text>
          <Text style={styles.headerCount}>{items.length} itens</Text>
        </View>

        {!!actionError && (
          <View style={styles.actionErrorBox}>
            <Text style={styles.actionErrorText}>{actionError}</Text>
          </View>
        )}

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
          <SectionList
            sections={sections}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            renderSectionHeader={({ section }) => (
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionHeaderText}>{section.title}</Text>
              </View>
            )}
            renderItem={({ item, index, section }) => (
              <InventoryItemRow
                item={item}
                isLast={index === section.data.length - 1}
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
                : !hasMore && items.length > 0
                ? <Text style={styles.endText}>Fim da lista</Text>
                : items.length === 0
                ? <Text style={styles.emptyText}>Nenhum item com este destino.</Text>
                : null
            }
          />
        )}

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
            preselectedLocationId={undefined}
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
    paddingVertical: 8,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: { marginRight: 8, padding: 4 },
  backText: { fontSize: 28, color: Colors.primary, lineHeight: 32 },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '600', color: Colors.textPrimary },
  headerCount: { fontSize: 13, color: Colors.textSecondary },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginTop: 16,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  sectionHeaderText: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary, letterSpacing: 0.5 },
  listContent: { paddingBottom: 100 },
  actionErrorBox: { marginHorizontal: 16, marginBottom: 8, backgroundColor: '#fef2f2', borderRadius: 8, padding: 10 },
  actionErrorText: { color: Colors.error, fontSize: 13, textAlign: 'center' },
  errorText: { color: Colors.error, fontSize: 14, textAlign: 'center', marginBottom: 12 },
  retryButton: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: Colors.primary, borderRadius: 8 },
  retryButtonText: { color: '#fff', fontSize: 14, fontWeight: '500' },
  endText: { textAlign: 'center', padding: 16, fontSize: 13, color: Colors.textSecondary },
  emptyText: { textAlign: 'center', padding: 32, fontSize: 14, color: Colors.textSecondary },
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
