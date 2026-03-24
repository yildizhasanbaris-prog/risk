import { PrismaClient } from '@prisma/client';
import { registerAuditMiddleware } from '../services/auditService';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (!globalForPrisma.prisma) {
  registerAuditMiddleware(prisma);
}

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
