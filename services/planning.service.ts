import { api } from './api';
import type { ApiResponse } from '../types/api-response';
import type {
  FinancePlanningItem,
  CreatePlanningItemRequest,
  UpdatePlanningItemRequest,
} from '../types/finance';

export const PlanningService = {
  getItems: (householdId: string, month?: string) => {
    const qs = new URLSearchParams({ householdId });
    if (month) qs.set('month', month);
    return api
      .get<ApiResponse<FinancePlanningItem[]>>(`/planning?${qs}`)
      .then((r) => r.data);
  },

  createItem: (request: CreatePlanningItemRequest) =>
    api
      .post<ApiResponse<FinancePlanningItem>>('/planning', request)
      .then((r) => r.data),

  updateItem: (id: string, request: UpdatePlanningItemRequest) =>
    api
      .put<ApiResponse<FinancePlanningItem>>(`/planning/${id}`, request)
      .then((r) => r.data),

  deleteItem: (id: string) =>
    api
      .delete<ApiResponse<boolean>>(`/planning/${id}`)
      .then((r) => r.data),
};
