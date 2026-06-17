import { api } from './api';
import { ApiResponse } from '../types/api-response';
import { Household } from '../types/household';
import { Config } from '../constants/config';

export const HouseholdService = {
  getMyHouseholds: () =>
    api.get<ApiResponse<Household[]>>('/household').then((r) => r.data),

  getHousehold: (id: string) =>
    api.get<ApiResponse<Household>>(`/household/${id}`).then((r) => r.data),

  createHousehold: (name: string) =>
   api.post<ApiResponse<Household>>('/household', { name }).then((r) => r.data),
  
  joinHousehold: (inviteCode: string) =>
    api
      .post<ApiResponse<Household>>(`/household/join/${inviteCode}`, {})
      .then((r) => r.data),

  updateSettings: (id: string, settings: { name?: string; defaultCurrency?: string }) =>
    api
      .patch<ApiResponse<Household>>(`/household/${id}/settings`, settings)
      .then((r) => r.data),

  deleteHousehold: (id: string) =>
    api
      .delete<ApiResponse<boolean>>(`/household/${id}`)
      .then((r) => r.data),
};
