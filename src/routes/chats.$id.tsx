import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Send, Phone, Video, Smile } from "lucide-react";
import { requireAuth } from "@/lib/auth-guard";
import { ensureFirebaseUser } from "@/integrations/firebase/client";
import {
  listenMessages, sendMessage, setTyping, listenTyping, markRead,
  listenPresence, setPresence, type ChatMessage,
} from "@/lib/firebase-chat";
import { doc, getDoc } from "firebase/firestore";
import { getDb } from "@/integrations/firebase/client";

export const Route = createFileRoute("/chats/$id")({
  ssr: false,
  beforeLoad: ({ location }) => requireAuth({ location }),
  head: () => ({ meta: [{ title: "Chat — Om Astro" }] }),
  component: ChatRoomPage,
});

const EMOJIS = ["🙏", "✨", "🌟", "🔮", "❤️", "🙌", "😊", "🌙", "🪐", "🕉️", "👏", "🌸"];

function ChatRoomPage() {
  const { id: roomId } = Route.useParams();
  const navigate = useNavigate();
  const [uid, setUid] = useState<string | null>(null);
  const [otherUid, setOtherUid] = useState<string>("");
  const [otherName, setOtherName] = useState("Astrologer");
  const [astrologerId, setAstrologerId] = useState<string>("");
  const [msgs, setMsgs] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [typing, setTypingState] = useState(false);
  const [online, setOnline] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Set up user, room metadata, listeners
  useEffect(() => {
    let unsubs: Array<() => void> = [];
    (async () => {
      const u = await ensureFirebaseUser();
      setUid(u.uid);
      void setPresence(u.uid, true);

      const roomSnap = await getDoc(doc(getDb(), "chats", roomId));
      const roomData = roomSnap.data() as
        | { members?: string[]; memberNames?: Record<string, string>; astrologerId?: string }
        | undefined;
      const other = roomData?.members?.find((m) => m !== u.uid) ?? "";
      setOtherUid(other);
      setOtherName(roomData?.memberNames?.[other] ?? "Astrologer");
      setAstrologerId(roomData?.astrologerId ?? other.replace(/^astro-/, ""));

      unsubs.push(listenMessages(roomId, setMsgs));
      if (other) {
        unsubs.push(listenTyping(roomId, other, setTypingState));
        unsubs.push(listenPresence(other, setOnline));
      }
      void markRead(roomId, u.uid);
    })();

    const beforeUnload = () => uid && void setPresence(uid, false);
    window.addEventListener("beforeunload", beforeUnload);
    return () => {
      unsubs.forEach((fn) => fn());
      window.removeEventListener("beforeunload", beforeUnload);
      if (uid) void setPresence(uid, false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  // Mark read whenever messages arrive
  useEffect(() => {
    if (uid) void markRead(roomId, uid);
  }, [msgs, uid, roomId]);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, typing]);

  const onChange = (v: string) => {
    setText(v);
    if (!uid) return;
    void setTyping(roomId, uid, true);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => uid && void setTyping(roomId, uid, false), 2500);
  };

  const onSend = async () => {
    if (!uid || !otherUid || !text.trim()) return;
    const t = text;
    setText("");
    setShowEmoji(false);
    await sendMessage(roomId, uid, otherUid, t);
    void setTyping(roomId, uid, false);
  };

  const initials = useMemo(
    () => otherName.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase(),
    [otherName],
  );

  return (
    <div className="mx-auto flex h-[100dvh] w-full max-w-md flex-col bg-background">
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-border bg-card/95 px-3 py-3 backdrop-blur">
        <button onClick={() => navigate({ to: "/chats" })} className="grid h-9 w-9 place-items-center rounded-full hover:bg-muted">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="relative">
          <div className="grid h-10 w-10 place-items-center rounded-full gold-bg font-display text-sm">{initials}</div>
          {online && <span className="absolute -bottom-0.5 right-0 h-3 w-3 rounded-full border-2 border-card bg-emerald-500" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-sm">{otherName}</p>
          <p className="text-[11px] text-muted-foreground">
            {typing ? "typing…" : online ? "Online" : "Offline"}
          </p>
        </div>
        {astrologerId && (
          <>
            <Link to="/call/$mode/$id" params={{ mode: "audio", id: astrologerId }} className="grid h-9 w-9 place-items-center rounded-full border border-border bg-card">
              <Phone className="h-4 w-4" />
            </Link>
            <Link to="/call/$mode/$id" params={{ mode: "video", id: astrologerId }} className="grid h-9 w-9 place-items-center rounded-full gold-bg">
              <Video className="h-4 w-4" />
            </Link>
          </>
        )}
      </header>

      <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto px-4 py-4">
        {msgs.map((m) => {
          const mine = m.senderId === uid;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[78%] rounded-2xl px-3.5 py-2 text-sm shadow-soft ${
                mine ? "gold-bg rounded-br-md" : "bg-card border border-border rounded-bl-md"
              }`}>
                <p className="whitespace-pre-wrap break-words">{m.text}</p>
                <p className={`mt-1 text-[10px] ${mine ? "text-foreground/60" : "text-muted-foreground"}`}>
                  {m.createdAt ? new Date(m.createdAt.toMillis()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "…"}
                </p>
              </div>
            </div>
          );
        })}
        {typing && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-md border border-border bg-card px-3 py-2 text-xs text-muted-foreground">
              typing…
            </div>
          </div>
        )}
      </div>

      {showEmoji && (
        <div className="grid grid-cols-6 gap-2 border-t border-border bg-card px-3 py-2">
          {EMOJIS.map((e) => (
            <button key={e} onClick={() => setText((t) => t + e)} className="rounded-lg p-1.5 text-xl hover:bg-muted">
              {e}
            </button>
          ))}
        </div>
      )}

      <div className="sticky bottom-0 flex items-center gap-2 border-t border-border bg-card px-3 py-2.5">
        <button onClick={() => setShowEmoji((s) => !s)} className="grid h-10 w-10 place-items-center rounded-full hover:bg-muted">
          <Smile className="h-5 w-5 text-muted-foreground" />
        </button>
        <input
          value={text}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") void onSend(); }}
          placeholder="Type a message…"
          className="flex-1 rounded-full border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-[var(--gold)]"
        />
        <button
          onClick={onSend}
          disabled={!text.trim()}
          className="grid h-10 w-10 place-items-center rounded-full gold-bg shadow-luxe disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
