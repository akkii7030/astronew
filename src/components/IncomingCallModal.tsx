// Global incoming-call popup. Mounts once and listens on the
// signed-in firebase user's uid for ringing calls in Firestore.
import { useEffect, useRef, useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { Phone, PhoneOff, Video } from "lucide-react";
import { getFirebaseAuth } from "@/integrations/firebase/client";
import {
  listenIncomingCalls, setCallStatus, type CallDoc,
} from "@/lib/firebase-calls";

const RING_URL =
  "data:audio/mp3;base64,//uQxAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAACcQCA";

export function IncomingCallModal() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [call, setCall] = useState<CallDoc | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Subscribe to incoming calls when firebase auth is ready.
  useEffect(() => {
    const auth = getFirebaseAuth();
    let unsub: (() => void) | null = null;

    const off = auth.onAuthStateChanged((u) => {
      if (unsub) { unsub(); unsub = null; }
      if (!u) {
        console.log("[IncomingCallModal] No Firebase user signed in.");
        return;
      }
      console.log("[IncomingCallModal] Listening for calls to UID:", u.uid, "isAnon:", u.isAnonymous, "email:", u.email);
      unsub = listenIncomingCalls(u.uid, (calls) => {
        console.log("[IncomingCallModal] Incoming calls snapshot:", calls.length, calls);
        if (calls.length > 0) {
          console.log("[IncomingCallModal] First call details:", calls[0]);
        }
        setCall(calls[0] ?? null);
      });
    });

    return () => { off(); if (unsub) unsub(); };
  }, []);

  // Don't ring while user is already inside a call screen.
  const onCallScreen = pathname.startsWith("/call/");
  const visible = !!call && !onCallScreen;

  // Ringtone + vibrate while popup is visible.
  useEffect(() => {
    if (!visible) {
      audioRef.current?.pause();
      return;
    }
    const a = new Audio(RING_URL);
    a.loop = true;
    a.play().catch(() => { /* autoplay blocked — silent ring */ });
    audioRef.current = a;
    const v = window.navigator.vibrate?.bind(window.navigator);
    const t = v ? window.setInterval(() => v([300, 200, 300]), 1500) : null;
    return () => {
      a.pause();
      if (t) clearInterval(t);
    };
  }, [visible]);

  if (!visible || !call) return null;

  const accept = async () => {
    await setCallStatus(call.id, "accepted");
    navigate({
      to: "/call/$mode/$id",
      params: { mode: call.mode, id: call.astrologerId ?? call.callerUid },
      search: { callId: call.id },
    });
  };
  const reject = async () => {
    await setCallStatus(call.id, "rejected");
    setCall(null);
  };

  const avatar = call.callerAvatar ||
    "https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=300&h=300&fit=crop";

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-between bg-[#0b0820] px-6 py-12 text-white"
      style={{
        backgroundImage:
          "radial-gradient(120% 80% at 50% 0%, #4a1d6e 0%, #1a0b3a 45%, #06030f 100%)",
      }}
    >
      <div className="flex flex-col items-center text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-white/60">
          Incoming {call.mode} call
        </p>
        <div className="relative mt-8">
          <span className="absolute inset-0 -m-6 animate-ping rounded-full bg-[var(--gold)]/30" />
          <span className="absolute inset-0 -m-3 animate-pulse rounded-full bg-[var(--gold)]/20" />
          <img
            src={avatar}
            alt={call.callerName}
            className="relative h-36 w-36 rounded-full border-4 border-white/20 object-cover shadow-2xl ring-4 ring-[var(--gold)]/40"
          />
        </div>
        <h2 className="mt-6 font-display text-2xl font-semibold">{call.callerName}</h2>
        <p className="mt-1 text-sm text-white/60">is calling you…</p>
      </div>

      <div className="flex w-full max-w-xs items-center justify-between">
        <button
          onClick={reject}
          aria-label="Reject"
          className="grid h-16 w-16 place-items-center rounded-full bg-red-500 shadow-[0_10px_30px_-8px_rgba(239,68,68,0.7)] transition active:scale-95"
        >
          <PhoneOff className="h-6 w-6" />
        </button>
        <button
          onClick={accept}
          aria-label="Accept"
          className="grid h-16 w-16 place-items-center rounded-full bg-emerald-500 shadow-[0_10px_30px_-8px_rgba(16,185,129,0.7)] transition active:scale-95"
        >
          {call.mode === "video" ? <Video className="h-6 w-6" /> : <Phone className="h-6 w-6" />}
        </button>
      </div>
    </div>
  );
}
