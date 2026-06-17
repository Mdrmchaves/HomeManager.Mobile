import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Share,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Share2 } from 'lucide-react-native';
import { HouseholdService } from '../../services/household.service';
import { useHousehold } from '../../contexts/HouseholdContext';
import { Colors } from '../../constants/colors';
import { SUPPORTED_CURRENCIES } from '../../constants/finance-constants';

function SectionLabel({ children }: { children: string }) {
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

function Divider() {
  return <View style={styles.divider} />;
}

export default function SettingsScreen() {
  const router = useRouter();
  const { selectedHousehold, refreshHouseholds } = useHousehold();

  const [name, setName] = useState(selectedHousehold?.name ?? '');
  const [savingName, setSavingName] = useState(false);
  const [savingCurrency, setSavingCurrency] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (!selectedHousehold) return null;
  const household = selectedHousehold as NonNullable<typeof selectedHousehold>;

  const nameChanged = name.trim() !== household.name;

  async function saveName() {
    if (!nameChanged || !name.trim()) return;
    setSavingName(true);
    try {
      await HouseholdService.updateSettings(household.id, { name: name.trim() });
      await refreshHouseholds();
    } catch (e: unknown) {
      Alert.alert('Erro', e instanceof Error ? e.message : 'Não foi possível guardar.');
    } finally {
      setSavingName(false);
    }
  }

  async function saveCurrency(currency: string) {
    if (currency === household.defaultCurrency) return;
    setSavingCurrency(true);
    try {
      await HouseholdService.updateSettings(household.id, { defaultCurrency: currency });
      await refreshHouseholds();
    } catch (e: unknown) {
      Alert.alert('Erro', e instanceof Error ? e.message : 'Não foi possível guardar.');
    } finally {
      setSavingCurrency(false);
    }
  }

  function shareInviteCode() {
    Share.share({
      message: `Código de convite para "${household.name}": ${household.inviteCode}`,
    });
  }

  function confirmDelete() {
    Alert.alert(
      'Eliminar casa',
      `Tens a certeza que queres eliminar "${household.name}"? Esta ação é irreversível e eliminará todos os dados associados.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: doDelete },
      ]
    );
  }

  async function doDelete() {
    setDeleting(true);
    try {
      await HouseholdService.deleteHousehold(household.id);
      await refreshHouseholds();
      router.replace('/(app)/dashboard');
    } catch (e: unknown) {
      Alert.alert('Erro', e instanceof Error ? e.message : 'Não foi possível eliminar.');
      setDeleting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        <SectionLabel>Nome da casa</SectionLabel>
        <View style={styles.card}>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Nome da casa"
            placeholderTextColor={Colors.textSecondary}
            autoCapitalize="words"
            returnKeyType="done"
            onSubmitEditing={saveName}
          />
          <TouchableOpacity
            style={[styles.saveButton, (!nameChanged || savingName) && styles.saveButtonDisabled]}
            onPress={saveName}
            disabled={!nameChanged || savingName}
          >
            <Text style={styles.saveButtonText}>
              {savingName ? 'A guardar...' : 'Guardar nome'}
            </Text>
          </TouchableOpacity>
        </View>

        <SectionLabel>Moeda padrão</SectionLabel>
        <View style={styles.card}>
          <View style={styles.currencyRow}>
            {SUPPORTED_CURRENCIES.map((c) => {
              const isActive = (household.defaultCurrency ?? 'BRL') === c;
              return (
                <TouchableOpacity
                  key={c}
                  style={[styles.currencyChip, isActive && styles.currencyChipActive]}
                  onPress={() => saveCurrency(c)}
                  disabled={savingCurrency}
                >
                  <Text style={[styles.currencyChipText, isActive && styles.currencyChipTextActive]}>
                    {c}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {savingCurrency && <Text style={styles.savingHint}>A guardar...</Text>}
        </View>

        <SectionLabel>Código de convite</SectionLabel>
        <View style={styles.card}>
          <Text style={styles.hint}>Partilha este código com quem queres convidar para a casa.</Text>
          <View style={styles.inviteRow}>
            <Text style={styles.inviteCode}>{household.inviteCode}</Text>
            <TouchableOpacity style={styles.shareButton} onPress={shareInviteCode}>
              <Share2 size={16} color={Colors.primary} />
              <Text style={styles.shareButtonText}>Partilhar</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Divider />

        <SectionLabel>Zona de perigo</SectionLabel>
        <View style={styles.card}>
          <Text style={styles.hint}>
            Eliminar a casa apaga todos os dados permanentemente: inventário, finanças e membros.
            Esta ação não pode ser revertida.
          </Text>
          <TouchableOpacity
            style={[styles.deleteButton, deleting && styles.deleteButtonDisabled]}
            onPress={confirmDelete}
            disabled={deleting}
          >
            <Text style={styles.deleteButtonText}>
              {deleting ? 'A eliminar...' : 'Eliminar casa'}
            </Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 48,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
    marginTop: 16,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginTop: 24,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.textPrimary,
    backgroundColor: Colors.background,
  },
  saveButton: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.4,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  currencyRow: {
    flexDirection: 'row',
    gap: 8,
  },
  currencyChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  currencyChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  currencyChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  currencyChipTextActive: {
    color: '#fff',
  },
  savingHint: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  hint: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  inviteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inviteCode: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: 3,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  shareButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },
  deleteButton: {
    borderWidth: 1,
    borderColor: Colors.error,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  deleteButtonDisabled: {
    opacity: 0.5,
  },
  deleteButtonText: {
    color: Colors.error,
    fontSize: 14,
    fontWeight: '600',
  },
});
