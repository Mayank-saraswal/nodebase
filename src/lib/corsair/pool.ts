import "server-only"
import { Pool } from "pg"

/**
 * Shared pg.Pool for Corsair (must not use PrismaClient).
 * Singleton survives Next.js hot reload in development.
 */
const globalForPool = globalThis as unknown as {
  corsairPgPool: Pool | undefined
}

export function getCorsairPool(): Pool {
  if (globalForPool.corsairPgPool) {
    return globalForPool.corsairPgPool
  }

  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error("DATABASE_URL is required for Corsair pool")
  }

  const pool = new Pool({
    connectionString,
    max: Number(process.env.CORSAIR_PG_POOL_MAX ?? "10"),
    idleTimeoutMillis: 30_000,
  })

  if (process.env.NODE_ENV !== "production") {
    globalForPool.corsairPgPool = pool
  } else {
    globalForPool.corsairPgPool = pool
  }

  return pool
}
