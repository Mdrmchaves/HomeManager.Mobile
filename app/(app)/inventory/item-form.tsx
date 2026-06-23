import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { X } from 'lucide-react-native';
import { StorageService } from '../../../services/storage.service';
import { InventoryService } from '../../../services/inventory.service';
import { HouseholdService } from '../../../services/household.service';
import { Colors } from '../../../constants/colors';
import { DESTINATION_ALL_OPTIONS, DESTINATION_RESOLVE_OPTIONS } from '../../../constants/destinations';
import type { InventoryItem } from '../../../types/inventory-item';
import type { Location } from '../../../types/location';
import type { HouseholdUser } from '../../../types/household';

// ── Máscara de moeda ──────────────────────────────────────────────────────────
function toRawDigits(value: number): string {
  return Math.round(value * 100).toString();
}
function rawToNumber(raw: string): number {
  if (!raw) return 0;
  return parseInt(raw, 10) / 100;
}
function formatCurrencyInput(raw: string): string {
  if (!raw) return '';
  return (parseInt(raw, 10) / 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
function onlyDigits(text: string): string {
  return text.replace(/\D/g, '').replace(/^0+/, '');
}

// ─── Types & constants ────────────────────────────────────────────────────────

export interface ItemFormProps {
  visible: boolean;
  householdId: string;
  locations: Location[];
  item?: InventoryItem;
  preselectedLocationId?: string;
  onClose: () => void;
  onSaved: (saved: InventoryItem | null) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ItemForm({
  visible,
  householdId,
  locations,
  item,
  preselectedLocationId,
  onClose,
  onSaved,
}: ItemFormProps) {
  const isEditing = !!item;

  // Form fields
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [locationId, setLocationId] = useState('');
  const [value, setValue] = useState('');
  const [description, setDescription] = useState('');
  const [destination, setDestination] = useState('');
  const [ownerId, setOwnerId] = useState('');

  // Members
  const [members, setMembers] = useState<HouseholdUser[]>([]);

  // Photo
  const [selectedFile, setSelectedFile] = useState<{ uri: string; ext: string } | null>(null);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [loadingPhoto, setLoadingPhoto] = useState(false);

  // UI state
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showPhotoActionSheet, setShowPhotoActionSheet] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [showDestinationPicker, setShowDestinationPicker] = useState(false);
  const [showOwnerPicker, setShowOwnerPicker] = useState(false);
  const [showResolvePicker, setShowResolvePicker] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nameError, setNameError] = useState(false);

  // Initialise / reset fields when modal opens or item changes
  useEffect(() => {
    if (!visible) return;
    setError(null);
    setNameError(false);
    setSaving(false);
    setDeleting(false);
    setShowDeleteConfirm(false);
    setSelectedFile(null);

    // Carregar membros da casa
    HouseholdService.getHousehold(householdId)
      .then((h) => setMembers(h.householdUsers ?? []))
      .catch(() => setMembers([]));

    if (item) {
      setName(item.name);
      setQuantity(item.quantity != null ? String(item.quantity) : '');
      setLocationId(item.locationId ?? '');
      setValue(item.value != null ? toRawDigits(item.value) : '');
      setDescription(item.description ?? '');
      setDestination(item.destination ?? '');
      setOwnerId(item.ownerId ?? '');
      setPreviewUri(null);
      if (item.photoUrl) {
        setLoadingPhoto(true);
        StorageService.getSignedUrl(item.photoUrl).then((url) => {
          setPreviewUri(url);
          setLoadingPhoto(false);
        });
      }
    } else {
      setName('');
      setQuantity('');
      setLocationId(preselectedLocationId ?? '');
      setValue('');
      setDescription('');
      setDestination('');
      setOwnerId('');
      setPreviewUri(null);
    }
  }, [visible, item?.id, householdId]);

  // ── Photo handlers ────────────────────────────────────────────────────────

  async function handleCamera() {
    setShowPhotoActionSheet(false);
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: 'images',
      quality: 0.8,
      allowsEditing: true,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const ext = asset.uri.split('.').pop() ?? 'jpg';
      setSelectedFile({ uri: asset.uri, ext });
      setPreviewUri(asset.uri);
    }
  }

  async function handleGallery() {
    setShowPhotoActionSheet(false);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      quality: 0.8,
      allowsEditing: true,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const ext = asset.uri.split('.').pop() ?? 'jpg';
      setSelectedFile({ uri: asset.uri, ext });
      setPreviewUri(asset.uri);
    }
  }

  function handleRemovePhoto() {
    setShowPhotoActionSheet(false);
    setSelectedFile(null);
    setPreviewUri(null);
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!name.trim()) {
      setNameError(true);
      setError('O nome é obrigatório.');
      return;
    }
    setNameError(false);
    setError(null);
    setSaving(true);

    try {
      let photoUrl: string | undefined = item?.photoUrl;
      // If photo was removed (previewUri null but item had one)
      if (!previewUri && !selectedFile) photoUrl = undefined;
      try {
        if (selectedFile) {
          photoUrl = await StorageService.uploadItemPhoto(selectedFile.uri, selectedFile.ext);
        }
      } catch (e) {
        console.log('Erro no submit:', e);
      }

      const payload = {
        name: name.trim(),
        quantity: quantity ? parseInt(quantity, 10) : undefined,
        locationId: locationId || undefined,
        value: value ? rawToNumber(value) : undefined,
        description: description.trim() || undefined,
        destination: destination || undefined,
        ownerId: ownerId || undefined,
        photoUrl,
      };

      if (isEditing) {
        await InventoryService.updateItem(item.id, payload);
        const updatedItem: InventoryItem = {
          ...item,
          name: name.trim(),
          quantity: quantity ? parseInt(quantity, 10) : undefined,
          locationId: locationId || undefined,
          locationName: locations.find((l) => l.id === locationId)?.name,
          value: value ? rawToNumber(value) : undefined,
          description: description.trim() || undefined,
          destination: destination || undefined,
          ownerId: ownerId || undefined,
          ownerName: members.find((m) => m.userId === ownerId)?.user.name,
          photoUrl,
          updatedAt: new Date().toISOString(),
        };
        onSaved(updatedItem);
      } else {
        await InventoryService.createItem({ householdId, ...payload });
        onSaved(null);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar item.');
    } finally {
      setSaving(false);
    }
  }

  // ── Resolve ───────────────────────────────────────────────────────────────

  async function handleResolve(destination: string) {
    if (!item) return;
    setResolving(true);
    setShowResolvePicker(false);
    try {
      await InventoryService.resolveItem(item.id, destination);
      onSaved(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao dar saída ao item.');
      setResolving(false);
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  async function handleDelete() {
    if (!item) return;
    setDeleting(true);
    try {
      await InventoryService.deleteItem(item.id);
      onSaved(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao apagar item.');
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  }

  // ── Derived display values ────────────────────────────────────────────────

  const selectedLocationName =
    locations.find((l) => l.id === locationId)?.name ?? 'Sem local';

  const selectedDestinationLabel =
    DESTINATION_ALL_OPTIONS.find((o) => o.value === destination)?.label ?? 'Sem destino';

  const selectedOwnerName =
    members.find((m) => m.userId === ownerId)?.user.name ?? 'Sem dono';

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <Text style={styles.headerTitle}>{isEditing ? 'Editar item' : 'Novo item'}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <X size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {!!error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Photo */}
            <TouchableOpacity
              style={styles.photoSection}
              onPress={() => setShowPhotoActionSheet(true)}
              disabled={loadingPhoto}
            >
              {previewUri ? (
                <View>
                  <Image
                    source={{ uri: previewUri }}
                    style={styles.photoPreview}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                  />
                  <View style={styles.photoOverlay}>
                    <Text style={styles.photoOverlayText}>Alterar foto</Text>
                  </View>
                </View>
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Text style={styles.photoPlaceholderIcon}>📷</Text>
                  <Text style={styles.photoPlaceholderText}>
                    {loadingPhoto ? 'A carregar...' : 'Adicionar foto'}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Name */}
            <View style={styles.field}>
              <Text style={styles.label}>Nome</Text>
              <TextInput
                style={[styles.input, nameError && styles.inputError]}
                placeholder="Nome do item"
                placeholderTextColor={Colors.textSecondary}
                value={name}
                onChangeText={(v) => { setName(v); setNameError(false); }}
                autoCapitalize="sentences"
              />
            </View>

            {/* Quantity */}
            <View style={styles.field}>
              <Text style={styles.label}>Quantidade</Text>
              <TextInput
                style={styles.input}
                placeholder="1"
                placeholderTextColor={Colors.textSecondary}
                value={quantity}
                onChangeText={setQuantity}
                keyboardType="numeric"
              />
            </View>

            {/* Location */}
            <View style={styles.field}>
              <Text style={styles.label}>Local</Text>
              <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => setShowLocationPicker(true)}
              >
                <Text style={styles.pickerButtonText}>{selectedLocationName}</Text>
                <Text style={styles.pickerChevron}>›</Text>
              </TouchableOpacity>
            </View>

            {/* Value */}
            <View style={styles.field}>
              <Text style={styles.label}>Valor estimado (€)</Text>
              <TextInput
                style={styles.input}
                placeholder="0,00"
                placeholderTextColor={Colors.textSecondary}
                value={formatCurrencyInput(value)}
                onChangeText={(t) => setValue(onlyDigits(t))}
                keyboardType="number-pad"
              />
            </View>

            {/* Description */}
            <View style={styles.field}>
              <Text style={styles.label}>Descrição</Text>
              <TextInput
                style={[styles.input, styles.inputMultiline]}
                placeholder="Descrição opcional..."
                placeholderTextColor={Colors.textSecondary}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Destination */}
            <View style={styles.field}>
              <Text style={styles.label}>Destino</Text>
              <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => setShowDestinationPicker(true)}
              >
                <Text style={styles.pickerButtonText}>{selectedDestinationLabel}</Text>
                <Text style={styles.pickerChevron}>›</Text>
              </TouchableOpacity>
            </View>

            {/* Owner */}
            {members.length > 1 && (
              <View style={styles.field}>
                <Text style={styles.label}>Dono</Text>
                <TouchableOpacity
                  style={styles.pickerButton}
                  onPress={() => setShowOwnerPicker(true)}
                >
                  <Text style={styles.pickerButtonText}>{selectedOwnerName}</Text>
                  <Text style={styles.pickerChevron}>›</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Dar saída */}
            {isEditing && (
              <TouchableOpacity
                style={styles.resolveButton}
                onPress={() => setShowResolvePicker(true)}
                disabled={resolving}
              >
                <Text style={styles.resolveButtonText}>
                  {resolving ? 'A processar...' : 'Dar saída do item'}
                </Text>
              </TouchableOpacity>
            )}

            {/* Delete */}
            {isEditing && (
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => setShowDeleteConfirm(true)}
                disabled={deleting}
              >
                <Text style={styles.deleteButtonText}>
                  {deleting ? 'A apagar...' : 'Apagar item'}
                </Text>
              </TouchableOpacity>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={saving}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.saveText}>Salvar</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* ── Photo ActionSheet ── */}
      <Modal visible={showPhotoActionSheet} transparent animationType="slide" onRequestClose={() => setShowPhotoActionSheet(false)}>
        <View style={styles.pickerOverlay}>
          <View style={styles.actionSheet}>
            <View style={styles.handle} />
            <TouchableOpacity style={styles.asOption} onPress={handleCamera}>
              <Text style={styles.asOptionText}>Tirar foto</Text>
            </TouchableOpacity>
            <View style={styles.asDivider} />
            <TouchableOpacity style={styles.asOption} onPress={handleGallery}>
              <Text style={styles.asOptionText}>Escolher da galeria</Text>
            </TouchableOpacity>
            {previewUri && (
              <>
                <View style={styles.asDivider} />
                <TouchableOpacity style={styles.asOption} onPress={handleRemovePhoto}>
                  <Text style={[styles.asOptionText, { color: Colors.error }]}>Remover foto</Text>
                </TouchableOpacity>
              </>
            )}
            <View style={styles.asSeparator} />
            <TouchableOpacity style={styles.asOption} onPress={() => setShowPhotoActionSheet(false)}>
              <Text style={[styles.asOptionText, { color: Colors.textSecondary }]}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Location Picker ── */}
      <Modal visible={showLocationPicker} transparent animationType="slide" onRequestClose={() => setShowLocationPicker(false)}>
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerSheet}>
            <View style={styles.handle} />
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Local</Text>
              <TouchableOpacity onPress={() => setShowLocationPicker(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <X size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {[{ id: '', name: 'Sem local' }, ...locations].map((loc) => (
                <TouchableOpacity
                  key={loc.id || '__none__'}
                  style={[styles.pickerOption, locationId === loc.id && styles.pickerOptionActive]}
                  onPress={() => { setLocationId(loc.id); setShowLocationPicker(false); }}
                >
                  <Text style={[styles.pickerOptionText, locationId === loc.id && styles.pickerOptionTextActive]}>
                    {loc.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Destination Picker ── */}
      <Modal visible={showDestinationPicker} transparent animationType="slide" onRequestClose={() => setShowDestinationPicker(false)}>
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerSheet}>
            <View style={styles.handle} />
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Destino</Text>
              <TouchableOpacity onPress={() => setShowDestinationPicker(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <X size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {DESTINATION_ALL_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value || '__none__'}
                  style={[styles.pickerOption, destination === opt.value && styles.pickerOptionActive]}
                  onPress={() => { setDestination(opt.value); setShowDestinationPicker(false); }}
                >
                  <Text style={[styles.pickerOptionText, destination === opt.value && styles.pickerOptionTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Owner Picker ── */}
      <Modal visible={showOwnerPicker} transparent animationType="slide" onRequestClose={() => setShowOwnerPicker(false)}>
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerSheet}>
            <View style={styles.handle} />
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Dono</Text>
              <TouchableOpacity onPress={() => setShowOwnerPicker(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <X size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {[{ userId: '', user: { id: '', name: 'Sem dono', email: '' }, role: '' }, ...members].map((m) => (
                <TouchableOpacity
                  key={m.userId || '__none__'}
                  style={[styles.pickerOption, ownerId === m.userId && styles.pickerOptionActive]}
                  onPress={() => { setOwnerId(m.userId); setShowOwnerPicker(false); }}
                >
                  <Text style={[styles.pickerOptionText, ownerId === m.userId && styles.pickerOptionTextActive]}>
                    {m.user.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Resolve Picker ── */}
      <Modal visible={showResolvePicker} transparent animationType="slide" onRequestClose={() => setShowResolvePicker(false)}>
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerSheet}>
            <View style={styles.handle} />
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Dar saída — destino</Text>
              <TouchableOpacity onPress={() => setShowResolvePicker(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <X size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {DESTINATION_RESOLVE_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.pickerOption, destination === opt.value && styles.pickerOptionActive]}
                  onPress={() => handleResolve(opt.value)}
                >
                  <Text style={[styles.pickerOptionText, destination === opt.value && styles.pickerOptionTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Delete confirm ── */}
      <Modal visible={showDeleteConfirm} transparent animationType="slide" onRequestClose={() => setShowDeleteConfirm(false)}>
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerSheet}>
            <View style={styles.handle} />
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Apagar item</Text>
              <TouchableOpacity onPress={() => setShowDeleteConfirm(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <X size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <View style={styles.confirmBody}>
              <Text style={styles.confirmText}>Esta ação não pode ser desfeita.</Text>
            </View>
            <View style={styles.footer}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowDeleteConfirm(false)} disabled={deleting}>
                <Text style={styles.cancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.deleteConfirmBtn, deleting && styles.saveBtnDisabled]}
                onPress={handleDelete}
                disabled={deleting}
              >
                <Text style={styles.deleteConfirmText}>{deleting ? 'A apagar...' : 'Apagar'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Main sheet
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '92%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 8,
    gap: 16,
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  saveBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnDisabled: {
    opacity: 0.5,
  },
  saveText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },

  // Error
  errorBox: {
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    padding: 10,
  },
  errorText: {
    color: Colors.error,
    fontSize: 13,
  },

  // Photo
  photoSection: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  photoPreview: {
    width: '100%',
    height: 180,
    borderRadius: 12,
  },
  photoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingVertical: 8,
    alignItems: 'center',
  },
  photoOverlayText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '500',
  },
  photoPlaceholder: {
    height: 100,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.background,
  },
  photoPlaceholderIcon: {
    fontSize: 28,
  },
  photoPlaceholderText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },

  // Fields
  field: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: Colors.textPrimary,
    backgroundColor: Colors.background,
  },
  inputError: {
    borderColor: Colors.error,
  },
  inputMultiline: {
    height: 80,
    textAlignVertical: 'top',
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: Colors.background,
  },
  pickerButtonText: {
    fontSize: 15,
    color: Colors.textPrimary,
  },
  pickerChevron: {
    fontSize: 18,
    color: Colors.textSecondary,
  },

  // Resolve button
  resolveButton: {
    alignItems: 'center',
    paddingVertical: 13,
    marginTop: 4,
    backgroundColor: '#fef3c7',
    borderRadius: 10,
  },
  resolveButtonText: {
    fontSize: 15,
    color: '#92400e',
    fontWeight: '600',
  },

  // Delete button (inline in form)
  deleteButton: {
    alignItems: 'center',
    paddingVertical: 13,
    marginTop: 4,
  },
  deleteButtonText: {
    fontSize: 15,
    color: Colors.error,
    fontWeight: '500',
  },

  // Photo ActionSheet
  actionSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    paddingHorizontal: 16,
  },
  asOption: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  asOptionText: {
    fontSize: 16,
    color: Colors.textPrimary,
  },
  asDivider: {
    height: 1,
    backgroundColor: Colors.border,
  },
  asSeparator: {
    height: 8,
    backgroundColor: Colors.background,
    marginHorizontal: -16,
    marginVertical: 4,
  },

  // Shared picker / confirm overlay
  pickerOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  pickerSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '60%',
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  pickerOption: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  pickerOptionActive: {
    backgroundColor: '#f0faf5',
  },
  pickerOptionText: {
    fontSize: 15,
    color: Colors.textPrimary,
  },
  pickerOptionTextActive: {
    color: Colors.primary,
    fontWeight: '600',
  },

  // Delete confirm sheet
  confirmBody: {
    padding: 20,
  },
  confirmText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  deleteConfirmBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 10,
    backgroundColor: Colors.error,
    alignItems: 'center',
  },
  deleteConfirmText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
});
