import { api } from './api';
import { ApiResponse } from '../types/api-response';
import { Category } from '../types/category';

export const CategoryService = {
  getCategories: (householdId: string, type?: string) => {
    const query = type ? `?type=${type}` : '';
    return api
      .get<ApiResponse<Category[]>>(`/households/${householdId}/categories${query}`)
      .then((r) => r.data);
  },
};
