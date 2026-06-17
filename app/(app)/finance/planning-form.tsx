import { useEffect, useState } from 'react';
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
import { PlanningService } from '../../../services/planning.service';
import { useFinance } from '../../../contexts/FinanceContext';
import { useHousehold } from '../../../contexts/HouseholdContext';
import {
  FINANCE_CATEGORIES,
  CATEGORY_LABELS,
  CATEGORY_COLORS,
  SUPPORTED_CURRENCIES,
  CURRENCY_SYMBOLS,
} from '../../../constants/finance-constants';
import { Colors } from '../../../constants/colors';
import type {
  FinancePlanningItem,
  PlanningItemType,
  FinanceCategory,
} from '../../../types/finance';
import type { SupportedCurrency } from '../../../constants/finance-constants';

interface Props {
  visible: boolean;
  item?: FinancePlanningItem;
  onClose: () => void;
  onSaved: (item: FinancePlanningItem) => void;
}

const TYPE_OPTS: { value: PlanningItemType; label: string; desc: string }[] = [
  { value: 'fixed', label: 'Fixo', desc: 'Recorrente todo mês' },
  { value: 'installment', label: 'Parcelado', desc: 'Número fixo de parcelas' },
];

export function PlanningForm({ visible, item, onClose, onSaved }: Props) {
  const { selectedHousehold } = useHousehold();
  const { markDashboardDirty } = useFinance();

  const isEditing = !!item;

  const [description, setDescription] = useState(item?.description ?? '');
  const [amount, setAmount] = useState(item?.amount?.toString() ?? '');
  const [currency, setCurrency] = useState<SupportedCurrency>(
    (item?.currency as SupportedCurrency) ?? 'BRL'
  );
  const [category, setCategory] = useState<FinanceCategory | undefined>(item?.category);
  const [type, setType] = useState<PlanningItemType>(item?.type ?? 'fixed');
  const [dayOfMonth, setDayOfMonth] = useState(item?.dayOfMonth?.toString() ?? '');
  const [totalInstallments, setTotalInstallments] = useState(
    item?.totalInstallments?.toString() ?? ''
  );
  const [installmentsPaid, setInstallmentsPaid] = useState(
    item?.installmentsPaid?.toString() ?? '0'
  );
  const [isActive, setIsActive] = useState(item?.isActive ?? true);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setDescription(item?.description ?? '');
      setAmount(item?.amount?.toString() ?? '');
      setCurrency((item?.currency as SupportedCurrency) ?? 'BRL');
      setCategory(item?.category);
      setType(item?.type ?? 'fixed');
      setDayOfMonth(item?.dayOfMonth?.toString() ?? '');
      setTotalInstallments(item?.totalInstallments?.toString() ?? '');
      setInstallmentsPaid(item?.installmentsPaid?.toString() ?? '0');
      setIsActive(item?.isActive ?? true);
      setError(null);
    }
  }, [visible]);

  async function handleSave() {
    if (!description.trim()) { setError('A descrição é obrigatória.'); return; }
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      setError('Valor inválido.');
      return;
    }
    if (type === 'installment' && (!totalInstallments || Number(totalInstallments) < 1)) {
      setError('Informe o número total de parcelas.');
      return;
    }
    if (!selectedHousehold) return;

    setSaving(true);
    setError(null);
    try {
      let saved: FinancePlanningItem;
      if (isEditing) {
        saved = await PlanningService.updateItem(item.id, {
          description: description.trim(),
          amount: Number(amount),
          currency,
          category: category ?? undefined,
          type,
          dayOfMonth: dayOfMonth ? Number(dayOfMonth) : undefined,
          totalInstallments: type === 'installment' ? Number(totalInstallments) : undefined,
          installmentsPaid: type === 'installment' ? Number(installmentsPaid) : 0,
          isActive,
        });
      } else {
        saved = await PlanningService.createItem({
          householdId: selectedHousehold.id,
          description: description.trim(),
          amount: Number(amount),
          currency,
          category: category ?? undefined,
          type,
          dayOfMonth: dayOfMonth ? Number(dayOfMonth) : undefined,
          totalInstallments: type === 'installment' ? Number(totalInstallments) : undefined,
          installmentsPaid: 0,
        });
      }
      markDashboardDirty();
      onSaved(saved);
    } catch (e: any) {
      setError(e.message ?? 'Erro ao salvar item.');
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
          <View style={styles.handle} />

          <View style={styles.header}>
            <Text style={styles.headerTitle}>
              {isEditing ? 'Editar Item' : 'Novo Item de Planejamento'}
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <X size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            {/* Descrição */}
            <Text style={styles.label}>Descrição</Text>
            <TextInput
              style={styles.input}
              value={description}
              onChangeText={setDescription}
              placeholder="Ex: Aluguel, Netflix, Academia..."
              placeholderTextColor={Colors.textSecondary}
              autoFocus={!isEditing}
            />

            {/* Tipo */}
            <Text style={styles.label}>Tipo</Text>
            <View style={styles.typeRow}>
              {TYPE_OPTS.map((t) => (
                <TouchableOpacity
                  key={t.value}
                  style={[styles.typeCard, type === t.value && styles.typeCardActive]}
                  onPress={() => setType(t.value)}
                >
                  <Text style={[styles.typeCardTitle, type === t.value && styles.typeCardTitleActive]}>
                    {t.label}
                  </Text>
                  <Text style={styles.typeCardDesc}>{t.desc}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Valor + Moeda */}
            <Text style={styles.label}>Valor</Text>
            <TextInput
              style={styles.input}
              value={amount}
              onChangeText={setAmount}
              placeholder="0,00"
              placeholderTextColor={Colors.textSecondary}
              keyboardType="numeric"
            />
            <View style={[styles.row, { marginTop: 6 }]}>
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

            {/* Dia do mês */}
            <Text style={styles.label}>Dia de vencimento (opcional)</Text>
            <TextInput
              style={styles.input}
              value={dayOfMonth}
              onChangeText={setDayOfMonth}
              placeholder="Ex: 5 (dia 5 de cada mês)"
              placeholderTextColor={Colors.textSecondary}
              keyboardType="numeric"
            />

            {/* Parcelas */}
            {type === 'installment' && (
              <>
                <Text style={styles.label}>Total de parcelas</Text>
                <TextInput
                  style={styles.input}
                  value={totalInstallments}
                  onChangeText={setTotalInstallments}
                  placeholder="Ex: 12"
                  placeholderTextColor={Colors.textSecondary}
                  keyboardType="numeric"
                />
                {isEditing && (
                  <>
                    <Text style={styles.label}>Parcelas pagas</Text>
                    <TextInput
                      style={styles.input}
                      value={installmentsPaid}
                      onChangeText={setInstallmentsPaid}
                      keyboardType="numeric"
                    />
                  </>
                )}
              </>
            )}

            {/* Categoria */}
            <Text style={styles.label}>Categoria (opcional)</Text>
            <View style={styles.catGrid}>
              {FINANCE_CATEGORIES.map((cat) => {
                const colors = CATEGORY_COLORS[cat];
                const isSelected = category === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.catChip,
                      isSelected && { backgroundColor: colors.bg, borderColor: colors.dot },
                    ]}
                    onPress={() => setCategory(isSelected ? undefined : cat)}
                  >
                    <View style={[styles.catDot, { backgroundColor: colors.dot }]} />
                    <Text
                      style={[
                        styles.catChipText,
                        isSelected && { color: colors.text, fontWeight: '700' },
                      ]}
                    >
                      {CATEGORY_LABELS[cat]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Activo (só edição) */}
            {isEditing && (
              <TouchableOpacity
                style={styles.activeRow}
                onPress={() => setIsActive((v) => !v)}
              >
                <View style={[styles.checkbox, isActive && styles.checkboxActive]}>
                  {isActive && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.activeLabel}>Item activo</Text>
              </TouchableOpacity>
            )}

            {error && <Text style={styles.error}>{error}</Text>}
          </ScrollView>

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
    gap: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginTop: 14,
    marginBottom: 6,
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
  typeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  typeCard: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  typeCardActive: {
    borderColor: Colors.primary,
    backgroundColor: '#e8f5ee',
  },
  typeCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  typeCardTitleActive: {
    color: Colors.primary,
  },
  typeCardDesc: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  chipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  chipTextActive: {
    color: '#fff',
  },
  catGrid: {
    gap: 6,
  },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  catDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  catChipText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  activeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 16,
    paddingVertical: 4,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  checkmark: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  activeLabel: {
    fontSize: 14,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  error: {
    color: Colors.error,
    fontSize: 13,
    marginTop: 10,
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

export default PlanningForm;
