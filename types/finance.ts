export type TransactionType = 'income' | 'expense' | 'transfer';
export type FinanceCategory = 'lf' | 'cf' | 'co' | 'mt' | 'pr' | 'es';
export type AccountType = 'account' | 'cc';
export type PlanningItemType = 'fixed' | 'installment';

export interface FinanceAccount {
  id: string;
  householdId: string;
  ownerId?: string;
  name: string;
  currency: string;
  type: AccountType;
  closeDay?: number;
  closeMonthIsNext: boolean;
  dueDay?: number;
  limit?: number;
  balance: number;
  currentInvoice?: number; // CC only — soma de despesas no mês consultado
  isActive: boolean;
  createdAt: string;
}

export interface FinanceTransaction {
  id: string;
  householdId: string;
  createdBy?: string;
  accountId?: string;
  accountName?: string;
  toAccountId?: string;
  toAccountName?: string;
  toAmount?: number;
  description: string;
  amount: number;
  currency: string;
  date: string;       // YYYY-MM-DD
  refMonth: string;   // YYYY-MM
  type: TransactionType;
  category?: FinanceCategory;
  appliedRate?: number;
  createdAt: string;
  planningItemId?: string;
}

export interface FinanceBudget {
  id: string;
  householdId: string;
  income: number;
  incomeCurrency: string;
  goals: Record<FinanceCategory, number>; // 0-100 (percentagens)
  updatedAt: string;
}

export interface FinancePlanningItem {
  id: string;
  householdId: string;
  description: string;
  amount: number;
  currency: string;
  category?: FinanceCategory;
  type: PlanningItemType;
  dayOfMonth?: number;
  totalInstallments?: number;
  installmentsPaid: number;
  isActive: boolean;
  createdAt: string;
  paidThisMonth: boolean;
  paidTransactionId?: string;
  paidViaCC: boolean;
}

export interface FinanceRates {
  id: string;
  householdId: string;
  rates: Record<string, number>; // { BRL: 1, EUR: 6.0, USD: 5.5, PYG: 0.0007 }
  updatedAt: string;
}

// Dashboard
export interface CategoryBreakdown {
  category: FinanceCategory;
  total: number;
  budget: number;
  usedPercent: number;
}

export interface AccountInvoice {
  accountId: string;
  accountName: string;
  currency: string;
  invoiceTotal: number;
  limit?: number;
  usedPercent: number;
  isOverLimit: boolean;
}

export interface MonthlyHistoryPoint {
  month: string; // YYYY-MM
  income: number;
  expenses: number;
}

export interface FinanceDashboard {
  month: string;
  baseCurrency: string;
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  byCategory: CategoryBreakdown[];
  invoices: AccountInvoice[];
  history: MonthlyHistoryPoint[];
}

// Requests
export interface CreateAccountRequest {
  householdId: string;
  name: string;
  currency: string;
  type: AccountType;
  closeDay?: number;
  closeMonthIsNext: boolean;
  dueDay?: number;
  limit?: number;
  balance?: number;
}

export interface UpdateAccountRequest {
  name?: string;
  currency?: string;
  type?: AccountType;
  closeDay?: number;
  closeMonthIsNext?: boolean;
  dueDay?: number;
  limit?: number;
  balance?: number;
  isActive?: boolean;
}

export interface CreateTransactionRequest {
  householdId: string;
  accountId?: string;
  description: string;
  amount: number;
  currency: string;
  date: string;       // YYYY-MM-DD
  type: TransactionType;
  category?: FinanceCategory;
  refMonth?: string;  // se omitido, backend calcula
  toAccountId?: string;
  toAmount?: number;
  planningItemId?: string;
}

export interface UpdateTransactionRequest {
  accountId?: string;
  description?: string;
  amount?: number;
  currency?: string;
  date?: string;
  type?: TransactionType;
  category?: FinanceCategory;
  refMonth?: string;
  toAccountId?: string;
  toAmount?: number;
  planningItemId?: string;
  clearPlanningItemId?: boolean;
}

export interface UpsertBudgetRequest {
  householdId: string;
  goals: Record<string, number>;
}

export interface UpsertRatesRequest {
  householdId: string;
  rates: Record<string, number>;
}

export interface CreatePlanningItemRequest {
  householdId: string;
  description: string;
  amount: number;
  currency: string;
  category?: FinanceCategory;
  type: PlanningItemType;
  dayOfMonth?: number;
  totalInstallments?: number;
  installmentsPaid?: number;
}

export interface UpdatePlanningItemRequest {
  description: string;
  amount: number;
  currency: string;
  category?: FinanceCategory;
  type: PlanningItemType;
  dayOfMonth?: number;
  totalInstallments?: number;
  installmentsPaid: number;
  isActive: boolean;
}

export interface ImportResult {
  imported: number;
  skipped: number;
}
