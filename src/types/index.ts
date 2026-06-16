export type UserRole = "MEMBER" | "MANAGER" | "ADMIN";

export type GivingCategory =
  | "TITHE"
  | "PCO_SEED"
  | "HAVEN_DUES"
  | "WELFARE"
  | "LOCAL_PARTNERSHIP";

export type ConsistencyStatus =
  | "OUTSTANDING"
  | "CONSISTENT"
  | "LAGGING"
  | "LAPSED";

export interface JwtPayload {
  sub: string;
  role: UserRole;
  groupId: string;
  mfaVerified: boolean;
  iat?: number;
  exp?: number;
}

export interface AuthContext {
  userId: string;
  role: UserRole;
  groupId: string;
  mfaVerified: boolean;
}

export const GIVING_CATEGORIES: {
  key: GivingCategory;
  label: string;
  description: string;
}[] = [
  {
    key: "TITHE",
    label: "Tithe",
    description: "Regular percentage-based or fixed monthly contributions",
  },
  {
    key: "PCO_SEED",
    label: "PCO Seed",
    description: "Partnership and faith seed contributions",
  },
  {
    key: "HAVEN_DUES",
    label: "Haven Dues",
    description: "Structural group dues on fixed intervals",
  },
  {
    key: "WELFARE",
    label: "Welfare",
    description: "Community support and internal charity",
  },
  {
    key: "LOCAL_PARTNERSHIP",
    label: "Local Partnership",
    description: "Regional project funding with monthly project focus",
  },
];

export const MANAGER_ROLES: UserRole[] = ["MANAGER", "ADMIN"];
