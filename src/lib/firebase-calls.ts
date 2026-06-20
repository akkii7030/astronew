// Firestore-backed call signalling (ringing / accept / reject / end).
import {
  addDoc, collection, doc, onSnapshot, orderBy, query, serverTimestamp,
  updateDoc, where, limit, getDoc, type Timestamp, type Unsubscribe,
} from "firebase/firestore";
import { getDb } from "@/integrations/firebase/client";
import { roomIdFor } from "@/lib/firebase-chat";

export type CallMode = "audio" | "video";
export type CallStatus = "ringing" | "accepted" | "rejected" | "ended" | "missed";

export interface CallDoc {
  id: string;
  callerUid: string;
  callerName: string;
  callerAvatar?: string | null;
  calleeUid: string;
  calleeName: string;
  calleeAvatar?: string | null;
  astrologerId?: string | null;
  mode: CallMode;
  roomId: string;
  status: CallStatus;
  createdAt: Timestamp | null;
  endedAt?: Timestamp | null;
}

export async function createCall(opts: {
  callerUid: string; callerName: string; callerAvatar?: string | null;
  calleeUid: string; calleeName: string; calleeAvatar?: string | null;
  astrologerId?: string | null;
  mode: CallMode;
}) {
  const roomId = roomIdFor(opts.callerUid, opts.calleeUid) + "_" + Date.now();
  console.log("[createCall] Creating call with callerUid:", opts.callerUid, "calleeUid:", opts.calleeUid, "roomId:", roomId);
  console.log("[createCall] Astrologer ID:", opts.astrologerId, "Mode:", opts.mode);
  try {
    const ref = await addDoc(collection(getDb(), "calls"), {
      callerUid: opts.callerUid,
      callerName: opts.callerName,
      callerAvatar: opts.callerAvatar ?? null,
      calleeUid: opts.calleeUid,
      calleeName: opts.calleeName,
      calleeAvatar: opts.calleeAvatar ?? null,
      astrologerId: opts.astrologerId ?? null,
      mode: opts.mode,
      roomId,
      status: "ringing" as CallStatus,
      createdAt: serverTimestamp(),
    });
    console.log("[createCall] Call created with ID:", ref.id);
    
    // Verify the call was written
    const verifySnap = await getDoc(doc(getDb(), "calls", ref.id));
    console.log("[createCall] Verification - call exists in Firestore:", verifySnap.exists());
    if (verifySnap.exists()) {
      const data = verifySnap.data();
      console.log("[createCall] Call data:", data);
    }
    
    return { id: ref.id, roomId };
  } catch (e) {
    console.error("[createCall] Failed to create call:", e);
    throw e;
  }
}

export function listenCall(callId: string, cb: (call: CallDoc | null) => void): Unsubscribe {
  return onSnapshot(doc(getDb(), "calls", callId), (snap) => {
    if (!snap.exists()) return cb(null);
    cb({ id: snap.id, ...(snap.data() as Omit<CallDoc, "id">) });
  });
}

/** Listen for ringing calls addressed to the given firebase uid. */
export function listenIncomingCalls(
  calleeUid: string,
  cb: (calls: CallDoc[]) => void,
): Unsubscribe {
  const q = query(
    collection(getDb(), "calls"),
    where("calleeUid", "==", calleeUid),
    where("status", "==", "ringing"),
  );
  return onSnapshot(q, (snap) => {
    const now = Date.now();
    const fresh = snap.docs
      .map((d) => ({ id: d.id, ...(d.data() as Omit<CallDoc, "id">) }))
      .filter((c) =>
        !!c.callerUid &&
        !!c.calleeUid &&
        !!c.callerName &&
        !!c.calleeName &&
        (c.mode === "audio" || c.mode === "video") &&
        !!c.roomId
      )
      // Drop stale rings (>60s) so an old doc never re-pops.
      .filter((c) => {
        const t = c.createdAt?.toMillis?.() ?? now;
        return now - t < 60_000;
      })
      // Sort descending (newest first) client-side to avoid needing a Firestore composite index
      .sort((a, b) => {
        const ta = a.createdAt?.toMillis?.() ?? now;
        const tb = b.createdAt?.toMillis?.() ?? now;
        return tb - ta;
      });
    cb(fresh);
  });
}

/** Listen for call history (all calls involving the given uid as caller or callee). */
export function listenCallHistory(
  uid: string,
  cb: (calls: CallDoc[]) => void,
): Unsubscribe {
  const q = query(
    collection(getDb(), "calls"),
    where("callerUid", "==", uid),
    orderBy("createdAt", "desc"),
    limit(50),
  );
  return onSnapshot(q, (snap) => {
    const calls = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<CallDoc, "id">) }));
    cb(calls);
  });
}

/** Listen for received calls (where uid was the callee). */
export function listenReceivedCalls(
  uid: string,
  cb: (calls: CallDoc[]) => void,
): Unsubscribe {
  const q = query(
    collection(getDb(), "calls"),
    where("calleeUid", "==", uid),
    orderBy("createdAt", "desc"),
    limit(50),
  );
  return onSnapshot(q, (snap) => {
    const calls = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<CallDoc, "id">) }));
    cb(calls);
  });
}

export async function setCallStatus(callId: string, status: CallStatus) {
  await updateDoc(doc(getDb(), "calls", callId), {
    status,
    ...(status === "ended" || status === "rejected" || status === "missed"
      ? { endedAt: serverTimestamp() }
      : {}),
  });
}
