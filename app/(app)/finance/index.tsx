import { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useFinance } from '../../../contexts/FinanceContext';
import { useHousehold } from '../../../contexts/HouseholdContext';
import { MonthSelector } from '../../../components/finance/MonthSelector';
import { Colors } from '../../../constants/colors';
import { DashboardTab } from './dashboard-tab';
import { AccountsTab } from './accounts-tab';
import { TransactionsTab } from './transactions-tab';
import { BudgetTab } from './budget-tab';
import { PlanningTab } from './planning-tab';

// #1 — ordem: Painel, Transações, Planejamento, Contas, Orçamento
const TABS = ['Painel', 'Transações', 'Planejamento', 'Contas', 'Orçamento'] as const;
type Tab = (typeof TABS)[number];

export default function FinanceScreen() {
  const { selectedHousehold } = useHousehold();
  const finance = useFinance();
  const [activeTab, setActiveTab] = useState<Tab>('Painel');
  // Lazy mount: monta cada tab na primeira visita, depois fica vivo em memória
  const mountedTabs = useRef<Set<Tab>>(new Set<Tab>(['Painel']));
  const [, forceRender] = useState(0);

  function handleTabChange(tab: Tab) {
    if (!mountedTabs.current.has(tab)) {
      mountedTabs.current.add(tab);
      forceRender((n) => n + 1);
    }
    setActiveTab(tab);
  }

  useEffect(() => {
    if (selectedHousehold) {
      finance.init(finance.activeMonth);
    }
  }, [finance.activeMonth, selectedHousehold?.id]);

  useFocusEffect(
    useCallback(() => {
      finance.refreshIfDirty();
    }, [finance.refreshIfDirty])
  );

  if (!selectedHousehold) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Seleciona uma casa para ver as finanças.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Finanças</Text>
          <MonthSelector
            month={finance.activeMonth}
            onChange={(m) => finance.setActiveMonth(m)}
          />
        </View>

        {/* Pill tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsContainer}
        >
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => handleTabChange(tab)}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Conteúdo das tabs — lazy mount + keep-alive (display:none quando inactiva) */}
      <View style={styles.content}>
        {TABS.map((tab) => (
          <View
            key={tab}
            style={[styles.tabContent, activeTab !== tab && styles.tabContentHidden]}
          >
            {mountedTabs.current.has(tab) && (
              tab === 'Painel'       ? <DashboardTab />    :
              tab === 'Transações'   ? <TransactionsTab /> :
              tab === 'Planejamento' ? <PlanningTab />     :
              tab === 'Contas'       ? <AccountsTab />     :
              <BudgetTab />
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingTop: 12,
    paddingBottom: 0,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 10, // #2 — espaçamento entre pills e borda inferior
    gap: 4,
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: Colors.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: '#ffffff',
  },
  content: {
    flex: 1,
  },
  tabContent: {
    flex: 1,
  },
  tabContentHidden: {
    display: 'none',
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: Colors.background,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});
