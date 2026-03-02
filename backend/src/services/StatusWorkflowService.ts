import { ReportStatus } from '@prisma/client';

/**
 * Allowed status transitions per plan (Table 50 / SMS workflow)
 * Key: current status -> Value: allowed next statuses
 */
const ALLOWED_TRANSITIONS: Record<ReportStatus, ReportStatus[]> = {
  [ReportStatus.NEW]: [ReportStatus.UNDER_REVIEW],
  [ReportStatus.UNDER_REVIEW]: [
    ReportStatus.NOT_SAFETY_RELATED,
    ReportStatus.HIRM_REQUIRED,
    ReportStatus.ACTION_PLANNING,
    ReportStatus.CLOSED,
  ],
  [ReportStatus.NOT_SAFETY_RELATED]: [], // terminal
  [ReportStatus.HIRM_REQUIRED]: [ReportStatus.IN_HIRM],
  [ReportStatus.IN_HIRM]: [ReportStatus.ACTION_PLANNING],
  [ReportStatus.ACTION_PLANNING]: [ReportStatus.ACTION_IN_PROGRESS],
  [ReportStatus.ACTION_IN_PROGRESS]: [ReportStatus.PENDING_EFFECTIVENESS_CHECK],
  [ReportStatus.PENDING_EFFECTIVENESS_CHECK]: [ReportStatus.CLOSED, ReportStatus.ACTION_PLANNING],
  [ReportStatus.CLOSED]: [], // terminal
};

export function canTransition(from: ReportStatus, to: ReportStatus): boolean {
  const allowed = ALLOWED_TRANSITIONS[from];
  return allowed?.includes(to) ?? false;
}

export function getAllowedTransitions(from: ReportStatus): ReportStatus[] {
  return ALLOWED_TRANSITIONS[from] ?? [];
}
