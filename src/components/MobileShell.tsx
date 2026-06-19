import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Users, Radio, ShoppingBag, User, MessageCircle } from "lucide-react";
import type { ReactNode } from "react";
import logoAsset from "@/assets/om-astro-logo.jpeg.asset.json";

const nav = [
  { to: "/", label: "Home", icon: Home },
  { to: "/categories", label: "Astrologers", icon: Users },
  { to: "/live", label: "Live", icon: Radio },
  { to: "/store", label: "E-Store", icon: ShoppingBag },
  { to: "/profile", label: "Profile", icon: User },
] as const;

function isNavActive(path: string, to: string) {
  if (to === "/") return path === "/";
  if (to === "/categories") return path === "/categories" || path.startsWith("/astrologers");
  return path.startsWith(to);
}

export function MobileShell({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col">
      <header className="sticky top-0 z-20 glass">
        <div className="flex items-center justify-between px-5 py-3.5">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="grid h-10 w-10 place-items-center overflow-hidden rounded-full bg-white ring-1 ring-[color-mix(in_oklab,var(--gold)_35%,transparent)] shadow-luxe">
              <img src={logoAsset.url} alt="Om Astro" width={40} height={40} className="h-full w-full object-cover" />
            </span>
            <span className="font-display text-xl leading-none">
              Om <span className="gold-text">Astro</span>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/chats" className="grid h-8 w-8 place-items-center rounded-full border border-border bg-card text-muted-foreground hover:text-foreground">
              <MessageCircle className="h-4 w-4" />
            </Link>
            <Link to="/wallet" className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground">
              ₹ 0.00
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 pb-24">{children}</main>

      <nav className="fixed bottom-3 left-1/2 z-30 flex w-[min(28rem,calc(100vw-1rem))] -translate-x-1/2 items-center justify-between rounded-full glass px-1.5 py-1.5 shadow-luxe">
        {nav.map(({ to, label, icon: Icon }) => {
          const active = isNavActive(path, to);
          return (
            <Link
              key={to}
              to={to}
              className={`flex flex-1 flex-col items-center gap-0.5 rounded-full py-1.5 text-[10px] font-medium transition-colors ${
                active ? "gold-bg shadow-luxe" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" strokeWidth={active ? 2.4 : 2} />
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
