import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import maleImg from "@/assets/rudraksha-male.jpeg.asset.json";
import femaleImg from "@/assets/rudraksha-female.jpeg.asset.json";
import logoAsset from "@/assets/om-astro-logo.jpeg.asset.json";

export const Route = createFileRoute("/onboarding")({
  ssr: false,
  head: () => ({ meta: [{ title: "Welcome — Om Astro" }] }),
  component: OnboardingPage,
});

const slides = [
  {
    img: femaleImg.url,
    eyebrow: "Cosmic Guidance",
    title: "Unlock the Power of the Cosmos",
    sub: "Discover personalized astrology insights, remedies, and spiritual guidance crafted for your journey.",
    position: "object-center",
  },
  {
    img: maleImg.url,
    eyebrow: "Sacred Energy",
    title: "Sacred Rudraksha Energy",
    sub: "Explore authentic Rudraksha collections designed to bring positivity, protection, and inner balance.",
    position: "object-top",
  },
  {
    img: femaleImg.url,
    eyebrow: "Divine Journey",
    title: "Your Spiritual Journey Starts Here",
    sub: "Connect with astrology, healing energies, and divine guidance — all in one premium experience.",
    position: "object-center",
  },
];

function OnboardingPage() {
  const navigate = useNavigate();
  const [i, setI] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setI((p) => (p + 1) % slides.length), 4500);
    return () => clearInterval(t);
  }, []);

  function finish() {
    localStorage.setItem("om-onboarded", "1");
    navigate({ to: "/auth" });
  }

  function next() {
    if (i === slides.length - 1) finish();
    else setI(i + 1);
  }

  const s = slides[i];

  return (
    <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col overflow-hidden bg-black">
      <AnimatePresence mode="sync">
        <motion.img
          key={i}
          src={s.img}
          alt=""
          initial={{ opacity: 0, scale: 1.08 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.1, ease: "easeOut" }}
          className={`absolute inset-0 h-full w-full object-cover ${s.position}`}
        />
      </AnimatePresence>

      {/* dark luxe gradient */}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,_rgba(8,6,2,0.35)_0%,_rgba(8,6,2,0.15)_35%,_rgba(8,6,2,0.85)_75%,_rgba(8,6,2,0.96)_100%)]" />
      {/* gold vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(120%_70%_at_50%_10%,_color-mix(in_oklab,var(--gold)_18%,transparent)_0%,_transparent_55%)]" />

      <div className="relative z-10 flex items-center justify-between px-5 pt-6">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center overflow-hidden rounded-full bg-white/95 ring-1 ring-[color-mix(in_oklab,var(--gold)_45%,transparent)]">
            <img src={logoAsset.url} alt="Om Astro" className="h-full w-full object-cover" />
          </span>
          <span className="font-display text-lg text-white">
            Om <span className="gold-text">Astro</span>
          </span>
        </div>
        <button onClick={finish} className="text-xs font-medium text-white/80 hover:text-white">
          Skip
        </button>
      </div>

      <div className="relative z-10 mt-auto px-6 pb-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={i}
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -16, opacity: 0 }}
            transition={{ duration: 0.55, ease: [0.2, 0.8, 0.2, 1] }}
          >
            <p className="text-[11px] uppercase tracking-[0.4em] text-[color-mix(in_oklab,var(--gold)_75%,white)]">
              {s.eyebrow}
            </p>
            <h2 className="mt-3 font-display text-[34px] leading-[1.05] text-white">
              {s.title}
            </h2>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/80">
              {s.sub}
            </p>
          </motion.div>
        </AnimatePresence>

        <div className="mt-7 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setI(idx)}
                aria-label={`Slide ${idx + 1}`}
                className={`h-1.5 rounded-full transition-all ${
                  idx === i ? "w-8 gold-bg" : "w-1.5 bg-white/40"
                }`}
              />
            ))}
          </div>
          <button
            onClick={next}
            className="group inline-flex items-center gap-2 rounded-full gold-bg px-6 py-3 text-sm font-semibold shadow-luxe"
          >
            {i === slides.length - 1 ? "Get Started" : "Next"}
            <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
