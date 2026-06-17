import { api } from './api';
import type { ApiResponse } from '../types/api-response';
import type { PagedResponse } from '../types/paged-response';
import type {
  FinanceAccount,
  FinanceTransaction,
  FinanceBudget,
  FinanceRates,
  FinanceDashboard,
  CreateAccountRequest,
  UpdateAccountRequest,
  CreateTransactionRequest,
  UpdateTransactionRequest,
  UpsertBudgetRequest,
  UpsertRatesRequest,
  ImportResult,
} from '../types/finance';

export interface GetTransactionsParams {
  householdId: string;
  month?: string;
  accountId?: string;
  type?: string;
  category?: string;
  page?: number;
  pageSize?: number;
}

export const FinanceService = {
  // ── Accounts ──────────────────────────────────────────────────────────────

  getAccounts: (householdId: string, month?: string, includeInactive = false) => {
    const qs = new URLSearchParams({ householdId });
    if (month) qs.set('month', month);
    if (includeInactive) qs.set('includeInactive', 'true');
    return api
      .get<ApiResponse<FinanceAccount[]>>(`/finance/accounts?${qs}`)
      .then((r) => r.data);
  },

  createAccount: (request: CreateAccountRequest) =>
    api
      .post<ApiResponse<FinanceAccount>>('/finance/accounts', request)
      .then((r) => r.data),

  updateAccount: (id: string, request: UpdateAccountRequest) =>
    api
      .put<ApiResponse<FinanceAccount>>(`/finance/accounts/${id}`, request)
      .then((r) => r.data),

  deleteAccount: (id: string) =>
    api
      .delete<ApiResponse<boolean>>(`/finance/accounts/${id}`)
      .then((r) => r.data),

  recalculateAccount: (id: string) =>
    api
      .post<ApiResponse<FinanceAccount>>(`/finance/accounts/${id}/recalculate`, {})
      .then((r) => r.data),

  // ── Transactions ──────────────────────────────────────────────────────────

  getTransactions: (params: GetTransactionsParams) => {
    const qs = new URLSearchParams({ householdId: params.householdId });
    if (params.month) qs.set('month', params.month);
    if (params.accountId) qs.set('accountId', params.accountId);
    if (params.type) qs.set('type', params.type);
    if (params.category) qs.set('category', params.category);
    qs.set('page', String(params.page ?? 1));
    qs.set('pageSize', String(params.pageSize ?? 50));
    return api
      .get<ApiResponse<PagedResponse<FinanceTransaction>>>(`/finance/transactions?${qs}`)
      .then((r) => r.data);
  },

  createTransaction: (request: CreateTransactionRequest) =>
    api
      .post<ApiResponse<FinanceTransaction>>('/finance/transactions', request)
      .then((r) => r.data),

  updateTransaction: (id: string, request: UpdateTransactionRequest) =>
    api
      .put<ApiResponse<FinanceTransaction>>(`/finance/transactions/${id}`, request)
      .then((r) => r.data),

  deleteTransaction: (id: string) =>
    api
      .delete<ApiResponse<boolean>>(`/finance/transactions/${id}`)
      .then((r) => r.data),

  importTransactions: (householdId: string, transactions: CreateTransactionRequest[]) =>
    api
      .post<ApiResponse<ImportResult>>('/finance/transactions/import', { householdId, transactions })
      .then((r) => r.data),

  // ── Budget ────────────────────────────────────────────────────────────────

  getBudget: (householdId: string) =>
    api
      .get<ApiResponse<FinanceBudget>>(`/finance/budget?householdId=${householdId}`)
      .then((r) => r.data),

  upsertBudget: (request: UpsertBudgetRequest) =>
    api
      .put<ApiResponse<FinanceBudget>>('/finance/budget', request)
      .then((r) => r.data),

  // ── Rates ─────────────────────────────────────────────────────────────────

  getRates: (householdId: string) =>
    api
      .get<ApiResponse<FinanceRates>>(`/finance/rates?householdId=${householdId}`)
      .then((r) => r.data),

  upsertRates: (request: UpsertRatesRequest) =>
    api
      .put<ApiResponse<FinanceRates>>('/finance/rates', request)
      .then((r) => r.data),

  // ── Dashboard ─────────────────────────────────────────────────────────────

  getDashboard: (householdId: string, month: string) =>
    api
      .get<ApiResponse<FinanceDashboard>>(
        `/finance/dashboard?householdId=${householdId}&month=${month}`
      )
      .then((r) => r.data),
};
