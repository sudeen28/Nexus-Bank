import { PrismaClient } from '@prisma/client';
import { logger } from '../common/logger';

declare global {
  var __prisma: PrismaClient | undefined;
}

const createPrismaClient = () => {
  const client = new PrismaClient({
    log: [
      { emit: 'event', level: 'query' },
      { emit: 'event', level: 'error' },
      { emit: 'event', level: 'warn' },
    ],
  });

  if (process.env.NODE_ENV === 'development') {
    (client as any).$on('query', (e: any) => {
      logger.debug(`Query: ${e.query} | Duration: ${e.duration}ms`);
    });
  }

  (client as any).$on('error', (e: any) => {
    logger.error(`Prisma error: ${e.message}`);
  });

  return client;
};

export const prisma = global.__prisma || createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  global.__prisma = prisma;
}

export async function connectDB() {
  try {
    await prisma.$connect();
    logger.info('✅ Database connected successfully');
  } catch (error) {
    logger.error('❌ Database connection failed:', error);
    process.exit(1);
  }
}

export async function disconnectDB() {
  await prisma.$disconnect();
  logger.info('Database disconnected');
}
