// Astrologer dashboard. Listens for the firebase auth user and shows
// "Online, waiting for calls". The global IncomingCallModal handles ringing.
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { doc, onSnapshot, query, collection, where, orderBy, limit } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { Radio, LogOut, MessageCircle, Phone, Video, Clock } from "lucide-react";
import { getFirebaseAuth, getDb } from "@/integrations/firebase/client";
import { setPresence, listenRooms, type ChatRoom } from "@/lib/firebase-chat";
import { listenReceivedCalls, type CallDoc, type CallMode } from "@/lib/firebase-calls";

export const Route = createFileRoute("/astrologer")({
  ssr: false,
  head: () => ({ meta: [{ title: "Astrologer — Om Astro" }] }),
  component: AstrologerHome,
});

interface UserDoc {
  name?: string; role?: string; avatar_url?: string | null; email?: string;
  skills?: string[]; languages?: string[];
}

function AstrologerHome() {
  const navigate = useNavigate();
  const [uid, setUid] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserDoc | null>(null);
  const [notAstrologer, setNotAstrologer] = useState(false);
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [calls, setCalls] = useState<CallDoc[]>([]);
  const [callLoading, setCallLoading] = useState(false);

  useEffect(() => {
    const auth = getFirebaseAuth();
    const off = auth.onAuthStateChanged((u) => {
      if (!u) { navigate({ to: "/astrologer-login" }); return; }
      setUid(u.uid);
      setPresence(u.uid, true).catch(() => undefined);
      const ref = doc(getDb(), "users", u.uid);
      const stop = onSnapshot(ref, (snap) => {
        const data = snap.data() as UserDoc | undefined;
        if (!data || data.role !== "astrologer") {
          setNotAstrologer(true);
        } else {
          setNotAstrologer(false);
          setProfile(data);
        }
      });
      return () => stop();
    });
    return () => off();
  }, [navigate]);

  useEffect(() => {
    if (!uid) return;
    console.log("[AstrologerHome] Listening for chat rooms for UID:", uid);
    const unsub = listenRooms(uid, setRooms);
    return () => unsub();
  }, [uid]);

  useEffect(() => {
    if (!uid) return;
    console.log("[AstrologerHome] Listening for received calls for UID:", uid);
    const unsub = listenReceivedCalls(uid, setCalls);
    return () => unsub();
  }, [uid]);

  const handleCallUser = async (userUid: string, userName: string, mode: CallMode) => {
    if (callLoading) return;
    setCallLoading(true);
    try {
      const { startCallToUser } = await import("@/lib/consultation-actions");
      const { id: callId } = await startCallToUser(userUid, userName, mode);
      navigate({
        to: "/call/$mode/$id",
        params: { mode, id: userUid },
        search: { callId },
      });
    } catch (e) {
      console.error("Failed to start call", e);
      import("sonner").then((m) => m.toast.error("Could not start call"));
    } finally {
      setCallLoading(false);
    }
  };

  async function handleSignOut() {
    const u = getFirebaseAuth().currentUser;
    if (u) await setPresence(u.uid, false).catch(() => undefined);
    await signOut(getFirebaseAuth());
    navigate({ to: "/astrologer-login" });
  }

  if (notAstrologer) {
    return (
      <div className="mx-auto max-w-md p-8 text-center">
        <p className="text-sm text-destructive">This account is not registered as an astrologer.</p>
        <button onClick={handleSignOut} className="mt-4 rounded-full gold-bg px-4 py-2 text-xs">Sign out</button>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-md bg-background px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl">Astrologer <span className="gold-text">Console</span></h1>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1.5 text-xs"
        >
          <LogOut className="h-3.5 w-3.5" /> Sign out
        </button>
      </div>

      <div className="card-luxe mt-6 p-5 text-center">
        {profile?.avatar_url && (
          <img src={profile.avatar_url} alt={profile.name}
               className="mx-auto h-24 w-24 rounded-full border-4 border-card object-cover shadow-luxe" />
        )}
        <h2 className="mt-3 font-display text-xl">{profile?.name ?? "Astrologer"}</h2>
        <p className="text-xs text-muted-foreground">{profile?.email}</p>
        {profile?.skills && profile.skills.length > 0 && (
          <p className="mt-2 text-xs text-muted-foreground">{profile.skills.join(" · ")}</p>
        )}

        <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-700">
          <span className="relative grid h-2.5 w-2.5 place-items-center">
            <span className="absolute inset-0 animate-ping rounded-full bg-emerald-500/60" />
            <span className="relative h-2.5 w-2.5 rounded-full bg-emerald-500" />
          </span>
          Online — waiting for calls
        </div>

        {uid && (
          <p className="mt-4 break-all text-[10px] text-muted-foreground">uid: {uid}</p>
        )}
      </div>

      <div className="mt-6 card-luxe p-5">
        <div className="flex items-start gap-3">
          <Radio className="mt-0.5 h-5 w-5 text-[var(--gold)]" />
          <div>
            <p className="text-sm font-semibold">How it works</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Keep this page open. When a user starts a call from your profile,
              a full-screen popup will ring on this device. Tap Accept to connect.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 card-luxe p-5">
        <div className="mb-3 flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-[var(--gold)]" />
          <p className="text-sm font-semibold">Recent Chats</p>
        </div>
        {rooms.length === 0 ? (
          <p className="text-xs text-muted-foreground">No chats yet. Users will appear here when they message you.</p>
        ) : (
          <div className="space-y-2">
            {rooms.map((r) => {
              const otherUid = r.members.find((m) => m !== uid) ?? "";
              const name = r.memberNames?.[otherUid] ?? "User";
              const unread = r.unread?.[uid ?? ""] ?? 0;
              return (
                <Link
                  key={r.id}
                  to="/chats/$id"
                  params={{ id: r.id }}
                  className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 hover:bg-muted/50"
                >
                  <div className="grid h-10 w-10 place-items-center rounded-full gold-bg font-display text-sm">
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
                      <p className="truncate text-xs text-muted-foreground">{r.lastMessage ?? "No messages"}</p>
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
        )}
      </div>

      <div className="mt-6 card-luxe p-5">
        <div className="mb-3 flex items-center gap-2">
          <Clock className="h-5 w-5 text-[var(--gold)]" />
          <p className="text-sm font-semibold">Call History</p>
        </div>
        {calls.length === 0 ? (
          <p className="text-xs text-muted-foreground">No calls yet. Users will appear here when they call you.</p>
        ) : (
          <div className="space-y-2">
            {calls.map((c) => {
              const callerName = c.callerName || "User";
              const statusColor = c.status === "ended" ? "text-muted-foreground" : 
                                 c.status === "rejected" ? "text-destructive" : 
                                 c.status === "missed" ? "text-orange-500" : "text-emerald-500";
              return (
                <div key={c.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                  <div className="grid h-10 w-10 place-items-center rounded-full gold-bg font-display text-sm">
                    {callerName.split(" ").map((p) => p[0]).slice(0, 2).join("")}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="truncate font-display text-sm">{callerName}</span>
                      <span className={`text-[10px] ${statusColor} capitalize`}>{c.status}</span>
                    </div>
                    <div className="mt-0.5 flex items-center justify-between gap-2">
                      <p className="truncate text-xs text-muted-foreground">
                        {c.mode === "video" ? "Video call" : "Audio call"}
                        {c.createdAt && ` • ${new Date(c.createdAt.toMillis()).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`}
                      </p>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleCallUser(c.callerUid, callerName, "audio")}
                          disabled={callLoading}
                          className="grid h-7 w-7 place-items-center rounded-full border border-border bg-card hover:bg-muted disabled:opacity-50"
                        >
                          <Phone className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => handleCallUser(c.callerUid, callerName, "video")}
                          disabled={callLoading}
                          className="grid h-7 w-7 place-items-center rounded-full gold-bg hover:opacity-80 disabled:opacity-50"
                        >
                          <Video className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
