import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { motion } from "framer-motion";
import logoAsset from "@/assets/om-astro-logo.jpeg.asset.json";
import { getFirebaseAuth } from "@/integrations/firebase/client";

export const Route = createFileRoute("/splash")({
  ssr: false,
  head: () => ({ meta: [{ title: "Om Astro" }] }),
  component: SplashPage,
});

function SplashPage() {
  const navigate = useNavigate();
  useEffect(() => {
    const t = setTimeout(() => {
      const auth = getFirebaseAuth();
      const unsub = auth.onAuthStateChanged((u) => {
        unsub();
        if (u && !u.isAnonymous) return navigate({ to: "/" });
        const onboarded = localStorage.getItem("om-onboarded") === "1";
        navigate({ to: onboarded ? "/auth" : "/onboarding" });
      });
    }, 1800);
    return () => clearTimeout(t);
  }, [navigate]);

  return (
    <div className="grid min-h-screen place-items-center bg-white">
      <motion.img
        src={logoAsset.url}
        alt="Om Astro"
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1, ease: [0.2, 0.8, 0.2, 1] }}
        className="h-40 w-40 rounded-3xl object-contain"
      />
    </div>
  );
}
