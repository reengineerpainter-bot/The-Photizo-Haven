import { PrismaClient } from "@prisma/client";
import type { AuthContext } from "@/types";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

/**
 * Sets PostgreSQL session variables for Row-Level Security.
 * Call at the start of every authenticated DB transaction.
 */
export async function withRlsContext<T>(
  ctx: AuthContext,
  fn: (tx: PrismaClient) => Promise<T>
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(
      `SELECT set_config('app.current_user_id', $1, TRUE)`,
      ctx.userId
    );
    await tx.$executeRawUnsafe(
      `SELECT set_config('app.current_user_role', $1, TRUE)`,
      ctx.role
    );
    await tx.$executeRawUnsafe(
      `SELECT set_config('app.current_group_id', $1, TRUE)`,
      ctx.groupId
    );
    return fn(tx as unknown as PrismaClient);
  });
}
