import { PrismaClient, ActionStatus, CaseLifecycleStatus, ReportStatus } from '@prisma/client';
import { hasOpenActionsForClosure } from './StatusWorkflowService';

export function isMitigationTerminal(status: ActionStatus): boolean {
  return (
    status === ActionStatus.DONE ||
    status === ActionStatus.VERIFIED ||
    status === ActionStatus.CANCELLED
  );
}

/** Spec §6.1: OPEN -> ACTION_OPEN when at least one mitigation is OPEN or IN_PROGRESS */
export function isMitigationActiveForLifecycle(status: ActionStatus): boolean {
  return status === ActionStatus.OPEN || status === ActionStatus.IN_PROGRESS;
}

export type LifecycleContext = {
  reportStatus: ReportStatus;
  actions: { status: ActionStatus }[];
  effectiveness: {
    furtherActionRequired: boolean | null;
    implementationVerified: boolean | null;
  } | null;
};

/**
 * Derives user-facing lifecycle from current case data (spec §6.1).
 */
export function deriveLifecycle(ctx: LifecycleContext): CaseLifecycleStatus {
  if (ctx.reportStatus === ReportStatus.CLOSED) {
    return CaseLifecycleStatus.CLOSED;
  }
  if (
    ctx.reportStatus === ReportStatus.CANCELLED ||
    ctx.reportStatus === ReportStatus.DUPLICATE ||
    ctx.reportStatus === ReportStatus.NOT_SAFETY_RELATED
  ) {
    return CaseLifecycleStatus.CLOSED;
  }
  if (ctx.reportStatus === ReportStatus.DRAFT) {
    return CaseLifecycleStatus.DRAFT;
  }

  const actions = ctx.actions;
  if (ctx.effectiveness?.furtherActionRequired === true) {
    return CaseLifecycleStatus.ACTION_OPEN;
  }

  if (actions.length === 0) {
    return CaseLifecycleStatus.OPEN;
  }

  const anyActive = actions.some((a) => isMitigationActiveForLifecycle(a.status));
  if (anyActive) {
    return CaseLifecycleStatus.ACTION_OPEN;
  }

  const allTerminal = actions.every((a) => isMitigationTerminal(a.status));
  if (allTerminal) {
    return CaseLifecycleStatus.MONITORING;
  }

  return CaseLifecycleStatus.OPEN;
}

/** Map lifecycle to a representative ReportStatus for legacy filters / dashboards */
export function suggestedReportStatusForLifecycle(
  lifecycle: CaseLifecycleStatus,
  current: ReportStatus,
): ReportStatus | null {
  switch (lifecycle) {
    case CaseLifecycleStatus.DRAFT:
      return ReportStatus.DRAFT;
    case CaseLifecycleStatus.OPEN:
      if (
        current === ReportStatus.NEW ||
        current === ReportStatus.SUBMITTED ||
        current === ReportStatus.UNDER_SCREENING ||
        current === ReportStatus.UNDER_REVIEW
      ) {
        return null;
      }
      if (
        current === ReportStatus.MITIGATION_IN_PROGRESS ||
        current === ReportStatus.ACTION_IN_PROGRESS ||
        current === ReportStatus.PENDING_EFFECTIVENESS_CHECK
      ) {
        return ReportStatus.UNDER_SCREENING;
      }
      return null;
    case CaseLifecycleStatus.ACTION_OPEN:
      if (current === ReportStatus.PENDING_EFFECTIVENESS_CHECK || current === ReportStatus.CLOSED) {
        return ReportStatus.MITIGATION_IN_PROGRESS;
      }
      if (
        current === ReportStatus.NEW ||
        current === ReportStatus.UNDER_SCREENING ||
        current === ReportStatus.UNDER_REVIEW ||
        current === ReportStatus.IN_HIRM ||
        current === ReportStatus.ACTION_PLANNING
      ) {
        return ReportStatus.MITIGATION_IN_PROGRESS;
      }
      return null;
    case CaseLifecycleStatus.MONITORING:
      if (current !== ReportStatus.PENDING_EFFECTIVENESS_CHECK && current !== ReportStatus.CLOSED) {
        return ReportStatus.PENDING_EFFECTIVENESS_CHECK;
      }
      return null;
    case CaseLifecycleStatus.CLOSED:
      return ReportStatus.CLOSED;
    default:
      return null;
  }
}

/** Persists derived lifecycle and soft-syncs legacy ReportStatus when safe */
export async function recalculateLifecycleForReport(db: PrismaClient, reportId: number): Promise<void> {
  const report = await db.report.findUnique({
    where: { id: reportId },
    include: {
      actions: { select: { status: true } },
      effectivenessReview: {
        select: { furtherActionRequired: true, implementationVerified: true },
      },
    },
  });
  if (!report) return;

  const derived = deriveLifecycle({
    reportStatus: report.status,
    actions: report.actions,
    effectiveness: report.effectivenessReview,
  });

  const statusSync = suggestedReportStatusForLifecycle(derived, report.status);
  const data: { lifecycleStatus: CaseLifecycleStatus; status?: ReportStatus } = {
    lifecycleStatus: derived,
  };
  const skipLegacySync = new Set<ReportStatus>([
    ReportStatus.NOT_SAFETY_RELATED,
    ReportStatus.CANCELLED,
    ReportStatus.DUPLICATE,
    ReportStatus.CLOSED,
  ]);
  if (statusSync && statusSync !== report.status && !skipLegacySync.has(report.status)) {
    data.status = statusSync;
  }

  await db.report.update({
    where: { id: reportId },
    data,
  });
}

export const lifecycleLabels: Record<CaseLifecycleStatus, string> = {
  DRAFT: 'Taslak',
  OPEN: 'Açık',
  ACTION_OPEN: 'Aksiyon açık',
  MONITORING: 'İzleme / etkililik',
  CLOSED: 'Kapalı',
};

/** Spec §6.2 closure preconditions */
export async function validateCaseClosure(db: PrismaClient, reportId: number): Promise<string | null> {
  const actions = await db.action.findMany({ where: { reportId } });
  if (hasOpenActionsForClosure(actions)) {
    return 'Açık mitigation varken kapatılamaz (DONE, VERIFIED veya CANCELLED olmalı)';
  }
  const pending = await db.caseApproval.count({
    where: { reportId, status: 'PENDING' },
  });
  if (pending > 0) return 'Bekleyen onay varken kapatılamaz';
  const eff = await db.effectivenessReview.findUnique({ where: { reportId } });
  if (!eff || eff.implementationVerified === null) {
    return 'Etkinlik incelemesi tamamlanmadan kapatılamaz';
  }
  if (eff.furtherActionRequired === true) {
    return 'Ek aksiyon gerekli işaretli iken kapatılamaz';
  }
  return null;
}
