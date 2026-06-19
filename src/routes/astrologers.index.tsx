import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { z } from "zod";
import { useState } from "react";
import { Search } from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { AstrologerCard } from "@/components/AstrologerCard";
import { astrologersQuery } from "@/lib/queries";
import { requireAuth } from "@/lib/auth-guard";

const searchSchema = z.object({
  category: z.string().optional(),
  online: z.boolean().optional(),
});

export const Route = createFileRoute("/astrologers/")({
  ssr: false,
  head: () => ({ meta: [{ title: "Astrologers — Om Astro" }, { name: "description", content: "Browse verified astrologers and start a chat or call." }] }),
  validateSearch: searchSchema,
  beforeLoad: ({ location }) => requireAuth({ location }),
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) => context.queryClient.ensureQueryData(astrologersQuery({ category: deps.category, onlineOnly: deps.online })),
  component: AstrologersPage,
  errorComponent: ({ error }) => { console.error(error); return <div className="p-6 text-sm text-destructive">Something went wrong. Please try again.</div>; },
  notFoundComponent: () => <div className="p-6">Not found</div>,
});

const tabs = ["All", "Love", "Career", "Marriage", "Tarot", "Kundli"];

function AstrologersPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { data } = useSuspenseQuery(astrologersQuery({ category: search.category, onlineOnly: search.online }));
  const [q, setQ] = useState("");
  const list = data.filter((a) => a.name.toLowerCase().includes(q.toLowerCase()));
  const active = search.category ?? "All";

  return (
    <MobileShell>
      <div className="space-y-4 px-5 pt-2">
        <h1 className="font-display text-2xl">Astrologers</h1>
        <div className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 shadow-soft">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name" className="w-full bg-transparent text-sm outline-none" />
        </div>

        <div className="-mx-5 overflow-x-auto">
          <div className="flex gap-2 px-5">
            {tabs.map((t) => {
              const isActive = active === t;
              return (
                <button
                  key={t}
                  onClick={() => navigate({ search: { category: t === "All" ? undefined : t, online: search.online } })}
                  className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-medium transition ${
                    isActive ? "gold-bg shadow-luxe" : "border border-border bg-card text-muted-foreground"
                  }`}
                >
                  {t}
                </button>
              );
            })}
          </div>
        </div>

        <label className="flex items-center justify-between rounded-full border border-border bg-card px-4 py-2 text-xs">
          <span className="text-muted-foreground">Show only online astrologers</span>
          <input
            type="checkbox"
            checked={search.online ?? false}
            onChange={(e) => navigate({ search: { category: search.category, online: e.target.checked || undefined } })}
            className="h-4 w-4 accent-[var(--gold)]"
          />
        </label>

        <div className="grid gap-3">
          {list.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">No astrologers match your filters.</p>}
          {list.map((a) => <AstrologerCard key={a.id} a={a} />)}
        </div>
      </div>
    </MobileShell>
  );
}
