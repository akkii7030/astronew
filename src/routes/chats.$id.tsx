import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { requireAuth } from "@/lib/auth-guard";
import { getFirebaseAuth, getDb } from "@/integrations/firebase/client";
import {
  listenMessages, sendMessage, setTyping, listenTyping, markRead,
  listenPresence, setPresence, type ChatMessage,
} from "@/lib/firebase-chat";
import { startAstrologerCall, type ConsultationAstrologer } from "@/lib/consultation-actions";
import { type CallMode } from "@/lib/firebase-calls";
import { doc, getDoc } from "firebase/firestore";
import { ChatRoomUI } from "@/components/ChatRoomUI";

export const Route = createFileRoute("/chats/$id")({
  ssr: false,
  beforeLoad: ({ location }) => requireAuth({ location }),
  head: () => ({ meta: [{ title: "Chat — Om Astro" }] }),
  component: ChatRoomPage,
});

function ChatRoomPage() {
  const { id: roomId } = Route.useParams();
  const navigate = useNavigate();
  const [uid, setUid] = useState<string | null>(null);
  const [otherUid, setOtherUid] = useState<string>("");
  const [otherName, setOtherName] = useState("Loading...");
  const [astrologer, setAstrologer] = useState<ConsultationAstrologer | null>(null);
  const [msgs, setMsgs] = useState<ChatMessage[]>([]);
  const [typing, setTypingState] = useState(false);
  const [online, setOnline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [callLoading, setCallLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const unsubsRef = useRef<Array<() => void>>([]);

  useEffect(() => {
    const auth = getFirebaseAuth();

    // Always wait for onAuthStateChanged — this is the critical fix for the
    // refresh bug. auth.currentUser is null during the brief initialization
    // window on page load, so we must not read it synchronously.
    const offAuth = auth.onAuthStateChanged(async (u) => {
      offAuth(); // Only need the first emission

      if (!u) {
        setError("Not signed in");
        setLoading(false);
        return;
      }

      const currentUid = u.uid;
      setUid(currentUid);
      void setPresence(currentUid, true);

      try {
        const roomSnap = await getDoc(doc(getDb(), "chats", roomId));
        if (!roomSnap.exists()) {
          setError("Chat room not found. It may have been deleted or you don't have access.");
          setLoading(false);
          return;
        }

        const roomData = roomSnap.data() as {
          members?: string[];
          memberNames?: Record<string, string>;
          astrologerId?: string;
          astrologerFirebaseUid?: string;
        };

        const other = roomData.members?.find((m) => m !== currentUid) ?? "";
        setOtherUid(other);
        setOtherName(roomData.memberNames?.[other] ?? "User");

        // Is the current user the astrologer?
        const isAstrologer = roomData.astrologerFirebaseUid === currentUid;

        // Show call buttons only for the user side (not astrologer).
        if (
          roomData.astrologerId &&
          !isAstrologer
        ) {
          setAstrologer({
            id: roomData.astrologerId,
            name: roomData.memberNames?.[roomData.astrologerFirebaseUid ?? other] ?? otherName,
            firebase_uid: roomData.astrologerFirebaseUid ?? other,
          });
        } else if (isAstrologer) {
          // If we are the astrologer, we don't set 'astrologer' state, but we know who the user is.
          setAstrologer(null);
        } else {
          setAstrologer(null);
        }

        // Set up real-time Firestore listeners
        const u1 = listenMessages(roomId, setMsgs);
        const u2 = other ? listenTyping(roomId, other, setTypingState) : () => {};
        const u3 = other ? listenPresence(other, setOnline) : () => {};
        unsubsRef.current = [u1, u2, u3];

        void markRead(roomId, currentUid);
        setLoading(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load chat");
        setLoading(false);
      }
    });

    const beforeUnload = () => {
      const u = getFirebaseAuth().currentUser;
      if (u) void setPresence(u.uid, false);
    };
    window.addEventListener("beforeunload", beforeUnload);

    return () => {
      offAuth();
      unsubsRef.current.forEach((fn) => fn());
      window.removeEventListener("beforeunload", beforeUnload);
      const u = getFirebaseAuth().currentUser;
      if (u) void setPresence(u.uid, false);
    };
  }, [roomId]); // Only re-run if the roomId changes

  // Mark as read whenever new messages arrive
  useEffect(() => {
    if (uid && msgs.length > 0) void markRead(roomId, uid);
  }, [msgs, uid, roomId]);

  if (loading) {
    return (
      <div className="mx-auto flex h-[100dvh] w-full max-w-md flex-col items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--gold)] border-t-transparent" />
          <p className="text-sm text-muted-foreground">Opening chat...</p>
        </div>
      </div>
    );
  }

  if (error || !uid) {
    return (
      <div className="mx-auto flex h-[100dvh] w-full max-w-md flex-col items-center justify-center bg-background px-6">
        <p className="text-center text-sm text-destructive">{error || "User not found"}</p>
        <button
          onClick={() => navigate({ to: "/chats" })}
          className="mt-4 rounded-full gold-bg px-4 py-2 text-xs font-semibold"
        >
          Back to Chats
        </button>
      </div>
    );
  }

  const startCall = async (mode: CallMode) => {
    if (callLoading) return;
    setCallLoading(true);
    try {
      if (astrologer) {
        // I am the user, calling the astrologer
        const { id: callId } = await startAstrologerCall(astrologer, mode);
        navigate({
          to: "/call/$mode/$id",
          params: { mode, id: astrologer.id },
          search: { callId },
        });
      } else {
        // I am the astrologer, calling the user (or two users calling each other)
        const { startCallToUser } = await import("@/lib/consultation-actions");
        const { id: callId } = await startCallToUser(otherUid, otherName, mode);
        navigate({
          to: "/call/$mode/$id",
          params: { mode, id: otherUid },
          search: { callId },
        });
      }
    } catch (e) {
      console.error("[chat call] failed to start", e);
      toast.error(e instanceof Error ? e.message : "Could not start call");
    } finally {
      setCallLoading(false);
    }
  };

  return (
    <ChatRoomUI
      uid={uid}
      otherName={otherName}
      online={online}
      typing={typing}
      msgs={msgs}
      onSend={async (text) => {
        await sendMessage(roomId, uid, otherUid, text);
        void setTyping(roomId, uid, false);
      }}
      onTyping={(isTyping) => {
        void setTyping(roomId, uid, isTyping);
      }}
      onBack={() => {
        if (window.history.length > 1) {
          window.history.back();
        } else {
          navigate({ to: "/chats" });
        }
      }}
      onStartCall={startCall}
      callLoading={callLoading}
    />
  );
}
