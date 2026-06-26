import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useHousehold } from './HouseholdContext';
import { FinanceService } from '../services/finance.service';
import { PlanningService } from '../services/planning.service';
import type {
  FinanceAccount,
  FinanceTransaction,
  FinanceBudget,
  FinancePlanningItem,
  FinanceRates,
  FinanceDashboard,
  CreateTransactionRequest,
  UpdateTransactionRequest,
} from '../types/finance';

// ─── Types ────────────────────────────────────────────────────────────────────

interface FinanceContextValue {
  // Estado partilhado
  accounts: FinanceAccount[];
  planningItems: FinancePlanningItem[];
  budget: FinanceBudget | null;
  rates: FinanceRates | null;
  dashboard: FinanceDashboard | null;

  // Flags de loading
  accountsLoading: boolean;
  planningLoading: boolean;
  dashboardLoading: boolean;

  // Mês activo
  activeMonth: string;
  setActiveMonth: (month: string) => void;

  // Inicialização / dirty / TTL
  init: (month: string) => Promise<void>;
  markAccountsDirty: () => void;
  markDashboardDirty: () => void;
  markPlanningDirty: () => void;
  refreshIfDirty: () => Promise<void>;
  reloadAccounts: () => Promise<void>;
  reloadPlanningItems: () => Promise<void>;
  reloadDashboard: () => Promise<void>;
  reloadBudgetAndRates: () => Promise<void>;

  // Optimistic helpers — planning
  addPlanningItem: (item: FinancePlanningItem) => void;
  patchPlanningItem: (item: FinancePlanningItem) => void;
  removePlanningItem: (id: string) => void;

  // Optimistic helpers — contas
  patchAccount: (account: FinanceAccount) => void;
  removeAccount: (id: string) => void;
  addAccount: (account: FinanceAccount) => void;

