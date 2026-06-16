import { z } from "zod";

export const monthlyReportQuerySchema = z.object({
  period: z
    .string()
    .regex(/^\d{4}-\d{2}(-01)?$/, "Use YYYY-MM format")
    .transform((p) => (p.length === 7 ? `${p}-01` : p)),
  scope: z.enum(["individual", "group"]),
  memberId: z.string().uuid().optional(),
});

export type MonthlyReportQuery = z.infer<typeof monthlyReportQuerySchema>;
