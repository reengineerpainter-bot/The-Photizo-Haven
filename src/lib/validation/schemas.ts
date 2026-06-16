import { z } from "zod";

const sanitizedString = (max: number) =>
  z
    .string()
    .min(1)
    .max(max)
    .transform((s) =>
      s
        .trim()
        .replace(/[<>'";&\\]/g, "")
        .replace(/\0/g, "")
    );

export const signupSchema = z.object({
  fullName: sanitizedString(200).refine(
    (s) => s.split(/\s+/).length >= 2,
    "Enter your full name (first and last)"
  ),
  phone: z
    .string()
    .regex(
      /^\+?[1-9]\d{7,14}$/,
      "Enter a valid international phone number"
    ),
  email: z.string().email().max(254).toLowerCase().trim(),
  dateJoined: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD format")
    .refine((d) => new Date(d) <= new Date(), "Date cannot be in the future"),
  password: z
    .string()
    .min(12, "Minimum 12 characters")
    .regex(/[A-Z]/, "Include an uppercase letter")
    .regex(/[a-z]/, "Include a lowercase letter")
    .regex(/[0-9]/, "Include a number")
    .regex(/[^A-Za-z0-9]/, "Include a symbol"),
  groupId: z.string().uuid().optional(),
});

export const loginSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  password: z.string().min(1),
  mfaCode: z.string().length(6).optional(),
});

export const givingRecordSchema = z.object({
  category: z.enum([
    "TITHE",
    "PCO_SEED",
    "HAVEN_DUES",
    "WELFARE",
    "LOCAL_PARTNERSHIP",
  ]),
  amount: z.number().positive().max(999_999_999.99),
  periodMonth: z.string().regex(/^\d{4}-\d{2}-01$/),
  notes: z.string().max(500).optional(),
  projectDesc: z.string().max(1000).optional(),
});

export const adminCommentSchema = z.object({
  memberId: z.string().uuid(),
  body: sanitizedString(2000),
});

export const memberFeedbackSchema = z.object({
  memberId: z.string().uuid(),
  subject: sanitizedString(200),
  body: sanitizedString(2000),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type GivingRecordInput = z.infer<typeof givingRecordSchema>;
