import { api } from './client';

export const lookupsApi = {
  severity: () => api.get<{ id: number; code: string; description: string }[]>('/lookups/severity'),
  likelihood: () => api.get<{ id: number; code: number; description: string }[]>('/lookups/likelihood'),
  categories: () => api.get<{ id: number; code: string; description: string }[]>('/lookups/categories'),
  departments: () => api.get<{ id: number; code: string; name: string }[]>('/lookups/departments'),
  caseTypes: () => api.get<{ id: number; code: string; description: string }[]>('/lookups/case-types'),
  actionTypes: () => api.get<{ id: number; code: string; description: string }[]>('/lookups/action-types'),
  approvalRoutes: () => api.get<{ id: number; code: string; label: string }[]>('/lookups/approval-routes'),
  riskAcceptanceRules: () =>
    api.get<
      {
        id: number;
        riskLevel: string;
        acceptingRoleName: string;
        responseTimeHours: number | null;
        secondaryApproverRequired: boolean;
      }[]
    >('/lookups/risk-acceptance-rules'),
  hfTaxonomy: () => api.get<{ id: number; code: string; description: string }[]>('/lookups/hf-taxonomy'),
  users: () => api.get<{ id: number; name: string; email: string }[]>('/lookups/users'),
  riskCalculate: (severity: string, likelihood: number) =>
    api.get<{ riskIndex: string; riskLevel: string }>('/lookups/risk-calculate', {
      params: { severity, likelihood },
    }),
};
