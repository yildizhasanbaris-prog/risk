import { PrismaClient, Prisma } from '@prisma/client';

export async function writeAuditLog(
  db: PrismaClient,
  params: {
    entityType: string;
    entityId: number;
    action: string;
    userId: number | null;
    oldValue?: unknown;
    newValue?: unknown;
  },
) {
  await db.auditLog.create({
    data: {
      entityType: params.entityType,
      entityId: params.entityId,
      action: params.action,
      userId: params.userId,
      oldValue: params.oldValue === undefined ? undefined : (params.oldValue as object),
      newValue: params.newValue === undefined ? undefined : (params.newValue as object),
    },
  });
}

const AUDITED_MODELS = new Set([
  'Report', 'RiskAssessment', 'Action', 'CaseApproval',
  'CaseReview', 'Hazard', 'ChangeRecord', 'EffectivenessReview',
  'User', 'Investigation',
]);

let _currentUserId: number | null = null;

export function setAuditUserId(userId: number | null) {
  _currentUserId = userId;
}

export function registerAuditMiddleware(prisma: PrismaClient) {
  prisma.$use(async (params: Prisma.MiddlewareParams, next: (params: Prisma.MiddlewareParams) => Promise<unknown>) => {
    if (!params.model || !AUDITED_MODELS.has(params.model)) {
      return next(params);
    }

    const action = params.action;
    let oldValue: unknown = undefined;

    if ((action === 'update' || action === 'delete') && params.args?.where) {
      try {
        oldValue = await (prisma as any)[lowerFirst(params.model)].findUnique({ where: params.args.where });
      } catch {
        // best effort
      }
    }

    const result = await next(params);

    if (action === 'create' || action === 'update' || action === 'delete') {
      try {
        const entityId = (result as any)?.id;
        if (entityId) {
          await prisma.auditLog.create({
            data: {
              entityType: params.model,
              entityId,
              action: action.toUpperCase(),
              userId: _currentUserId,
              oldValue: oldValue ? (oldValue as object) : undefined,
              newValue: action !== 'delete' ? (result as object) : undefined,
            },
          });
        }
      } catch (err) {
        console.error('Audit log write failed:', err);
      }
    }

    return result;
  });
}

function lowerFirst(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1);
}
