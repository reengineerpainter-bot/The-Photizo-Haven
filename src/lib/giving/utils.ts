import type { GivingCategory } from "@/types";
import type { GivingRecordDto, GivingTargetDto } from "@/types/giving";
import type { Decimal } from "@prisma/client/runtime/library";

export function currentPeriodMonth(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}-01`;
}

export function toNumber(value: Decimal | number | string): number {
  return typeof value === "number" ? value : Number(value);
}

export function computeProgress(
  amount: number,
  target: GivingTargetDto | undefined
): number | null {
  if (!target || target.targetAmount <= 0) return null;
  return Math.min(100, Math.round((amount / target.targetAmount) * 100));
}

export function recordForCategory(
  records: GivingRecordDto[],
  category: GivingCategory,
  periodMonth: string
): GivingRecordDto | undefined {
  return records.find(
    (r) => r.category === category && r.periodMonth.startsWith(periodMonth.slice(0, 7))
  );
}

export function targetForCategory(
  targets: GivingTargetDto[],
  category: GivingCategory
): GivingTargetDto | undefined {
  return targets.find((t) => t.category === category);
}

export function formatCurrency(amount: number, currency = "GHS"): string {
  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}
