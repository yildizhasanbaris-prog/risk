import { api } from './client';

export interface UserRow {
  id: number;
  name: string;
  email: string;
  roleId: number;
  roleName: string;
  departmentId: number | null;
  departmentName: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface RoleRow {
  id: number;
  name: string;
}

export interface MasterRow {
  id: number;
  code: string;
  description?: string;
  name?: string;
  isActive?: boolean;
}

export const adminApi = {
  listUsers: () => api.get<UserRow[]>('/admin/users'),
  createUser: (data: { name: string; email: string; password: string; roleId: number; departmentId?: number | null }) =>
    api.post<UserRow>('/admin/users', data),
  updateUser: (id: number, data: Partial<{ name: string; email: string; password: string; roleId: number; departmentId: number | null; isActive: boolean }>) =>
    api.put<UserRow>(`/admin/users/${id}`, data),
  listRoles: () => api.get<RoleRow[]>('/admin/roles'),

  listMaster: (entity: string) => api.get<MasterRow[]>(`/admin/master/${entity}`),
  createMaster: (entity: string, data: { code: string; description?: string; name?: string }) =>
    api.post<MasterRow>(`/admin/master/${entity}`, data),
  updateMaster: (entity: string, id: number, data: Partial<MasterRow>) =>
    api.put<MasterRow>(`/admin/master/${entity}/${id}`, data),
};
