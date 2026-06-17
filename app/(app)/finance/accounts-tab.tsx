import { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Plus, CreditCard, Landmark, Edit3, Trash2, RefreshCw } from 'lucide-react-native';
import { FinanceService } from '../../../services/finance.service';
import { useFinance } from '../../../contexts/FinanceContext';
import { Colors } from '../../../constants/colors';
import { CURRENCY_SYMBOLS } from '../../../constants/finance-constants';
import type { FinanceAccount } from '../../../types/finance';
import type { SupportedCurrency } from '../../../constants/finance-constants';
import { AccountForm } from './account-form';

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function AccountSkeleton() {
  return (
    <View style={styles.container}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={[styles.accountCard, { marginBottom: 8 }]}>
          <View style={{ width: '50%', height: 14, borderRadius: 6, backgroundColor: Colors.border }} />
          <View style={{ height: 8 }} />
          <View style={{ width: '30%', height: 22, borderRadius: 6, backgroundColor: Colors.border }} />
        </View>
      ))}
    </View>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function AccountsTab() {
  const {
    accounts,
    accountsLoading,
    activeMonth,
    refreshIfDirty,
    patchAccount,
    removeAccount,
    addAccount,
    markDashboardDirty,
  } = useFinance();

  const [showForm, setShowForm] = useState(false);
  const [editAccount, setEditAccount] = useState<FinanceAccount | undefined>();
  const [recalculating, setRecalculating] = useState<string | null>(null);
  // #6 — accordion de opções por conta
  const [expandedAccountId, setExpandedAccountId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      refreshIfDirty();
    }, [refreshIfDirty])
  );

  async function handleRecalculate(account: FinanceAccount) {
    setExpandedAccountId(null);
    setRecalculating(account.id);
    try {
      const updated = await FinanceService.recalculateAccount(account.id);
      patchAccount(updated);
    } catch (e: any) {
      Alert.alert('Erro', e.message ?? 'Erro ao recalcular saldo.');
    } finally {
      setRecalculating(null);
    }
  }

  function handleDelete(account: FinanceAccount) {
    setExpandedAccountId(null);
    Alert.alert(
      'Apagar conta',
      `Deseja apagar "${account.name}"? As transações associadas não serão apagadas.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Apagar',
          style: 'destructive',
          onPress: async () => {
            try {
              await FinanceService.deleteAccount(account.id);
              removeAccount(account.id);
              markDashboardDirty();
            } catch (e: any) {
              Alert.alert('Erro', e.message ?? 'Erro ao apagar conta.');
            }
          },
        },
      ]
    );
  }

  if (accountsLoading) return <AccountSkeleton />;

  const inactiveAccounts = accounts.filter((a) => !a.isActive);

  return (
    <View style={styles.container}>
      <FlatList
        data={accounts.filter((a) => a.isActive)}
        keyExtractor={(a) => a.id}
        contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={() => (
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => {
              setEditAccount(undefined);
              setShowForm(true);
            }}
          >
            <Plus size={16} color={Colors.primary} strokeWidth={2.5} />
            <Text style={styles.addBtnText}>Adicionar conta</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Nenhuma conta activa.</Text>
            <Text style={styles.emptyHint}>Adicione uma conta para começar.</Text>
          </View>
        )}
        renderItem={({ item: account }) => {
          const symbol = CURRENCY_SYMBOLS[account.currency as SupportedCurrency] ?? account.currency;
          const isCC = account.type === 'cc';
          const isRecalc = recalculating === account.id;
          const isExpanded = expandedAccountId === account.id;

          return (
            <TouchableOpacity
              style={[styles.accountCard, isExpanded && styles.accountCardExpanded]}
              onLongPress={() => setExpandedAccountId((prev) => (prev === account.id ? null : account.id))}
              onPress={isExpanded ? () => setExpandedAccountId(null) : undefined}
              delayLongPress={350}
              activeOpacity={0.85}
            >
              {/* Topo do card */}
              <View style={styles.accountTop}>
                <View style={styles.accountIcon}>
                  {isCC
                    ? <CreditCard size={18} color={Colors.primary} />
                    : <Landmark size={18} color={Colors.primary} />
                  }
                </View>
                <View style={styles.accountInfo}>
                  <Text style={styles.accountName}>{account.name}</Text>
                  <Text style={styles.accountMeta}>
                    {isCC ? 'Cartão de Crédito' : 'Conta'} · {account.currency}
                  </Text>
                </View>
                {isRecalc && <ActivityIndicator size="small" color={Colors.textSecondary} />}
              </View>

              {/* Saldo ou fatura */}
              {isCC ? (
                <View style={styles.balanceRow}>
                  <View>
                    <Text style={styles.balanceLabel}>Fatura ({activeMonth})</Text>
                    <Text style={[styles.balanceValue, { color: Colors.error }]}>
                      {symbol} {(account.currentInvoice ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </Text>
                  </View>
                  {account.limit && (
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.balanceLabel}>Limite</Text>
                      <Text style={styles.balanceValue}>
                        {symbol} {account.limit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </Text>
                    </View>
                  )}
                </View>
              ) : (
                <View style={styles.balanceRow}>
                  <View>
                    <Text style={styles.balanceLabel}>Saldo</Text>
                    <Text style={[styles.balanceValue, { color: account.balance >= 0 ? '#059669' : Colors.error }]}>
                      {symbol} {account.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </Text>
                  </View>
                </View>
              )}

              {isCC && account.closeDay && (
                <Text style={styles.ccInfo}>
                  Fecha dia {account.closeDay}
                  {account.dueDay ? ` · Vence dia ${account.dueDay}` : ''}
                </Text>
              )}

              {/* Accordion de acções */}
              {isExpanded && (
                <View style={styles.accordion}>
                  <View style={styles.accordionDivider} />
                  <View style={styles.accordionActions}>
                    <TouchableOpacity
                      style={styles.accordionBtn}
                      onPress={() => {
                        setExpandedAccountId(null);
                        setEditAccount(account);
                        setShowForm(true);
                      }}
                    >
                      <Edit3 size={14} color={Colors.primary} strokeWidth={2} />
                      <Text style={[styles.accordionBtnText, { color: Colors.primary }]}>Editar</Text>
                    </TouchableOpacity>

                    <View style={styles.accordionSep} />

                    <TouchableOpacity
                      style={styles.accordionBtn}
                      onPress={() => handleRecalculate(account)}
                      disabled={isRecalc}
                    >
                      <RefreshCw size={14} color={Colors.textSecondary} strokeWidth={2} />
                      <Text style={[styles.accordionBtnText, { color: Colors.textSecondary }]}>Recalcular</Text>
                    </TouchableOpacity>

                    <View style={styles.accordionSep} />

                    <TouchableOpacity
                      style={styles.accordionBtn}
                      onPress={() => handleDelete(account)}
                    >
                      <Trash2 size={14} color={Colors.error} strokeWidth={2} />
                      <Text style={[styles.accordionBtnText, { color: Colors.error }]}>Apagar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </TouchableOpacity>
          );
        }}
        ListFooterComponent={
          inactiveAccounts.length > 0 ? (
            <Text style={styles.inactiveHint}>
              {inactiveAccounts.length} conta(s) inactiva(s) oculta(s).
            </Text>
          ) : null
        }
      />

      <AccountForm
        visible={showForm}
        account={editAccount}
        onClose={() => setShowForm(false)}
        onSaved={(saved) => {
          if (editAccount) {
            patchAccount(saved);
          } else {
            addAccount(saved);
          }
          setShowForm(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    marginBottom: 4,
  },
  addBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  accountCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  accountCardExpanded: {
    borderColor: Colors.primary,
  },
  accountTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  accountIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  accountMeta: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  balanceLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  balanceValue: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  ccInfo: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 6,
  },
  accordion: {
    marginTop: 10,
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
    gap: 5,
    paddingVertical: 6,
    borderRadius: 8,
  },
  accordionBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  accordionSep: {
    width: 1,
    backgroundColor: Colors.border,
    marginHorizontal: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  emptyHint: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  inactiveHint: {
    textAlign: 'center',
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 8,
  },
});

export default AccountsTab;
