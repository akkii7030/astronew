import { createFileRoute, Link } from "@tanstack/react-router";
import { Search, ArrowLeft, Hash, Eye, Flame, BookOpen, Compass, Hand } from "lucide-react";
import { useState } from "react";
import { MobileShell } from "@/components/MobileShell";
import { requireAuth } from "@/lib/auth-guard";

export const Route = createFileRoute("/categories")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Categories — Om Astro" },
      { name: "description", content: "Browse astrology categories and find expert astrologers." },
    ],
  }),
  beforeLoad: ({ location }) => requireAuth({ location }),
  component: CategoriesPage,
});

const categoryList = [
  { name: "Numerology", icon: Hash, desc: "Decode your numbers" },
  { name: "Psychic", icon: Eye, desc: "Intuitive guidance" },
  { name: "Tarot", icon: Flame, desc: "Card readings" },
  { name: "Vedic", icon: BookOpen, desc: "Ancient wisdom" },
  { name: "Life Coach", icon: Compass, desc: "Personal growth" },
  { name: "Palmistry", icon: Hand, desc: "Hand analysis" },
];

function CategoriesPage() {
  const [q, setQ] = useState("");

  return (
    <MobileShell>
      <div className="space-y-5 px-5 pt-2">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="grid h-8 w-8 place-items-center rounded-full border border-border bg-card text-muted-foreground transition hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="font-display text-2xl">Astrology Categories</h1>
        </div>

        <div className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 shadow-soft">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search astrologers"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          {categoryList.map(({ name, icon: Icon, desc }) => (
            <Link
              key={name}
              to="/astrologers"
              search={{ category: name }}
              className="card-luxe flex flex-col items-center gap-3 p-5 transition hover:shadow-luxe"
            >
              <span className="grid h-14 w-14 place-items-center rounded-full bg-ivory text-[var(--gold)]">
                <Icon className="h-6 w-6" />
              </span>
              <div className="text-center">
                <p className="text-sm font-semibold">{name}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </MobileShell>
  );
}
