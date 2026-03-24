import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { processNotificationQueue } from '../services/notificationService';

const prisma = new PrismaClient();

async function main() {
  const n = await processNotificationQueue(prisma);
  console.log(`Processed ${n} notification(s)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
