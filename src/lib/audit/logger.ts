import { prisma } from "@/lib/db/prisma";
import type { AuditAction } from "@prisma/client";

interface AuditEntry {
  actorId?: string;
  groupId?: string;
  action: AuditAction;
  resourceType?: string;
  resourceId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

export async function writeAuditLog(entry: AuditEntry): Promise<void> {
  await prisma.auditLog.create({
    data: {
      actorId: entry.actorId ?? null,
      groupId: entry.groupId ?? null,
      action: entry.action,
      resourceType: entry.resourceType ?? null,
      resourceId: entry.resourceId ?? null,
      ipAddress: entry.ipAddress ?? null,
      userAgent: entry.userAgent ?? null,
      metadata: (entry.metadata ?? {}) as object,
    },
  });
}
