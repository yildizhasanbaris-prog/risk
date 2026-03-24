import { api } from './client';

export const caseApi = {
  hazards: (reportId: number) => api.get(`/reports/${reportId}/hazards`).then((r) => r.data),
  createHazard: (reportId: number, body: { statement: string; topEvent?: string }) =>
    api.post(`/reports/${reportId}/hazards`, body).then((r) => r.data),
  getInvestigation: (reportId: number) => api.get(`/reports/${reportId}/investigation`).then((r) => r.data),
  saveInvestigation: (reportId: number, body: Record<string, unknown>) =>
    api.put(`/reports/${reportId}/investigation`, body).then((r) => r.data),
  getEffectiveness: (reportId: number) => api.get(`/reports/${reportId}/effectiveness`).then((r) => r.data),
  saveEffectiveness: (reportId: number, body: Record<string, unknown>) =>
    api.put(`/reports/${reportId}/effectiveness`, body).then((r) => r.data),
  listApprovals: (reportId: number) => api.get(`/reports/${reportId}/approvals`).then((r) => r.data),
  createApproval: (reportId: number, body: { approvalType: string; requiredRoleHint?: string }) =>
    api.post(`/reports/${reportId}/approvals`, body).then((r) => r.data),
  signApproval: (reportId: number, approvalId: number, body: { status: string; comment?: string }) =>
    api.post(`/reports/${reportId}/approvals/${approvalId}/sign`, body).then((r) => r.data),
  listComments: (reportId: number) => api.get(`/reports/${reportId}/comments`).then((r) => r.data),
  addComment: (reportId: number, body: { body: string }) =>
    api.post(`/reports/${reportId}/comments`, body).then((r) => r.data),
  getChange: (reportId: number) => api.get(`/reports/${reportId}/change`).then((r) => r.data),
  saveChange: (reportId: number, body: Record<string, unknown>) =>
    api.put(`/reports/${reportId}/change`, body).then((r) => r.data),
};

export const complianceApi = {
  listFindings: () => api.get('/compliance/findings').then((r) => r.data),
  createFinding: (body: Record<string, unknown>) => api.post('/compliance/findings', body).then((r) => r.data),
  linkFinding: (id: number, linkedReportId: number | null) =>
    api.patch(`/compliance/findings/${id}/link`, { linkedReportId }).then((r) => r.data),
};
