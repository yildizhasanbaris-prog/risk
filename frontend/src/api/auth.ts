import { api } from './client';

export interface LoginResponse {
  token: string;
  user: { id: number; name: string; email: string; role: string; department: string | null };
}

export const authApi = {
  login: (email: string, password: string) =>
    api.post<LoginResponse>('/auth/login', { email, password }),

  me: () => api.get('/auth/me'),
};
