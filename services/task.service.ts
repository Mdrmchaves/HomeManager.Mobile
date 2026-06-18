import { api } from './api';
import type { ApiResponse } from '../types/api-response';
import type { Task, CreateTaskRequest, UpdateTaskRequest } from '../types/task';

export const TaskService = {
  getTasksByDate: (householdId: string, date: string) =>
    api
      .get<ApiResponse<Task[]>>(`/tasks?householdId=${householdId}&date=${date}`)
      .then((r) => r.data),

  getTask: (id: string) =>
    api.get<ApiResponse<Task>>(`/tasks/${id}`).then((r) => r.data),

  createTask: (request: CreateTaskRequest) =>
    api.post<ApiResponse<Task>>('/tasks', request).then((r) => r.data),

  updateTask: (id: string, request: UpdateTaskRequest) =>
    api.put<ApiResponse<Task>>(`/tasks/${id}`, request).then((r) => r.data),

  deleteTask: (id: string) =>
    api.delete<void>(`/tasks/${id}`),

  completeTask: (id: string) =>
    api.post<ApiResponse<Task>>(`/tasks/${id}/complete`, {}).then((r) => r.data),

  reopenTask: (id: string) =>
    api.post<ApiResponse<Task>>(`/tasks/${id}/reopen`, {}).then((r) => r.data),

  deleteRecurrence: (recurrenceId: string) =>
    api.delete<void>(`/task-recurrences/${recurrenceId}`),
};
