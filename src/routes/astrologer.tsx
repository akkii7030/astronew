// Astrologer dashboard. Listens for the firebase auth user and shows
// "Online, waiting for calls". The global IncomingCallModal handles ringing.
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { Radio, LogOut } from "lucide-react";
import { getFirebaseAuth, getDb } from "@/integrations/firebase/client";
import { setPresence } from "@/lib/firebase-chat";

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
          setProfile(data);
        }
      });
      return () => stop();
    });
    return () => off();
  }, [navigate]);

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
    </div>
  );
}
