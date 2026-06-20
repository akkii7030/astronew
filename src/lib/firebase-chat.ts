// Firestore chat helpers (browser-only).
import {
  collection, doc, setDoc, addDoc, getDoc, onSnapshot, orderBy, query,
  serverTimestamp, updateDoc, where, limit, type Unsubscribe, type Timestamp,
} from "firebase/firestore";
import { getDb } from "@/integrations/firebase/client";

export const astroUid = (astrologerId: string) => `astro-${astrologerId}`;

export function roomIdFor(uidA: string, uidB: string) {
  return [uidA, uidB].sort().join("__");
}

export interface ChatMessage {
  id: string;
  text: string;
  senderId: string;
  createdAt: Timestamp | null;
}

export interface ChatRoom {
  id: string;
  members: string[];
  memberNames: Record<string, string>;
  memberAvatars?: Record<string, string>;
  lastMessage?: string;
  lastMessageAt?: Timestamp | null;
  lastSenderId?: string;
  unread?: Record<string, number>;
}

export async function ensureChatRoom(opts: {
  userUid: string; userName: string;
  astrologerId: string; astrologerName: string;
  astrologerFirebaseUid?: string | null;
}) {
  const db = getDb();
  const otherUid = opts.astrologerFirebaseUid || astroUid(opts.astrologerId);
  const id = roomIdFor(opts.userUid, otherUid);
  const ref = doc(db, "chats", id);
  const snap = await getDoc(ref);
  
  if (!snap.exists()) {
    await setDoc(ref, {
      members: [opts.userUid, otherUid],
      memberNames: { [opts.userUid]: opts.userName, [otherUid]: opts.astrologerName },
      astrologerId: opts.astrologerId,
      astrologerFirebaseUid: otherUid,  // stored so chat room knows which side is the astrologer
      createdAt: serverTimestamp(),
      lastMessageAt: serverTimestamp(),
      unread: { [opts.userUid]: 0, [otherUid]: 0 },
    });
  } else {
    // If the chat exists, patch the names so that if the user updated their profile (e.g. from Guest to a real name),
    // the astrologer will see the new name.
    await setDoc(ref, {
      memberNames: { [opts.userUid]: opts.userName, [otherUid]: opts.astrologerName },
    }, { merge: true });
    
    // Update astrologerFirebaseUid in case it was created before seeding
    const data = snap.data() as { astrologerFirebaseUid?: string };
    if (!data.astrologerFirebaseUid && otherUid) {
      await updateDoc(ref, { astrologerFirebaseUid: otherUid });
    }
  }
  return id;
}

export function listenRooms(userUid: string, cb: (rooms: ChatRoom[]) => void): Unsubscribe {
  const db = getDb();
  const q = query(
    collection(db, "chats"),
    where("members", "array-contains", userUid),
    orderBy("lastMessageAt", "desc"),
    limit(50),
  );
  return onSnapshot(q, (snap) => {
    const rooms = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ChatRoom, "id">) }));
    cb(rooms);
  });
}

export function listenMessages(roomId: string, cb: (msgs: ChatMessage[]) => void): Unsubscribe {
  const db = getDb();
  const q = query(
    collection(db, "chats", roomId, "messages"),
    orderBy("createdAt", "asc"),
    limit(200),
  );
  console.log("[listenMessages] Listening for messages in roomId:", roomId);
  return onSnapshot(q, (snap) => {
    const msgs = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ChatMessage, "id">) }));
    console.log("[listenMessages] Messages snapshot:", msgs.length, msgs);
    cb(msgs);
  }, (error) => {
    console.error("[listenMessages] Error listening to messages:", error);
  });
}

export async function sendMessage(roomId: string, senderId: string, otherId: string, text: string) {
  const db = getDb();
  const trimmed = text.trim();
  if (!trimmed) return;
  console.log("[sendMessage] Sending message:", { roomId, senderId, otherId, text: trimmed });
  try {
    const msgRef = await addDoc(collection(db, "chats", roomId, "messages"), {
      text: trimmed, senderId, createdAt: serverTimestamp(),
    });
    console.log("[sendMessage] Message added with ID:", msgRef.id);
    
    await updateDoc(doc(db, "chats", roomId), {
      lastMessage: trimmed,
      lastMessageAt: serverTimestamp(),
      lastSenderId: senderId,
      [`unread.${otherId}`]: (await getUnread(roomId, otherId)) + 1,
    });
    console.log("[sendMessage] Chat room updated successfully");
  } catch (e) {
    console.error("[sendMessage] Failed to send message:", e);
    throw e;
  }
}

async function getUnread(roomId: string, uid: string) {
  const snap = await getDoc(doc(getDb(), "chats", roomId));
  const data = snap.data() as { unread?: Record<string, number> } | undefined;
  return data?.unread?.[uid] ?? 0;
}

export async function markRead(roomId: string, uid: string) {
  await updateDoc(doc(getDb(), "chats", roomId), { [`unread.${uid}`]: 0 });
}

export function setTyping(roomId: string, uid: string, typing: boolean) {
  return setDoc(doc(getDb(), "chats", roomId, "typing", uid), {
    typing, at: serverTimestamp(),
  });
}

export function listenTyping(roomId: string, otherUid: string, cb: (typing: boolean) => void): Unsubscribe {
  return onSnapshot(doc(getDb(), "chats", roomId, "typing", otherUid), (snap) => {
    const d = snap.data() as { typing?: boolean; at?: Timestamp } | undefined;
    if (!d) return cb(false);
    const ageMs = d.at ? Date.now() - d.at.toMillis() : 99999;
    cb(!!d.typing && ageMs < 8000);
  });
}

export function setPresence(uid: string, online: boolean) {
  return setDoc(doc(getDb(), "presence", uid), {
    online, at: serverTimestamp(),
  }, { merge: true });
}

export function listenPresence(uid: string, cb: (online: boolean) => void): Unsubscribe {
  return onSnapshot(doc(getDb(), "presence", uid), (snap) => {
    const d = snap.data() as { online?: boolean; at?: Timestamp } | undefined;
    if (!d) return cb(false);
    const ageMs = d.at ? Date.now() - d.at.toMillis() : 99999;
    cb(!!d.online && ageMs < 60_000);
  });
}