  // Mutations — transações (cascade automático)
  createTransaction: (payload: CreateTransactionRequest) => Promise<FinanceTransaction>;
  updateTransaction: (id: string, payload: UpdateTransactionRequest) => Promise<FinanceTransaction>;
  deleteTransaction: (tx: FinanceTransaction) => Promise<void>;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const FinanceContext = createContext<FinanceContextValue | null>(null);

export function useFinance(): FinanceContextValue {
  const ctx = useContext(FinanceContext);
  if (!ctx) throw new Error('useFinance must be used within FinanceProvider');
  return ctx;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

const STALE_MS = 5 * 60 * 1000; // 5 min

function currentMonthStr(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function FinanceProvider({ children }: { children: React.ReactNode }) {
  const { selectedHousehold } = useHousehold();

  // Estado
  const [accounts, setAccounts] = useState<FinanceAccount[]>([]);
  const [planningItems, setPlanningItems] = useState<FinancePlanningItem[]>([]);
  const [budget, setBudget] = useState<FinanceBudget | null>(null);
  const [rates, setRates] = useState<FinanceRates | null>(null);
  const [dashboard, setDashboard] = useState<FinanceDashboard | null>(null);
  const [activeMonth, setActiveMonth] = useState(currentMonthStr());

  // Loading flags
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [planningLoading, setPlanningLoading] = useState(false);
  const [dashboardLoading, setDashboardLoading] = useState(false);

  // Cache / dirty refs
  const cachedHouseholdId = useRef('');
  const cachedMonth = useRef('');
  const accountsDirty = useRef(false);
  const dashboardDirty = useRef(false);
  const planningDirty = useRef(false);
  const lastInitAt = useRef<number>(0);

  // ── Loaders privados ────────────────────────────────────────────────────────

  const loadAccounts = useCallback(async (householdId: string, month: string) => {
    setAccountsLoading(true);
    try {
      const data = await FinanceService.getAccounts(householdId, month, true);
      setAccounts(data);
    } catch {
      // mantém valor anterior em erro
    } finally {
      setAccountsLoading(false);
    }
  }, []);

  const loadPlanningItems = useCallback(async (householdId: string, month: string) => {
    setPlanningLoading(true);
    try {
      const data = await PlanningService.getItems(householdId, month);
      setPlanningItems(data);
    } catch {
      // mantém valor anterior em erro
    } finally {
      setPlanningLoading(false);
    }
  }, []);

  const loadBudgetAndRates = useCallback(async (householdId: string) => {
    try {
      const [b, r] = await Promise.all([
        FinanceService.getBudget(householdId),
        FinanceService.getRates(householdId),
      ]);
      setBudget(b);
      setRates(r);
    } catch {
      // mantém valor anterior em erro
    }
  }, []);

  const loadDashboard = useCallback(async (householdId: string, month: string) => {
    setDashboardLoading(true);
    try {
      const data = await FinanceService.getDashboard(householdId, month);
      setDashboard(data);
    } catch {
      // mantém valor anterior em erro
    } finally {
      setDashboardLoading(false);
    }
  }, []);

  // ── API pública ─────────────────────────────────────────────────────────────

  const init = useCallback(async (month: string) => {
    const householdId = selectedHousehold?.id;
    if (!householdId) return;

    const householdChanged = householdId !== cachedHouseholdId.current;
    const monthChanged = month !== cachedMonth.current;
    cachedHouseholdId.current = householdId;
    cachedMonth.current = month;

    if (householdChanged) {
      await Promise.all([
        loadAccounts(householdId, month),
        loadPlanningItems(householdId, month),
        loadBudgetAndRates(householdId),
        loadDashboard(householdId, month),
      ]);
    } else if (monthChanged) {
      // Budget/rates não dependem do mês — skip
      await Promise.all([
        loadAccounts(householdId, month),
        loadPlanningItems(householdId, month),
        loadDashboard(householdId, month),
      ]);
    }
    // household + mês iguais → dados em cache ainda válidos

    lastInitAt.current = Date.now();
  }, [selectedHousehold?.id, loadAccounts, loadPlanningItems, loadBudgetAndRates, loadDashboard]);

  const markAccountsDirty = useCallback(() => { accountsDirty.current = true; }, []);
  const markDashboardDirty = useCallback(() => { dashboardDirty.current = true; }, []);
  const markPlanningDirty = useCallback(() => { planningDirty.current = true; }, []);

  const refreshIfDirty = useCallback(async () => {
    const householdId = cachedHouseholdId.current;
    const month = cachedMonth.current;
    if (!householdId) return;

    // TTL: reload tudo se os dados estão stale (> 5 min)
    const now = Date.now();
    const isStale = lastInitAt.current > 0 && (now - lastInitAt.current) > STALE_MS;
    if (isStale) {
      lastInitAt.current = now;
      accountsDirty.current = false;
      dashboardDirty.current = false;
      planningDirty.current = false;
      await Promise.all([
        loadAccounts(householdId, month),
        loadPlanningItems(householdId, month),
        loadDashboard(householdId, month),
      ]);
      return;
    }

    // Reload apenas os slices dirty
    const tasks: Promise<void>[] = [];
    if (accountsDirty.current) {
      accountsDirty.current = false;
      tasks.push(loadAccounts(householdId, month));
    }
    if (dashboardDirty.current) {
      dashboardDirty.current = false;
      tasks.push(loadDashboard(householdId, month));
    }
    if (planningDirty.current) {
      planningDirty.current = false;
      tasks.push(loadPlanningItems(householdId, month));
    }
    if (tasks.length > 0) await Promise.all(tasks);
  }, [loadAccounts, loadDashboard, loadPlanningItems]);

  const reloadAccounts = useCallback(async () => {
    const householdId = cachedHouseholdId.current;
    if (!householdId) return;
    accountsDirty.current = false;
    await loadAccounts(householdId, cachedMonth.current);
  }, [loadAccounts]);

  const reloadPlanningItems = useCallback(async () => {
    const householdId = cachedHouseholdId.current;
    if (!householdId) return;
    planningDirty.current = false;
    await loadPlanningItems(householdId, cachedMonth.current);
  }, [loadPlanningItems]);

  const reloadDashboard = useCallback(async () => {
    const householdId = cachedHouseholdId.current;
    if (!householdId) return;
    dashboardDirty.current = false;
    await loadDashboard(householdId, cachedMonth.current);
  }, [loadDashboard]);

  const reloadBudgetAndRates = useCallback(async () => {
    const householdId = cachedHouseholdId.current;
    if (!householdId) return;
    await loadBudgetAndRates(householdId);
  }, [loadBudgetAndRates]);

  // ── Optimistic — planning ───────────────────────────────────────────────────

  const addPlanningItem = useCallback((item: FinancePlanningItem) => {
    setPlanningItems((list) => [item, ...list]);
  }, []);

  // Preserva paidThisMonth computado pelo servidor (edit response devolve false)
  const patchPlanningItem = useCallback((item: FinancePlanningItem) => {
    setPlanningItems((list) =>
      list.map((p) => {
        if (p.id !== item.id) return p;
        return {
          ...item,
          paidThisMonth: p.paidThisMonth,
          paidTransactionId: p.paidTransactionId,
          paidViaCC: p.paidViaCC,
        };
      })
    );
  }, []);

  const removePlanningItem = useCallback((id: string) => {
    setPlanningItems((list) => list.filter((p) => p.id !== id));
  }, []);

  // ── Optimistic — contas ─────────────────────────────────────────────────────

  const addAccount = useCallback((account: FinanceAccount) => {
    setAccounts((list) => [...list, account]);
  }, []);

  const patchAccount = useCallback((account: FinanceAccount) => {
    setAccounts((list) => list.map((a) => (a.id === account.id ? account : a)));
  }, []);

  const removeAccount = useCallback((id: string) => {
    setAccounts((list) => list.filter((a) => a.id !== id));
  }, []);

  // ── Mutations — transações ──────────────────────────────────────────────────

  const createTransaction = useCallback(async (payload: CreateTransactionRequest): Promise<FinanceTransaction> => {
    const tx = await FinanceService.createTransaction(payload);
    markAccountsDirty();
    markDashboardDirty();
    if (payload.planningItemId) {
      setPlanningItems((list) =>
        list.map((p) =>
          p.id === payload.planningItemId
            ? { ...p, paidThisMonth: true, paidTransactionId: tx.id }
            : p
        )
      );
      markPlanningDirty();
    }
    return tx;
  }, [markAccountsDirty, markDashboardDirty, markPlanningDirty]);

  const updateTransaction = useCallback(async (id: string, payload: UpdateTransactionRequest): Promise<FinanceTransaction> => {
    const tx = await FinanceService.updateTransaction(id, payload);
    markAccountsDirty();
    markDashboardDirty();
    if (payload.planningItemId || payload.clearPlanningItemId) {
      markPlanningDirty();
    }
    return tx;
  }, [markAccountsDirty, markDashboardDirty, markPlanningDirty]);

  const deleteTransaction = useCallback(async (tx: FinanceTransaction): Promise<void> => {
    await FinanceService.deleteTransaction(tx.id);
    markAccountsDirty();
    markDashboardDirty();
    if (tx.planningItemId) {
      setPlanningItems((list) =>
        list.map((p) =>
          p.id === tx.planningItemId
            ? { ...p, paidThisMonth: false, paidTransactionId: undefined }
            : p
        )
      );
      markPlanningDirty();
    }
  }, [markAccountsDirty, markDashboardDirty, markPlanningDirty]);

  // ── Reset ao trocar household ───────────────────────────────────────────────

  useEffect(() => {
    cachedHouseholdId.current = '';
    cachedMonth.current = '';
    accountsDirty.current = false;
    dashboardDirty.current = false;
    planningDirty.current = false;
    lastInitAt.current = 0;
    setAccounts([]);
    setPlanningItems([]);
    setBudget(null);
    setRates(null);
    setDashboard(null);
  }, [selectedHousehold?.id]);

  return (
    <FinanceContext.Provider
      value={{
        accounts,
        planningItems,
        budget,
        rates,
        dashboard,
        accountsLoading,
        planningLoading,
        dashboardLoading,
        activeMonth,
        setActiveMonth,
        init,
        markAccountsDirty,
        markDashboardDirty,
        markPlanningDirty,
        refreshIfDirty,
        reloadAccounts,
        reloadPlanningItems,
        reloadDashboard,
        reloadBudgetAndRates,
        addPlanningItem,
        patchPlanningItem,
        removePlanningItem,
        addAccount,
        patchAccount,
        removeAccount,
        createTransaction,
        updateTransaction,
        deleteTransaction,
      }}
    >
      {children}
    </FinanceContext.Provider>
  );
}
