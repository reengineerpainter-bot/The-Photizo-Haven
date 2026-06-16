import { z } from "zod";

export const mfaVerifySchema = z.object({
  code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code from your app"),
});
