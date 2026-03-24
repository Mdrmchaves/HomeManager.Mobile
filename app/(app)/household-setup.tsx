import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { HouseholdService } from '../../services/household.service';
import { Colors } from '../../constants/colors';
import { useAuth } from '../../contexts/AuthContext';

type Mode = 'create' | 'join';

export default function HouseholdSetupScreen() {
  const { refreshHouseholds } = useAuth();
  const [mode, setMode] = useState<Mode>('create');

  const [householdName, setHouseholdName] = useState('');
  const [inviteCode, setInviteCode] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function switchMode(next: Mode) {
    setMode(next);
    setError('');
  }

  function validate(): boolean {
    if (mode === 'create' && !householdName.trim()) {
      setError('O nome da casa é obrigatório.');
      return false;
    }
    if (mode === 'join' && !inviteCode.trim()) {
      setError('O código de convite é obrigatório.');
      return false;
    }
    return true;
  }

  async function handleSubmit() {
    setError('');
    if (!validate()) return;

    setLoading(true);
    try {
      if (mode === 'create') {
        await HouseholdService.createHousehold(householdName.trim());
      } else {
        await HouseholdService.joinHousehold(inviteCode.trim());
      }
      await refreshHouseholds();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Ocorreu um erro. Tenta novamente.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          {/* Icon */}
          <Text style={styles.icon}>🏠</Text>

          {/* Header */}
          <Text style={styles.title}>Bem-vindo ao HomeManager</Text>
          <Text style={styles.subtitle}>Crie a sua casa ou entre numa existente</Text>

          {/* Mode toggle */}
          <View style={styles.toggleBar}>
            <TouchableOpacity
              style={[styles.toggleBtn, mode === 'create' && styles.toggleBtnActive]}
              onPress={() => switchMode('create')}
            >
              <Text style={[styles.toggleText, mode === 'create' && styles.toggleTextActive]}>
                Criar casa
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, mode === 'join' && styles.toggleBtnActive]}
              onPress={() => switchMode('join')}
            >
              <Text style={[styles.toggleText, mode === 'join' && styles.toggleTextActive]}>
                Entrar com código
              </Text>
            </TouchableOpacity>
          </View>

          {/* Create mode */}
          {mode === 'create' && (
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Nome da casa</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: Casa da Família Silva"
                placeholderTextColor={Colors.textSecondary}
                value={householdName}
                onChangeText={setHouseholdName}
                autoCapitalize="words"
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
              />
            </View>
          )}

          {/* Join mode */}
          {mode === 'join' && (
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Código de convite</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: ABC123"
                placeholderTextColor={Colors.textSecondary}
                value={inviteCode}
                onChangeText={setInviteCode}
                autoCapitalize="characters"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
              />
            </View>
          )}

          {/* Error */}
          {!!error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Submit */}
          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={styles.primaryButtonText}>
              {loading
                ? mode === 'create'
                  ? 'A criar...'
                  : 'A entrar...'
                : mode === 'create'
                ? 'Criar casa'
                : 'Entrar na casa'}
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
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },

  // Header
  icon: {
    fontSize: 48,
    textAlign: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },

  // Toggle
  toggleBar: {
    flexDirection: 'row',
    backgroundColor: Colors.border,
    borderRadius: 10,
    padding: 4,
    marginBottom: 20,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  toggleBtnActive: {
    backgroundColor: Colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  toggleTextActive: {
    color: Colors.textPrimary,
    fontWeight: '600',
  },

  // Fields
  fieldGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: Colors.textPrimary,
    backgroundColor: Colors.surface,
  },

  // Error
  errorBox: {
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    padding: 10,
    marginBottom: 14,
  },
  errorText: {
    color: Colors.error,
    fontSize: 13,
  },

  // Primary button
  primaryButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
});
