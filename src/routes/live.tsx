import { createFileRoute, Link } from "@tanstack/react-router";
import { MobileShell } from "@/components/MobileShell";
import { Radio, Users, Eye, Sparkles } from "lucide-react";
import { requireAuth } from "@/lib/auth-guard";

export const Route = createFileRoute("/live")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Live astrologers — Om Astro" },
      { name: "description", content: "Watch verified astrologers go live. Join free sessions and ask questions in real time." },
      { property: "og:title", content: "Live astrologers — Om Astro" },
      { property: "og:description", content: "Watch verified astrologers go live. Join free sessions and ask questions in real time." },
    ],
  }),
  beforeLoad: ({ location }) => requireAuth({ location }),
  component: LivePage,
});

// Placeholder live sessions — will be wired to a real `live_sessions` table later.
const sessions = [
  {
    id: "1",
    astrologer: "Acharya Ramesh",
    title: "Saturn Transit 2026 — what it means for you",
    viewers: 1284,
    tag: "Vedic",
    img: "/banner-1.jpg",
  },
  {
    id: "2",
    astrologer: "Pandit Suresh",
    title: "Live Tarot — pick a card",
    viewers: 642,
    tag: "Tarot",
    img: "/banner-2.jpg",
  },
  {
    id: "3",
    astrologer: "Maa Anjali",
    title: "Career Q&A — open chat",
    viewers: 318,
    tag: "Career",
    img: "/banner-3.jpg",
  },
];

function LivePage() {
  return (
    <MobileShell>
      <section className="px-5 pb-6 pt-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl">Live now</h1>
            <p className="mt-1 text-xs text-muted-foreground">Join free streams from verified astrologers.</p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-red-500">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
            Live
          </span>
        </div>

        <div className="mt-5 grid gap-4">
          {sessions.map((s) => (
            <Link
              key={s.id}
              to="/astrologers"
              className="card-luxe overflow-hidden"
            >
              <div className="relative aspect-video w-full overflow-hidden">
                <img src={s.img} alt={s.title} loading="lazy" className="h-full w-full object-cover" />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                  <div className="flex items-center justify-between text-white">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
                      <Radio className="h-3 w-3" /> Live
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium">
                      <Eye className="h-3 w-3" /> {s.viewers.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
              </div>
              <div className="p-3.5">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{s.tag}</p>
                <h3 className="mt-1 font-display text-base leading-tight">{s.title}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{s.astrologer}</p>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-8 card-luxe p-5 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full gold-bg">
            <Sparkles className="h-5 w-5" />
          </div>
          <h2 className="mt-3 font-display text-lg">Are you an astrologer?</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Go live, build your audience, and earn from gifts and consultations.
          </p>
          <button
            disabled
            className="mt-4 inline-flex items-center gap-2 rounded-full gold-bg px-5 py-2.5 text-xs font-semibold shadow-luxe disabled:opacity-60"
            title="Available once your astrologer profile is approved"
          >
            <Users className="h-4 w-4" /> Go live (coming soon)
          </button>
        </div>
      </section>
    </MobileShell>
  );
}
