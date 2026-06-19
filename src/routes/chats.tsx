import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { requireAuth } from "@/lib/auth-guard";
import { ensureFirebaseUser } from "@/integrations/firebase/client";
import { listenRooms, type ChatRoom } from "@/lib/firebase-chat";

export const Route = createFileRoute("/chats")({
  ssr: false,
  beforeLoad: ({ location }) => requireAuth({ location }),
  head: () => ({ meta: [{ title: "Chats — Om Astro" }] }),
  component: ChatsPage,
});

function ChatsPage() {
  const [uid, setUid] = useState<string | null>(null);
  const [rooms, setRooms] = useState<ChatRoom[]>([]);

  useEffect(() => {
    let unsub: (() => void) | undefined;
    ensureFirebaseUser().then((u) => {
      setUid(u.uid);
      unsub = listenRooms(u.uid, setRooms);
    });
    return () => unsub?.();
  }, []);

  return (
    <MobileShell>
      <div className="px-5 pt-2">
        <h1 className="font-display text-2xl">Chats</h1>
        <p className="mt-1 text-xs text-muted-foreground">Your conversations with astrologers.</p>

        <div className="mt-4 grid gap-2">
          {rooms.length === 0 && (
            <div className="card-luxe p-8 text-center">
              <MessageCircle className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">No chats yet.</p>
              <Link to="/astrologers" className="mt-3 inline-block rounded-full gold-bg px-4 py-2 text-xs font-semibold">
                Browse astrologers
              </Link>
            </div>
          )}
          {rooms.map((r) => {
            const otherUid = r.members.find((m) => m !== uid) ?? "";
            const name = r.memberNames?.[otherUid] ?? "Astrologer";
            const unread = r.unread?.[uid ?? ""] ?? 0;
            return (
              <Link
                key={r.id}
                to="/chats/$id"
                params={{ id: r.id }}
                className="card-luxe flex items-center gap-3 p-3"
              >
                <div className="grid h-12 w-12 place-items-center rounded-full gold-bg font-display text-base">
                  {name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="truncate font-display text-sm">{name}</span>
                    {r.lastMessageAt && (
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(r.lastMessageAt.toMillis()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 flex items-center justify-between gap-2">
                    <p className="truncate text-xs text-muted-foreground">{r.lastMessage ?? "Say hello"}</p>
                    {unread > 0 && (
                      <span className="grid h-5 min-w-5 place-items-center rounded-full bg-emerald-500 px-1.5 text-[10px] font-semibold text-white">
                        {unread}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </MobileShell>
  );
}
