import { api } from './client';

export interface RiskAssessment {
  id: number;
  reportId: number;
  assessmentType: string;
  hazardDescription: string | null;
  consequences: string | null;
  existingControls: string | null;
  proposedControls: string | null;
  severityCode: string | null;
  likelihoodCode: number | null;
  riskIndex: string | null;
  riskLevel: string | null;
  assessedBy?: { id: number; name: string };
  assessedAt: string | null;
}

export interface RiskAssessmentCreate {
  assessmentType: 'INITIAL' | 'RESIDUAL' | 'INTERMEDIATE';
  hazardDescription?: string;
  consequences?: string;
  existingControls?: string;
  proposedControls?: string;
  severityCode: 'A' | 'B' | 'C' | 'D' | 'E';
  likelihoodCode: number;
  riskOwnerUserId?: number;
  reviewDueDate?: string;
  acceptanceLevel?: string;
}

export const riskAssessmentsApi = {
  list: (reportId: number) =>
    api.get<RiskAssessment[]>(`/reports/${reportId}/risk-assessments`),

  create: (reportId: number, data: RiskAssessmentCreate) =>
    api.post<RiskAssessment>(`/reports/${reportId}/risk-assessments`, data),

  update: (reportId: number, assessmentId: number, data: Partial<RiskAssessmentCreate>) =>
    api.put<RiskAssessment>(`/reports/${reportId}/risk-assessments/${assessmentId}`, data),
};
