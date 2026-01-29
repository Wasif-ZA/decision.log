// ===========================================
// Prisma Client Singleton
// ===========================================
// Prevents multiple Prisma Client instances in development
// due to Next.js hot reloading

import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
    log: process.env.LOG_LEVEL === 'debug'
        ? ['query', 'info', 'warn', 'error']
        : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma;
}

export default prisma;
