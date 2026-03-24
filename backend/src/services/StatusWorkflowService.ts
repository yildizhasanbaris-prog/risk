import { ReportStatus } from '@prisma/client';

/**
 * Allowed status transitions (EASA-aligned Safety Case workflow).
 * NEW/UNDER_REVIEW kept for backward compatibility; UNDER_SCREENING is equivalent path.
 */
const ALLOWED_TRANSITIONS: Record<ReportStatus, ReportStatus[]> = {
  [ReportStatus.DRAFT]: [ReportStatus.SUBMITTED, ReportStatus.NEW],
  [ReportStatus.NEW]: [ReportStatus.UNDER_REVIEW, ReportStatus.UNDER_SCREENING, ReportStatus.SUBMITTED],
  [ReportStatus.SUBMITTED]: [ReportStatus.UNDER_SCREENING, ReportStatus.UNDER_REVIEW],
  [ReportStatus.UNDER_REVIEW]: [
    ReportStatus.NOT_SAFETY_RELATED,
    ReportStatus.HIRM_REQUIRED,
    ReportStatus.ACTION_PLANNING,
    ReportStatus.AWAITING_RISK_ASSESSMENT,
    ReportStatus.UNDER_INVESTIGATION,
    ReportStatus.CLOSED,
    ReportStatus.CANCELLED,
    ReportStatus.DUPLICATE,
  ],
  [ReportStatus.UNDER_SCREENING]: [
    ReportStatus.NOT_SAFETY_RELATED,
    ReportStatus.AWAITING_IMMEDIATE_ACTION,
    ReportStatus.UNDER_INVESTIGATION,
    ReportStatus.HIRM_REQUIRED,
    ReportStatus.AWAITING_RISK_ASSESSMENT,
    ReportStatus.ACTION_PLANNING,
    ReportStatus.CLOSED,
    ReportStatus.CANCELLED,
    ReportStatus.DUPLICATE,
  ],
  [ReportStatus.AWAITING_IMMEDIATE_ACTION]: [
    ReportStatus.UNDER_INVESTIGATION,
    ReportStatus.AWAITING_RISK_ASSESSMENT,
    ReportStatus.HIRM_REQUIRED,
    ReportStatus.UNDER_SCREENING,
  ],
  [ReportStatus.UNDER_INVESTIGATION]: [
    ReportStatus.AWAITING_RISK_ASSESSMENT,
    ReportStatus.HIRM_REQUIRED,
    ReportStatus.ACTION_PLANNING,
  ],
  [ReportStatus.NOT_SAFETY_RELATED]: [],
  [ReportStatus.HIRM_REQUIRED]: [ReportStatus.IN_HIRM, ReportStatus.AWAITING_RISK_ASSESSMENT],
  [ReportStatus.IN_HIRM]: [ReportStatus.ACTION_PLANNING, ReportStatus.AWAITING_APPROVAL],
  [ReportStatus.AWAITING_RISK_ASSESSMENT]: [
    ReportStatus.HIRM_REQUIRED,
    ReportStatus.IN_HIRM,
    ReportStatus.ACTION_PLANNING,
    ReportStatus.AWAITING_APPROVAL,
  ],
  [ReportStatus.AWAITING_APPROVAL]: [
    ReportStatus.ACTION_PLANNING,
    ReportStatus.ACTION_IN_PROGRESS,
    ReportStatus.MITIGATION_IN_PROGRESS,
  ],
  [ReportStatus.ACTION_PLANNING]: [
    ReportStatus.ACTION_IN_PROGRESS,
    ReportStatus.MITIGATION_IN_PROGRESS,
  ],
  [ReportStatus.ACTION_IN_PROGRESS]: [ReportStatus.PENDING_EFFECTIVENESS_CHECK, ReportStatus.MITIGATION_IN_PROGRESS],
  [ReportStatus.MITIGATION_IN_PROGRESS]: [ReportStatus.PENDING_EFFECTIVENESS_CHECK],
  [ReportStatus.PENDING_EFFECTIVENESS_CHECK]: [
    ReportStatus.CLOSED,
    ReportStatus.ACTION_PLANNING,
    ReportStatus.REOPENED,
  ],
  [ReportStatus.CLOSED]: [ReportStatus.REOPENED],
  [ReportStatus.REOPENED]: [
    ReportStatus.UNDER_SCREENING,
    ReportStatus.UNDER_INVESTIGATION,
    ReportStatus.ACTION_PLANNING,
    ReportStatus.PENDING_EFFECTIVENESS_CHECK,
  ],
  [ReportStatus.CANCELLED]: [],
  [ReportStatus.DUPLICATE]: [],
};

export function canTransition(from: ReportStatus, to: ReportStatus): boolean {
  const allowed = ALLOWED_TRANSITIONS[from];
  return allowed?.includes(to) ?? false;
}

export function getAllowedTransitions(from: ReportStatus): ReportStatus[] {
  return ALLOWED_TRANSITIONS[from] ?? [];
}

/** Block closure if open/overdue actions exist */
export function hasOpenActionsForClosure(actions: { status: string; dueDate: Date | null; revisedDueDate: Date | null }[]): boolean {
  const open = actions.filter((a) => a.status !== 'DONE' && a.status !== 'CANCELLED');
  return open.length > 0;
}

export function hasOverdueActions(actions: { status: string; dueDate: Date | null; revisedDueDate: Date | null }[]): boolean {
  const now = new Date();
  return actions.some((a) => {
    if (a.status === 'DONE' || a.status === 'CANCELLED') return false;
    const due = a.revisedDueDate ?? a.dueDate;
    return due != null && due < now;
  });
}
