import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Send, Phone, Video, Smile } from "lucide-react";
import { type CallMode } from "@/lib/firebase-calls";
import { type ChatMessage } from "@/lib/firebase-chat";

const EMOJIS = ["🙏", "✨", "🌟", "🔮", "❤️", "🙌", "😊", "🌙", "🪐", "🕉️", "👏", "🌸"];

interface ChatRoomUIProps {
  uid: string;
  otherName: string;
  online: boolean;
  typing: boolean;
  msgs: ChatMessage[];
  onSend: (text: string) => Promise<void>;
  onTyping: (isTyping: boolean) => void;
  onBack: () => void;
  onStartCall?: (mode: CallMode) => Promise<void> | void;
  // Disable inputs if disconnected
  disabled?: boolean;
  callLoading?: boolean;
}

export function ChatRoomUI({
  uid,
  otherName,
  online,
  typing,
  msgs,
  onSend,
  onTyping,
  onBack,
  onStartCall,
  disabled,
  callLoading,
}: ChatRoomUIProps) {
  const [text, setText] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, typing]);

  const onChange = (v: string) => {
    setText(v);
    onTyping(true);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => onTyping(false), 2500);
  };

  const handleSend = async () => {
    if (!text.trim() || disabled) return;
    const t = text;
    setText("");
    setShowEmoji(false);
    await onSend(t);
  };

  const initials = useMemo(
    () => otherName.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase() || "?",
    [otherName],
  );

  return (
    <div className="mx-auto flex h-[100dvh] w-full max-w-md flex-col bg-background">
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-border bg-card/95 px-3 py-3 backdrop-blur">
        <button onClick={onBack} className="grid h-9 w-9 place-items-center rounded-full hover:bg-muted">
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
        {onStartCall && (
          <>
            <button
              type="button"
              onClick={() => void onStartCall("audio")}
              disabled={callLoading}
              className="grid h-9 w-9 place-items-center rounded-full border border-border bg-card disabled:opacity-50"
              aria-label={`Audio call ${otherName}`}
            >
              <Phone className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => void onStartCall("video")}
              disabled={callLoading}
              className="grid h-9 w-9 place-items-center rounded-full gold-bg disabled:opacity-50"
              aria-label={`Video call ${otherName}`}
            >
              <Video className="h-4 w-4" />
            </button>
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
          onKeyDown={(e) => { if (e.key === "Enter") void handleSend(); }}
          placeholder="Type a message…"
          disabled={disabled}
          className="flex-1 rounded-full border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-[var(--gold)] disabled:opacity-50"
        />
        <button
          onClick={handleSend}
          disabled={!text.trim() || disabled}
          className="grid h-10 w-10 place-items-center rounded-full gold-bg shadow-luxe disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
