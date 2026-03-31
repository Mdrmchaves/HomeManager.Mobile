import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useHousehold } from '../../../contexts/HouseholdContext';
import { InventoryService } from '../../../services/inventory.service';
import { StorageService } from '../../../services/storage.service';
import { Colors } from '../../../constants/colors';
import { getDestinationMeta } from '../../../constants/destinations';
import type { InventoryItem } from '../../../types/inventory-item';

const PAGE_SIZE = 30;

const MONTHS_PT = ['jan.','fev.','mar.','abr.','mai.','jun.','jul.','ago.','set.','out.','nov.','dez.'];
function formatDatePT(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS_PT[d.getMonth()]} ${d.getFullYear()}`;
}

export default function HistoryScreen() {
  const router = useRouter();
  const { selectedHousehold } = useHousehold();

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);

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
      const paged = await InventoryService.getResolvedItems(
        selectedHousehold.id, pageNum, PAGE_SIZE
      );
      const newItems = paged.items;
      setItems((prev) => (reset || pageNum === 1 ? newItems : [...prev, ...newItems]));
      setHasMore(paged.hasMore);
      setPage(pageNum);
      await fetchPhotos(newItems);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar histórico.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  useEffect(() => {
    loadPage(1, true);
  }, [selectedHousehold?.id]);

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

  async function handleRestore(id: string) {
    setRestoringId(id);
    try {
      await InventoryService.restoreItem(id);
      loadPage(1, true);
    } catch {
      // silencioso — pode mostrar toast futuramente
    } finally {
      setRestoringId(null);
    }
  }

  function renderItem({ item }: { item: InventoryItem }) {
    const badge = getDestinationMeta(item.destination);
    return (
      <View style={styles.historyItem}>
        <View style={styles.historyItemInfo}>
          <Text style={styles.historyItemName}>{item.name}</Text>
          <View style={styles.historyItemMeta}>
            {item.locationName && (
              <Text style={styles.historyLocation}>{item.locationName}</Text>
            )}
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
  }

  return (
    <View style={styles.root}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Histórico</Text>
      </View>

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
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          onEndReachedThreshold={0.3}
          onEndReached={() => {
            if (hasMore && !loadingMore) loadPage(page + 1);
          }}
          ListFooterComponent={
            loadingMore
              ? <ActivityIndicator color={Colors.primary} style={{ padding: 16 }} />
              : !hasMore && items.length > 0
              ? <Text style={styles.endText}>Fim do histórico</Text>
              : items.length === 0
              ? <Text style={styles.emptyText}>Nenhum item no histórico.</Text>
              : null
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
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
    paddingVertical: 14,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: { marginRight: 8, padding: 4 },
  backText: { fontSize: 28, color: Colors.primary, lineHeight: 32 },
  headerTitle: { fontSize: 17, fontWeight: '600', color: Colors.textPrimary },
  listContent: { padding: 16, paddingBottom: 100 },
  separator: { height: 1, backgroundColor: Colors.border, marginVertical: 4 },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
  },
  historyItemInfo: { flex: 1, gap: 4 },
  historyItemName: { fontSize: 14, fontWeight: '500', color: Colors.textPrimary },
  historyItemMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  historyLocation: { fontSize: 11, color: Colors.textSecondary },
  destBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  destBadgeText: { fontSize: 11, fontWeight: '500' },
  historyDate: { fontSize: 12, color: Colors.textSecondary },
  restoreButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: Colors.primary,
    borderRadius: 8,
  },
  restoreButtonText: { fontSize: 13, color: '#ffffff', fontWeight: '500' },
  errorText: { color: Colors.error, fontSize: 14, textAlign: 'center', marginBottom: 12 },
  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: Colors.primary,
    borderRadius: 8,
  },
  retryButtonText: { color: '#fff', fontSize: 14, fontWeight: '500' },
  endText: { textAlign: 'center', padding: 16, fontSize: 13, color: Colors.textSecondary },
  emptyText: { textAlign: 'center', padding: 32, fontSize: 14, color: Colors.textSecondary },
});
