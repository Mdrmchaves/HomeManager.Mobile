import { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { Colors } from '@/constants/colors';

// ─── EditLocationModal ────────────────────────────────────────────────────────

type Props = {
  visible: boolean;
  onClose: () => void;
  onConfirm: (name: string, icon: string) => void;
  saving: boolean;
  initialName: string;
  initialIcon: string;
};

export default function EditLocationModal({
  visible,
  onClose,
  onConfirm,
  saving,
  initialName,
  initialIcon,
}: Props) {
  const [name, setName] = useState(initialName);
  const [icon, setIcon] = useState(initialIcon);

  useEffect(() => {
    if (visible) {
      setName(initialName);
      setIcon(initialIcon);
    }
  }, [visible, initialName, initialIcon]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.modalBackdrop}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Editar local</Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Nome do local"
              placeholderTextColor={Colors.textSecondary}
              value={name}
              onChangeText={setName}
              autoCapitalize="sentences"
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Emoji opcional (ex: 🍳)"
              placeholderTextColor={Colors.textSecondary}
              value={icon}
              onChangeText={setIcon}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={onClose}
              >
                <Text style={styles.modalBtnCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalBtn,
                  styles.modalBtnConfirm,
                  (!name.trim() || saving) && styles.modalBtnDisabled,
                ]}
                onPress={() => onConfirm(name, icon)}
                disabled={!name.trim() || saving}
              >
                <Text style={styles.modalBtnConfirmText}>
                  {saving ? 'A salvar...' : 'Salvar'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    gap: 12,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  modalInput: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalBtnCancel: {
    backgroundColor: Colors.border,
  },
  modalBtnCancelText: {
    fontSize: 15,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  modalBtnConfirm: {
    backgroundColor: Colors.primary,
  },
  modalBtnConfirmText: {
    fontSize: 15,
    color: '#ffffff',
    fontWeight: '600',
  },
  modalBtnDisabled: {
    opacity: 0.5,
  },
});
