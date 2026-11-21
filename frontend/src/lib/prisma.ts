import { PrismaClient } from '@/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const globalForPrisma = global as unknown as {
  prisma: PrismaClient;
};

/**
 * The app talks to Supabase's *transaction* pooler (DATABASE_URL, port 6543),
 * which suits serverless hosting: each Vercel instance opens its own
 * connections, and the session pooler (DIRECT_URL, port 5432) caps clients at
 * the pool size ("max clients reached"). DIRECT_URL stays for migrations
 * (prisma.config.ts) and is only a fallback here.
 */
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL ?? process.env.DIRECT_URL,
  // Per server instance; enough for a page's parallel queries.
  max: 5,
});

const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter,
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
