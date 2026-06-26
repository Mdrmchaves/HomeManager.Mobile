import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useToast } from '../../../contexts/ToastContext';
import { CheckCircle2, Circle, CreditCard, Edit3, Plus, Repeat, Trash2 } from 'lucide-react-native';
import { PlanningService } from '../../../services/planning.service';
import { useFinance } from '../../../contexts/FinanceContext';
import { useHousehold } from '../../../contexts/HouseholdContext';
import { CategoryBadge } from '../../../components/finance/CategoryBadge';
import { ProgressBar } from '../../../components/finance/ProgressBar';
import { Colors } from '../../../constants/colors';
import {
  CURRENCY_SYMBOLS,
  CATEGORY_COLORS,
  SUPPORTED_CURRENCIES,
} from '../../../constants/finance-constants';
import type { FinancePlanningItem, FinanceAccount } from '../../../types/finance';
import type { SupportedCurrency } from '../../../constants/finance-constants';
import { PlanningForm } from './planning-form';
import { TransactionForm } from './transaction-form';

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function PlanningSkeleton() {
  return (
    <View style={styles.container}>
      <View style={[styles.summaryCard, { marginTop: 16, marginHorizontal: 16 }]}>
        <View style={{ width: '40%', height: 12, borderRadius: 6, backgroundColor: Colors.border }} />
        <View style={{ height: 10 }} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <View style={{ width: '40%', height: 22, borderRadius: 6, backgroundColor: Colors.border }} />
          <View style={{ width: '40%', height: 22, borderRadius: 6, backgroundColor: Colors.border }} />
        </View>
        <View style={{ height: 10 }} />
        <View style={{ width: '100%', height: 8, borderRadius: 4, backgroundColor: Colors.border }} />
      </View>
      {[0, 1, 2, 3].map((i) => (
        <View key={i} style={[styles.card, { marginHorizontal: 16, marginTop: 8 }]}>
          <View style={{ width: '60%', height: 14, borderRadius: 6, backgroundColor: Colors.border }} />
          <View style={{ height: 8 }} />
          <View style={{ width: '35%', height: 20, borderRadius: 6, backgroundColor: Colors.border }} />
        </View>
      ))}
    </View>
  );
}

// ─── Banner / Summary ─────────────────────────────────────────────────────────

