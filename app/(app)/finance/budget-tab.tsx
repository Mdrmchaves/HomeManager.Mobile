import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useToast } from '../../../contexts/ToastContext';
import { FinanceService } from '../../../services/finance.service';
import { useFinance } from '../../../contexts/FinanceContext';
import { useHousehold } from '../../../contexts/HouseholdContext';
import {
  FINANCE_CATEGORIES,
  CATEGORY_LABELS,
  CATEGORY_COLORS,
  SUPPORTED_CURRENCIES,
  CURRENCY_SYMBOLS,
  CURRENCY_LABELS,
} from '../../../constants/finance-constants';
import { Colors } from '../../../constants/colors';
import type { FinanceCategory } from '../../../types/finance';

// #7 — padrões 25/30/25/10/5/5 na ordem lf, cf, co, mt, pr, es
const DEFAULT_GOALS: Record<FinanceCategory, string> = {
  lf: '25',
  cf: '30',
  co: '25',
  mt: '10',
  pr: '5',
  es: '5',
};

export function BudgetTab() {
  const { selectedHousehold } = useHousehold();
  const { budget, rates, reloadBudgetAndRates, markDashboardDirty } = useFinance();
  const { showToast } = useToast();

  const [goals, setGoals] = useState<Record<FinanceCategory, string>>(DEFAULT_GOALS);

  const [savingBudget, setSavingBudget] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(!budget && !rates);

  // Popula campos quando dados chegam do contexto
  useEffect(() => {
    if (budget) {
      const g: Record<FinanceCategory, string> = {} as any;
      FINANCE_CATEGORIES.forEach((cat) => {
        const val = budget.goals[cat] ?? 0;
        g[cat] = val > 0 ? val.toString() : DEFAULT_GOALS[cat];
      });
      setGoals(g);
    }
  }, [budget]);

  useEffect(() => {
    if (!budget && !rates && selectedHousehold) {
      setLoadingInitial(true);
      reloadBudgetAndRates().finally(() => setLoadingInitial(false));
    } else {
      setLoadingInitial(false);
    }
  }, [selectedHousehold?.id]);

  const goalsTotal = FINANCE_CATEGORIES.reduce((sum, cat) => sum + (Number(goals[cat]) || 0), 0);

  async function saveBudget() {
    if (!selectedHousehold) return;
    if (goalsTotal > 100) {
      showToast('A soma das metas não pode ultrapassar 100%.', 'error');
      return;
    }
    setSavingBudget(true);
    try {
      await FinanceService.upsertBudget({
        householdId: selectedHousehold.id,
        goals: Object.fromEntries(
          FINANCE_CATEGORIES.map((cat) => [cat, Number(goals[cat]) || 0])
        ),
      });
      await reloadBudgetAndRates();
      markDashboardDirty();
      showToast('Orçamento guardado.', 'success');
    } catch (e: any) {
      showToast(e.message ?? 'Erro ao salvar orçamento.', 'error');
    } finally {
      setSavingBudget(false);
    }
  }

  if (loadingInitial) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Orçamento ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Orçamento</Text>

          <Text style={styles.hint}>
            As metas são calculadas automaticamente sobre a receita real do mês (transações de entrada).
          </Text>

          <Text style={[styles.label, { marginTop: 4 }]}>Metas por categoria (%)</Text>
          <Text style={styles.hint}>
            Soma: {goalsTotal.toFixed(0)}%{goalsTotal > 100 ? ' ⚠️ acima de 100%' : ''}
          </Text>

          {FINANCE_CATEGORIES.map((cat) => {
            const colors = CATEGORY_COLORS[cat];
            return (
              <View key={cat} style={styles.goalRow}>
                <View style={[styles.goalDot, { backgroundColor: colors.dot }]} />
                <Text style={styles.goalLabel}>{CATEGORY_LABELS[cat]}</Text>
                <TextInput
                  style={styles.goalInput}
                  value={goals[cat]}
                  onChangeText={(v) => setGoals((prev) => ({ ...prev, [cat]: v }))}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={Colors.textSecondary}
                />
                <Text style={styles.pctSign}>%</Text>
              </View>
            );
          })}

          <TouchableOpacity
            style={styles.saveBtn}
            onPress={saveBudget}
            disabled={savingBudget}
          >
            {savingBudget
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={styles.saveBtnText}>Salvar orçamento</Text>
            }
          </TouchableOpacity>
        </View>

        {/* ── Câmbio (read-only) ── */}
        {/* #8 — exibe apenas valores actualizados da API, sem edição manual */}
        <View style={[styles.card, { marginBottom: 32 }]}>
          <Text style={styles.cardTitle}>Câmbio</Text>
          <Text style={styles.hint}>
            Cotações actualizadas automaticamente pelo servidor (Frankfurter API).
          </Text>

          {SUPPORTED_CURRENCIES.map((c) => {
            const value = rates?.rates[c];
            const hasValue = value !== undefined && value !== null;
            const isBase = c === (selectedHousehold?.defaultCurrency ?? 'BRL');
            return (
              <View key={c} style={styles.rateRow}>
                <Text style={styles.rateSymbol}>{CURRENCY_SYMBOLS[c]}</Text>
                <View style={styles.rateInfo}>
                  <View style={styles.rateCodeRow}>
                    <Text style={styles.rateCode}>{c}</Text>
                    {isBase && (
                      <View style={styles.baseBadge}>
                        <Text style={styles.baseBadgeText}>Principal</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.rateName}>{CURRENCY_LABELS[c]}</Text>
                </View>
                <Text style={[styles.rateValue, !hasValue && styles.rateValueEmpty]}>
                  {hasValue
                    ? `= ${value!.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })} BRL`
                    : '—'}
                </Text>
              </View>
            );
          })}

          {!rates && (
            <Text style={styles.ratesUnavailable}>Cotações ainda não disponíveis.</Text>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: 16,
    gap: 12,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  hint: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  incomeRow: {
    flexDirection: 'column',
    gap: 8,
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
  currencyPicker: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
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
  goalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  goalDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  goalLabel: {
    flex: 1,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  goalInput: {
    width: 60,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 14,
    color: Colors.textPrimary,
    textAlign: 'right',
    backgroundColor: Colors.background,
  },
  pctSign: {
    fontSize: 13,
    color: Colors.textSecondary,
    width: 16,
  },
  saveBtn: {
    marginTop: 16,
    backgroundColor: Colors.primary,
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  rateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  rateSymbol: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    width: 24,
    textAlign: 'center',
  },
  rateInfo: {
    flex: 1,
    gap: 1,
  },
  rateCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rateCode: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  baseBadge: {
    backgroundColor: Colors.primary,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  baseBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#fff',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  rateName: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  rateValue: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
    textAlign: 'right',
  },
  rateValueEmpty: {
    color: Colors.textSecondary,
  },
  ratesUnavailable: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 8,
    marginTop: 4,
  },
});

export default BudgetTab;
