import { PrismaClient } from '@prisma/client';

declare global {
  var prisma: PrismaClient | undefined;
}

const createPrismaClient = () => {
  // Use a dummy URL during build if DATABASE_URL is not available
  const databaseUrl = process.env.DATABASE_URL || 'postgresql://dummy:dummy@localhost:5432/dummy';
  
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
    // Add connection pooling and timeout settings for large file uploads
    transactionOptions: {
      maxWait: 300000, // 5 minutes
      timeout: 600000, // 10 minutes
    },
  });
};

// Prevent multiple instances in serverless environments
const prisma = globalThis.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma;
}

export { prisma };
