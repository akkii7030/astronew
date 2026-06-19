import { createFileRoute, notFound, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  Star, MessageCircle, Phone, Video, ArrowLeft, Share2, Plus, Check,
} from "lucide-react";
import { ensureFirebaseUser } from "@/integrations/firebase/client";
import { ensureChatRoom, astroUid } from "@/lib/firebase-chat";
import { createCall, type CallMode } from "@/lib/firebase-calls";
import { MobileShell } from "@/components/MobileShell";
import { astrologerQuery, astrologerReviewsQuery } from "@/lib/queries";
import { requireAuth } from "@/lib/auth-guard";

const PLACEHOLDER_AVATAR =
  "https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=600&h=600&fit=crop";

export const Route = createFileRoute("/astrologers/$id")({
  ssr: false,
  beforeLoad: ({ location }) => requireAuth({ location }),
  loader: async ({ context, params }) => {
    const [data] = await Promise.all([
      context.queryClient.ensureQueryData(astrologerQuery(params.id)),
      context.queryClient.ensureQueryData(astrologerReviewsQuery(params.id)),
    ]);
    if (!data) throw notFound();
    return data;
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData ? `${loaderData.name} — Om Astro` : "Astrologer" },
      { name: "description", content: loaderData?.bio ?? "Astrologer profile" },
    ],
  }),
  component: AstrologerPage,
  errorComponent: ({ error }) => { console.error(error); return <div className="p-6 text-sm text-destructive">Something went wrong. Please try again.</div>; },
  notFoundComponent: () => (
    <MobileShell><div className="p-8 text-center text-muted-foreground">Astrologer not found.</div></MobileShell>
  ),
});

function formatCount(n: number) {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "k+";
  return String(n);
}

function AstrologerPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { data: a } = useSuspenseQuery(astrologerQuery(id));
  const { data: reviews } = useSuspenseQuery(astrologerReviewsQuery(id));
  const [loading, setLoading] = useState(false);
  const [imgErr, setImgErr] = useState(false);
  const [following, setFollowing] = useState(false);
  const [bioOpen, setBioOpen] = useState(false);
  if (!a) return null;

  const avatar = (!imgErr && a.avatar_url) || PLACEHOLDER_AVATAR;
  const rounded = Math.round(a.rating);
  const isNew = (a.reviews_count ?? 0) < 100;

  const openChat = async () => {
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
    } catch (e) {
      console.error("[chat] failed to open", e);
      toast.error(e instanceof Error ? e.message : "Could not open chat");
    } finally {
      setLoading(false);
    }
  };

  const startCall = async (mode: CallMode) => {
    setLoading(true);
    try {
      const u = await ensureFirebaseUser();
      const calleeUid = a.firebase_uid ?? astroUid(a.id);
      if (!a.firebase_uid) {
        toast.error("This astrologer is not yet activated. Ask admin to run /seed-astrologers.");
        setLoading(false);
        return;
      }
      const { id: callId } = await createCall({
        callerUid: u.uid,
        callerName: u.displayName || u.phoneNumber || "Guest",
        callerAvatar: u.photoURL ?? null,
        calleeUid,
        calleeName: a.name,
        calleeAvatar: a.avatar_url ?? null,
        astrologerId: a.id,
        mode,
      });
      navigate({
        to: "/call/$mode/$id",
        params: { mode, id: a.id },
        search: { callId },
      });
    } catch (e) {
      console.error("[call] failed to start", e);
      toast.error(e instanceof Error ? e.message : "Could not start call");
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    try {
      if (navigator.share) await navigator.share({ title: a.name, url });
      else { await navigator.clipboard.writeText(url); toast.success("Link copied"); }
    } catch { /* user cancelled */ }
  };

  return (
    <MobileShell>
      {/* Sticky gold header */}
      <div className="sticky top-0 z-30 flex items-center justify-between gold-bg px-4 py-3 shadow-soft">
        <button
          onClick={() => navigate({ to: "/astrologers" })}
          aria-label="Back"
          className="grid h-9 w-9 place-items-center rounded-full bg-white/30 backdrop-blur"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h1 className="font-display text-lg font-semibold">Profile</h1>
        <button
          onClick={handleShare}
          className="flex items-center gap-1 rounded-full bg-white/30 px-3 py-1.5 text-xs font-semibold backdrop-blur"
        >
          <Share2 className="h-3.5 w-3.5" /> Share
        </button>
      </div>

      <div className="px-5 pt-5 pb-36">
        {/* Avatar + identity */}
        <div className="flex flex-col items-center text-center animate-fade-in">
          <div className="relative">
            <img
              src={avatar}
              alt={a.name}
              onError={() => setImgErr(true)}
              className="h-24 w-24 rounded-full border-4 border-card object-cover shadow-luxe ring-2 ring-[var(--gold-soft)]"
            />
            {a.is_online && (
              <span className="absolute bottom-0.5 right-0.5 h-3.5 w-3.5 rounded-full border-2 border-card bg-emerald-500" />
            )}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <h2 className="font-display text-2xl font-semibold">{a.name}</h2>
            <button
              onClick={() => setFollowing((v) => !v)}
              className={`flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-semibold transition ${
                following
                  ? "bg-emerald-100 text-emerald-700"
                  : "gold-bg shadow-soft"
              }`}
            >
              {following ? <><Check className="h-3 w-3" /> Following</> : <><Plus className="h-3 w-3" /> Follow</>}
            </button>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{a.skills.join(", ")}</p>
          <p className="text-sm text-muted-foreground">{a.languages.join(", ")}</p>
          <p className="text-sm text-muted-foreground">Exp {a.experience_years} Years</p>

          {/* Stars + NEW */}
          <div className="mt-2 flex items-center gap-2">
            <div className="flex">
              {[1,2,3,4,5].map((i) => (
                <Star
                  key={i}
                  className={`h-4 w-4 ${i <= rounded ? "fill-[var(--gold)] text-[var(--gold)]" : "text-border"}`}
                />
              ))}
            </div>
            {isNew && (
              <span className="rounded-full gold-bg px-2 py-0.5 text-[10px] font-bold tracking-wider">NEW!</span>
            )}
          </div>

          {/* Price */}
          <p className="mt-2 text-lg font-bold gold-text">₹{a.price_per_minute}/min</p>
        </div>

        {/* Stats strip with dividers */}
        <div className="mt-5 grid grid-cols-3 divide-x divide-border rounded-2xl border border-border bg-card py-3 shadow-soft">
          <StatCol label="orders" value={formatCount(a.orders_completed ?? 0)} />
          <StatCol label="followers" value={formatCount(a.followers ?? 0)} />
          <StatCol label="mins" value={formatCount((a.orders_completed ?? 0) * 6)} />
        </div>

        {/* Bio */}
        {a.bio && (
          <section className="mt-5">
            <p className="text-sm leading-relaxed text-foreground/80">
              {bioOpen || a.bio.length <= 140 ? a.bio : a.bio.slice(0, 140).trimEnd() + "… "}
              {a.bio.length > 140 && (
                <button
                  onClick={() => setBioOpen((v) => !v)}
                  className="font-semibold gold-text"
                >
                  {bioOpen ? "show less" : "show more"}
                </button>
              )}
            </p>
          </section>
        )}

        {/* Gallery */}
        {a.gallery_urls?.length > 0 && (
          <section className="mt-5 -mx-5">
            <div className="grid grid-flow-col auto-cols-[34%] gap-1.5 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {a.gallery_urls.map((g) => (
                <img
                  key={g}
                  src={g}
                  alt=""
                  loading="lazy"
                  className="aspect-[3/4] w-full rounded-xl object-cover"
                />
              ))}
            </div>
          </section>
        )}

        {/* Reviews */}
        <section className="mt-6">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold">User Reviews</h3>
            <button className="text-xs font-semibold gold-text">View All</button>
          </div>
          <div className="mt-3 grid gap-3">
            {reviews.length === 0 && (
              <p className="text-sm text-muted-foreground">No reviews yet.</p>
            )}
            {reviews.slice(0, 4).map((r) => (
              <div key={r.id} className="rounded-2xl border border-border bg-card p-3 shadow-soft">
                <div className="flex">
                  {[1,2,3,4,5].map((i) => (
                    <Star
                      key={i}
                      className={`h-3.5 w-3.5 ${i <= Math.round(Number(r.rating)) ? "fill-[var(--gold)] text-[var(--gold)]" : "text-border"}`}
                    />
                  ))}
                </div>
                <p className="mt-1 text-sm font-semibold">{r.reviewer_name}</p>
                <p className="mt-0.5 text-sm leading-relaxed text-foreground/75">{r.comment}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Bottom CTA: Chat / Audio / Video */}
      <div className="fixed inset-x-0 bottom-20 z-20 mx-auto max-w-md px-5">
        <div className="grid grid-cols-3 gap-2 rounded-3xl border border-border bg-card p-3 shadow-luxe">
          <button
            onClick={openChat}
            disabled={loading}
            className="flex items-center justify-center gap-1.5 rounded-2xl border border-emerald-200 bg-emerald-50 py-3 text-xs font-semibold text-emerald-700 transition active:scale-[0.98] disabled:opacity-60"
          >
            <MessageCircle className="h-4 w-4" /> Chat
          </button>
          <button
            onClick={() => startCall("audio")}
            disabled={loading}
            className="flex items-center justify-center gap-1.5 rounded-2xl border border-emerald-200 bg-emerald-50 py-3 text-xs font-semibold text-emerald-700 transition active:scale-[0.98] disabled:opacity-60"
          >
            <Phone className="h-4 w-4" /> Call
          </button>
          <button
            onClick={() => startCall("video")}
            disabled={loading}
            className="flex items-center justify-center gap-1.5 rounded-2xl border border-amber-200 bg-amber-50 py-3 text-xs font-semibold text-amber-700 transition active:scale-[0.98] disabled:opacity-60"
          >
            <Video className="h-4 w-4" /> Video
          </button>
        </div>
      </div>
    </MobileShell>
  );
}

function StatCol({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 px-2">
      <span className="text-sm font-bold">{value}</span>
      <span className="text-[11px] text-muted-foreground">{label}</span>
    </div>
  );
}
