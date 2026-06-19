import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const CF_BASE = "https://api.cashfree.com/pg"; // live

const rechargeSchema = z.object({
  amount_inr: z.number().int().min(10).max(100000),
  return_url: z.string().url(),
});

export const createRechargeOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => rechargeSchema.parse(input))
  .handler(async ({ data, context }) => {
    const appId = process.env.CASHFREE_APP_ID;
    const secret = process.env.CASHFREE_SECRET_KEY;
    if (!appId || !secret) throw new Error("Payments are not configured");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const orderId = `omw_${context.userId.slice(0, 8)}_${Date.now()}`;
    const amount_paise = data.amount_inr * 100;

    const { error: txErr } = await supabaseAdmin.from("wallet_transactions").insert({
      user_id: context.userId, amount_paise, kind: "credit", status: "pending",
      provider: "cashfree", provider_order_id: orderId, note: "Wallet recharge",
    });
    if (txErr) { console.error(txErr); throw new Error("Could not start recharge"); }

    const { data: userRes } = await supabaseAdmin.auth.admin.getUserById(context.userId);
    const email = userRes.user?.email ?? `user_${context.userId.slice(0, 8)}@omastro.app`;
    const phone = userRes.user?.phone || userRes.user?.user_metadata?.phone || "9999999999";

    const res = await fetch(`${CF_BASE}/orders`, {
      method: "POST",
      headers: {
        "x-client-id": appId, "x-client-secret": secret, "x-api-version": "2023-08-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        order_id: orderId,
        order_amount: data.amount_inr,
        order_currency: "INR",
        customer_details: {
          customer_id: context.userId,
          customer_email: email,
          customer_phone: String(phone).replace(/^\+/, "").slice(-10) || "9999999999",
        },
        order_meta: { return_url: `${data.return_url}?order_id={order_id}` },
      }),
    });
    const body = await res.json();
    if (!res.ok) { console.error("cashfree", res.status, body); throw new Error("Could not create payment order"); }
    return { order_id: orderId, payment_session_id: body.payment_session_id as string };
  });

export const confirmRechargeOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ order_id: z.string().min(1).max(64) }).parse(input))
  .handler(async ({ data, context }) => {
    const appId = process.env.CASHFREE_APP_ID;
    const secret = process.env.CASHFREE_SECRET_KEY;
    if (!appId || !secret) throw new Error("Payments are not configured");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: tx } = await supabaseAdmin.from("wallet_transactions")
      .select("id, user_id, amount_paise, status")
      .eq("provider_order_id", data.order_id).maybeSingle();
    if (!tx || tx.user_id !== context.userId) throw new Error("Order not found");
    if (tx.status === "success") return { status: "success" as const };

    const res = await fetch(`${CF_BASE}/orders/${encodeURIComponent(data.order_id)}`, {
      headers: { "x-client-id": appId, "x-client-secret": secret, "x-api-version": "2023-08-01" },
    });
    const body = await res.json();
    if (!res.ok) { console.error("cashfree-fetch", res.status, body); throw new Error("Could not verify payment"); }

    if (body.order_status === "PAID") {
      await creditWallet(tx.id, tx.user_id, tx.amount_paise, body.cf_order_id?.toString() ?? null);
      return { status: "success" as const };
    }
    if (body.order_status === "EXPIRED" || body.order_status === "TERMINATED") {
      await supabaseAdmin.from("wallet_transactions").update({ status: "failed" }).eq("id", tx.id);
      return { status: "failed" as const };
    }
    return { status: "pending" as const };
  });

export async function creditWallet(txId: string, userId: string, paise: number, paymentId: string | null) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: updated } = await supabaseAdmin.from("wallet_transactions")
    .update({ status: "success", provider_payment_id: paymentId })
    .eq("id", txId).eq("status", "pending").select("id").maybeSingle();
  if (!updated) return; // already processed
  const { data: w } = await supabaseAdmin.from("wallets").select("balance_paise").eq("user_id", userId).maybeSingle();
  const next = (w?.balance_paise ?? 0) + paise;
  await supabaseAdmin.from("wallets").upsert({ user_id: userId, balance_paise: next, updated_at: new Date().toISOString() });
}

export const getWalletOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: wallet }, { data: txs }] = await Promise.all([
      supabaseAdmin.from("wallets").select("balance_paise").eq("user_id", context.userId).maybeSingle(),
      supabaseAdmin.from("wallet_transactions")
        .select("id, amount_paise, kind, status, note, created_at")
        .eq("user_id", context.userId).order("created_at", { ascending: false }).limit(20),
    ]);
    return { balance_paise: wallet?.balance_paise ?? 0, transactions: txs ?? [] };
  });
