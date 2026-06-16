import { NextResponse } from "next/server";
import type { AuthContext, UserRole } from "@/types";
import { MANAGER_ROLES } from "@/types";

export class AuthError extends Error {
  constructor(
    message: string,
    public status: number = 401
  ) {
    super(message);
    this.name = "AuthError";
  }
}

export class ForbiddenError extends Error {
  constructor(message: string = "Forbidden") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export function requireAuth(ctx: AuthContext | null): AuthContext {
  if (!ctx) throw new AuthError("Authentication required");
  return ctx;
}

export function requireMfa(ctx: AuthContext): AuthContext {
  if (!ctx.mfaVerified) {
    throw new AuthError("MFA verification required", 403);
  }
  return ctx;
}

export function requireRole(ctx: AuthContext, ...roles: UserRole[]): AuthContext {
  if (!roles.includes(ctx.role)) {
    throw new ForbiddenError(`Requires one of: ${roles.join(", ")}`);
  }
  return ctx;
}

export function requireManager(ctx: AuthContext): AuthContext {
  return requireRole(ctx, ...MANAGER_ROLES);
}

/**
 * IDOR prevention: members can only access their own resource;
 * managers can access resources within their group.
 */
export function assertResourceAccess(
  ctx: AuthContext,
  resource: { userId: string; groupId: string }
): void {
  if (ctx.role === "MEMBER" && ctx.userId !== resource.userId) {
    throw new ForbiddenError("Cannot access another member's data");
  }
  if (MANAGER_ROLES.includes(ctx.role) && ctx.groupId !== resource.groupId) {
    throw new ForbiddenError("Cannot access data outside your group");
  }
}

export function handleAuthError(error: unknown): NextResponse {
  if (error instanceof AuthError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof ForbiddenError) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }
  console.error("[auth]", error);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}
