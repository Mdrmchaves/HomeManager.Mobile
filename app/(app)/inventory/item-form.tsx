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
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { StorageService } from '../../../services/storage.service';
import { InventoryService } from '../../../services/inventory.service';
import { Colors } from '../../../constants/colors';
import type { InventoryItem } from '../../../types/inventory-item';
import type { Location } from '../../../types/location';

// ─── Types & constants ────────────────────────────────────────────────────────

export interface ItemFormProps {
  visible: boolean;
  householdId: string;
  locations: Location[];
  item?: InventoryItem;
  preselectedLocationId?: string;
  onClose: () => void;
  onSaved: () => void;
}

const DESTINATION_OPTIONS = [
  { label: 'Sem destino', value: '' },
  { label: 'Manter', value: 'Keep' },
  { label: 'Vender', value: 'Sell' },
  { label: 'Doar', value: 'Donate' },
  { label: 'Descartar', value: 'Trash' },
];

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

    if (item) {
      setName(item.name);
      setQuantity(item.quantity != null ? String(item.quantity) : '');
      setLocationId(item.locationId ?? '');
      setValue(item.value != null ? String(item.value) : '');
      setDescription(item.description ?? '');
      setDestination(item.destination ?? '');
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
      setPreviewUri(null);
    }
  }, [visible, item?.id]);

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
      if (selectedFile) {
        photoUrl = await StorageService.uploadItemPhoto(selectedFile.uri, selectedFile.ext);
      }

      const payload = {
        name: name.trim(),
        quantity: quantity ? parseInt(quantity, 10) : undefined,
        locationId: locationId || undefined,
        value: value ? parseFloat(value.replace(',', '.')) : undefined,
        description: description.trim() || undefined,
        destination: destination || undefined,
        photoUrl,
      };

      if (isEditing) {
        await InventoryService.updateItem(item.id, payload);
      } else {
        await InventoryService.createItem({ householdId, ...payload });
      }
      onSaved();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar item.');
    } finally {
      setSaving(false);
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  async function handleDelete() {
    if (!item) return;
    setDeleting(true);
    try {
      await InventoryService.deleteItem(item.id);
      onSaved();
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
    DESTINATION_OPTIONS.find((o) => o.value === destination)?.label ?? 'Sem destino';

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.headerSide}>
            <Text style={styles.cancelBtn}>Cancelar</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{isEditing ? 'Editar item' : 'Novo item'}</Text>
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving}
            style={styles.headerSide}
          >
            <Text style={[styles.saveBtn, saving && styles.saveBtnDisabled]}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Text>
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Error */}
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
                value={value}
                onChangeText={setValue}
                keyboardType="decimal-pad"
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

            {/* Delete (edit mode only) */}
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
        </KeyboardAvoidingView>
      </View>

      {/* ── Photo ActionSheet ── */}
      <Modal visible={showPhotoActionSheet} transparent animationType="slide">
        <TouchableOpacity
          style={styles.asBackdrop}
          activeOpacity={1}
          onPress={() => setShowPhotoActionSheet(false)}
        >
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
            <View style={styles.asCard}>
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
                    <Text style={[styles.asOptionText, { color: Colors.error }]}>
                      Remover foto
                    </Text>
                  </TouchableOpacity>
                </>
              )}
              <View style={styles.asSeparator} />
              <TouchableOpacity
                style={styles.asOption}
                onPress={() => setShowPhotoActionSheet(false)}
              >
                <Text style={[styles.asOptionText, { color: Colors.textSecondary }]}>
                  Cancelar
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ── Location Picker ── */}
      <Modal visible={showLocationPicker} transparent animationType="fade">
        <TouchableOpacity
          style={styles.pickerBackdrop}
          activeOpacity={1}
          onPress={() => setShowLocationPicker(false)}
        >
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
            <View style={styles.pickerCard}>
              <Text style={styles.pickerTitle}>Local</Text>
              {[{ id: '', name: 'Sem local' }, ...locations].map((loc, idx, arr) => (
                <TouchableOpacity
                  key={loc.id || '__none__'}
                  style={[
                    styles.pickerOption,
                    idx < arr.length - 1 && styles.pickerOptionBorder,
                  ]}
                  onPress={() => { setLocationId(loc.id); setShowLocationPicker(false); }}
                >
                  <Text
                    style={[
                      styles.pickerOptionText,
                      locationId === loc.id && styles.pickerOptionActive,
                    ]}
                  >
                    {loc.name}
                  </Text>
                </TouchableOpacity>
              ))}
              <View style={styles.pickerDivider} />
              <TouchableOpacity
                style={styles.pickerOption}
                onPress={() => setShowLocationPicker(false)}
              >
                <Text style={[styles.pickerOptionText, { color: Colors.textSecondary }]}>
                  Cancelar
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ── Destination Picker ── */}
      <Modal visible={showDestinationPicker} transparent animationType="fade">
        <TouchableOpacity
          style={styles.pickerBackdrop}
          activeOpacity={1}
          onPress={() => setShowDestinationPicker(false)}
        >
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
            <View style={styles.pickerCard}>
              <Text style={styles.pickerTitle}>Destino</Text>
              {DESTINATION_OPTIONS.map((opt, idx, arr) => (
                <TouchableOpacity
                  key={opt.value || '__none__'}
                  style={[
                    styles.pickerOption,
                    idx < arr.length - 1 && styles.pickerOptionBorder,
                  ]}
                  onPress={() => { setDestination(opt.value); setShowDestinationPicker(false); }}
                >
                  <Text
                    style={[
                      styles.pickerOptionText,
                      destination === opt.value && styles.pickerOptionActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
              <View style={styles.pickerDivider} />
              <TouchableOpacity
                style={styles.pickerOption}
                onPress={() => setShowDestinationPicker(false)}
              >
                <Text style={[styles.pickerOptionText, { color: Colors.textSecondary }]}>
                  Cancelar
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ── Delete confirm ── */}
      <Modal visible={showDeleteConfirm} transparent animationType="fade">
        <View style={styles.confirmBackdrop}>
          <View style={styles.confirmCard}>
            <Text style={styles.confirmTitle}>Apagar item?</Text>
            <Text style={styles.confirmBody}>Esta ação não pode ser desfeita.</Text>
            <View style={styles.confirmButtons}>
              <TouchableOpacity
                style={[styles.confirmBtn, styles.confirmBtnCancel]}
                onPress={() => setShowDeleteConfirm(false)}
                disabled={deleting}
              >
                <Text style={styles.confirmBtnCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, styles.confirmBtnDelete]}
                onPress={handleDelete}
                disabled={deleting}
              >
                <Text style={styles.confirmBtnDeleteText}>
                  {deleting ? 'A apagar...' : 'Apagar'}
                </Text>
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
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerSide: {
    minWidth: 80,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  cancelBtn: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  saveBtn: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
    textAlign: 'right',
  },
  saveBtnDisabled: {
    opacity: 0.5,
  },

  // Scroll
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
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
    height: 200,
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
    height: 120,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.surface,
  },
  photoPlaceholderIcon: {
    fontSize: 32,
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
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  inputError: {
    borderColor: Colors.error,
  },
  inputMultiline: {
    height: 88,
    textAlignVertical: 'top',
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 14,
  },
  pickerButtonText: {
    fontSize: 14,
    color: Colors.textPrimary,
  },
  pickerChevron: {
    fontSize: 18,
    color: Colors.textSecondary,
  },

  // Delete button
  deleteButton: {
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 8,
  },
  deleteButtonText: {
    fontSize: 15,
    color: Colors.error,
    fontWeight: '500',
  },

  // Photo ActionSheet
  asBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  asCard: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
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

  // Pickers
  pickerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 24,
  },
  pickerCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
  },
  pickerTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  pickerOption: {
    paddingVertical: 14,
  },
  pickerOptionBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  pickerOptionText: {
    fontSize: 15,
    color: Colors.textPrimary,
  },
  pickerOptionActive: {
    color: Colors.primary,
    fontWeight: '600',
  },
  pickerDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 4,
  },

  // Delete confirm
  confirmBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 32,
  },
  confirmCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 24,
  },
  confirmTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  confirmBody: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 24,
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  confirmBtnCancel: {
    backgroundColor: Colors.border,
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
});
