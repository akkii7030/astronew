import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { MessageCircle } from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { requireAuth } from "@/lib/auth-guard";
import { getFirebaseAuth } from "@/integrations/firebase/client";
import { listenRooms, type ChatRoom } from "@/lib/firebase-chat";

export const Route = createFileRoute("/chats/")({
  ssr: false,
  beforeLoad: ({ location }) => requireAuth({ location }),
  head: () => ({ meta: [{ title: "Chats — Om Astro" }] }),
  component: ChatsPage,
});

function ChatsPage() {
  const [uid, setUid] = useState<string | null>(null);
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const unsubRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const auth = getFirebaseAuth();

    // Wait for Firebase auth to initialize — fixes "chats disappear on refresh"
    const offAuth = auth.onAuthStateChanged((u) => {
      offAuth(); // Only need the first emission

      if (!u) {
        setLoading(false);
        return;
      }

      setUid(u.uid);
      // Real-time listener — Firestore keeps this synced automatically
      unsubRef.current = listenRooms(u.uid, (r) => {
        setRooms(r);
        setLoading(false);
      });
    });

    return () => {
      offAuth();
      unsubRef.current?.();
    };
  }, []);

  return (
    <MobileShell>
      <div className="px-5 pt-2">
        <h1 className="font-display text-2xl">Chats</h1>
        <p className="mt-1 text-xs text-muted-foreground">Your conversations with astrologers.</p>

        <div className="mt-4 grid gap-2">
          {loading && (
            <div className="card-luxe p-8 text-center">
              <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-[var(--gold)] border-t-transparent" />
              <p className="mt-3 text-xs text-muted-foreground">Loading chats...</p>
            </div>
          )}

          {!loading && rooms.length === 0 && (
            <div className="card-luxe p-8 text-center">
              <MessageCircle className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">No chats yet.</p>
              <Link to="/astrologers" className="mt-3 inline-block rounded-full gold-bg px-4 py-2 text-xs font-semibold">
                Browse astrologers
              </Link>
            </div>
          )}

          {(() => {
            // Deduplicate chats by name to hide older placeholder chats (before seeding)
            const uniqueRooms = new Map<string, typeof rooms[0]>();
            for (const r of rooms) {
              const otherUid = r.members.find((m) => m !== uid) ?? "";
              const name = r.memberNames?.[otherUid] ?? "Astrologer";
              const existing = uniqueRooms.get(name);
              if (!existing || (r.lastMessageAt?.toMillis() ?? 0) > (existing.lastMessageAt?.toMillis() ?? 0)) {
                uniqueRooms.set(name, r);
              }
            }

            return Array.from(uniqueRooms.values()).map((r) => {
              const otherUid = r.members.find((m) => m !== uid) ?? "";
              const name = r.memberNames?.[otherUid] ?? "Astrologer";
            const unread = r.unread?.[uid ?? ""] ?? 0;
            const initials = name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase() || "?";
            return (
              <Link
                key={r.id}
                to="/chats/$id"
                params={{ id: r.id }}
                className="card-luxe flex items-center gap-3 p-3 transition-opacity active:opacity-70"
              >
                <div className="relative grid h-12 w-12 flex-shrink-0 place-items-center rounded-full gold-bg font-display text-base">
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="truncate font-display text-sm">{name}</span>
                    {r.lastMessageAt && (
                      <span className="ml-2 flex-shrink-0 text-[10px] text-muted-foreground">
                        {new Date(r.lastMessageAt.toMillis()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 flex items-center justify-between gap-2">
                    <p className="truncate text-xs text-muted-foreground">{r.lastMessage ?? "Say hello 👋"}</p>
                    {unread > 0 && (
                      <span className="flex-shrink-0 grid h-5 min-w-5 place-items-center rounded-full bg-emerald-500 px-1.5 text-[10px] font-semibold text-white">
                        {unread}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })})()}
        </div>
      </div>
    </MobileShell>
  );
}
