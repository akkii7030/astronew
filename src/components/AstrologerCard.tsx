import { Link, useNavigate } from "@tanstack/react-router";
import { Star, MessageCircle, Phone, Video, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { Astrologer } from "@/lib/queries";
import { ensureFirebaseUser } from "@/integrations/firebase/client";
import { ensureChatRoom } from "@/lib/firebase-chat";

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export function AstrologerCard({ a }: { a: Astrologer }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [imgErr, setImgErr] = useState(false);

  const openChat = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (loading) return;
    setLoading(true);
    try {
      const u = await ensureFirebaseUser();
      const roomId = await ensureChatRoom({
        userUid: u.uid,
        userName: u.displayName || u.phoneNumber || "Guest",
        astrologerId: a.id,
        astrologerName: a.name,
      });
      navigate({ to: "/chats/$id", params: { id: roomId } });
    } catch (err) {
      console.error("[chat] failed to open", err);
      toast.error(err instanceof Error ? err.message : "Could not open chat");
    } finally {
      setLoading(false);
    }
  };

  const goCall = (mode: "audio" | "video") => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigate({ to: "/call/$mode/$id", params: { mode, id: a.id } });
  };

  const showImg = a.avatar_url && !imgErr;

  return (
    <Link
      to="/astrologers/$id"
      params={{ id: a.id }}
      className="card-luxe flex gap-3 p-3 transition hover:shadow-luxe"
    >
      <div className="relative h-16 w-16 shrink-0">
        {showImg ? (
          <img
            src={a.avatar_url!}
            alt={a.name}
            onError={() => setImgErr(true)}
            className="h-16 w-16 rounded-full object-cover shadow-luxe ring-2 ring-[var(--gold-soft)]"
          />
        ) : (
          <div className="grid h-16 w-16 place-items-center rounded-full gold-bg font-display text-lg shadow-luxe">
            {initials(a.name)}
          </div>
        )}
        {a.is_online && (
          <span className="absolute -bottom-0.5 right-0.5 h-3.5 w-3.5 rounded-full border-2 border-card bg-emerald-500" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <h3 className="truncate font-display text-base font-semibold">{a.name}</h3>
          <span className="flex items-center gap-0.5 rounded-full bg-ivory px-2 py-0.5 text-xs">
            <Star className="h-3 w-3 fill-[var(--gold)] text-[var(--gold)]" />
            {a.rating.toFixed(1)}
          </span>
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {a.skills.slice(0, 2).join(" · ")} · {a.experience_years}+ yrs
        </p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{a.languages.join(", ")}</p>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-sm font-semibold gold-text">₹{a.price_per_minute}/min</span>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={openChat}
              disabled={loading}
              aria-label={`Chat with ${a.name}`}
              className="grid h-7 w-7 place-items-center rounded-full border border-border text-muted-foreground transition hover:border-[var(--gold)] hover:text-[var(--gold)] disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MessageCircle className="h-3.5 w-3.5" />}
            </button>
            <button
              type="button"
              onClick={goCall("audio")}
              aria-label={`Audio call ${a.name}`}
              className="grid h-7 w-7 place-items-center rounded-full border border-border text-muted-foreground transition hover:border-[var(--gold)] hover:text-[var(--gold)]"
            >
              <Phone className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={goCall("video")}
              aria-label={`Video call ${a.name}`}
              className="grid h-7 w-7 place-items-center rounded-full gold-bg"
            >
              <Video className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
}
