import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const phoneSchema = z.object({
  phone: z.string().trim().regex(/^\+[1-9]\d{7,14}$/, "Use E.164 format like +919812345678"),
});

const verifySchema = z.object({
  phone: z.string().trim().regex(/^\+[1-9]\d{7,14}$/),
  code: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code"),
});

async function sha256(input: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export const sendPhoneOtp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => phoneSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const lovableKey = process.env.LOVABLE_API_KEY;
    const twilioKey = process.env.TWILIO_API_KEY;
    const from = process.env.TWILIO_FROM_NUMBER;
    if (!lovableKey || !twilioKey || !from) throw new Error("OTP service is not configured");

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const code_hash = await sha256(`${data.phone}:${code}`);
    const expires_at = new Date(Date.now() + 5 * 60_000).toISOString();

    const { error: insErr } = await supabaseAdmin.from("phone_otps").insert({
      user_id: context.userId, phone: data.phone, code_hash, expires_at,
    });
    if (insErr) { console.error(insErr); throw new Error("Could not start verification"); }

    const res = await fetch("https://connector-gateway.lovable.dev/twilio/Messages.json", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": twilioKey,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: data.phone, From: from,
        Body: `Your Om Astro verification code is ${code}. Valid for 5 minutes.`,
      }),
    });
    if (!res.ok) { console.error("twilio", res.status, await res.text()); throw new Error("Could not send SMS"); }
    return { ok: true };
  });

export const verifyPhoneOtp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => verifySchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const code_hash = await sha256(`${data.phone}:${data.code}`);

    const { data: row } = await supabaseAdmin
      .from("phone_otps")
      .select("id, expires_at, consumed_at, attempts")
      .eq("user_id", context.userId).eq("phone", data.phone).eq("code_hash", code_hash)
      .order("created_at", { ascending: false }).limit(1).maybeSingle();

    if (!row || row.consumed_at || new Date(row.expires_at) < new Date()) {
      throw new Error("Invalid or expired code");
    }

    await supabaseAdmin.from("phone_otps").update({ consumed_at: new Date().toISOString() }).eq("id", row.id);
    await supabaseAdmin.from("profiles").update({ phone: data.phone, phone_verified: true }).eq("id", context.userId);
    return { ok: true };
  });
