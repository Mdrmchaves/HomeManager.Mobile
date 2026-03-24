import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';

// ─── DeleteLocationConfirmModal ───────────────────────────────────────────────

type Props = {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  deleting: boolean;
  locationName: string;
  error?: string | null;
};

export default function DeleteLocationConfirmModal({
  visible,
  onClose,
  onConfirm,
  deleting,
  locationName: _locationName,
  error,
}: Props) {
  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.confirmBackdrop}>
        <View style={styles.confirmCard}>
          <Text style={styles.confirmIcon}>⚠️</Text>
          <Text style={styles.confirmTitle}>Excluir local?</Text>
          <Text style={styles.confirmBody}>
            Os itens associados ficarão sem local. Esta ação não pode ser desfeita.
          </Text>
          {!!error && <Text style={styles.errorText}>{error}</Text>}
          <View style={styles.confirmButtons}>
            <TouchableOpacity
              style={[styles.confirmBtn, styles.confirmBtnCancel]}
              onPress={onClose}
              disabled={deleting}
            >
              <Text style={styles.confirmBtnCancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmBtn, styles.confirmBtnDelete]}
              onPress={onConfirm}
              disabled={deleting}
            >
              <Text style={styles.confirmBtnDeleteText}>
                {deleting ? 'A excluir...' : 'Excluir'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  confirmBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  confirmCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  confirmIcon: {
    fontSize: 32,
    marginBottom: 12,
  },
  confirmTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  confirmBody: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  confirmBtnCancel: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
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
  errorText: {
    fontSize: 13,
    color: Colors.error,
    textAlign: 'center',
    marginBottom: 12,
  },
});
