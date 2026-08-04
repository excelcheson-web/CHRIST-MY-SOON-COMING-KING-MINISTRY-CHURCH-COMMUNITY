import { PrismaClient } from '@prisma/client'

/**
 * The public site must render even before a database exists, so the client is
 * optional: `prisma` is `null` when DATABASE_URL is unset. Read paths fall back
 * to bundled content (see `lib/page-content.ts`); write paths call
 * `requirePrisma()` and surface a clear error instead of a stack trace.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient | null }

export const isDatabaseConfigured = Boolean(process.env.DATABASE_URL?.trim())

export class DatabaseNotConfiguredError extends Error {
  constructor() {
    super('DATABASE_URL is not set. Copy .env.example to .env and add a PostgreSQL connection string.')
    this.name = 'DatabaseNotConfiguredError'
  }
}

function createPrismaClient(): PrismaClient | null {
  if (!isDatabaseConfigured) return null
  try {
    return new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    })
  } catch {
    return null
  }
}

export const prisma: PrismaClient | null = globalForPrisma.prisma ?? createPrismaClient()

// Avoid exhausting connections through hot reloads in dev.
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export function requirePrisma(): PrismaClient {
  if (!prisma) throw new DatabaseNotConfiguredError()
  return prisma
}
