import { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Plus, Edit3, Trash2 } from 'lucide-react-native';
import { FinanceService } from '../../../services/finance.service';
import { useFinance } from '../../../contexts/FinanceContext';
import { useHousehold } from '../../../contexts/HouseholdContext';
import { CategoryBadge } from '../../../components/finance/CategoryBadge';
import { AmountText } from '../../../components/finance/AmountText';
import { Colors } from '../../../constants/colors';
import { FINANCE_CATEGORIES, CATEGORY_LABELS } from '../../../constants/finance-constants';
import type { FinanceTransaction, TransactionType, FinanceCategory } from '../../../types/finance';
import { TransactionForm } from './transaction-form';

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function TransactionSkeleton() {
  return (
    <View style={styles.skeletonContainer}>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <View key={i} style={styles.skeletonRow}>
          <View style={styles.skeletonBar} />
          <View style={styles.skeletonBody}>
            <View style={styles.skeletonTop}>
              <View style={[styles.skeletonBox, { width: '55%', height: 13 }]} />
              <View style={[styles.skeletonBox, { width: 72, height: 13 }]} />
            </View>
            <View style={[styles.skeletonBox, { width: '28%', height: 11, marginTop: 6 }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

// ─── Row com accordion de acções ──────────────────────────────────────────────

function TransactionRow({
  tx,
  expanded,
  onToggle,
  onEdit,
  onDelete,
  toAccountCurrency,
}: {
  tx: FinanceTransaction;
  expanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  toAccountCurrency?: string;
}) {
  const [, month, day] = tx.date.split('-');
  const dateLabel = `${day}/${month}`;
  const barColor =
    tx.type === 'income' ? '#059669' : tx.type === 'expense' ? Colors.error : Colors.primary;

  return (
    <TouchableOpacity
      style={[styles.txRow, expanded && styles.txRowExpanded]}
      onLongPress={onToggle}
      onPress={expanded ? onToggle : undefined}
      delayLongPress={350}
      activeOpacity={0.75}
    >
      <View style={[styles.typeBar, { backgroundColor: barColor }]} />

      <View style={{ flex: 1 }}>
        <View style={styles.txBody}>
          <View style={styles.txTop}>
            <Text style={styles.txDesc} numberOfLines={1}>{tx.description}</Text>
            <AmountText amount={tx.amount} currency={tx.currency} type={tx.type} size="sm" />
          </View>
          <View style={styles.txBottom}>
            <Text style={styles.txDate}>{dateLabel}</Text>
            {tx.accountName && <Text style={styles.txAccount}> · {tx.accountName}</Text>}
            {tx.category && <CategoryBadge category={tx.category} size="sm" />}
          </View>
          {tx.type === 'transfer' && tx.toAccountName && (
            <View style={styles.txBottom}>
              <Text style={styles.txTransfer}>→ {tx.toAccountName}</Text>
              {tx.toAmount != null && (
                <Text style={styles.txAccount}>
                  {' '}·{' '}
                  {tx.toAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  {toAccountCurrency ? ` ${toAccountCurrency}` : ''}
                </Text>
              )}
            </View>
          )}
        </View>

        {expanded && (
          <View style={styles.accordion}>
            <View style={styles.accordionDivider} />
            <View style={styles.accordionActions}>
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
      </View>
    </TouchableOpacity>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

const TYPE_FILTER_OPTS: { value: TransactionType | ''; label: string }[] = [
  { value: '', label: 'Todos' },
  { value: 'expense', label: 'Despesas' },
  { value: 'income', label: 'Receitas' },
  { value: 'transfer', label: 'Transferências' },
];

export function TransactionsTab() {
  const { selectedHousehold } = useHousehold();
  const {
    accounts,
    activeMonth,
    markAccountsDirty,
    markDashboardDirty,
  } = useFinance();

  // Fonte de verdade: todos os itens do mês, sem filtro
  const [allItems, setAllItems] = useState<FinanceTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const fetchingRef = useRef(false);

  // Filtros locais — aplicados em memória, zero latência
  const [filterType, setFilterType] = useState<TransactionType | ''>('');
  const [filterCategory, setFilterCategory] = useState<FinanceCategory | ''>('');

  const [showForm, setShowForm] = useState(false);
  const [editTx, setEditTx] = useState<FinanceTransaction | undefined>();
  const [expandedTxId, setExpandedTxId] = useState<string | null>(null);

  // Carrega TODOS os itens do mês de uma vez (sem filtros no servidor)
  async function loadAll() {
    if (!selectedHousehold) return;
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setLoading(true);
    try {
      let page = 1;
      let collected: FinanceTransaction[] = [];
      while (true) {
        const data = await FinanceService.getTransactions({
          householdId: selectedHousehold.id,
          month: activeMonth,
          page,
          pageSize: 200,
        });
        collected = [...collected, ...data.items];
        if (!data.hasMore) break;
        page++;
      }
      setAllItems(collected);
    } catch (e: any) {
      Alert.alert('Erro', e.message ?? 'Erro ao carregar transações.');
    } finally {
      fetchingRef.current = false;
      setLoading(false);
    }
  }

  // Recarrega quando muda o mês ou o household
  useEffect(() => {
    setAllItems([]);
    setExpandedTxId(null);
    loadAll();
  }, [activeMonth, selectedHousehold?.id]);

  // Filtro em memória — instantâneo
  const displayItems = useMemo(() => {
    let items = allItems;
    if (filterType) items = items.filter((t) => t.type === filterType);
    if (filterCategory) items = items.filter((t) => t.category === filterCategory);
    return items;
  }, [allItems, filterType, filterCategory]);

  async function handleDelete(tx: FinanceTransaction) {
    setExpandedTxId(null);
    Alert.alert('Apagar transação', `Apagar "${tx.description}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Apagar',
        style: 'destructive',
        onPress: async () => {
          try {
            await FinanceService.deleteTransaction(tx.id);
            setAllItems((prev) => prev.filter((t) => t.id !== tx.id));
            markAccountsDirty();
            markDashboardDirty();
          } catch (e: any) {
            Alert.alert('Erro', e.message ?? 'Erro ao apagar transação.');
          }
        },
      },
    ]);
  }

  if (loading && allItems.length === 0) {
    return (
      <View style={styles.container}>
        <FilterBar
          filterType={filterType}
          filterCategory={filterCategory}
          onTypeChange={setFilterType}
          onCategoryChange={setFilterCategory}
        />
        <TransactionSkeleton />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FilterBar
        filterType={filterType}
        filterCategory={filterCategory}
        onTypeChange={(t) => {
          setFilterType(t);
          if (t !== 'expense') setFilterCategory('');
          setExpandedTxId(null);
        }}
        onCategoryChange={(c) => {
          setFilterCategory(c);
          setExpandedTxId(null);
        }}
      />

      <FlatList
        data={displayItems}
        keyExtractor={(tx) => tx.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 100, gap: 2 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {filterType || filterCategory
                ? 'Nenhuma transação com estes filtros.'
                : 'Nenhuma transação neste mês.'}
            </Text>
            {!filterType && !filterCategory && (
              <Text style={styles.emptyHint}>Toca no + para adicionar.</Text>
            )}
          </View>
        )}
        renderItem={({ item: tx }) => (
          <TransactionRow
            tx={tx}
            expanded={expandedTxId === tx.id}
            onToggle={() => setExpandedTxId((prev) => (prev === tx.id ? null : tx.id))}
            onEdit={() => {
              setExpandedTxId(null);
              setEditTx(tx);
              setShowForm(true);
            }}
            onDelete={() => handleDelete(tx)}
            toAccountCurrency={
              tx.toAccountId
                ? accounts.find((a) => a.id === tx.toAccountId)?.currency
                : undefined
            }
          />
        )}
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => {
          setEditTx(undefined);
          setShowForm(true);
        }}
      >
        <Plus size={24} color="#fff" strokeWidth={2.5} />
      </TouchableOpacity>

      <TransactionForm
        visible={showForm}
        transaction={editTx}
        onClose={() => setShowForm(false)}
        onSaved={(saved) => {
          if (editTx) {
            setAllItems((prev) => prev.map((t) => (t.id === saved.id ? saved : t)));
          } else {
            setAllItems((prev) => [saved, ...prev]);
          }
          setShowForm(false);
        }}
        onDeleted={(id) => {
          setAllItems((prev) => prev.filter((t) => t.id !== id));
          setShowForm(false);
        }}
      />
    </View>
  );
}

// ─── Barra de filtros extraída para evitar re-render da lista ─────────────────

function FilterBar({
  filterType,
  filterCategory,
  onTypeChange,
  onCategoryChange,
}: {
  filterType: TransactionType | '';
  filterCategory: FinanceCategory | '';
  onTypeChange: (v: TransactionType | '') => void;
  onCategoryChange: (v: FinanceCategory | '') => void;
}) {
  return (
    <View style={styles.filterBar}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterContent}
      >
        {TYPE_FILTER_OPTS.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[styles.filterChip, filterType === opt.value && styles.filterChipActive]}
            onPress={() => onTypeChange(opt.value as TransactionType | '')}
          >
            <Text style={[styles.filterChipText, filterType === opt.value && styles.filterChipTextActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}

        {filterType === 'expense' && (
          <>
            <View style={styles.filterDivider} />
            {FINANCE_CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[styles.filterChip, filterCategory === cat && styles.filterChipActive]}
                onPress={() => onCategoryChange(filterCategory === cat ? '' : cat)}
              >
                <Text style={[styles.filterChipText, filterCategory === cat && styles.filterChipTextActive]}>
                  {CATEGORY_LABELS[cat]}
                </Text>
              </TouchableOpacity>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  // Skeleton
  skeletonContainer: {
    padding: 16,
    gap: 8,
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: Colors.surface,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 6,
  },
  skeletonBar: {
    width: 4,
    backgroundColor: Colors.border,
    alignSelf: 'stretch',
  },
  skeletonBody: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  skeletonTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skeletonBox: {
    borderRadius: 6,
    backgroundColor: Colors.border,
  },
  // Filtros
  filterBar: {
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  filterContent: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
    flexShrink: 0,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  filterChipTextActive: {
    color: '#fff',
  },
  filterDivider: {
    width: 1,
    height: 20,
    backgroundColor: Colors.border,
    marginHorizontal: 4,
  },
  // Rows
  txRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: Colors.surface,
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  txRowExpanded: {
    borderColor: Colors.primary,
  },
  typeBar: {
    width: 4,
    alignSelf: 'stretch',
  },
  txBody: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },
  txTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  txDesc: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  txBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  txDate: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  txAccount: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  txTransfer: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: '600',
  },
  // Accordion
  accordion: {
    paddingHorizontal: 12,
    paddingBottom: 10,
  },
  accordionDivider: {
    height: 1,
    backgroundColor: Colors.border,
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
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 4,
    textAlign: 'center',
  },
  emptyHint: {
    fontSize: 13,
    color: Colors.textSecondary,
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

export default TransactionsTab;
