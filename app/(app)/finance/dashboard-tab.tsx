import { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useFinance } from '../../../contexts/FinanceContext';
import { useHousehold } from '../../../contexts/HouseholdContext';
import { AmountText } from '../../../components/finance/AmountText';
import { ProgressBar } from '../../../components/finance/ProgressBar';
import { Colors } from '../../../constants/colors';
import {
  FINANCE_CATEGORIES,
  CATEGORY_LABELS,
  CATEGORY_COLORS,
  CURRENCY_SYMBOLS,
  SUPPORTED_CURRENCIES,
} from '../../../constants/finance-constants';
import type { SupportedCurrency } from '../../../constants/finance-constants';

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonBox({ width, height = 16 }: { width: number | string; height?: number }) {
  return (
    <View style={{ width: width as number, height, borderRadius: 6, backgroundColor: Colors.border }} />
  );
}

function DashboardSkeleton() {
  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <View style={styles.card}>
        <SkeletonBox width="40%" height={14} />
        <View style={{ height: 8 }} />
        <SkeletonBox width="60%" height={32} />
        <View style={{ height: 12 }} />
        <View style={styles.row}>
          <SkeletonBox width="45%" height={20} />
          <SkeletonBox width="45%" height={20} />
        </View>
      </View>
      {[0, 1, 2].map((i) => (
        <View key={i} style={styles.card}>
          <SkeletonBox width="50%" height={14} />
          <View style={{ height: 8 }} />
          <SkeletonBox width="100%" height={8} />
        </View>
      ))}
    </ScrollView>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function DashboardTab() {
  const { selectedHousehold } = useHousehold();
  const { dashboard, dashboardLoading, rates, activeMonth, reloadDashboard } = useFinance();

  const [selectedCurrency, setSelectedCurrency] = useState<string>(
    () => selectedHousehold?.defaultCurrency ?? 'BRL'
  );

  useEffect(() => {
    if (selectedHousehold && !dashboard) {
      reloadDashboard();
    }
  }, []);

  // Reset ao trocar de household — usa a moeda da nova casa
  useEffect(() => {
    setSelectedCurrency(selectedHousehold?.defaultCurrency ?? 'BRL');
  }, [selectedHousehold?.id]);

  // ── Conversão client-side ──────────────────────────────────────────────────
  // rates[c] = BRL por 1 unidade de c (ex: EUR=6.0, BRL=1, PYG=0.0007)
  // Para converter `from → to`: amount * rates[from] / rates[to]
  const ratesData = rates?.rates;

  const convert = useMemo(() => {
    return (amount: number, fromCurrency: string): number => {
      const target = selectedCurrency || (dashboard?.baseCurrency ?? fromCurrency);
      if (!ratesData || fromCurrency === target) return amount;
      const fromRate = ratesData[fromCurrency] ?? 1;
      const toRate = ratesData[target];
      if (!toRate) return amount;
      return (amount * fromRate) / toRate;
    };
  }, [ratesData, selectedCurrency, dashboard?.baseCurrency]);

  if (dashboardLoading || !dashboard) {
    return <DashboardSkeleton />;
  }

  const effectiveCurrency = selectedCurrency || dashboard.baseCurrency;
  const sym = CURRENCY_SYMBOLS[effectiveCurrency as SupportedCurrency] ?? effectiveCurrency;

  // Valores convertidos do dashboard (base → selectedCurrency)
  const balance = convert(dashboard.balance, dashboard.baseCurrency);
  const totalIncome = convert(dashboard.totalIncome, dashboard.baseCurrency);
  const totalExpenses = convert(dashboard.totalExpenses, dashboard.baseCurrency);

  // Moedas disponíveis para o selector (apenas as que têm taxa)
  const selectorCurrencies = ratesData
    ? SUPPORTED_CURRENCIES.filter((c) => ratesData[c] !== undefined)
    : [dashboard.baseCurrency as SupportedCurrency];

  return (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

      {/* Resumo do mês */}
      <View style={styles.card}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.cardTitle}>Resumo de {monthLabel(activeMonth)}</Text>
        </View>

        {/* Selector de moeda */}
        {selectorCurrencies.length > 1 && (
          <View style={styles.currencyRow}>
            {selectorCurrencies.map((c) => (
              <TouchableOpacity
                key={c}
                style={[styles.currChip, effectiveCurrency === c && styles.currChipActive]}
                onPress={() => setSelectedCurrency(c)}
              >
                <Text style={[styles.currChipText, effectiveCurrency === c && styles.currChipTextActive]}>
                  {CURRENCY_SYMBOLS[c]} {c}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Saldo principal */}
        <Text
          style={[
            styles.balanceAmount,
            { color: balance >= 0 ? '#059669' : Colors.error },
          ]}
        >
          {sym} {Math.abs(balance).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </Text>
        <Text style={styles.balanceCaption}>
          {balance >= 0 ? 'Saldo positivo' : 'Saldo negativo'}
          {effectiveCurrency !== dashboard.baseCurrency && (
            <Text style={styles.convertedNote}> · convertido de {dashboard.baseCurrency}</Text>
          )}
        </Text>

        {/* Receitas / Despesas */}
        <View style={[styles.row, { marginTop: 12 }]}>
          <View style={styles.halfCard}>
            <Text style={styles.halfLabel}>Receitas</Text>
            <AmountText
              amount={totalIncome}
              currency={effectiveCurrency}
              type="income"
              size="md"
            />
          </View>
          <View style={[styles.halfCard, { borderLeftWidth: 1, borderLeftColor: Colors.border }]}>
            <Text style={styles.halfLabel}>Despesas</Text>
            <AmountText
              amount={totalExpenses}
              currency={effectiveCurrency}
              type="expense"
              size="md"
            />
          </View>
        </View>
      </View>

      {/* Faturas de cartão */}
      {dashboard.invoices.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Faturas</Text>
          {dashboard.invoices.map((inv) => {
            // Fatura está na moeda da própria conta → converte para selectedCurrency
            const invCurrency = inv.currency || dashboard.baseCurrency;
            const invoiceTotal = convert(inv.invoiceTotal, invCurrency);
            const limit = inv.limit != null ? convert(inv.limit, invCurrency) : undefined;
            return (
              <View key={inv.accountId} style={styles.invoiceRow}>
                <View style={styles.invoiceHeader}>
                  <Text style={styles.invoiceName}>{inv.accountName}</Text>
                  <Text style={[styles.invoiceAmount, { color: inv.isOverLimit ? Colors.error : Colors.textPrimary }]}>
                    {sym} {invoiceTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    {limit != null ? ` / ${sym} ${limit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : ''}
                  </Text>
                </View>
                {limit != null && (
                  <View style={{ marginTop: 6 }}>
                    <ProgressBar percent={inv.usedPercent} color={Colors.primary} height={5} />
                    <Text style={styles.usedPct}>
                      {inv.usedPercent.toFixed(0)}% utilizado{inv.isOverLimit ? ' ⚠️' : ''}
                    </Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      )}

      {/* Por categoria */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Por categoria</Text>
        {FINANCE_CATEGORIES.map((cat) => {
          const breakdown = dashboard.byCategory.find((b) => b.category === cat);
          if (!breakdown || breakdown.total === 0) return null;
          const colors = CATEGORY_COLORS[cat];
          const catTotal = convert(breakdown.total, dashboard.baseCurrency);
          const catBudget = convert(breakdown.budget, dashboard.baseCurrency);
          return (
            <View key={cat} style={styles.categoryRow}>
              <View style={styles.categoryHeader}>
                <View style={[styles.categoryDot, { backgroundColor: colors.dot }]} />
                <Text style={styles.categoryName}>{CATEGORY_LABELS[cat]}</Text>
                <View style={styles.categoryAmounts}>
                  <Text style={[styles.categoryTotal, { color: Colors.error }]}>
                    {sym} {catTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Text>
                  {catBudget > 0 && (
                    <>
                      <Text style={styles.categoryBudget}>
                        {' '}/ {sym} {catBudget.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </Text>
                      <Text style={[styles.categoryPct, { color: breakdown.usedPercent >= 100 ? Colors.error : Colors.textSecondary }]}>
                        {' '}· {breakdown.usedPercent.toFixed(0)}%
                      </Text>
                    </>
                  )}
                </View>
              </View>
              {catBudget > 0 && (
                <View style={{ marginTop: 5 }}>
                  <ProgressBar percent={breakdown.usedPercent} color={colors.dot} height={5} />
                </View>
              )}
            </View>
          );
        })}
        {dashboard.byCategory.every((b) => b.total === 0) && (
          <Text style={styles.emptyHint}>Nenhuma despesa categorizada neste mês.</Text>
        )}
      </View>

      {/* Histórico 6 meses */}
      {dashboard.history.length > 0 && (
        <View style={[styles.card, { marginBottom: 32 }]}>
          <Text style={styles.cardTitle}>Histórico (6 meses)</Text>
          <HistoryChart
            history={dashboard.history}
            sym={sym}
            convert={(amount) => convert(amount, dashboard.baseCurrency)}
          />
        </View>
      )}
    </ScrollView>
  );
}

// ─── Gráfico de histórico ─────────────────────────────────────────────────────

function HistoryChart({
  history,
  sym,
  convert,
}: {
  history: { month: string; income: number; expenses: number }[];
  sym: string;
  convert: (amount: number) => number;
}) {
  const converted = history.map((h) => ({
    ...h,
    income: convert(h.income),
    expenses: convert(h.expenses),
  }));
  const maxVal = Math.max(...converted.flatMap((h) => [h.income, h.expenses]), 1);
  const BAR_HEIGHT = 80;
  const MONTH_ABBR = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

  return (
    <View style={histStyles.container}>
      {converted.map((point) => {
        const incomePct = (point.income / maxVal) * BAR_HEIGHT;
        const expPct = (point.expenses / maxVal) * BAR_HEIGHT;
        const [, monthPart] = point.month.split('-');
        const label = MONTH_ABBR[Number(monthPart) - 1] ?? monthPart;

        return (
          <View key={point.month} style={histStyles.col}>
            <View style={[histStyles.barsContainer, { height: BAR_HEIGHT }]}>
              <View style={histStyles.barWrapper}>
                <View style={{ flex: 1 }} />
                <View style={[histStyles.bar, { height: incomePct, backgroundColor: '#059669', marginRight: 2 }]} />
              </View>
              <View style={histStyles.barWrapper}>
                <View style={{ flex: 1 }} />
                <View style={[histStyles.bar, { height: expPct, backgroundColor: Colors.error, marginLeft: 2 }]} />
              </View>
            </View>
            <Text style={histStyles.monthLabel}>{label}</Text>
          </View>
        );
      })}
    </View>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTHS_PT_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
function monthLabel(month: string): string {
  const [, m] = month.split('-');
  return MONTHS_PT_SHORT[Number(m) - 1] ?? month;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
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
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  currencyRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 14,
    flexWrap: 'wrap',
  },
  currChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
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
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  currChipTextActive: {
    color: '#fff',
  },
  balanceAmount: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  balanceCaption: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  convertedNote: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  halfCard: {
    flex: 1,
    paddingLeft: 8,
    gap: 4,
  },
  halfLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  invoiceRow: {
    marginBottom: 12,
  },
  invoiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  invoiceName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  invoiceAmount: {
    fontSize: 13,
    fontWeight: '600',
  },
  usedPct: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 3,
    textAlign: 'right',
  },
  categoryRow: {
    marginBottom: 12,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  categoryName: {
    fontSize: 13,
    color: Colors.textPrimary,
    flex: 1,
  },
  categoryAmounts: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryTotal: {
    fontSize: 13,
    fontWeight: '600',
  },
  categoryBudget: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  categoryPct: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyHint: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 8,
  },
});

const histStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingTop: 8,
  },
  col: {
    flex: 1,
    alignItems: 'center',
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    width: '100%',
    paddingHorizontal: 2,
  },
  barWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  bar: {
    width: '90%',
    borderRadius: 3,
  },
  monthLabel: {
    fontSize: 10,
    color: Colors.textSecondary,
    marginTop: 4,
  },
});

export default DashboardTab;
