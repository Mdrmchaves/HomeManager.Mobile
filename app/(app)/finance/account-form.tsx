import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { X } from 'lucide-react-native';
import { FinanceService } from '../../../services/finance.service';
import { useFinance } from '../../../contexts/FinanceContext';
import { useHousehold } from '../../../contexts/HouseholdContext';
import { SUPPORTED_CURRENCIES, CURRENCY_SYMBOLS } from '../../../constants/finance-constants';
import { Colors } from '../../../constants/colors';
import type { FinanceAccount, AccountType } from '../../../types/finance';
import type { SupportedCurrency } from '../../../constants/finance-constants';

interface Props {
  visible: boolean;
  account?: FinanceAccount; // se presente → edição
  onClose: () => void;
  onSaved: (account: FinanceAccount) => void;
}

const ACCOUNT_TYPES: { value: AccountType; label: string }[] = [
  { value: 'account', label: 'Conta' },
  { value: 'cc', label: 'Cartão de Crédito' },
];

export function AccountForm({ visible, account, onClose, onSaved }: Props) {
  const { selectedHousehold } = useHousehold();
  const { markDashboardDirty } = useFinance();

  const [name, setName] = useState(account?.name ?? '');
  const [currency, setCurrency] = useState<SupportedCurrency>(
    (account?.currency as SupportedCurrency) ?? 'BRL'
  );
  const [type, setType] = useState<AccountType>(account?.type ?? 'account');
  const [closeDay, setCloseDay] = useState(account?.closeDay?.toString() ?? '');
  const [dueDay, setDueDay] = useState(account?.dueDay?.toString() ?? '');
  const [limit, setLimit] = useState(account?.limit?.toString() ?? '');
  const [balance, setBalance] = useState(account?.balance?.toString() ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isCC = type === 'cc';
  const isEditing = !!account;

  async function handleSave() {
    if (!name.trim()) { setError('O nome é obrigatório.'); return; }
    if (!selectedHousehold) return;
    setSaving(true);
    setError(null);
    try {
      const payload = {
        householdId: selectedHousehold.id,
        name: name.trim(),
        currency,
        type,
        closeDay: isCC && closeDay ? Number(closeDay) : undefined,
        closeMonthIsNext: false,
        dueDay: isCC && dueDay ? Number(dueDay) : undefined,
        limit: isCC && limit ? Number(limit) : undefined,
        balance: balance ? Number(balance) : undefined,
      };
      const saved = isEditing
        ? await FinanceService.updateAccount(account.id, payload)
        : await FinanceService.createAccount(payload);
      markDashboardDirty();
      onSaved(saved);
    } catch (e: any) {
      setError(e.message ?? 'Erro ao salvar conta.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <View style={styles.sheet}>
          {/* Handle */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>
              {isEditing ? 'Editar Conta' : 'Nova Conta'}
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <X size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            {/* Nome */}
            <Text style={styles.label}>Nome</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Ex: Nubank, Bradesco..."
              placeholderTextColor={Colors.textSecondary}
              autoFocus
            />

            {/* Tipo */}
            <Text style={styles.label}>Tipo</Text>
            <View style={styles.row}>
              {ACCOUNT_TYPES.map((t) => (
                <TouchableOpacity
                  key={t.value}
                  style={[styles.chip, type === t.value && styles.chipActive]}
                  onPress={() => setType(t.value)}
                >
                  <Text style={[styles.chipText, type === t.value && styles.chipTextActive]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Moeda */}
            <Text style={styles.label}>Moeda</Text>
            <View style={styles.row}>
              {SUPPORTED_CURRENCIES.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[styles.chip, currency === c && styles.chipActive]}
                  onPress={() => setCurrency(c)}
                >
                  <Text style={[styles.chipText, currency === c && styles.chipTextActive]}>
                    {CURRENCY_SYMBOLS[c]} {c}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Saldo inicial */}
            <Text style={styles.label}>Saldo inicial</Text>
            <TextInput
              style={styles.input}
              value={balance}
              onChangeText={setBalance}
              placeholder="0,00"
              placeholderTextColor={Colors.textSecondary}
              keyboardType="numeric"
            />

            {/* Campos específicos de CC */}
            {isCC && (
              <>
                <Text style={styles.label}>Dia de fechamento</Text>
                <TextInput
                  style={styles.input}
                  value={closeDay}
                  onChangeText={setCloseDay}
                  placeholder="Ex: 10"
                  placeholderTextColor={Colors.textSecondary}
                  keyboardType="numeric"
                />

                <Text style={styles.label}>Dia de vencimento</Text>
                <TextInput
                  style={styles.input}
                  value={dueDay}
                  onChangeText={setDueDay}
                  placeholder="Ex: 20"
                  placeholderTextColor={Colors.textSecondary}
                  keyboardType="numeric"
                />

                <Text style={styles.label}>Limite</Text>
                <TextInput
                  style={styles.input}
                  value={limit}
                  onChangeText={setLimit}
                  placeholder="0,00"
                  placeholderTextColor={Colors.textSecondary}
                  keyboardType="numeric"
                />
              </>
            )}

            {error && <Text style={styles.error}>{error}</Text>}
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={saving}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
              {saving
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.saveText}>Salvar</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
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
    justifyContent: 'space-between',
    alignItems: 'center',
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
  body: {
    padding: 20,
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginTop: 12,
    marginBottom: 4,
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
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  chipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  chipTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  error: {
    color: Colors.error,
    fontSize: 13,
    marginTop: 8,
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
  saveText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
});

export default AccountForm;
