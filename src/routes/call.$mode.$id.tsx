import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";
import {
  PhoneOff, Mic, MicOff, Volume2, VolumeX,
  Video as VideoIcon, VideoOff, SwitchCamera,
} from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { ensureFirebaseUser } from "@/integrations/firebase/client";
import { astrologerQuery } from "@/lib/queries";
import { getZegoKitToken } from "@/lib/zego.functions";
import { listenCall, setCallStatus, type CallDoc } from "@/lib/firebase-calls";
import { astroUid, roomIdFor } from "@/lib/firebase-chat";

const PLACEHOLDER =
  "https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=600&h=600&fit=crop";

const searchSchema = z.object({
  callId: z.string().optional(),
});

export const Route = createFileRoute("/call/$mode/$id")({
  ssr: false,
  validateSearch: searchSchema,
  parseParams: (p) => ({
    mode: z.enum(["audio", "video"]).parse(p.mode),
    id: z.string().parse(p.id),
  }),
  // No supabase auth gate: astrologers sign in via firebase only and still need
  // to land here to answer a call. We gate on firebase user inside the component.
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(astrologerQuery(params.id)),
  head: () => ({ meta: [{ title: "Call — Om Astro" }] }),
  component: CallPage,
});

function formatTime(s: number) {
  const m = Math.floor(s / 60).toString().padStart(2, "0");
  const sec = (s % 60).toString().padStart(2, "0");
  return `${m}:${sec}`;
}

