import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ActivityIndicator,
  SectionList,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
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
const DEBOUNCE_MS = 350;

export default function SearchScreen() {
  const router = useRouter();
  const { selectedHousehold } = useHousehold();
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [query, setQuery] = useState('');
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [locations, setLocations] = useState<Location[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showItemForm, setShowItemForm] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | undefined>(undefined);
  const [resolveTargetItem, setResolveTargetItem] = useState<InventoryItem | null>(null);
  const [showItemResolvePicker, setShowItemResolvePicker] = useState(false);
  const [deleteTargetItem, setDeleteTargetItem] = useState<InventoryItem | null>(null);
  const [showItemDeleteConfirm, setShowItemDeleteConfirm] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    LocationService.getLocations(selectedHousehold?.id ?? '').then(setLocations).catch(() => {});
  }, [selectedHousehold?.id]);

  useFocusEffect(
    useCallback(() => {
      return () => {
        setItems([]);
        setPhotoUrls({});
        setQuery('');
        setPage(1);
        setHasMore(false);
      };
    }, [])
  );

  async function fetchPhotos(newItems: InventoryItem[]) {
    const paths = newItems
      .filter((i) => i.photoUrl && !photoUrls[i.photoUrl])
      .map((i) => i.photoUrl!);
    if (paths.length === 0) return;
    const urls = await StorageService.getSignedUrls(paths);
    setPhotoUrls((prev) => ({ ...prev, ...urls }));
  }

  async function doSearch(q: string, pageNum: number, reset = false) {
    if (!selectedHousehold || q.trim().length < 2) {
      setItems([]);
      setHasMore(false);
      setLoading(false);
      return;
    }
    if (pageNum === 1) setLoading(true);
    else setLoadingMore(true);
    setError(null);

    try {
      const paged = await InventoryService.searchItems({
        householdId: selectedHousehold.id,
        q: q.trim(),
        page: pageNum,
        pageSize: PAGE_SIZE,
      });
      const newItems = paged.items;
      setItems((prev) => (reset || pageNum === 1 ? newItems : [...prev, ...newItems]));
      setHasMore(paged.hasMore);
      setPage(pageNum);
      await fetchPhotos(newItems);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro na pesquisa.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  function handleQueryChange(text: string) {
    setQuery(text);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      doSearch(text, 1, true);
    }, DEBOUNCE_MS);
  }

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

  async function handleResolveItem(dest: string) {
    if (!resolveTargetItem) return;
    setShowItemResolvePicker(false);
    try {
      await InventoryService.resolveItem(resolveTargetItem.id, dest);
      doSearch(query, 1, true);
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
      doSearch(query, 1, true);
    } catch {
      setActionError('Erro ao apagar item.');
    } finally {
      setDeleteTargetItem(null);
    }
  }

  function menuActionsForItem(item: InventoryItem): MenuAction[] {
    return [
      { label: 'Editar', onPress: () => { setEditingItem(item); setShowItemForm(true); } },
      { label: 'Dar saída', onPress: () => { setResolveTargetItem(item); setActionError(null); setShowItemResolvePicker(true); } },
      { label: 'Eliminar', destructive: true, onPress: () => { setDeleteTargetItem(item); setActionError(null); setShowItemDeleteConfirm(true); } },
    ];
  }

  return (
    <ItemMenuProvider>
      <View style={styles.root}>

        {/* Header com input */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={handleQueryChange}
            placeholder="Pesquisar itens..."
            placeholderTextColor={Colors.textSecondary}
            autoFocus
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => { setQuery(''); setItems([]); setHasMore(false); }}>
              <Text style={styles.clearBtn}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {!!actionError && (
          <View style={styles.actionErrorBox}>
            <Text style={styles.actionErrorText}>{actionError}</Text>
          </View>
        )}

        {/* Estado vazio / loading / resultados */}
        {query.trim().length < 2 ? (
          <View style={styles.centered}>
            <Text style={styles.hintText}>Escreve pelo menos 2 caracteres para pesquisar.</Text>
          </View>
        ) : loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : error ? (
          <View style={styles.centered}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : sections.length === 0 ? (
          <View style={styles.centered}>
            <Text style={styles.emptyText}>Nenhum resultado para "{query}".</Text>
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
              if (hasMore && !loadingMore) doSearch(query, page + 1);
            }}
            ListFooterComponent={
              loadingMore
                ? <ActivityIndicator color={Colors.primary} style={{ padding: 16 }} />
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
            onSaved={() => { setShowItemForm(false); doSearch(query, 1, true); }}
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
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: { padding: 4 },
  backText: { fontSize: 28, color: Colors.primary, lineHeight: 32 },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.textPrimary,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: Colors.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  clearBtn: { fontSize: 16, color: Colors.textSecondary, padding: 4 },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  sectionHeaderText: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary, letterSpacing: 0.5 },
  listContent: { paddingBottom: 100 },
  hintText: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center' },
  errorText: { color: Colors.error, fontSize: 14, textAlign: 'center' },
  emptyText: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center' },
  actionErrorBox: { marginHorizontal: 16, marginBottom: 8, backgroundColor: '#fef2f2', borderRadius: 8, padding: 10 },
  actionErrorText: { color: Colors.error, fontSize: 13, textAlign: 'center' },
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
