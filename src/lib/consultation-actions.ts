import { doc, getDoc } from "firebase/firestore";
import { getDb, ensureFirebaseUser } from "@/integrations/firebase/client";
import { ensureChatRoom } from "@/lib/firebase-chat";
import { createCall, type CallMode } from "@/lib/firebase-calls";

export interface ConsultationAstrologer {
  id: string;
  name: string;
  firebase_uid?: string | null;
  avatar_url?: string | null;
}

export async function getSignedInUserProfile() {
  const user = await ensureFirebaseUser();
  const snap = await getDoc(doc(getDb(), "users", user.uid));
  const data = snap.data() as
    | { name?: string; avatar_url?: string | null; photoURL?: string | null }
    | undefined;

  return {
    user,
    name: data?.name || user.displayName || user.phoneNumber || user.email || "Guest",
    avatar: data?.avatar_url || data?.photoURL || user.photoURL || null,
  };
}

export async function openAstrologerChat(astrologer: ConsultationAstrologer) {
  if (!astrologer.firebase_uid) {
    throw new Error("This astrologer is not yet activated. Ask admin to run /seed-astrologers.");
  }

  const { user, name } = await getSignedInUserProfile();
  return ensureChatRoom({
    userUid: user.uid,
    userName: name,
    astrologerId: astrologer.id,
    astrologerName: astrologer.name,
    astrologerFirebaseUid: astrologer.firebase_uid,
  });
}

export async function startAstrologerCall(astrologer: ConsultationAstrologer, mode: CallMode) {
  if (!astrologer.firebase_uid) {
    throw new Error("This astrologer is not yet activated. Ask admin to run /seed-astrologers.");
  }

  const { user, name, avatar } = await getSignedInUserProfile();
  return createCall({
    callerUid: user.uid,
    callerName: name,
    callerAvatar: avatar,
    calleeUid: astrologer.firebase_uid,
    calleeName: astrologer.name,
    calleeAvatar: astrologer.avatar_url ?? null,
    astrologerId: astrologer.id,
    mode,
  });
}

// Allows an astrologer to initiate a call back to a user
export async function startCallToUser(userUid: string, userName: string, mode: CallMode) {
  const { user: astrologer, name: astrologerName, avatar: astrologerAvatar } = await getSignedInUserProfile();
  return createCall({
    callerUid: astrologer.uid,
    callerName: astrologerName,
    callerAvatar: astrologerAvatar,
    calleeUid: userUid,
    calleeName: userName,
    calleeAvatar: null,
    astrologerId: astrologer.uid,
    mode,
  });
}
