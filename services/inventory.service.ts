import { api } from './api';
import type { ApiResponse } from '../types/api-response';
import type { InventoryItem, CreateItemRequest, UpdateItemRequest } from '../types/inventory-item';
import type { PagedResponse } from '../types/paged-response';
import type { LocationCount, DestinationCount } from '../types/inventory-counts';

export interface GetItemsParams {
  householdId: string;
  locationId?: string | 'null';
  destination?: string | 'null';
  status?: string;
  page?: number;
  pageSize?: number;
}

export interface SearchItemsParams {
  householdId: string;
  q: string;
  page?: number;
  pageSize?: number;
}

export const InventoryService = {

  // Lista paginada — filtra por locationId, destination, status ou combinação
  getItems: (params: GetItemsParams) => {
    const qs = new URLSearchParams();
    qs.set('householdId', params.householdId);
    if (params.locationId !== undefined) qs.set('locationId', params.locationId);
    if (params.destination !== undefined) qs.set('destination', params.destination);
    if (params.status !== undefined) qs.set('status', params.status);
    qs.set('page', String(params.page ?? 1));
    qs.set('pageSize', String(params.pageSize ?? 30));
    return api
      .get<ApiResponse<PagedResponse<InventoryItem>>>(`/inventory/items?${qs.toString()}`)
      .then((r) => r.data);
  },

  // Pesquisa server-side por nome — mínimo 2 caracteres
  searchItems: (params: SearchItemsParams) => {
    const qs = new URLSearchParams();
    qs.set('householdId', params.householdId);
    qs.set('q', params.q);
    qs.set('page', String(params.page ?? 1));
    qs.set('pageSize', String(params.pageSize ?? 30));
    return api
      .get<ApiResponse<PagedResponse<InventoryItem>>>(`/inventory/items/search?${qs.toString()}`)
      .then((r) => r.data);
  },

  // Contadores por localização — para Tela 1 vista Por Local
  getCountsByLocation: (householdId: string) =>
    api
      .get<ApiResponse<LocationCount[]>>(
        `/inventory/items/counts/by-location?householdId=${householdId}`
      )
      .then((r) => r.data),

  // Contadores por destino — para Tela 1 vista Por Destino
  getCountsByDestination: (householdId: string) =>
    api
      .get<ApiResponse<DestinationCount[]>>(
        `/inventory/items/counts/by-destination?householdId=${householdId}`
      )
      .then((r) => r.data),

  // Histórico paginado — itens com status=resolved
  getResolvedItems: (householdId: string, page = 1, pageSize = 30) =>
    api
      .get<ApiResponse<PagedResponse<InventoryItem>>>(
        `/inventory/items?householdId=${householdId}&status=resolved&page=${page}&pageSize=${pageSize}`
      )
      .then((r) => r.data),

  // CRUD — sem alterações de contrato
  createItem: (request: CreateItemRequest) =>
    api
      .post<ApiResponse<InventoryItem>>('/inventory/items', request)
      .then((r) => r.data),

  updateItem: (id: string, request: UpdateItemRequest) =>
    api.put<void>(`/inventory/items/${id}`, request),

  deleteItem: (id: string) =>
    api.delete<void>(`/inventory/items/${id}`),

  resolveItem: (id: string, destination: string) =>
    api.post<void>(`/inventory/items/${id}/resolve`, { destination }),

  restoreItem: (id: string) =>
    api.post<void>(`/inventory/items/${id}/restore`, {}),
};
