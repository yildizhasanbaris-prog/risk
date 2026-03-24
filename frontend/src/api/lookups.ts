import { api } from './client';

export const lookupsApi = {
  severity: () => api.get<{ id: number; code: string; description: string }[]>('/lookups/severity'),
  likelihood: () => api.get<{ id: number; code: number; description: string }[]>('/lookups/likelihood'),
  categories: () => api.get<{ id: number; code: string; description: string }[]>('/lookups/categories'),
  departments: () => api.get<{ id: number; code: string; name: string }[]>('/lookups/departments'),
  caseTypes: () => api.get<{ id: number; code: string; description: string }[]>('/lookups/case-types'),
  riskCalculate: (severity: string, likelihood: number) =>
    api.get<{ riskIndex: string; riskLevel: string }>('/lookups/risk-calculate', {
      params: { severity, likelihood },
    }),
};