function CallPage() {
  const { mode, id } = Route.useParams();
  const { callId } = Route.useSearch();
  const navigate = useNavigate();
  const { data: astrologer } = useSuspenseQuery(astrologerQuery(id));
  const fetchZegoToken = useServerFn(getZegoKitToken);
  const containerRef = useRef<HTMLDivElement>(null);
  const zpRef = useRef<any>(null);
  const cleanedUpRef = useRef(false);

  const [status, setStatus] = useState<"connecting" | "ringing" | "connected" | "ended" | "error">(
    callId ? "ringing" : "connecting",
  );
  const [error, setError] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [muted, setMuted] = useState(false);
  const [speakerOff, setSpeakerOff] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [frontCamera, setFrontCamera] = useState(true);
  const [callDoc, setCallDoc] = useState<CallDoc | null>(null);
  const [myUid, setMyUid] = useState<string | null>(null);

  useEffect(() => {
    ensureFirebaseUser().then((u) => setMyUid(u.uid)).catch(() => undefined);
  }, []);

  // Watch Firestore call doc for status transitions (accept / reject / end).
  useEffect(() => {
    if (!callId) return;
    const unsub = listenCall(callId, (doc) => {
      setCallDoc(doc);
      if (!doc) return;
      if (doc.status === "rejected") {
        toast("Call declined");
        endCall(true);
      } else if (doc.status === "ended") {
        endCall(true);
      }
    });
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callId]);

  // Live timer
  useEffect(() => {
    if (status !== "connected") return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [status]);

  // Join Zego room. For caller (ringing): wait until callee accepts.
  useEffect(() => {
    let cancelled = false;
    const shouldJoin = !callId || callDoc?.status === "accepted" || callDoc?.status === "ringing";
    // Actually for caller (ringing) we also pre-join so the callee finds us instantly.
    if (!shouldJoin) return;

    (async () => {
      try {
        const user = await ensureFirebaseUser();
        const userName = user.displayName || user.phoneNumber || "Guest";
        const idToken = await user.getIdToken();

        const roomID =
          callDoc?.roomId ?? roomIdFor(user.uid, astroUid(id));

        const { ZegoUIKitPrebuilt } = await import("@zegocloud/zego-uikit-prebuilt");

        // Get a server-signed Zego Kit Token (token04) — works regardless of
        // Zego project Authentication mode (Token or AppSign).
        const { token, appId } = await fetchZegoToken({
          data: { idToken, userId: user.uid, userName },
        });

        const kitToken = ZegoUIKitPrebuilt.generateKitTokenForProduction(
          appId,
          token,
          roomID,
          user.uid,
          userName,
        );

        if (cancelled || !containerRef.current) return;
        if (zpRef.current) return; // already joined

        const zp = ZegoUIKitPrebuilt.create(kitToken);
        zpRef.current = zp;

        (zp as any).joinRoom({
          container: containerRef.current,
          scenario: { mode: ZegoUIKitPrebuilt.OneONoneCall },
          turnOnCameraWhenJoining: mode === "video",
          turnOnMicrophoneWhenJoining: true,
          useFrontFacingCamera: true,
          showPreJoinView: false,
          showLeavingView: false,
          showMyCameraToggleButton: false,
          showMyMicrophoneToggleButton: false,
          showAudioVideoSettingsButton: false,
          showScreenSharingButton: false,
          showTextChat: false,
          showUserList: false,
          showLayoutButton: false,
          showLeaveRoomConfirmDialog: false,
          maxUsers: 2,
          layout: "Auto",
          onJoinRoom: () => {
            // Wait for the OTHER participant to join before flipping to "connected".
            // Zego doesn't always fire user events for self, so flip optimistically.
          },
          onUserJoin: () => {
            setStatus("connected");
            if (callId) setCallStatus(callId, "accepted").catch(() => undefined);
          },
          onUserLeave: () => {
            endCall();
          },
          onLeaveRoom: () => endCall(),
        });
      } catch (e) {
        console.error(e);
        const msg = e instanceof Error ? e.message : "Could not start call";
        setError(msg);
        setStatus("error");
        toast.error(msg);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, mode, callDoc?.roomId]);

  // Tear down zego only when leaving the page.
  useEffect(() => {
    return () => {
      try { zpRef.current?.destroy?.(); } catch { /* noop */ }
      zpRef.current = null;
    };
  }, []);

  const endCall = (silent = false) => {
    if (cleanedUpRef.current) return;
    cleanedUpRef.current = true;
    try { zpRef.current?.destroy?.(); } catch { /* noop */ }
    zpRef.current = null;
    setStatus("ended");
    if (callId && !silent) setCallStatus(callId, "ended").catch(() => undefined);
    navigate({ to: "/astrologers/$id", params: { id } });
  };

  const toggleMic = () => {
    const next = !muted;
    setMuted(next);
    try { zpRef.current?.turnMicrophoneOn?.(!next); } catch { /* noop */ }
  };
  const toggleSpeaker = () => {
    const next = !speakerOff;
    setSpeakerOff(next);
    try { zpRef.current?.setAudioOutputDevice?.(next ? "off" : "default"); } catch { /* noop */ }
  };
  const toggleCamera = () => {
    const next = !cameraOff;
    setCameraOff(next);
    try { zpRef.current?.turnCameraOn?.(!next); } catch { /* noop */ }
  };
  const switchCamera = () => {
    const next = !frontCamera;
    setFrontCamera(next);
    try { zpRef.current?.useFrontFacingCamera?.(next); } catch { /* noop */ }
  };

  // Pick "the other party" based on who I am in the call doc.
  const isCallee = !!(callDoc && myUid && callDoc.calleeUid === myUid);
  const peerName = callDoc
    ? (isCallee ? callDoc.callerName : callDoc.calleeName)
    : astrologer?.name;
  const peerAvatar = (callDoc
    ? (isCallee ? callDoc.callerAvatar : callDoc.calleeAvatar)
    : astrologer?.avatar_url) || PLACEHOLDER;
  const avatar = peerAvatar;
  const skills = !isCallee ? astrologer?.skills?.slice(0, 3).join(" · ") : undefined;
  const isVideo = mode === "video";
  const isRinging = callId && callDoc?.status === "ringing";
  const statusLabel =
    status === "connected" ? formatTime(seconds)
    : isRinging ? "Ringing…"
    : status === "connecting" ? "Connecting…"
    : status === "ended" ? "Ended"
    : status === "error" ? "Error"
    : "Connecting…";

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-[#0b0820] text-white">
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 80% at 50% 0%, #4a1d6e 0%, #1a0b3a 45%, #06030f 100%)",
        }}
      />
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(1px 1px at 20% 30%, #fff, transparent), radial-gradient(1px 1px at 70% 60%, #fff, transparent), radial-gradient(1.5px 1.5px at 40% 80%, #fff, transparent), radial-gradient(1px 1px at 85% 20%, #fff, transparent), radial-gradient(1px 1px at 10% 70%, #fff, transparent)",
          backgroundSize: "300px 300px",
        }}
      />

      {/* Zego container (video stage / hidden for audio) */}
      <div
        ref={containerRef}
        className={
          isVideo && status === "connected"
            ? "absolute inset-0 [&_.zego-uikit-prebuilt_*]:!bg-transparent"
            : "pointer-events-none absolute -z-10 h-px w-px overflow-hidden opacity-0"
        }
      />

      {/* Top bar */}
      <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-5 pt-5">
        <button
          onClick={() => endCall()}
          className="rounded-full bg-white/10 px-3 py-1.5 text-xs backdrop-blur"
        >
          ← Back
        </button>
        <div className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium backdrop-blur">
          {statusLabel}
        </div>
        <span className="w-12" />
      </div>

      {/* Hero (audio always; video while not yet connected) */}
      {(!isVideo || status !== "connected") && (
        <div className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center">
          <div className="relative">
            {(status === "connecting" || isRinging) && (
              <>
                <span className="absolute inset-0 -m-6 animate-ping rounded-full bg-[var(--gold)]/30" />
                <span className="absolute inset-0 -m-3 animate-pulse rounded-full bg-[var(--gold)]/20" />
              </>
            )}
            <img
              src={avatar}
              alt={peerName ?? "Caller"}
              className="relative h-40 w-40 rounded-full border-4 border-white/20 object-cover shadow-2xl ring-4 ring-[var(--gold)]/40"
            />
          </div>
          <h1 className="mt-6 font-display text-2xl font-semibold">{peerName ?? astrologer?.name}</h1>
          {skills && <p className="mt-1 text-sm text-white/70">{skills}</p>}
          <p className="mt-4 text-xs uppercase tracking-[0.2em] text-[var(--gold)]/80">
            {isVideo ? "Video call" : "Audio call"}
          </p>
          <p className="mt-1 text-sm text-white/60">
            {isRinging ? (isCallee ? "Incoming…" : "Ringing astrologer…")
              : status === "connecting" ? "Connecting…"
              : status === "connected" ? "On call"
              : error ?? ""}
          </p>
        </div>
      )}

      {/* Bottom controls */}
      <div className="absolute inset-x-0 bottom-0 z-10 pb-8">
        <div className="mx-auto flex max-w-md items-center justify-center gap-4 px-6">
          <button
            onClick={toggleMic}
            aria-label="Mute"
            className={`grid h-14 w-14 place-items-center rounded-full backdrop-blur transition active:scale-95 ${
              muted ? "bg-white text-[#0b0820]" : "bg-white/15"
            }`}
          >
            {muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </button>

          {isVideo ? (
            <>
              <button
                onClick={toggleCamera}
                aria-label="Camera"
                className={`grid h-14 w-14 place-items-center rounded-full backdrop-blur transition active:scale-95 ${
                  cameraOff ? "bg-white text-[#0b0820]" : "bg-white/15"
                }`}
              >
                {cameraOff ? <VideoOff className="h-5 w-5" /> : <VideoIcon className="h-5 w-5" />}
              </button>
              <button
                onClick={switchCamera}
                aria-label="Switch camera"
                className="grid h-14 w-14 place-items-center rounded-full bg-white/15 backdrop-blur transition active:scale-95"
              >
                <SwitchCamera className="h-5 w-5" />
              </button>
            </>
          ) : (
            <button
              onClick={toggleSpeaker}
              aria-label="Speaker"
              className={`grid h-14 w-14 place-items-center rounded-full backdrop-blur transition active:scale-95 ${
                speakerOff ? "bg-white text-[#0b0820]" : "bg-white/15"
              }`}
            >
              {speakerOff ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </button>
          )}

          <button
            onClick={() => endCall()}
            aria-label="End call"
            className="grid h-16 w-16 place-items-center rounded-full bg-red-500 shadow-[0_10px_30px_-8px_rgba(239,68,68,0.7)] transition active:scale-95"
          >
            <PhoneOff className="h-6 w-6" />
          </button>
        </div>
        <p className="mt-4 text-center text-[11px] text-white/40">
          Tap end to leave the call
        </p>
      </div>
    </div>
  );
}
