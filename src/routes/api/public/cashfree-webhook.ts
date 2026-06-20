import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";
import { creditWallet } from "@/lib/cashfree.functions";

export const Route = createFileRoute("/api/public/cashfree-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.CASHFREE_SECRET_KEY;
        if (!secret) return new Response("not configured", { status: 500 });

        const ts = request.headers.get("x-webhook-timestamp") ?? "";
        const sig = request.headers.get("x-webhook-signature") ?? "";
        const body = await request.text();

        const expected = createHmac("sha256", secret).update(ts + body).digest("base64");
        const a = Buffer.from(sig);
        const b = Buffer.from(expected);
        if (a.length !== b.length || !timingSafeEqual(a, b)) {
          return new Response("invalid signature", { status: 401 });
        }

        let payload: any;
        try { payload = JSON.parse(body); } catch { return new Response("bad json", { status: 400 }); }

        const type = payload?.type as string | undefined;
        const order = payload?.data?.order;
        const payment = payload?.data?.payment;
        if (type === "PAYMENT_SUCCESS_WEBHOOK" && order?.order_id) {
          const { getFirebaseAdmin } = await import("@/lib/cashfree.functions");
          const db = await getFirebaseAdmin();
          const snap = await db.collection("wallet_transactions")
            .where("provider_order_id", "==", order.order_id).limit(1).get();
          
          if (!snap.empty) {
            const txDoc = snap.docs[0];
            const tx = txDoc.data();
            if (tx.status === "pending") {
              await creditWallet(txDoc.id, tx.user_id, tx.amount_paise, payment?.cf_payment_id?.toString() ?? null);
            }
          }

        } else if (type === "PAYMENT_FAILED_WEBHOOK" && order?.order_id) {
          const { getFirebaseAdmin } = await import("@/lib/cashfree.functions");
          const db = await getFirebaseAdmin();
          const snap = await db.collection("wallet_transactions")
            .where("provider_order_id", "==", order.order_id).limit(1).get();
            
          if (!snap.empty) {
            await snap.docs[0].ref.update({ status: "failed" });
          }
        }
        return new Response("ok");
      },
    },
  },
});
