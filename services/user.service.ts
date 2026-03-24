import { api } from './api';
import type { ApiResponse } from '@/types/api-response';
import type { UserProfile } from '@/types/user';

export const UserService = {
  getMe: () =>
    api.get<ApiResponse<UserProfile>>('/users/me').then((r) => r.data),

  updateMe: (name: string) =>
    api.put<ApiResponse<UserProfile>>('/users/me', { name }).then((r) => r.data),
};
