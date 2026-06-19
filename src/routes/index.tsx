import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Search, Heart, Briefcase, Gem, Sparkles, ScrollText, Moon, MessageCircle, Phone } from "lucide-react";
import { useState } from "react";
import { MobileShell } from "@/components/MobileShell";
import { AstrologerCard } from "@/components/AstrologerCard";
import { astrologersQuery } from "@/lib/queries";
import banner1 from "@/assets/banner-1.jpg";
import banner2 from "@/assets/banner-2.jpg";
import banner3 from "@/assets/banner-3.jpg";

import { requireAuth } from "@/lib/auth-guard";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Om Astro — Premium Astrology Consultations" },
      { name: "description", content: "Talk to verified astrologers for love, career, marriage, tarot and kundli readings — anytime." },
      { property: "og:title", content: "Om Astro — Premium Astrology Consultations" },
      { property: "og:description", content: "Talk to verified astrologers for love, career, marriage, tarot and kundli readings — anytime." },
    ],
  }),
  beforeLoad: ({ location }) => requireAuth({ location }),
  loader: ({ context }) => context.queryClient.ensureQueryData(astrologersQuery()),
  component: HomePage,
  errorComponent: ({ error }) => { console.error(error); return <div className="p-6 text-sm text-destructive">Something went wrong. Please try again.</div>; },
  notFoundComponent: () => <div className="p-6">Not found</div>,
});

const banners = [
  { src: banner1, title: "Discover your stars", sub: "First chat free" },
  { src: banner2, title: "Daily tarot pulls", sub: "Honest, intuitive readings" },
  { src: banner3, title: "Detailed kundli reports", sub: "From senior astrologers" },
];

const categories = [
  { label: "Love", icon: Heart },
  { label: "Career", icon: Briefcase },
  { label: "Marriage", icon: Gem },
  { label: "Tarot", icon: Sparkles },
  { label: "Kundli", icon: ScrollText },
  { label: "Horoscope", icon: Moon },
];

function HomePage() {
  const { data } = useSuspenseQuery(astrologersQuery());
  const [search, setSearch] = useState("");
  const filtered = data.filter((a) => a.name.toLowerCase().includes(search.toLowerCase()));
  const online = filtered.filter((a) => a.is_online);
  const top = [...filtered].sort((a, b) => b.rating - a.rating).slice(0, 4);

  return (
    <MobileShell>
      <div className="space-y-6 px-5 pt-2">
        <section>
          <h1 className="font-display text-3xl leading-tight">
            Find your <span className="gold-text">guide</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Verified astrologers, on call or chat.</p>
          <div className="mt-3 flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 shadow-soft">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search astrologers"
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3">
          <Link
            to="/astrologers"
            className="flex items-center justify-center gap-2 rounded-full gold-bg px-4 py-3 text-sm font-semibold shadow-luxe transition active:scale-[0.97]"
          >
            <MessageCircle className="h-4 w-4" strokeWidth={2.5} />
            <span>Chat with Astrologer</span>
          </Link>
          <Link
            to="/astrologers"
            className="flex items-center justify-center gap-2 rounded-full gold-bg px-4 py-3 text-sm font-semibold shadow-luxe transition active:scale-[0.97]"
          >
            <Phone className="h-4 w-4" strokeWidth={2.5} />
            <span>Call with Astrologer</span>
          </Link>
        </section>

        <section className="-mx-5 overflow-x-auto">
          <div className="flex snap-x snap-mandatory gap-3 px-5 pb-1">
            {banners.map((b) => (
              <div key={b.title} className="relative h-36 w-[85%] shrink-0 snap-center overflow-hidden rounded-2xl border border-border shadow-luxe">
                <img src={b.src} alt="" loading="lazy" width={1280} height={704} className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                <div className="absolute bottom-3 left-4 text-white">
                  <p className="font-display text-lg leading-tight">{b.title}</p>
                  <p className="text-xs opacity-90">{b.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <div className="grid grid-cols-3 gap-3">
            {categories.map(({ label, icon: Icon }) => (
              <Link
                key={label}
                to="/astrologers"
                search={{ category: label }}
                className="card-luxe flex flex-col items-center gap-2 py-3 transition hover:shadow-luxe"
              >
                <span className="grid h-10 w-10 place-items-center rounded-full bg-ivory text-[var(--gold)]">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="text-xs font-medium">{label}</span>
              </Link>
            ))}
          </div>
        </section>

        <section>
          <SectionHeader title="Top astrologers" to="/astrologers" />
          <div className="mt-3 grid gap-3">
            {top.map((a) => <AstrologerCard key={a.id} a={a} />)}
          </div>
        </section>

        <section>
          <SectionHeader title="Online now" to="/astrologers" />
          <div className="mt-3 grid gap-3">
            {online.length === 0 && <p className="text-sm text-muted-foreground">No one online right now.</p>}
            {online.map((a) => <AstrologerCard key={a.id} a={a} />)}
          </div>
        </section>
      </div>
    </MobileShell>
  );
}

function SectionHeader({ title, to }: { title: string; to: string }) {
  return (
    <div className="flex items-end justify-between">
      <h2 className="font-display text-xl">{title}</h2>
      <Link to={to} className="text-xs font-medium gold-text">See all</Link>
    </div>
  );
}
