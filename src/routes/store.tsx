import { createFileRoute } from "@tanstack/react-router";
import { MobileShell } from "@/components/MobileShell";
import { ExternalLink, ShoppingBag, ShieldCheck, Truck, Sparkles } from "lucide-react";
import { requireAuth } from "@/lib/auth-guard";

export const Route = createFileRoute("/store")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "E-Store — Om Rudraksha Jewels" },
      { name: "description", content: "Authentic Rudraksha bracelets, pendants, malas, idols, and crystal jewellery — energized and consecrated." },
      { property: "og:title", content: "E-Store — Om Rudraksha Jewels" },
      { property: "og:description", content: "Authentic Rudraksha bracelets, pendants, malas, idols, and crystal jewellery — energized and consecrated." },
    ],
  }),
  beforeLoad: ({ location }) => requireAuth({ location }),
  component: StorePage,
});

const STORE = "https://omrudrakshajewels.com";

const categories = [
  {
    name: "Rudraksha Bracelets",
    items: 24,
    img: "https://omrudrakshajewels.com/wp-content/uploads/2026/05/WhatsApp-Image-2026-05-26-at-8.41.33-PM.jpeg",
    href: `${STORE}/product-category/rudraksha-bracelets/`,
  },
  {
    name: "Pendants",
    items: 32,
    img: "https://omrudrakshajewels.com/wp-content/uploads/2026/05/WhatsApp-Image-2026-05-26-at-7.25.18-PM.jpeg",
    href: `${STORE}/product-category/pendants/`,
  },
  {
    name: "Idols",
    items: 48,
    img: "https://omrudrakshajewels.com/wp-content/uploads/2026/05/WhatsApp-Image-2026-05-26-at-7.26.30-PM.jpeg",
    href: `${STORE}/product-category/idols/`,
  },
  {
    name: "Malas",
    items: 16,
    img: "https://omrudrakshajewels.com/wp-content/uploads/2026/05/WhatsApp-Image-2026-05-26-at-7.34.22-PM.jpeg",
    href: `${STORE}/product-category/malas/`,
  },
  {
    name: "Siddh Malas",
    items: 12,
    img: "https://omrudrakshajewels.com/wp-content/uploads/2026/05/WhatsApp-Image-2026-05-26-at-8.45.47-PM.jpeg",
    href: `${STORE}/product-category/malas/siddh-malas/`,
  },
  {
    name: "Crystal Bracelets",
    items: 38,
    img: "https://omrudrakshajewels.com/wp-content/uploads/2026/05/WhatsApp-Image-2026-05-26-at-7.25.18-PM-1.jpeg",
    href: `${STORE}/product-category/crystalsjewellery/crystal-bracelets/`,
  },
  {
    name: "Shankha",
    items: 48,
    img: "https://omrudrakshajewels.com/wp-content/uploads/2026/02/Black-shanka.jpeg",
    href: `${STORE}/product-category/shanka/`,
  },
];

const bestsellers = [
  {
    name: "Trishul Rudraksha Pendant",
    img: "https://omrudrakshajewels.com/wp-content/uploads/2026/03/WhatsApp-Image-2026-03-11-at-1.16.05-AM.jpeg",
    href: `${STORE}/product/trishul-rudraksha-pendant/`,
  },
  {
    name: "Shiv Kawach",
    img: "https://omrudrakshajewels.com/wp-content/uploads/2026/04/WhatsApp-Image-2026-04-05-at-12.34.29-AM-1.jpeg",
    href: `${STORE}/product/shiv-kawach/`,
  },
  {
    name: "Om Rudraksha Pendant",
    img: "https://omrudrakshajewels.com/wp-content/uploads/2026/03/WhatsApp-Image-2026-03-11-at-1.16.28-AM-16.jpeg",
    href: `${STORE}/product/10-mukhi-rudraksha-pendant/`,
  },
  {
    name: "Maa Durga Pendant",
    img: "https://omrudrakshajewels.com/wp-content/uploads/2026/03/WhatsApp-Image-2026-03-11-at-1.16.06-AM-21.jpeg",
    href: `${STORE}/product/maa-durga-pendant/`,
  },
];

function StorePage() {
  return (
    <MobileShell>
      <section className="px-5 pb-6 pt-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Powered by Om Rudraksha Jewels</p>
            <h1 className="mt-1 font-display text-2xl">
              Sacred <span className="gold-text">jewellery</span> &amp; idols
            </h1>
            <p className="mt-1 text-xs text-muted-foreground">
              Energized Rudraksha, crystal bracelets, Makrana marble idols and more.
            </p>
          </div>
          <a
            href={STORE}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 rounded-full gold-bg p-2.5 shadow-luxe"
            aria-label="Open Om Rudraksha Jewels store"
          >
            <ShoppingBag className="h-4 w-4" />
          </a>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2 text-center text-[10px] text-muted-foreground">
          <div className="card-luxe flex flex-col items-center gap-1 p-2.5">
            <ShieldCheck className="h-4 w-4 text-[var(--gold)]" />
            <span>Energized &amp; certified</span>
          </div>
          <div className="card-luxe flex flex-col items-center gap-1 p-2.5">
            <Truck className="h-4 w-4 text-[var(--gold)]" />
            <span>India-wide shipping</span>
          </div>
          <div className="card-luxe flex flex-col items-center gap-1 p-2.5">
            <Sparkles className="h-4 w-4 text-[var(--gold)]" />
            <span>Handcrafted</span>
          </div>
        </div>

        <h2 className="mt-7 font-display text-lg">Shop by category</h2>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {categories.map((c) => (
            <a
              key={c.name}
              href={c.href}
              target="_blank"
              rel="noopener noreferrer"
              className="card-luxe overflow-hidden"
            >
              <div className="aspect-square w-full overflow-hidden bg-ivory">
                <img
                  src={c.img}
                  alt={c.name}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                />
              </div>
              <div className="px-3 py-2.5">
                <p className="truncate text-sm font-medium">{c.name}</p>
                <p className="text-[11px] text-muted-foreground">{c.items} items</p>
              </div>
            </a>
          ))}
        </div>

        <h2 className="mt-7 font-display text-lg">Bestsellers</h2>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {bestsellers.map((p) => (
            <a
              key={p.name}
              href={p.href}
              target="_blank"
              rel="noopener noreferrer"
              className="card-luxe overflow-hidden"
            >
              <div className="aspect-square w-full overflow-hidden bg-ivory">
                <img src={p.img} alt={p.name} loading="lazy" className="h-full w-full object-cover" />
              </div>
              <div className="px-3 py-2.5">
                <p className="truncate text-sm font-medium">{p.name}</p>
                <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-[var(--gold)]">
                  Buy now <ExternalLink className="h-3 w-3" />
                </p>
              </div>
            </a>
          ))}
        </div>

        <a
          href={`${STORE}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-7 flex items-center justify-center gap-2 rounded-full gold-bg py-3.5 text-sm font-semibold shadow-luxe"
        >
          Browse the full store <ExternalLink className="h-4 w-4" />
        </a>

        <p className="mt-3 text-center text-[10px] text-muted-foreground">
          You'll be taken to omrudrakshajewels.com to complete checkout.
        </p>
      </section>
    </MobileShell>
  );
}
