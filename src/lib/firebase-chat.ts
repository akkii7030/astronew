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
}) {
  const db = getDb();
  const otherUid = astroUid(opts.astrologerId);
  const id = roomIdFor(opts.userUid, otherUid);
  const ref = doc(db, "chats", id);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      members: [opts.userUid, otherUid],
      memberNames: { [opts.userUid]: opts.userName, [otherUid]: opts.astrologerName },
      astrologerId: opts.astrologerId,
      createdAt: serverTimestamp(),
      lastMessageAt: serverTimestamp(),
      unread: { [opts.userUid]: 0, [otherUid]: 0 },
    });
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
    cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ChatRoom, "id">) })));
  });
}

export function listenMessages(roomId: string, cb: (msgs: ChatMessage[]) => void): Unsubscribe {
  const db = getDb();
  const q = query(
    collection(db, "chats", roomId, "messages"),
    orderBy("createdAt", "asc"),
    limit(200),
  );
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ChatMessage, "id">) })));
  });
}

export async function sendMessage(roomId: string, senderId: string, otherId: string, text: string) {
  const db = getDb();
  const trimmed = text.trim();
  if (!trimmed) return;
  await addDoc(collection(db, "chats", roomId, "messages"), {
    text: trimmed, senderId, createdAt: serverTimestamp(),
  });
  await updateDoc(doc(db, "chats", roomId), {
    lastMessage: trimmed,
    lastMessageAt: serverTimestamp(),
    lastSenderId: senderId,
    [`unread.${otherId}`]: (await getUnread(roomId, otherId)) + 1,
  });
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
