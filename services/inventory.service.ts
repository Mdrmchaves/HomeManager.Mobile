import { api } from './api';
import { ApiResponse } from '../types/api-response';
import { InventoryItem, CreateItemRequest, UpdateItemRequest } from '../types/inventory-item';

export const InventoryService = {
  getItems: (householdId: string) =>
    api
      .get<ApiResponse<InventoryItem[]>>(`/inventory/items?householdId=${householdId}`)
      .then((r) => r.data),

  createItem: (request: CreateItemRequest) =>
    api
      .post<ApiResponse<InventoryItem>>('/inventory/items', request)
      .then((r) => r.data),

  updateItem: (id: string, request: UpdateItemRequest) =>
    api.put<void>(`/inventory/items/${id}`, request),

  deleteItem: (id: string) => api.delete<void>(`/inventory/items/${id}`),
};
