import { api } from './client';

export interface Action {
  id: number;
  reportId: number;
  actionNo: number;
  description: string;
  ownerUserId: number;
  dueDate: string | null;
  status: string;
  completedAt: string | null;
  effectivenessComment: string | null;
  owner?: { id: number; name: string; email: string };
}

export const actionsApi = {
  list: (reportId: number) => api.get<Action[]>(`/reports/${reportId}/actions`),
  create: (reportId: number, data: { description: string; ownerUserId: number; dueDate?: string }) =>
    api.post<Action>(`/reports/${reportId}/actions`, data),
  update: (reportId: number, actionId: number, data: Partial<{ description: string; ownerUserId: number; dueDate: string; status: string; effectivenessComment: string }>) =>
    api.put<Action>(`/reports/${reportId}/actions/${actionId}`, data),
};