function PlanningBanner({
  planningItems,
  rates,
  selectedCurrency,
  onCurrencyChange,
}: {
  planningItems: FinancePlanningItem[];
  rates: Record<string, number> | undefined;
  selectedCurrency: string;
  onCurrencyChange: (c: string) => void;
}) {
  const hasRates = !!rates;

  // Conversão: rates[from] = BRL/unit; amount * rates[from] / rates[to]
  function convert(amount: number, fromCurrency: string): number {
    if (!rates || fromCurrency === selectedCurrency) return amount;
    const fromRate = rates[fromCurrency] ?? 1;
    const toRate = rates[selectedCurrency] ?? 1;
    if (!toRate) return amount;
    return (amount * fromRate) / toRate;
  }

  const sym = CURRENCY_SYMBOLS[selectedCurrency as SupportedCurrency] ?? selectedCurrency;

  // Itens paidViaCC excluídos do total — já estão na fatura do cartão
  const directItems = planningItems.filter((i) => !i.paidViaCC);
  const paid = planningItems.filter((i) => i.paidThisMonth);

  // "Planejado" = directItems (todos, pagos + não pagos)
  const totalPlanned = directItems.reduce(
    (sum, i) => sum + convert(i.amount, i.currency), 0
  );
  // "A pagar" = directItems ainda não pagos
  const totalUnpaid = directItems
    .filter((i) => !i.paidThisMonth)
    .reduce((sum, i) => sum + convert(i.amount, i.currency), 0);

  const progressPct = totalPlanned > 0
    ? (directItems.filter((i) => i.paidThisMonth).length / directItems.length) * 100
    : 0;

  const paidViaCCCount = planningItems.filter((i) => i.paidViaCC).length;

  return (
    <View style={styles.summaryCard}>
      {/* Título + seletor de moeda */}
      <View style={styles.summaryHeader}>
        <Text style={styles.summaryTitle}>Estimativa mensal</Text>
        {hasRates && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.currencyRow}>
              {SUPPORTED_CURRENCIES.filter((c) => rates![c] !== undefined).map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[styles.currChip, selectedCurrency === c && styles.currChipActive]}
                  onPress={() => onCurrencyChange(c)}
                >
                  <Text style={[styles.currChipText, selectedCurrency === c && styles.currChipTextActive]}>
                    {CURRENCY_SYMBOLS[c]} {c}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        )}
      </View>

      {!hasRates && (
        <Text style={styles.ratesWarning}>
          Taxas não disponíveis — valores sem conversão
        </Text>
      )}

      {/* Valores principais */}
      <View style={styles.summaryValuesRow}>
        <View>
          <Text style={styles.summaryLabel}>Planejado</Text>
          <Text style={styles.summaryValue}>
            {sym} {totalPlanned.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.summaryLabel}>A pagar</Text>
          <Text style={[styles.summaryValue, { color: totalUnpaid > 0 ? Colors.error : '#059669' }]}>
            {totalUnpaid > 0
              ? `${sym} ${totalUnpaid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
              : '✓ Tudo pago'}
          </Text>
        </View>
      </View>

      {/* Progresso */}
      <View style={{ marginTop: 10 }}>
        <ProgressBar percent={progressPct} color="#059669" height={6} />
        <Text style={styles.summaryPct}>
          {paid.length} de {planningItems.length} itens pagos · {planningItems.length - paid.length} pendente(s)
          {paidViaCCCount > 0 ? ` · ${paidViaCCCount} via CC` : ''}
        </Text>
      </View>

    </View>
  );
}

// ─── Card de faturas CC ───────────────────────────────────────────────────────

function CCInvoicesCard({
  ccAccounts,
  rates,
  selectedCurrency,
  paidViaCCCount,
}: {
  ccAccounts: FinanceAccount[];
  rates: Record<string, number> | undefined;
  selectedCurrency: string;
  paidViaCCCount: number;
}) {
  function convert(amount: number, fromCurrency: string): number {
    if (!rates || fromCurrency === selectedCurrency) return amount;
    const fromRate = rates[fromCurrency] ?? 1;
    const toRate = rates[selectedCurrency] ?? 1;
    if (!toRate) return amount;
    return (amount * fromRate) / toRate;
  }

  const sym = CURRENCY_SYMBOLS[selectedCurrency as SupportedCurrency] ?? selectedCurrency;
  const ccTotal = ccAccounts.reduce(
    (sum, a) => sum + convert(a.currentInvoice ?? 0, a.currency), 0
  );

  return (
    <View style={styles.summaryCard}>
      <View style={styles.ccSectionHeader}>
        <CreditCard size={13} color={Colors.textSecondary} strokeWidth={2} />
        <Text style={styles.ccSectionTitle}>Faturas CC</Text>
      </View>

      {ccAccounts.map((acc) => {
        const invConverted = convert(acc.currentInvoice ?? 0, acc.currency);
        return (
          <View key={acc.id} style={styles.ccRow}>
            <Text style={styles.ccRowName}>{acc.name}</Text>
            <Text style={styles.ccRowAmount}>
              {sym} {invConverted.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </Text>
          </View>
        );
      })}

      {ccAccounts.length > 1 && (
        <View style={[styles.ccRow, { borderTopWidth: 1, borderTopColor: Colors.border, marginTop: 4, paddingTop: 6 }]}>
          <Text style={[styles.ccRowName, { fontWeight: '700', color: Colors.textPrimary }]}>Total CC</Text>
          <Text style={[styles.ccRowAmount, { fontWeight: '700', color: Colors.textPrimary }]}>
            {sym} {ccTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </Text>
        </View>
      )}

      {paidViaCCCount > 0 && (
        <Text style={styles.ccHint}>
          {paidViaCCCount} item(ns) excluídos do planejamento — já incluídos na fatura
        </Text>
      )}
    </View>
  );
}

// ─── Card de item ─────────────────────────────────────────────────────────────

function PlanningItemCard({
  item,
  expanded,
  onToggle,
  onPay,
  onEdit,
  onDelete,
}: {
  item: FinancePlanningItem;
  expanded: boolean;
  onToggle: () => void;
  onPay: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const symbol = CURRENCY_SYMBOLS[item.currency as SupportedCurrency] ?? item.currency;
  const isInstallment = item.type === 'installment';
  const catColors = item.category ? CATEGORY_COLORS[item.category] : null;
  const isViaCC = item.paidViaCC && !item.paidThisMonth;
  const canPay = !item.paidThisMonth && !isViaCC;

  const installmentPct = isInstallment && item.totalInstallments
    ? (item.installmentsPaid / item.totalInstallments) * 100
    : 0;

  return (
    <TouchableOpacity
      style={[
        styles.card,
        item.paidThisMonth && styles.cardPaid,
        isViaCC && styles.cardViaCC,
        expanded && styles.cardExpanded,
      ]}
      onLongPress={onToggle}
      onPress={expanded ? onToggle : undefined}
      delayLongPress={350}
      activeOpacity={0.75}
    >
      {/* Linha superior */}
      <View style={styles.cardTop}>
        <View>
          {item.paidThisMonth ? (
            <CheckCircle2 size={22} color="#059669" strokeWidth={2} />
          ) : isViaCC ? (
            <CreditCard size={22} color="#3b82f6" strokeWidth={2} />
          ) : (
            <Circle size={22} color={Colors.border} strokeWidth={2} />
          )}
        </View>

        <View style={styles.cardMiddle}>
          <Text
            style={[styles.cardDesc, item.paidThisMonth && styles.cardDescPaid]}
            numberOfLines={1}
          >
            {item.description}
          </Text>

          <View style={styles.cardMeta}>
            {item.dayOfMonth && (
              <Text style={styles.cardMetaText}>Dia {item.dayOfMonth}</Text>
            )}
            {isInstallment && item.totalInstallments && (
              <Text style={styles.cardMetaText}>
                {item.installmentsPaid}/{item.totalInstallments} parcelas
              </Text>
            )}
            {item.category && <CategoryBadge category={item.category} size="sm" />}
            {isViaCC && (
              <View style={styles.ccBadgeBlue}>
                <CreditCard size={10} color="#3b82f6" />
                <Text style={styles.ccBadgeBlueText}>Via CC</Text>
              </View>
            )}
          </View>
        </View>

        <Text style={[styles.cardAmount, isViaCC && { color: '#3b82f6' }]}>
          {symbol} {item.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </Text>
      </View>

      {/* Progresso de parcelas */}
      {isInstallment && item.totalInstallments && (
        <View style={styles.installmentBar}>
          <ProgressBar
            percent={installmentPct}
            color={catColors?.dot ?? Colors.primary}
            height={4}
          />
        </View>
      )}

      {/* Accordion de acções */}
      {expanded && (
        <View style={styles.accordion}>
          <View style={styles.accordionDivider} />
          <View style={styles.accordionActions}>
            {canPay && (
              <>
                <TouchableOpacity style={styles.accordionBtn} onPress={onPay}>
                  <CheckCircle2 size={14} color="#059669" strokeWidth={2} />
                  <Text style={[styles.accordionBtnText, { color: '#059669' }]}>Pagar</Text>
                </TouchableOpacity>
                <View style={styles.accordionSep} />
              </>
            )}
            <TouchableOpacity style={styles.accordionBtn} onPress={onEdit}>
              <Edit3 size={14} color={Colors.primary} strokeWidth={2} />
              <Text style={[styles.accordionBtnText, { color: Colors.primary }]}>Editar</Text>
            </TouchableOpacity>
            <View style={styles.accordionSep} />
            <TouchableOpacity style={styles.accordionBtn} onPress={onDelete}>
              <Trash2 size={14} color={Colors.error} strokeWidth={2} />
              <Text style={[styles.accordionBtnText, { color: Colors.error }]}>Apagar</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function PlanningTab() {
  const { selectedHousehold } = useHousehold();
  const {
    planningItems,
    planningLoading,
    accounts,
    rates,
    activeMonth,
    addPlanningItem,
    patchPlanningItem,
    removePlanningItem,
    reloadPlanningItems,
    markDashboardDirty,
  } = useFinance();

  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<FinancePlanningItem | undefined>();
  const [payingItem, setPayingItem] = useState<FinancePlanningItem | undefined>();
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [selectedCurrency, setSelectedCurrency] = useState<string>(
    () => selectedHousehold?.defaultCurrency ?? 'BRL'
  );
  const { showToast } = useToast();

  useEffect(() => {
    if (selectedHousehold && planningItems.length === 0 && !planningLoading) {
      reloadPlanningItems();
    }
  }, []);

  // Reset ao trocar de household — usa a moeda da nova casa
  useEffect(() => {
    setSelectedCurrency(selectedHousehold?.defaultCurrency ?? 'BRL');
  }, [selectedHousehold?.id]);

  // Fallback: se a moeda seleccionada não existir nas taxas, volta à default da casa
  useEffect(() => {
    if (rates?.rates && !rates.rates[selectedCurrency]) {
      setSelectedCurrency(selectedHousehold?.defaultCurrency ?? 'BRL');
    }
  }, [rates]);

  async function handleDelete(item: FinancePlanningItem) {
    try {
      await PlanningService.deleteItem(item.id);
      removePlanningItem(item.id);
      markDashboardDirty();
    } catch (e: any) {
      showToast(e.message ?? 'Erro ao apagar item.', 'error');
    }
  }

  // CC accounts com fatura activa
  const ccAccounts = useMemo(
    () => accounts.filter((a) => a.type === 'cc' && a.isActive && (a.currentInvoice ?? 0) > 0),
    [accounts]
  );

  // Ordenação: não pagos primeiro (excluindo paidViaCC ao fundo), depois pagos
  const unpaid = planningItems.filter((i) => !i.paidThisMonth && !i.paidViaCC);
  const viaCC = planningItems.filter((i) => !i.paidThisMonth && i.paidViaCC);
  const paid = planningItems.filter((i) => i.paidThisMonth);
  const ordered = [...unpaid, ...viaCC, ...paid];

  if (planningLoading) return <PlanningSkeleton />;

  return (
    <View style={styles.container}>
      <FlatList
        data={ordered}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 100, gap: 8 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={() => (
          <>
            {(planningItems.length > 0 || ccAccounts.length > 0) && (
              <PlanningBanner
                planningItems={planningItems}
                rates={rates?.rates}
                selectedCurrency={selectedCurrency}
                onCurrencyChange={setSelectedCurrency}
              />
            )}

            {ccAccounts.length > 0 && (
              <CCInvoicesCard
                ccAccounts={ccAccounts}
                rates={rates?.rates}
                selectedCurrency={selectedCurrency}
                paidViaCCCount={planningItems.filter((i) => i.paidViaCC).length}
              />
            )}

            {unpaid.length > 0 && (
              <Text style={styles.sectionHeader}>A pagar ({unpaid.length})</Text>
            )}
          </>
        )}
        renderItem={({ item, index }) => {
          const isFirstViaCC = item.paidViaCC && !item.paidThisMonth &&
            (index === 0 || !ordered[index - 1]?.paidViaCC || ordered[index - 1]?.paidThisMonth);
          const isFirstPaid = item.paidThisMonth &&
            (index === 0 || !ordered[index - 1]?.paidThisMonth);

          return (
            <>
              {isFirstViaCC && (
                <Text style={[styles.sectionHeader, { marginTop: index > 0 ? 8 : 0 }]}>
                  Via cartão ({viaCC.length})
                </Text>
              )}
              {isFirstPaid && (
                <Text style={[styles.sectionHeader, { marginTop: index > 0 ? 8 : 0 }]}>
                  Pago este mês ({paid.length})
                </Text>
              )}
              <PlanningItemCard
                item={item}
                expanded={expandedItemId === item.id}
                onToggle={() => setExpandedItemId((prev) => (prev === item.id ? null : item.id))}
                onPay={() => {
                  setExpandedItemId(null);
                  setPayingItem(item);
                }}
                onEdit={() => {
                  setExpandedItemId(null);
                  setEditItem(item);
                  setShowForm(true);
                }}
                onDelete={() => {
                  setExpandedItemId(null);
                  handleDelete(item);
                }}
              />
            </>
          );
        }}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Repeat size={40} color={Colors.border} strokeWidth={1.5} />
            <Text style={styles.emptyText}>Nenhum item no planejamento.</Text>
            <Text style={styles.emptyHint}>Adicione despesas recorrentes para acompanhar.</Text>
          </View>
        )}
        ListFooterComponent={<View style={{ height: 24 }} />}
      />

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => {
          setEditItem(undefined);
          setShowForm(true);
        }}
      >
        <Plus size={24} color="#fff" strokeWidth={2.5} />
      </TouchableOpacity>

      {/* Form criar/editar */}
      <PlanningForm
        visible={showForm}
        item={editItem}
        onClose={() => setShowForm(false)}
        onSaved={(saved) => {
          if (editItem) patchPlanningItem(saved);
          else addPlanningItem(saved);
          setShowForm(false);
        }}
      />

      {/* Form de pagamento pré-preenchido */}
      {payingItem && (
        <TransactionForm
          visible={!!payingItem}
          prefill={{
            type: 'expense',
            description: payingItem.description,
            amount: payingItem.amount,
            category: payingItem.category,
            planningItemId: payingItem.id,
          }}
          onClose={() => setPayingItem(undefined)}
          onSaved={() => setPayingItem(undefined)}
        />
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  // Banner
  summaryCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 12,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 10,
  },
  summaryTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  currencyRow: {
    flexDirection: 'row',
    gap: 5,
  },
  currChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  currChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  currChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  currChipTextActive: {
    color: '#fff',
  },
  ratesWarning: {
    fontSize: 11,
    color: Colors.warning ?? '#d97706',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  summaryValuesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  summaryLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '500',
    marginBottom: 2,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  summaryPct: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 4,
    textAlign: 'right',
  },

  ccSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  ccSectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  ccRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
  },
  ccRowName: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  ccRowAmount: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  ccHint: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 4,
  },

  // Secções da lista
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },

  // Card de item
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardPaid: {
    opacity: 0.65,
  },
  cardViaCC: {
    borderColor: '#93c5fd',
    backgroundColor: '#eff6ff',
  },
  cardExpanded: {
    borderColor: Colors.primary,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cardMiddle: {
    flex: 1,
    gap: 4,
  },
  cardDesc: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  cardDescPaid: {
    textDecorationLine: 'line-through',
    color: Colors.textSecondary,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  cardMetaText: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  cardAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  ccBadgeBlue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: '#dbeafe',
  },
  ccBadgeBlueText: {
    fontSize: 10,
    color: '#3b82f6',
    fontWeight: '700',
  },
  installmentBar: {
    marginTop: 8,
  },
  accordion: {
    paddingTop: 4,
  },
  accordionDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginTop: 10,
    marginBottom: 8,
  },
  accordionActions: {
    flexDirection: 'row',
  },
  accordionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
    borderRadius: 8,
  },
  accordionBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  accordionSep: {
    width: 1,
    backgroundColor: Colors.border,
    marginHorizontal: 4,
  },

  // Empty
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 8,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  emptyHint: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
  },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 6,
  },
});

export default PlanningTab;
