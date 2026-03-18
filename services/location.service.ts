import { api } from './api';
import { ApiResponse } from '../types/api-response';
import { Location } from '../types/location';

export const LocationService = {
  getLocations: (householdId: string) =>
    api
      .get<ApiResponse<Location[]>>(`/households/${householdId}/locations`)
      .then((r) => r.data),

  createLocation: (householdId: string, name: string, icon?: string) =>
    api
      .post<ApiResponse<Location>>(`/households/${householdId}/locations`, { name, icon })
      .then((r) => r.data),

  updateLocation: (id: string, name: string, icon?: string) =>
    api.put<ApiResponse<Location>>(`/locations/${id}`, { name, icon }).then((r) => r.data),

  deleteLocation: (id: string) =>
    api.delete<ApiResponse<boolean>>(`/locations/${id}`),
};
