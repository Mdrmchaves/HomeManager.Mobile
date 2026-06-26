import { useCallback, useEffect, useRef, useState } from 'react';
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
import { usePertences } from '../../../contexts/PertencesContext';
import { InventoryService } from '../../../services/inventory.service';
import { StorageService } from '../../../services/storage.service';
import { Colors } from '../../../constants/colors';
import {
  DESTINATION_ALL_OPTIONS,
  DESTINATION_RESOLVE_OPTIONS,
} from '../../../constants/destinations';
import InventoryItemRow from '@/components/inventory/InventoryItemRow';
import ItemForm from './item-form';
import type { InventoryItem } from '../../../types/inventory-item';

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
  const { locations, detailCache, setDetailCache, refreshCounts } = usePertences();

  const isNullLocation = locationId === 'null';
  const decodedName = decodeURIComponent(locationName ?? '');

  // ── Dados ──
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
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
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);

  // ── Refs ──
  const fetchingRef = useRef(false);
  // Previne double-fetch no mount: boot effect e chip effect disparam em simultâneo
  const chipChangedRef = useRef(false);
  // Segue o estado actual para evitar stale closure no cleanup do useFocusEffect
  const currentStateRef = useRef({ items, photoUrls, page, hasMore });

  // ── Resolve / Delete ──
  const [resolveTargetItem, setResolveTargetItem] = useState<InventoryItem | null>(null);
  const [showItemResolvePicker, setShowItemResolvePicker] = useState(false);
  const [deleteTargetItem, setDeleteTargetItem] = useState<InventoryItem | null>(null);
  const [showItemDeleteConfirm, setShowItemDeleteConfirm] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Manter currentStateRef sincronizado com o estado actual
  useEffect(() => {
    currentStateRef.current = { items, photoUrls, page, hasMore };
  }, [items, photoUrls, page, hasMore]);

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
    if (fetchingRef.current) return;
    fetchingRef.current = true;
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
      fetchingRef.current = false;
      setLoading(false);
      setLoadingMore(false);
    }
  }

  // Boot — dispara ao entrar na tela ou mudar de localização
  useEffect(() => {
    // Sinalizar ao chip effect para não disparar na montagem inicial
    chipChangedRef.current = false;
    // Resetar chip — se já era 'Todos', não gera re-render nem dispara chip effect
    setSelectedChip('Todos');

    // Verificar cache (sempre para chip 'Todos' pois é o estado inicial)
    const cacheKey = `loc:${locationId}:Todos`;
    if (detailCache?.key === cacheKey) {
      setItems(detailCache.items);
      setPhotoUrls(detailCache.photoUrls);
      setPage(detailCache.page);
      setHasMore(detailCache.hasMore);
      setLoading(false);
      return;
    }

    loadPage(1, true);
  }, [selectedHousehold?.id, locationId]);

  // Chip — skip na montagem inicial (boot effect trata o fetch inicial)
  useEffect(() => {
    if (!chipChangedRef.current) {
      // Primeira execução após boot: marcar como pronto para reagir a mudanças futuras
      chipChangedRef.current = true;
      return;
    }
    loadPage(1, true);
  }, [selectedChip]);

  // Cleanup ao sair: guardar estado no cache e limpar memória local
  useFocusEffect(
    useCallback(() => {
      return () => {
        setDetailCache({
          key: `loc:${locationId}:${selectedChip}`,
          ...currentStateRef.current,
        });
        setItems([]);
        setPhotoUrls({});
        setPage(1);
        setHasMore(true);
      };
    }, [locationId, selectedChip])
  );

  // ── Item actions ──────────────────────────────────────────────────────────

  async function handleResolveItem(destination: string) {
    if (!resolveTargetItem) return;
    setShowItemResolvePicker(false);
    const targetId = resolveTargetItem.id;
    setResolveTargetItem(null);
    try {
      await InventoryService.resolveItem(targetId, destination);
      setItems((prev) => prev.filter((i) => i.id !== targetId));
      refreshCounts();
    } catch {
      setActionError('Erro ao dar saída ao item.');
    }
  }

  async function handleDeleteItem() {
    if (!deleteTargetItem) return;
    setShowItemDeleteConfirm(false);
    const targetId = deleteTargetItem.id;
    setDeleteTargetItem(null);
    try {
      await InventoryService.deleteItem(targetId);
      setItems((prev) => prev.filter((i) => i.id !== targetId));
      refreshCounts();
    } catch {
      setActionError('Erro ao apagar item.');
    }
  }


  // ── Render ────────────────────────────────────────────────────────────────

  return (
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
          style={styles.chipsRow}
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
              <View style={styles.chipdivider} />
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
          <View style={styles.skeletonContainer}>
            {[...Array(8)].map((_, i) => (
              <View key={i} style={styles.skeletonRow}>
                <View style={styles.skeletonPhoto} />
                <View style={styles.skeletonInfo}>
                  <View style={styles.skeletonName} />
                  <View style={styles.skeletonBadge} />
                </View>
              </View>
            ))}
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
                expanded={expandedItemId === item.id}
                onToggle={() => setExpandedItemId((prev) => prev === item.id ? null : item.id)}
                onEdit={() => { setExpandedItemId(null); setEditingItem(item); setShowItemForm(true); }}
                onResolve={() => { setExpandedItemId(null); setResolveTargetItem(item); setActionError(null); setShowItemResolvePicker(true); }}
                onDelete={() => { setExpandedItemId(null); setDeleteTargetItem(item); setActionError(null); setShowItemDeleteConfirm(true); }}
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
            onSaved={(saved) => {
              setShowItemForm(false);
              if (saved) {
                // Edição — actualização optimista da linha
                setItems((prev) => prev.map((i) => (i.id === saved.id ? saved : i)));
              } else {
                // Criação — reload (novo item vai para o topo)
                loadPage(1, true);
                refreshCounts();
              }
            }}
          />
        )}
      </View>
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
  chipsRow: { flexGrow: 0 },
  chipsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignContent: 'flex-start',
 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    flexShrink: 0,
    marginRight: 8,
    minWidth: 80,
    minHeight: 32,
    alignItems: 'center',
  },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },
  chipTextActive: { color: '#fff' },
  chipdivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginHorizontal: 5,
  },
  listContent: { paddingBottom: 100 },
  skeletonContainer: { flex: 1, paddingTop: 8 },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    opacity: 0.6,
  },
  skeletonPhoto: { width: 60, height: 60, borderRadius: 8, backgroundColor: Colors.border, flexShrink: 0 },
  skeletonInfo: { flex: 1, gap: 8 },
  skeletonName: { height: 14, borderRadius: 6, backgroundColor: Colors.border },
  skeletonBadge: { width: 60, height: 20, borderRadius: 10, backgroundColor: Colors.border },
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
