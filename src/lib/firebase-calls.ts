// Firestore-backed call signalling (ringing / accept / reject / end).
import {
  addDoc, collection, doc, onSnapshot, orderBy, query, serverTimestamp,
  updateDoc, where, limit, type Timestamp, type Unsubscribe,
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
  return { id: ref.id, roomId };
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
    orderBy("createdAt", "desc"),
    limit(5),
  );
  return onSnapshot(q, (snap) => {
    const now = Date.now();
    const fresh = snap.docs
      .map((d) => ({ id: d.id, ...(d.data() as Omit<CallDoc, "id">) }))
      // Drop stale rings (>60s) so an old doc never re-pops.
      .filter((c) => {
        const t = c.createdAt?.toMillis?.() ?? now;
        return now - t < 60_000;
      });
    cb(fresh);
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
