export type RecurrencePattern = 'daily' | 'weekly' | 'monthly';

export interface Task {
  id: string;
  householdId: string;
  recurrenceId?: string;
  recurrencePattern?: RecurrencePattern;
  recurrenceDay?: number;
  title: string;
  description?: string;
  assigneeId?: string;
  assigneeName?: string;
  dueDate?: string;
  status: 'active' | 'completed';
  completedAt?: string;
  completedBy?: string;
  completedByName?: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskRequest {
  householdId: string;
  title: string;
  description?: string;
  assigneeId?: string;
  dueDate?: string;
  recurrencePattern?: RecurrencePattern;
  recurrenceDay?: number;
}

export interface UpdateTaskRequest {
  title?: string;
  description?: string;
  assigneeId?: string;
  dueDate?: string;
}
