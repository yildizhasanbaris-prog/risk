import { api } from './client';

export interface Report {
  id: number;
  reportNo: string | null;
  createdAt: string;
  title: string;
  description: string | null;
  status: string;
  lifecycleStatus?: string;
  lifecycleLabel?: string;
  currentRiskLevel: string | null;
  isMor: boolean;
  isSafetyRelated: boolean;
  reportedBy?: { id: number; name: string; email: string };
  department?: { code: string; name: string };
  category?: { code: string; description: string };
  riskAssessments?: { id: number; riskIndex: string | null; riskLevel: string | null; hazardDescription: string | null }[];
  allowedStatuses?: string[];
  morDeadline?: string | null;
  morStatus?: string;
  caseTypeId?: number | null;
  caseType?: { id: number; code: string; description: string };
  mandatoryVoluntary?: string | null;
  occurrenceClassification?: string | null;
  immediateContainmentRequired?: boolean | null;
  investigationRequired?: boolean | null;
  riskAssessmentRequired?: boolean | null;
  externalReportingRequired?: boolean | null;
  screeningComment?: string | null;
}

export interface ReportCreate {
  title: string;
  description?: string;
  departmentId?: number;
  location?: string;
  aircraftReg?: string;
  aircraftType?: string;
  componentPn?: string;
  componentSn?: string;
  immediateActions?: string;
  categoryId?: number;
  caseTypeId?: number;
}

export interface ReportReviewUpdate {
  isSafetyRelated?: boolean;
  isMor?: boolean;
  morDeadline?: string;
  morStatus?: string;
  status?: string;
  comment?: string;
  closureSummary?: string;
  caseTypeId?: number | null;
  mandatoryVoluntary?: string | null;
  occurrenceClassification?: string | null;
  immediateContainmentRequired?: boolean | null;
  investigationRequired?: boolean | null;
  riskAssessmentRequired?: boolean | null;
  externalReportingRequired?: boolean | null;
  screeningComment?: string | null;
}

export const reportsApi = {
  list: (params?: { status?: string; departmentId?: number; from?: string; to?: string }) =>
    api.get<{ data: Report[]; total: number }>('/reports', { params }),

  create: (data: ReportCreate) => api.post<Report>('/reports', data),

  getById: (id: number) => api.get<Report>(`/reports/${id}`),

  update: (id: number, data: Partial<ReportCreate>) => api.put<Report>(`/reports/${id}`, data),

  updateStatus: (id: number, status: string, comment?: string) =>
    api.post<Report>(`/reports/${id}/status`, { status, comment }),

  review: (id: number, data: ReportReviewUpdate) => api.put<Report>(`/reports/${id}/review`, data),

  getAllowedStatuses: (id: number) =>
    api.get<{ current: string; allowed: string[] }>(`/reports/${id}/allowed-statuses`),
};
