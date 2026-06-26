import { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
} from 'react-native';
import { Eye, EyeOff, ArrowLeftRight, Edit3, Trash2 } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useHousehold } from '../../../contexts/HouseholdContext';
import { usePertences } from '../../../contexts/PertencesContext';
import ItemForm from './item-form';
import { LocationService } from '../../../services/location.service';
import { Colors } from '../../../constants/colors';
import { getDestinationMeta, Destination } from '../../../constants/destinations';
import AddLocationModal from '@/components/inventory/modals/AddLocationModal';
import EditLocationModal from '@/components/inventory/modals/EditLocationModal';
import DeleteLocationConfirmModal from '@/components/inventory/modals/DeleteLocationConfirmModal';
import type { LocationCount, DestinationCount } from '../../../types/inventory-counts';
import type { Location } from '../../../types/location';

// ─── View mode ────────────────────────────────────────────────────────────────

type ViewMode = 'location' | 'destination';

// ─── LocationCard ─────────────────────────────────────────────────────────────

function LocationCard({
  lc,
  expanded,
  onPress,
  onToggle,
  onEdit,
  onDelete,
}: {
  lc: LocationCount;
  expanded: boolean;
  onPress: () => void;
  onToggle?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const hasMenu = !!onToggle;

  return (
    <View style={[styles.card, expanded && styles.cardExpanded]}>
      <TouchableOpacity
        style={styles.cardRow}
        onPress={expanded ? onToggle : onPress}
        onLongPress={hasMenu ? onToggle : undefined}
        delayLongPress={350}
        activeOpacity={0.75}
      >
        <View style={styles.cardIconWrap}>
          <Text style={styles.cardIcon} numberOfLines={1}>{lc.icon ?? '📦'}</Text>
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardName}>{lc.locationName}</Text>
        </View>
        <View style={styles.cardBadge}>
          <Text style={styles.cardBadgeText}>{lc.count}</Text>
        </View>
        {!expanded && <Text style={styles.cardArrow}>›</Text>}
      </TouchableOpacity>

      {expanded && (
        <View style={styles.accordion}>
          <View style={styles.accordionDivider} />
          <View style={styles.accordionActions}>
            <TouchableOpacity style={styles.accordionBtn} onPress={onPress}>
              <Text style={[styles.accordionBtnText, { color: Colors.primary }]}>Ver itens</Text>
            </TouchableOpacity>
            <View style={styles.accordionSep} />
            <TouchableOpacity style={styles.accordionBtn} onPress={onEdit}>
              <Edit3 size={14} color={Colors.primary} strokeWidth={2} />
              <Text style={[styles.accordionBtnText, { color: Colors.primary }]}>Editar</Text>
            </TouchableOpacity>
            <View style={styles.accordionSep} />
            <TouchableOpacity style={styles.accordionBtn} onPress={onDelete}>
              <Trash2 size={14} color={Colors.error} strokeWidth={2} />
              <Text style={[styles.accordionBtnText, { color: Colors.error }]}>Eliminar</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function PertencesTab() {
  const router = useRouter();
  const { selectedHousehold } = useHousehold();
  const { locations, locationCounts, destinationCounts, countsLoading: loading, countsError: error, refreshCounts, refreshLocations } = usePertences();

  // ── Vista ──
  const [viewMode, setViewMode] = useState<ViewMode>('location');

  // ── UI ──
  const [hideEmpty, setHideEmpty] = useState(true);

  // ── Location CRUD ──
  const [showNewLocationModal, setShowNewLocationModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [showEditLocationModal, setShowEditLocationModal] = useState(false);
  const [showDeleteLocationConfirm, setShowDeleteLocationConfirm] = useState(false);
  const [locationToDelete, setLocationToDelete] = useState<Location | null>(null);
  const [savingLocation, setSavingLocation] = useState(false);
  const [deletingLocation, setDeletingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [expandedLocationId, setExpandedLocationId] = useState<string | null>(null);

  // ── Item form (FAB) ──
  const [showItemForm, setShowItemForm] = useState(false);

  // ── Listas completas (inclui entradas com count=0) ──────────────────────────

  const mergedLocationCounts = useMemo<LocationCount[]>(() => {
    const countsMap = new Map(locationCounts.map((lc) => [lc.locationId, lc]));
    const result: LocationCount[] = locations.map((loc) =>
      countsMap.get(loc.id) ?? { locationId: loc.id, locationName: loc.name, icon: loc.icon ?? null, count: 0 }
    );
    const nullEntry = countsMap.get(null);
    if (nullEntry) result.push(nullEntry);
    return result;
  }, [locations, locationCounts]);

  const mergedDestinationCounts = useMemo<DestinationCount[]>(() => {
    const countsMap = new Map(destinationCounts.map((dc) => [dc.destination, dc]));
    const known = [Destination.Keep, Destination.Sell, Destination.Donate, Destination.Trash] as const;
    const result: DestinationCount[] = known.map((dest) =>
      countsMap.get(dest) ?? { destination: dest, count: 0 }
    );
    result.push(countsMap.get(null) ?? { destination: null, count: 0 });
    return result;
  }, [destinationCounts]);

  const listData = useMemo(() => {
    const base = viewMode === 'location'
      ? (mergedLocationCounts as Array<LocationCount | DestinationCount>)
      : (mergedDestinationCounts as Array<LocationCount | DestinationCount>);
    return hideEmpty ? base.filter((item) => item.count > 0) : base;
  }, [viewMode, mergedLocationCounts, mergedDestinationCounts, hideEmpty]);

  // ── Location CRUD handlers ─────────────────────────────────────────────────

  async function createLocation(name: string, icon: string) {
    if (!selectedHousehold) return;
    setSavingLocation(true);
    setLocationError(null);
    try {
      await LocationService.createLocation(selectedHousehold.id, name, icon || undefined);
      setShowNewLocationModal(false);
      await Promise.all([refreshLocations(), refreshCounts()]);
    } catch {
      setLocationError('Erro ao criar localização.');
    } finally {
      setSavingLocation(false);
    }
  }

  async function saveEditLocation(name: string, icon: string) {
    if (!editingLocation) return;
    setSavingLocation(true);
    setLocationError(null);
    try {
      await LocationService.updateLocation(editingLocation.id, name, icon || undefined);
      setShowEditLocationModal(false);
      setEditingLocation(null);
      await Promise.all([refreshLocations(), refreshCounts()]);
    } catch {
      setLocationError('Erro ao editar localização.');
    } finally {
      setSavingLocation(false);
    }
  }

  async function deleteLocation() {
    if (!locationToDelete) return;
    setDeletingLocation(true);
    setLocationError(null);
    try {
      await LocationService.deleteLocation(locationToDelete.id);
      setShowDeleteLocationConfirm(false);
      setLocationToDelete(null);
      await Promise.all([refreshLocations(), refreshCounts()]);
    } catch {
      setLocationError('Erro ao apagar localização.');
    } finally {
      setDeletingLocation(false);
    }
  }

  // ── Totais ─────────────────────────────────────────────────────────────────

  const totalItems =
    viewMode === 'location'
      ? locationCounts.reduce((s, c) => s + c.count, 0)
      : destinationCounts.reduce((s, c) => s + c.count, 0);

  // ── Render helpers ─────────────────────────────────────────────────────────

  function renderLocationCard({ item: lc }: { item: LocationCount }) {
    const isNull = lc.locationId === null;
    const navigate = () => {
      if (isNull) {
        router.push('/inventory/location-detail?locationId=null&locationName=Sem+localização');
      } else {
        router.push(
          `/inventory/location-detail?locationId=${lc.locationId}&locationName=${encodeURIComponent(lc.locationName)}`
        );
      }
    };
    return (
      <LocationCard
        lc={lc}
        expanded={expandedLocationId === lc.locationId}
        onPress={navigate}
        onToggle={isNull ? undefined : () => setExpandedLocationId((prev) => prev === lc.locationId ? null : lc.locationId)}
        onEdit={isNull ? undefined : () => {
          setExpandedLocationId(null);
          const loc = locations.find((l) => l.id === lc.locationId);
          if (!loc) return;
          setEditingLocation(loc);
          setLocationError(null);
          setShowEditLocationModal(true);
        }}
        onDelete={isNull ? undefined : () => {
          setExpandedLocationId(null);
          const loc = locations.find((l) => l.id === lc.locationId);
          if (!loc) return;
          setLocationToDelete(loc);
          setLocationError(null);
          setShowDeleteLocationConfirm(true);
        }}
      />
    );
  }

  function renderDestinationCard({ item: dc }: { item: DestinationCount }) {
    const isNull = dc.destination === null;
    const meta = isNull ? null : getDestinationMeta(dc.destination);
    const label = meta?.label ?? 'Indefinido';
    const barColor = meta?.barColor ?? Colors.border;
    return (
      <TouchableOpacity
        style={[styles.card, styles.cardRow]}
        onPress={() => {
          const dest = isNull ? 'null' : dc.destination!;
          router.push(
            `/inventory/destination-detail?destination=${dest}&label=${encodeURIComponent(label)}`
          );
        }}
        activeOpacity={0.7}
      >
        <View style={[styles.destBar, { backgroundColor: barColor }]} />
        <View style={styles.cardInfo}>
          <Text style={styles.cardName}>{label}</Text>
        </View>
        <View style={styles.cardBadge}>
          <Text style={styles.cardBadgeText}>{dc.count}</Text>
        </View>
        <Text style={styles.cardArrow}>›</Text>
      </TouchableOpacity>
    );
  }

  function renderFooter() {
    return (
      <View>
        {/* Adicionar local — só na vista por localização */}
        {viewMode === 'location' && (
          <TouchableOpacity
            style={styles.addLocationButton}
            onPress={() => { setLocationError(null); setShowNewLocationModal(true); }}
          >
            <Text style={styles.addLocationButtonText}>+ Adicionar local</Text>
          </TouchableOpacity>
        )}
        {/* Card Histórico — sempre visível */}
        <TouchableOpacity
          style={[styles.card, styles.historyCard]}
          onPress={() => router.push('/inventory/history')}
          activeOpacity={0.7}
        >
          <View style={styles.cardRow}>
            <View style={styles.cardIconWrap}>
              <Text style={styles.cardIcon}>🕐</Text>
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.cardName}>Histórico</Text>
            </View>
            <Text style={styles.cardArrow}>›</Text>
          </View>
        </TouchableOpacity>
      </View>
    );
  }

  // ── States de loading / error ──────────────────────────────────────────────

  if (loading) {
    return (
      <View style={[styles.root, { paddingTop: 8 }]}>
        {[...Array(5)].map((_, i) => (
          <View key={i} style={[styles.card, styles.skeletonCard]}>
            <View style={styles.skeletonIcon} />
            <View style={styles.skeletonName} />
            <View style={styles.skeletonBadge} />
          </View>
        ))}
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refreshCounts()}>
          <Text style={styles.retryButtonText}>Tentar novamente</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <View style={styles.root}>

      {/* Search bar — navega para Tela 3 */}
      <TouchableOpacity
        style={styles.searchBar}
        onPress={() => router.push('/inventory/search')}
        activeOpacity={0.7}
      >
        <Text style={styles.searchPlaceholder}>🔍  Pesquisar em todos os itens...</Text>
      </TouchableOpacity>

      {/* Toolbar: total + ocultar vazios + toggle vista */}
      <View style={styles.toolbar}>
        <Text style={styles.totalText}>
          {locations.length} locais · {totalItems} itens
        </Text>
        <View style={styles.toolbarIcons}>
          <TouchableOpacity onPress={() => setHideEmpty((v) => !v)}>
            {hideEmpty
              ? <EyeOff size={20} color={Colors.textSecondary} />
              : <Eye size={20} color={Colors.textSecondary} />}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setViewMode((v) => v === 'location' ? 'destination' : 'location')}>
            <ArrowLeftRight
              size={20}
              color={viewMode === 'destination' ? Colors.primary : Colors.textSecondary}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Lista de cards */}
      <FlatList
        data={listData}
        keyExtractor={(item) =>
          viewMode === 'location'
            ? (item as LocationCount).locationId ?? '__null_loc__'
            : (item as DestinationCount).destination ?? '__null_dest__'
        }
        renderItem={
          viewMode === 'location'
            ? (info) => renderLocationCard(info as { item: LocationCount })
            : (info) => renderDestinationCard(info as { item: DestinationCount })
        }
        ListFooterComponent={renderFooter}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
      />

      {/* FAB — adicionar item sem localização pré-selecionada */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowItemForm(true)}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* Modais de localização */}
      <AddLocationModal
        visible={showNewLocationModal}
        onClose={() => setShowNewLocationModal(false)}
        onConfirm={createLocation}
        saving={savingLocation}
        error={locationError}
      />
      <EditLocationModal
        visible={showEditLocationModal}
        onClose={() => { setShowEditLocationModal(false); setEditingLocation(null); }}
        onConfirm={saveEditLocation}
        saving={savingLocation}
        initialName={editingLocation?.name ?? ''}
        initialIcon={editingLocation?.icon ?? ''}
        error={locationError}
      />
      <DeleteLocationConfirmModal
        visible={showDeleteLocationConfirm}
        onClose={() => setShowDeleteLocationConfirm(false)}
        onConfirm={deleteLocation}
        deleting={deletingLocation}
        locationName={locationToDelete?.name ?? ''}
        error={locationError}
      />

      {/* Item form modal — sem localização pré-selecionada */}
      <ItemForm
        visible={showItemForm}
        onClose={() => setShowItemForm(false)}
        onSaved={() => {
          setShowItemForm(false);
          refreshCounts();
        }}
        item={undefined}
        preselectedLocationId={undefined}
        householdId={selectedHousehold?.id ?? ''}
        locations={locations}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  searchBar: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchPlaceholder: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  totalText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  toolbarIcons: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 8,
    overflow: 'hidden',
  },
  cardExpanded: {
    borderColor: Colors.primary,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 10,
  },
  historyCard: {
    marginTop: 8,
    borderStyle: 'dashed',
  },
  accordion: {
    paddingBottom: 4,
  },
  accordionDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginHorizontal: 12,
    marginBottom: 4,
  },
  accordionActions: {
    flexDirection: 'row',
    paddingHorizontal: 4,
  },
  accordionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
  },
  accordionBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  accordionSep: {
    width: 1,
    backgroundColor: Colors.border,
    marginHorizontal: 2,
  },
  cardIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#e8f4ef',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardIcon: {
    fontSize: 18,
  },
  destBar: {
    width: 4,
    height: 36,
    borderRadius: 2,
    flexShrink: 0,
  },
  cardInfo: {
    flex: 1,
  },
  cardName: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  cardBadge: {
    backgroundColor: '#e8f4ef',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
    minWidth: 32,
    alignItems: 'center',
  },
  cardBadgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.primary,
  },
  cardArrow: {
    fontSize: 18,
    color: Colors.textSecondary,
  },
  addLocationButton: {
    marginVertical: 4,
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
  fabText: {
    fontSize: 28,
    color: '#fff',
    lineHeight: 32,
  },
  errorText: {
    fontSize: 14,
    color: Colors.error,
    textAlign: 'center',
    marginBottom: 12,
  },
  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: Colors.primary,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  skeletonCard: { opacity: 0.6, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, marginHorizontal: 16 },
  skeletonIcon: { width: 38, height: 38, borderRadius: 10, backgroundColor: Colors.border },
  skeletonName: { flex: 1, height: 14, borderRadius: 6, backgroundColor: Colors.border },
  skeletonBadge: { width: 32, height: 22, borderRadius: 11, backgroundColor: Colors.border },
});
