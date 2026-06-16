import type { GivingCategory } from "@/types";

export interface GivingRecordDto {
  id: string;
  category: GivingCategory;
  amount: number;
  currency: string;
  periodMonth: string;
  notes: string | null;
  projectDesc: string | null;
  recordedAt: string;
}

export interface GivingTargetDto {
  category: GivingCategory;
  targetAmount: number;
  isPercentage: boolean;
  percentage: number | null;
}

export interface PartnershipProjectDto {
  title: string;
  description: string;
}

export interface GivingSummary {
  periodMonth: string;
  records: GivingRecordDto[];
  targets: GivingTargetDto[];
  activeProject: PartnershipProjectDto | null;
}
