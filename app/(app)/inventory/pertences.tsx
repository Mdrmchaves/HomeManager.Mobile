import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Modal,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Eye, EyeOff, ArrowLeftRight } from 'lucide-react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useHousehold } from '../../../contexts/HouseholdContext';
import ItemForm from './item-form';
import { LocationService } from '../../../services/location.service';
import { InventoryService } from '../../../services/inventory.service';
import { Colors } from '../../../constants/colors';
import { getDestinationMeta } from '../../../constants/destinations';
import AddLocationModal from '@/components/inventory/modals/AddLocationModal';
import EditLocationModal from '@/components/inventory/modals/EditLocationModal';
import DeleteLocationConfirmModal from '@/components/inventory/modals/DeleteLocationConfirmModal';
import type { LocationCount, DestinationCount } from '../../../types/inventory-counts';
import type { Location } from '../../../types/location';

// ─── View mode ────────────────────────────────────────────────────────────────

type ViewMode = 'location' | 'destination';

// ─── Main component ───────────────────────────────────────────────────────────

export default function PertencesTab() {
  const router = useRouter();
  const { selectedHousehold } = useHousehold();

  // ── Vista ──
  const [viewMode, setViewMode] = useState<ViewMode>('location');

  // ── Dados ──
  const [locations, setLocations] = useState<Location[]>([]);
  const [locationCounts, setLocationCounts] = useState<LocationCount[]>([]);
  const [destinationCounts, setDestinationCounts] = useState<DestinationCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
  const [activeLocationMenu, setActiveLocationMenu] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; right: number } | null>(null);

  // ── Item form (FAB) ──
  const [showItemForm, setShowItemForm] = useState(false);

  // ── Carregamento ──────────────────────────────────────────────────────────

  async function loadLocations() {
    if (!selectedHousehold) return;
    try {
      const locs = await LocationService.getLocations(selectedHousehold.id);
      setLocations(locs);
    } catch {
      // localizações não críticas para o render
    }
  }

  async function loadCounts() {
    if (!selectedHousehold) return;
    setLoading(true);
    setError(null);
    try {
      if (viewMode === 'location') {
        const counts = await InventoryService.getCountsByLocation(selectedHousehold.id);
        setLocationCounts(counts);
      } else {
        const counts = await InventoryService.getCountsByDestination(selectedHousehold.id);
        setDestinationCounts(counts);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar contadores.');
    } finally {
      setLoading(false);
    }
  }

  // Carrega localizações uma vez no boot do household
  useEffect(() => {
    loadLocations();
  }, [selectedHousehold?.id]);

  // Carrega contadores sempre que viewMode ou household muda
  useEffect(() => {
    loadCounts();
  }, [selectedHousehold?.id, viewMode]);

  // Recarrega contadores ao voltar para esta tela (ex: após editar item na Tela 2)
  useFocusEffect(
    useCallback(() => {
      loadCounts();
    }, [selectedHousehold?.id, viewMode])
  );

  // ── Location CRUD handlers ─────────────────────────────────────────────────

  async function createLocation(name: string, icon: string) {
    if (!selectedHousehold) return;
    setSavingLocation(true);
    setLocationError(null);
    try {
      await LocationService.createLocation(selectedHousehold.id, name, icon || undefined);
      setShowNewLocationModal(false);
      await Promise.all([loadLocations(), loadCounts()]);
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
      await Promise.all([loadLocations(), loadCounts()]);
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
      await Promise.all([loadLocations(), loadCounts()]);
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
    if (hideEmpty && lc.count === 0) return null;
    const isNull = lc.locationId === null;
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => {
          if (isNull) {
            router.push('/inventory/location-detail?locationId=null&locationName=Sem+localização');
          } else {
            router.push(
              `/inventory/location-detail?locationId=${lc.locationId}&locationName=${encodeURIComponent(lc.locationName)}`
            );
          }
        }}
        activeOpacity={0.7}
      >
        <View style={styles.cardIconWrap}>
          <Text style={styles.cardIcon}>{lc.icon ?? '📦'}</Text>
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardName}>{lc.locationName}</Text>
        </View>
        <View style={styles.cardBadge}>
          <Text style={styles.cardBadgeText}>{lc.count}</Text>
        </View>
        <Text style={styles.cardArrow}>›</Text>
        {/* Menu ⋮ — só para localizações reais (não "Sem localização") */}
        {!isNull && (
          <TouchableOpacity
            style={styles.menuButton}
            onPress={(e) => {
              e.stopPropagation();
              setActiveLocationMenu(lc.locationId);
              setMenuPosition({ top: 200, right: 16 });
            }}
          >
            <Text style={styles.menuDots}>⋮</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  }

  function renderDestinationCard({ item: dc }: { item: DestinationCount }) {
    if (hideEmpty && dc.count === 0) return null;
    const isNull = dc.destination === null;
    const meta = isNull ? null : getDestinationMeta(dc.destination);
    const label = meta?.label ?? 'Indefinido';
    const barColor = meta?.barColor ?? Colors.border;
    return (
      <TouchableOpacity
        style={styles.card}
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
          <View style={styles.cardIconWrap}>
            <Text style={styles.cardIcon}>🕐</Text>
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.cardName}>Histórico</Text>
          </View>
          <Text style={styles.cardArrow}>›</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── States de loading / error ──────────────────────────────────────────────

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadCounts}>
          <Text style={styles.retryButtonText}>Tentar novamente</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const listData = viewMode === 'location'
    ? (locationCounts as Array<LocationCount | DestinationCount>)
    : (destinationCounts as Array<LocationCount | DestinationCount>);

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
              ? <Eye size={20} color={Colors.textSecondary} />
              : <EyeOff size={20} color={Colors.textSecondary} />}
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

      {/* Dropdown menu de localização */}
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
                  const loc = locations.find((l) => l.id === activeLocationMenu);
                  if (!loc) return;
                  setEditingLocation(loc);
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
                  const loc = locations.find((l) => l.id === activeLocationMenu);
                  if (!loc) return;
                  setLocationToDelete(loc);
                  setLocationError(null);
                  setShowDeleteLocationConfirm(true);
                  setActiveLocationMenu(null);
                  setMenuPosition(null);
                }}
              >
                <Text style={[styles.dropdownOptionText, { color: Colors.error }]}>Excluir local</Text>
              </TouchableOpacity>
            </View>
          )}
        </TouchableOpacity>
      </Modal>

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
          loadCounts();
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    marginBottom: 8,
    gap: 10,
  },
  historyCard: {
    marginTop: 8,
    borderStyle: 'dashed',
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
  menuButton: {
    padding: 4,
  },
  menuDots: {
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
  dropdownOption: { padding: 12 },
  dropdownOptionText: { fontSize: 14, color: Colors.textPrimary },
  dropdownDivider: { height: 1, backgroundColor: Colors.border },
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
});
