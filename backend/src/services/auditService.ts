import { PrismaClient } from '@prisma/client';

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
