// Server function: generate a ZEGO Token04 (Kit Token) for the authenticated
// Firebase user. The ZEGO ServerSecret never leaves the server.
import { createServerFn } from "@tanstack/react-start";
import { jwtVerify, createRemoteJWKSet } from "jose";
import { randomBytes, createCipheriv } from "node:crypto";

const FIREBASE_PROJECT_ID = "omastro-42ea9";
const JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"),
);

function generateToken04(appId: number, userId: string, secret: string, effectiveSec: number) {
  if (secret.length !== 32) throw new Error("ZEGO server secret must be 32 chars");
  const createTime = Math.floor(Date.now() / 1000);
  const tokenInfo = {
    app_id: appId,
    user_id: userId,
    nonce: Math.floor(Math.random() * 2147483647),
    ctime: createTime,
    expire: createTime + effectiveSec,
    payload: "",
  };
  const plaintext = Buffer.from(JSON.stringify(tokenInfo), "utf8");
  const iv = randomBytes(16);
  const key = Buffer.from(secret, "utf8");
  const cipher = createCipheriv("aes-256-cbc", key, iv);
  const enc = Buffer.concat([cipher.update(plaintext), cipher.final()]);

  const buf = Buffer.alloc(8 + 2 + iv.length + 2 + enc.length);
  let off = 0;
  buf.writeBigInt64BE(BigInt(tokenInfo.expire), off); off += 8;
  buf.writeUInt16BE(iv.length, off); off += 2;
  iv.copy(buf, off); off += iv.length;
  buf.writeUInt16BE(enc.length, off); off += 2;
  enc.copy(buf, off);
  return "04" + buf.toString("base64");
}

export const getZegoKitToken = createServerFn({ method: "POST" })
  .inputValidator((data: { idToken: string; userId: string; userName: string }) => {
    if (!data?.idToken || typeof data.idToken !== "string") throw new Error("idToken required");
    if (!data?.userId || typeof data.userId !== "string" || data.userId.length > 64) {
      throw new Error("userId required");
    }
    if (!data?.userName || typeof data.userName !== "string" || data.userName.length > 64) {
      throw new Error("userName required");
    }
    return data;
  })
  .handler(async ({ data }) => {
    const { payload } = await jwtVerify(data.idToken, JWKS, {
      issuer: `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`,
      audience: FIREBASE_PROJECT_ID,
    });
    const firebaseUid = typeof payload.sub === "string" ? payload.sub : null;
    if (!firebaseUid) throw new Error("Invalid Firebase token");

    const appId = Number(process.env.ZEGO_APP_ID);
    const secret = process.env.ZEGO_SERVER_SECRET;
    if (!appId || !secret) throw new Error("ZEGO credentials not configured");

    const token = generateToken04(appId, data.userId, secret, 60 * 60); // 1h
    return { token, appId };
  });
