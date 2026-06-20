import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Firebase Admin SDK is needed for server-side operations.
// Wallet/payment features use Firestore on the server.
export async function getFirebaseAdmin() {
  const { initializeApp, getApps, cert } = await import(/* @vite-ignore */ "firebase-admin/app");
  const { getFirestore } = await import(/* @vite-ignore */ "firebase-admin/firestore");
  if (!getApps().length) {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID ?? "omastro-42ea9",
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL ?? "",
        privateKey: (process.env.FIREBASE_PRIVATE_KEY ?? "").replace(/\\n/g, "\n"),
      }),
    });
  }
  return getFirestore();
}

const CF_BASE = "https://api.cashfree.com/pg"; // live

const rechargeSchema = z.object({
  amount_inr: z.number().int().min(10).max(100000),
  return_url: z.string().url(),
  userId: z.string().min(1),
});

export const createRechargeOrder = createServerFn({ method: "POST" })
  .inputValidator((input) => rechargeSchema.parse(input))
  .handler(async ({ data }) => {
    const appId = process.env.CASHFREE_APP_ID;
    const secret = process.env.CASHFREE_SECRET_KEY;
    if (!appId || !secret) throw new Error("Payments are not configured");

    const db = await getFirebaseAdmin();
    const orderId = `omw_${data.userId.slice(0, 8)}_${Date.now()}`;
    const amount_paise = data.amount_inr * 100;

    await db.collection("wallet_transactions").add({
      user_id: data.userId, amount_paise, kind: "credit", status: "pending",
      provider: "cashfree", provider_order_id: orderId, note: "Wallet recharge",
      created_at: new Date().toISOString(),
    });

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
          customer_id: data.userId,
          customer_email: `user_${data.userId.slice(0, 8)}@omastro.app`,
          customer_phone: "9999999999",
        },
        order_meta: { return_url: `${data.return_url}?order_id={order_id}` },
      }),
    });
    const body = await res.json();
    if (!res.ok) { console.error("cashfree", res.status, body); throw new Error("Could not create payment order"); }
    return { order_id: orderId, payment_session_id: body.payment_session_id as string };
  });

export const confirmRechargeOrder = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({
    order_id: z.string().min(1).max(64),
    userId: z.string().min(1),
  }).parse(input))
  .handler(async ({ data }) => {
    const appId = process.env.CASHFREE_APP_ID;
    const secret = process.env.CASHFREE_SECRET_KEY;
    if (!appId || !secret) throw new Error("Payments are not configured");

    const db = await getFirebaseAdmin();
    const snap = await db.collection("wallet_transactions")
      .where("provider_order_id", "==", data.order_id).limit(1).get();
    
    if (snap.empty) throw new Error("Order not found");
    const txDoc = snap.docs[0];
    const tx = txDoc.data();
    if (tx.user_id !== data.userId) throw new Error("Order not found");
    if (tx.status === "success") return { status: "success" as const };

    const res = await fetch(`${CF_BASE}/orders/${encodeURIComponent(data.order_id)}`, {
      headers: { "x-client-id": appId, "x-client-secret": secret, "x-api-version": "2023-08-01" },
    });
    const body = await res.json();
    if (!res.ok) { console.error("cashfree-fetch", res.status, body); throw new Error("Could not verify payment"); }

    if (body.order_status === "PAID") {
      await creditWallet(txDoc.id, tx.user_id, tx.amount_paise, body.cf_order_id?.toString() ?? null);
      return { status: "success" as const };
    }
    if (body.order_status === "EXPIRED" || body.order_status === "TERMINATED") {
      await txDoc.ref.update({ status: "failed" });
      return { status: "failed" as const };
    }
    return { status: "pending" as const };
  });

export async function creditWallet(txId: string, userId: string, paise: number, paymentId: string | null) {
  const db = await getFirebaseAdmin();
  const txRef = db.collection("wallet_transactions").doc(txId);
  const txSnap = await txRef.get();
  if (!txSnap.exists || txSnap.data()?.status !== "pending") return;
  await txRef.update({ status: "success", provider_payment_id: paymentId });
  
  const walletRef = db.collection("wallets").doc(userId);
  await db.runTransaction(async (t) => {
    const w = await t.get(walletRef);
    const current = w.exists ? (w.data()?.balance_paise ?? 0) : 0;
    t.set(walletRef, { user_id: userId, balance_paise: current + paise, updated_at: new Date().toISOString() }, { merge: true });
  });
}

export const getWalletOverview = createServerFn({ method: "GET" })
  .inputValidator((input) => z.object({ userId: z.string().min(1) }).parse(input))
  .handler(async ({ data }) => {
    const db = await getFirebaseAdmin();
    const [walletSnap, txsSnap] = await Promise.all([
      db.collection("wallets").doc(data.userId).get(),
      db.collection("wallet_transactions")
        .where("user_id", "==", data.userId)
        .orderBy("created_at", "desc").limit(20).get(),
    ]);
    return {
      balance_paise: walletSnap.exists ? (walletSnap.data()?.balance_paise ?? 0) : 0,
      transactions: txsSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
    };
  });
