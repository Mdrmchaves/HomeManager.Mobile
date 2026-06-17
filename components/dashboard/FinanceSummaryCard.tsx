import { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { TrendingUp, TrendingDown, Clock } from 'lucide-react-native';
import { DashboardCard } from './DashboardCard';
import { FinanceService } from '../../services/finance.service';
import { PlanningService } from '../../services/planning.service';
import { Colors } from '../../constants/colors';
import { CURRENCY_SYMBOLS } from '../../constants/finance-constants';
import type { FinanceDashboard } from '../../types/finance';

const MONTHS_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function formatAmount(amount: number, currency: string) {
  const sym = (CURRENCY_SYMBOLS as Record<string, string>)[currency] ?? currency;
  return `${sym} ${Math.abs(amount).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function SkeletonLine({ width }: { width: number | string }) {
  return <View style={{ width: width as number, height: 14, borderRadius: 4, backgroundColor: Colors.border }} />;
}

export function FinanceSummaryCard({ householdId }: { householdId: string }) {
  const router = useRouter();
  const [data, setData] = useState<FinanceDashboard | null>(null);
  const [pendingPlanning, setPendingPlanning] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const month = currentMonth();
    setLoading(true);
    Promise.all([
      FinanceService.getDashboard(householdId, month),
      PlanningService.getItems(householdId, month),
    ])
      .then(([dashboard, planning]) => {
        setData(dashboard);
        const pending = (planning ?? []).filter((p) => !p.paidThisMonth && p.isActive).length;
        setPendingPlanning(pending);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [householdId]);

  const now = new Date();
  const monthLabel = `${MONTHS_PT[now.getMonth()]} ${now.getFullYear()}`;

  return (
    <DashboardCard title={`Finanças · ${monthLabel}`} onPress={() => router.push('/(app)/finance')}>
      {loading ? (
        <View style={styles.skeletonContainer}>
          <View style={styles.row}>
            <View style={{ flex: 1, gap: 6 }}>
              <SkeletonLine width="60%" />
              <SkeletonLine width="80%" />
            </View>
            <View style={{ flex: 1, gap: 6 }}>
              <SkeletonLine width="60%" />
              <SkeletonLine width="80%" />
            </View>
          </View>
        </View>
      ) : data ? (
        <>
          <View style={styles.row}>
            <View style={styles.metric}>
              <View style={styles.metricLabel}>
                <TrendingUp size={13} color="#059669" />
                <Text style={styles.labelText}>Receitas</Text>
              </View>
              <Text style={[styles.amount, { color: '#059669' }]}>
                {formatAmount(data.totalIncome, data.baseCurrency)}
              </Text>
            </View>
            <View style={styles.metric}>
              <View style={styles.metricLabel}>
                <TrendingDown size={13} color={Colors.error} />
                <Text style={styles.labelText}>Despesas</Text>
              </View>
              <Text style={[styles.amount, { color: Colors.error }]}>
                {formatAmount(data.totalExpenses, data.baseCurrency)}
              </Text>
            </View>
          </View>
          {pendingPlanning > 0 && (
            <View style={styles.planningRow}>
              <Clock size={12} color={Colors.warning} />
              <Text style={styles.planningText}>
                {pendingPlanning} {pendingPlanning === 1 ? 'item pendente' : 'itens pendentes'} no planejamento
              </Text>
            </View>
          )}
        </>
      ) : (
        <Text style={styles.emptyText}>Sem dados para este mês</Text>
      )}
    </DashboardCard>
  );
}

const styles = StyleSheet.create({
  skeletonContainer: { gap: 8 },
  row: { flexDirection: 'row', gap: 16 },
  metric: { flex: 1 },
  metricLabel: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 3 },
  labelText: { fontSize: 12, color: Colors.textSecondary },
  amount: { fontSize: 17, fontWeight: '700' },
  planningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  planningText: { fontSize: 12, color: Colors.warning, fontWeight: '500' },
  emptyText: { fontSize: 13, color: Colors.textSecondary },
});
