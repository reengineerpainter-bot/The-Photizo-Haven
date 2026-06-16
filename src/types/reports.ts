import type { ConsistencyStatus, GivingCategory } from "@/types";

export type ReportScope = "individual" | "group";

export interface CategoryReportRow {
  category: GivingCategory;
  label: string;
  amount: number;
  target: number | null;
  progress: number | null;
  projectDesc: string | null;
}

export interface MemberReportRow {
  id: string;
  name: string;
  consistency: ConsistencyStatus;
  total: number;
  byCategory: Partial<Record<GivingCategory, number>>;
}

export interface MonthlyReportData {
  scope: ReportScope;
  periodMonth: string;
  periodLabel: string;
  groupName: string;
  generatedAt: Date;
  memberName?: string;
  consistency?: ConsistencyStatus;
  categories: CategoryReportRow[];
  totalContributed: number;
  members?: MemberReportRow[];
  groupTotalsByCategory?: Partial<Record<GivingCategory, number>>;
  consistencyBreakdown?: Record<ConsistencyStatus, number>;
}
