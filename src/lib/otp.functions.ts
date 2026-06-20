import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// These server-side OTP functions are deprecated — phone OTP is now handled
// client-side via Firebase Auth (signInWithPhoneNumber). These stubs are kept
// to avoid breaking any lingering import references but are not used.

const phoneSchema = z.object({
  phone: z.string().trim().regex(/^\+[1-9]\d{7,14}$/, "Use E.164 format like +919812345678"),
});

const verifySchema = z.object({
  phone: z.string().trim().regex(/^\+[1-9]\d{7,14}$/),
  code: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code"),
});

export const sendPhoneOtp = createServerFn({ method: "POST" })
  .inputValidator((input) => phoneSchema.parse(input))
  .handler(async () => {
    throw new Error("Use Firebase Auth client-side signInWithPhoneNumber instead");
  });

export const verifyPhoneOtp = createServerFn({ method: "POST" })
  .inputValidator((input) => verifySchema.parse(input))
  .handler(async () => {
    throw new Error("Use Firebase Auth client-side confirmationResult.confirm() instead");
  });
