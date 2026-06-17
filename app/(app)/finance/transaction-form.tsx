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
import { FinanceService } from '../../../services/finance.service';
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
  FinanceTransaction,
  FinancePlanningItem,
  TransactionType,
  FinanceCategory,
} from '../../../types/finance';
import type { SupportedCurrency } from '../../../constants/finance-constants';

interface Props {
  visible: boolean;
  transaction?: FinanceTransaction; // se presente → edição
  prefill?: {
    type?: TransactionType;
    accountId?: string;
    planningItemId?: string;
    amount?: number;
    description?: string;
    category?: FinanceCategory;
  };
  onClose: () => void;
  onSaved: (tx: FinanceTransaction) => void;
  onDeleted?: (id: string) => void;
}

const TYPES: { value: TransactionType; label: string }[] = [
  { value: 'expense', label: 'Despesa' },
  { value: 'income', label: 'Receita' },
  { value: 'transfer', label: 'Transferência' },
];

// Formata Date para YYYY-MM-DD
function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function TransactionForm({ visible, transaction, prefill, onClose, onSaved, onDeleted }: Props) {
  const { selectedHousehold } = useHousehold();
  const {
    accounts,
    planningItems,
    rates,
    activeMonth,
    markAccountsDirty,
    markDashboardDirty,
  } = useFinance();

  const isEditing = !!transaction;

  const [type, setType] = useState<TransactionType>(transaction?.type ?? prefill?.type ?? 'expense');
  const [description, setDescription] = useState(transaction?.description ?? prefill?.description ?? '');
  const [amount, setAmount] = useState(transaction?.amount?.toString() ?? prefill?.amount?.toString() ?? '');
  const [currency, setCurrency] = useState<SupportedCurrency>(
    (transaction?.currency as SupportedCurrency) ?? 'BRL'
  );
  const [date, setDate] = useState(transaction?.date ?? toDateStr(new Date()));
  const [category, setCategory] = useState<FinanceCategory | undefined>(
    transaction?.category ?? prefill?.category ?? undefined
  );
  const [accountId, setAccountId] = useState<string | undefined>(
    transaction?.accountId ?? prefill?.accountId ?? undefined
  );
  const [toAccountId, setToAccountId] = useState<string | undefined>(
    transaction?.toAccountId ?? undefined
  );
  const [toAmount, setToAmount] = useState(transaction?.toAmount?.toString() ?? '');
  const [planningItemId, setPlanningItemId] = useState<string | undefined>(
    transaction?.planningItemId ?? prefill?.planningItemId ?? undefined
  );
  // #5 — mês de referência; default = activeMonth
  const [refMonth, setRefMonth] = useState<string>(transaction?.refMonth ?? activeMonth);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exchangeRateHint, setExchangeRateHint] = useState('');

  // Reset ao abrir
  useEffect(() => {
    if (visible) {
      setType(transaction?.type ?? prefill?.type ?? 'expense');
      setDescription(transaction?.description ?? prefill?.description ?? '');
      setAmount(transaction?.amount?.toString() ?? prefill?.amount?.toString() ?? '');
      setCurrency((transaction?.currency as SupportedCurrency) ?? 'BRL');
      setDate(transaction?.date ?? toDateStr(new Date()));
      setCategory(transaction?.category ?? prefill?.category ?? undefined);
      setAccountId(transaction?.accountId ?? prefill?.accountId ?? undefined);
      setToAccountId(transaction?.toAccountId ?? undefined);
      setToAmount(transaction?.toAmount?.toString() ?? '');
      setPlanningItemId(transaction?.planningItemId ?? prefill?.planningItemId ?? undefined);
      setRefMonth(transaction?.refMonth ?? activeMonth);
      setError(null);
      setExchangeRateHint('');
    }
  }, [visible]);

  const isTransfer = type === 'transfer';
  const isExpense = type === 'expense';

  const activeAccounts = accounts.filter((a) => a.isActive);

  // Derived para transferências: conta destino + taxa de câmbio sugerida
  const toAccount = accounts.find((a) => a.id === toAccountId);
  const toAccountCurrency = toAccount?.currency;

  useEffect(() => {
    if (!isTransfer) { setExchangeRateHint(''); return; }
    const fromAcc = accounts.find((a) => a.id === accountId);
    const toAcc = accounts.find((a) => a.id === toAccountId);
    if (!fromAcc || !toAcc || !rates) { setExchangeRateHint(''); return; }
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) { setExchangeRateHint(''); return; }

    const fromRate = rates.rates[fromAcc.currency] ?? 1;
    const toRate = rates.rates[toAcc.currency] ?? 1;

    if (fromAcc.currency === toAcc.currency) {
      setExchangeRateHint('');
      if (!isEditing) setToAmount(amount);
    } else {
      const converted = Math.round((amt * fromRate / toRate) * 100) / 100;
      const effectiveRate = Math.round((fromRate / toRate) * 10000) / 10000;
      setExchangeRateHint(
        `Taxa de câmbio estimada: 1 ${fromAcc.currency} ≈ ${effectiveRate} ${toAcc.currency}`
      );
      if (!isEditing) setToAmount(converted.toString());
    }
  }, [accountId, toAccountId, amount, isTransfer, accounts, rates, isEditing]);

  // Itens de planejamento elegíveis para vinculação: activos, não pagos, não via CC
  const linkableItems = planningItems.filter(
    (i) => i.isActive && !i.paidThisMonth && !i.paidViaCC
  );

  function handleSelectPlanning(item: FinancePlanningItem) {
    if (planningItemId === item.id) {
      setPlanningItemId(undefined);
      return;
    }
    setPlanningItemId(item.id);
    setDescription(item.description);
    setAmount(item.amount.toString());
    setCurrency(item.currency as SupportedCurrency);
    if (item.category) setCategory(item.category);
  }

  async function handleSave() {
    if (!description.trim()) { setError('A descrição é obrigatória.'); return; }
    if (!amount || isNaN(Number(amount))) { setError('Valor inválido.'); return; }
    if (!selectedHousehold) return;
    if (isTransfer && !toAccountId) { setError('Seleciona a conta de destino.'); return; }

    setSaving(true);
    setError(null);
    try {
      const payload = {
        householdId: selectedHousehold.id,
        accountId: accountId ?? undefined,
        description: description.trim(),
        amount: Number(amount),
        currency,
        date,
        type,
        category: isExpense ? category : undefined,
        toAccountId: isTransfer ? toAccountId : undefined,
        toAmount: isTransfer && toAmount ? Number(toAmount) : undefined,
        planningItemId: planningItemId ?? undefined,
        refMonth,
      };

      const saved = isEditing
        ? await FinanceService.updateTransaction(transaction.id, payload)
        : await FinanceService.createTransaction(payload);

      markAccountsDirty();
      markDashboardDirty();
      onSaved(saved);
    } catch (e: any) {
      setError(e.message ?? 'Erro ao salvar transação.');
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
              {isEditing ? 'Editar Transação' : 'Nova Transação'}
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <X size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            {/* Tipo */}
            <Text style={styles.label}>Tipo</Text>
            <View style={styles.row}>
              {TYPES.map((t) => (
                <TouchableOpacity
                  key={t.value}
                  style={[
                    styles.typeChip,
                    type === t.value && {
                      backgroundColor: TYPE_COLORS[t.value],
                      borderColor: TYPE_COLORS[t.value],
                    },
                  ]}
                  onPress={() => setType(t.value)}
                >
                  <Text
                    style={[
                      styles.typeChipText,
                      type === t.value && styles.typeChipTextActive,
                    ]}
                  >
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Vincular ao planejamento — só despesas novas com itens elegíveis */}
            {isExpense && !isEditing && linkableItems.length > 0 && (
              <>
                <Text style={styles.label}>Vincular ao planejamento</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.planningRow}
                >
                  {linkableItems.map((item) => {
                    const isSelected = planningItemId === item.id;
                    const sym = CURRENCY_SYMBOLS[item.currency as SupportedCurrency] ?? item.currency;
                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={[styles.planningChip, isSelected && styles.planningChipActive]}
                        onPress={() => handleSelectPlanning(item)}
                      >
                        <Text
                          style={[styles.planningChipText, isSelected && styles.planningChipTextActive]}
                          numberOfLines={1}
                        >
                          {item.description}
                        </Text>
                        <Text style={[styles.planningChipAmt, isSelected && styles.planningChipAmtActive]}>
                          {sym} {item.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </>
            )}

            {/* Descrição */}
            <Text style={styles.label}>Descrição</Text>
            <TextInput
              style={styles.input}
              value={description}
              onChangeText={setDescription}
              placeholder="Ex: Supermercado, Salário..."
              placeholderTextColor={Colors.textSecondary}
              autoFocus={!isEditing}
            />

            {/* Valor + Moeda */}
            <Text style={styles.label}>Valor</Text>
            <View style={styles.amountRow}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={amount}
                onChangeText={setAmount}
                placeholder="0,00"
                placeholderTextColor={Colors.textSecondary}
                keyboardType="numeric"
              />
              <View style={styles.currencyRow}>
                {SUPPORTED_CURRENCIES.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.currChip, currency === c && styles.currChipActive]}
                    onPress={() => setCurrency(c)}
                  >
                    <Text style={[styles.currChipText, currency === c && styles.currChipTextActive]}>
                      {c}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Data */}
            <Text style={styles.label}>Data</Text>
            <TextInput
              style={styles.input}
              value={date}
              onChangeText={setDate}
              placeholder="AAAA-MM-DD"
              placeholderTextColor={Colors.textSecondary}
            />

            {/* Mês de referência — 12 meses do ano com scroll */}
            <Text style={styles.label}>Mês de referência</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.monthRow}>
                {buildYearMonthOptions(activeMonth).map((m) => (
                  <TouchableOpacity
                    key={m.value}
                    style={[styles.monthChip, refMonth === m.value && styles.monthChipActive]}
                    onPress={() => setRefMonth(m.value)}
                  >
                    <Text style={[styles.monthChipText, refMonth === m.value && styles.monthChipTextActive]}>
                      {m.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* Conta de origem */}
            <Text style={styles.label}>{isTransfer ? 'Conta de origem' : 'Conta'}</Text>
            <View style={styles.accountList}>
              <TouchableOpacity
                style={[styles.accountChip, !accountId && styles.accountChipActive]}
                onPress={() => setAccountId(undefined)}
              >
                <Text style={[styles.accountChipText, !accountId && styles.accountChipTextActive]}>
                  Sem conta
                </Text>
              </TouchableOpacity>
              {activeAccounts.map((acc) => (
                <TouchableOpacity
                  key={acc.id}
                  style={[styles.accountChip, accountId === acc.id && styles.accountChipActive]}
                  onPress={() => {
                    setAccountId(acc.id);
                    if (acc.currency) setCurrency(acc.currency as SupportedCurrency);
                  }}
                >
                  <Text
                    style={[
                      styles.accountChipText,
                      accountId === acc.id && styles.accountChipTextActive,
                    ]}
                  >
                    {acc.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Conta de destino (só transferência) */}
            {isTransfer && (
              <>
                <Text style={styles.label}>Conta de destino</Text>
                <View style={styles.accountList}>
                  {activeAccounts
                    .filter((a) => a.id !== accountId)
                    .map((acc) => (
                      <TouchableOpacity
                        key={acc.id}
                        style={[styles.accountChip, toAccountId === acc.id && styles.accountChipActive]}
                        onPress={() => setToAccountId(acc.id)}
                      >
                        <Text
                          style={[
                            styles.accountChipText,
                            toAccountId === acc.id && styles.accountChipTextActive,
                          ]}
                        >
                          {acc.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                </View>

                <Text style={styles.label}>
                  Valor recebido{toAccountCurrency ? ` (${toAccountCurrency})` : ''}
                </Text>
                <TextInput
                  style={styles.input}
                  value={toAmount}
                  onChangeText={(v) => { setToAmount(v); setExchangeRateHint(''); }}
                  placeholder={toAccountCurrency ? `0,00 ${toAccountCurrency}` : '0,00'}
                  placeholderTextColor={Colors.textSecondary}
                  keyboardType="numeric"
                />
                {!!exchangeRateHint && (
                  <Text style={styles.rateHint}>{exchangeRateHint}</Text>
                )}
              </>
            )}

            {/* Categoria (só despesa) */}
            {isExpense && (
              <>
                <Text style={styles.label}>Categoria</Text>
                <View style={styles.categoryGrid}>
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
              </>
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

// Gera os 12 meses do ano corrente com nomes completos
const MONTHS_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];
function buildYearMonthOptions(activeMonth: string): { value: string; label: string }[] {
  const year = activeMonth.split('-')[0];
  return MONTHS_PT.map((name, i) => ({
    value: `${year}-${String(i + 1).padStart(2, '0')}`,
    label: name,
  }));
}

const TYPE_COLORS: Record<TransactionType, string> = {
  expense: Colors.error,
  income: '#059669',
  transfer: Colors.primary,
};

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
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  typeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  typeChipText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  typeChipTextActive: {
    color: '#ffffff',
  },
  amountRow: {
    gap: 8,
  },
  currencyRow: {
    flexDirection: 'row',
    gap: 6,
  },
  currChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  currChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  currChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  currChipTextActive: {
    color: '#fff',
  },
  accountList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  accountChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  accountChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  accountChipText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  accountChipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  categoryGrid: {
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
  monthRow: {
    flexDirection: 'row',
    gap: 6,
  },
  monthChip: {
    minWidth: 96,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
    alignItems: 'center',
    flexShrink: 0,
  },
  monthChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  monthChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  monthChipTextActive: {
    color: '#fff',
  },
  planningRow: {
    gap: 6,
    paddingBottom: 2,
  },
  planningChip: {
    minWidth: 110,
    maxWidth: 160,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
    gap: 2,
    flexShrink: 0,
  },
  planningChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  planningChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  planningChipTextActive: {
    color: '#fff',
  },
  planningChipAmt: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  planningChipAmtActive: {
    color: 'rgba(255,255,255,0.85)',
  },
  rateHint: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 4,
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

export default TransactionForm;
