import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { User, CalendarDays, Clock, MapPin } from "lucide-react";
import { getFirebaseAuth, getDb } from "@/integrations/firebase/client";
import { doc, getDoc, setDoc } from "firebase/firestore";

const searchSchema = z.object({ redirect: z.string().optional() });

export const Route = createFileRoute("/details")({
  ssr: false,
  validateSearch: searchSchema,
  beforeLoad: async ({ location }) => {
    if (typeof window === "undefined") return;
    const auth = getFirebaseAuth();
    // Wait for Firebase auth to initialize
    await new Promise((resolve) => {
      const unsub = auth.onAuthStateChanged((u) => { unsub(); resolve(u); });
    });
    if (!auth.currentUser) {
      const { redirect } = await import("@tanstack/react-router");
      throw redirect({ to: "/auth", search: { redirect: location.href } });
    }
  },
  head: () => ({ meta: [{ title: "Your details — Om Astro" }] }),
  component: DetailsPage,
});

function DetailsPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [fullName, setFullName] = useState("");
  const [dob, setDob] = useState("");
  const [tob, setTob] = useState("");
  const [place, setPlace] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const auth = getFirebaseAuth();
    const offAuth = auth.onAuthStateChanged(async (u) => {
      offAuth();
      if (!u) return;
      try {
        const snap = await getDoc(doc(getDb(), "users", u.uid));
        const profile = snap.data();
        if (profile) {
          setFullName(profile.name ?? "");
          setDob(profile.date_of_birth ?? "");
          setTob(profile.time_of_birth ?? "");
          setPlace(profile.birth_location ?? "");
          if (
            profile.name &&
            profile.date_of_birth &&
            profile.time_of_birth &&
            profile.birth_location
          ) {
            navigate({ to: (search.redirect as "/") ?? "/", replace: true });
            return;
          }
        }
      } catch { /* noop */ }
      setChecking(false);
    });
    return () => offAuth();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName || !dob || !tob || !place) {
      toast.error("Please fill all fields");
      return;
    }
    setLoading(true);
    try {
      const auth = getFirebaseAuth();
      const u = auth.currentUser;
      if (!u) throw new Error("Not signed in");
      await setDoc(doc(getDb(), "users", u.uid), {
        name: fullName.trim(),
        date_of_birth: dob,
        time_of_birth: tob,
        birth_location: place.trim(),
        role: "user",
      }, { merge: true });
      toast.success("Welcome to Om Astro");
      navigate({ to: (search.redirect as "/") ?? "/", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--gold)] border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-background px-6 py-10">
      <motion.div
        initial={{ y: 16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        <p className="text-[11px] uppercase tracking-[0.4em] text-muted-foreground">A few details</p>
        <h1 className="mt-2 font-display text-3xl">
          Your <span className="gold-text">Birth Chart</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          We use this to personalise your readings.
        </p>
      </motion.div>

      <motion.form
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.55, delay: 0.1 }}
        onSubmit={submit}
        className="mt-8 card-luxe space-y-3 p-5"
      >
        <Field icon={<User className="h-4 w-4" />} placeholder="Full name" value={fullName} onChange={setFullName} />
        <Field icon={<CalendarDays className="h-4 w-4" />} type="date" placeholder="Date of birth" value={dob} onChange={setDob} />
        <Field icon={<Clock className="h-4 w-4" />} type="time" placeholder="Time of birth" value={tob} onChange={setTob} />
        <Field icon={<MapPin className="h-4 w-4" />} placeholder="Birth location (city, country)" value={place} onChange={setPlace} />

        <button
          disabled={loading}
          className="w-full rounded-full gold-bg py-3 text-sm font-semibold shadow-luxe disabled:opacity-60"
        >
          {loading ? "Saving…" : "Continue"}
        </button>
      </motion.form>
    </div>
  );
}

function Field({
  icon, type = "text", placeholder, value, onChange,
}: {
  icon: React.ReactNode; type?: string; placeholder: string; value: string; onChange: (v: string) => void;
}) {
  return (
    <label className="flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-3 text-sm shadow-soft transition focus-within:border-[var(--gold)]">
      <span className="text-muted-foreground">{icon}</span>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent outline-none placeholder:text-muted-foreground"
      />
    </label>
  );
}
