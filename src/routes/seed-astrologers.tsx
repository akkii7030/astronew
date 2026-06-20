// Hidden one-time seeder. Visit /seed-astrologers, click the button, and it:
//  1. Creates (or signs in to) a real Firebase Auth account per astrologer
//  2. Writes users/{uid} doc in Firestore with role=astrologer + profile
//  3. Writes to astrologers collection in Firestore
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { initializeApp, deleteApp } from "firebase/app";
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { getFirestore, doc, setDoc, serverTimestamp } from "firebase/firestore";
import { getDb } from "@/integrations/firebase/client";
import { ASTROLOGER_ACCOUNTS } from "@/lib/astrologer-accounts";

export const Route = createFileRoute("/seed-astrologers")({
  ssr: false,
  head: () => ({ meta: [{ title: "Seed astrologers" }] }),
  component: SeedPage,
});

type LogEntry = { name: string; status: "ok" | "err"; uid?: string; msg?: string };

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDkGt3cm94SVtTW7_raEwfmpvwdUR-tU5E",
  authDomain: "omastro-42ea9.firebaseapp.com",
  projectId: "omastro-42ea9",
  storageBucket: "omastro-42ea9.firebasestorage.app",
  messagingSenderId: "24968482924",
  appId: "1:24968482924:web:4e49dc39d76fadd7d3c849",
};

const DEMO_PROFILES = [
  {
    name: "Acharya Shivam",
    avatar_url: "https://images.unsplash.com/photo-1542156822-6924d1a71ace?w=600&h=600&fit=crop",
    skills: ["Vedic Astrology", "Vastu"],
    languages: ["English", "Hindi"],
    is_online: true,
    bio: "Expert in Vedic Astrology with over 15 years of experience.",
    categories: ["Career", "Marriage"],
    price_per_minute: 20,
    rating: 4.8,
    reviews_count: 120,
    is_featured: true,
    followers: 1500,
    orders_completed: 300,
    experience_years: 15,
    gallery_urls: [],
  },
  {
    name: "Astro Priya",
    avatar_url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600&h=600&fit=crop",
    skills: ["Tarot Reading", "Numerology"],
    languages: ["English", "Hindi", "Tamil"],
    is_online: true,
    bio: "Renowned Tarot reader helping clients find their true path.",
    categories: ["Love", "Relationships"],
    price_per_minute: 25,
    rating: 4.9,
    reviews_count: 200,
    is_featured: true,
    followers: 2500,
    orders_completed: 500,
    experience_years: 8,
    gallery_urls: [],
  },
  {
    name: "Pandit Ramesh",
    avatar_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=600&fit=crop",
    skills: ["Prashna Kundali", "Face Reading"],
    languages: ["Hindi", "Sanskrit"],
    is_online: false,
    bio: "Specializes in Prashna Kundali and face reading for accurate predictions.",
    categories: ["Health", "Wealth"],
    price_per_minute: 15,
    rating: 4.5,
    reviews_count: 85,
    is_featured: false,
    followers: 800,
    orders_completed: 150,
    experience_years: 20,
    gallery_urls: [],
  },
  {
    name: "Yogini Meera",
    avatar_url: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=600&h=600&fit=crop",
    skills: ["Palmistry", "Crystal Healing"],
    languages: ["English"],
    is_online: true,
    bio: "Guiding souls through crystal healing and palmistry.",
    categories: ["Spiritual", "Career"],
    price_per_minute: 30,
    rating: 5.0,
    reviews_count: 350,
    is_featured: true,
    followers: 4000,
    orders_completed: 800,
    experience_years: 12,
    gallery_urls: [],
  }
];

function SeedPage() {
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState<LogEntry[]>([]);

  async function run() {
    setRunning(true);
    setLog([]);
    const out: LogEntry[] = [];
    const secondary = initializeApp(FIREBASE_CONFIG, "astro-seeder-" + Date.now());
    const secAuth = getAuth(secondary);
    const secDb = getFirestore(secondary);

    try {
      for (const acct of ASTROLOGER_ACCOUNTS) {
        try {
          const profile = DEMO_PROFILES.find((a) => a.name === acct.name);
          if (!profile) {
            out.push({ name: acct.name, status: "err", msg: "no matching demo profile" });
            setLog([...out]);
            continue;
          }

          // Create or sign-in to get a real UID.
          let uid: string;
          let displayName: string = acct.name;
          try {
            const cred = await createUserWithEmailAndPassword(secAuth, acct.email, acct.password);
            uid = cred.user.uid;
            try { await updateProfile(cred.user, { displayName }); } catch { /* noop */ }
          } catch (e) {
            const code = (e as { code?: string }).code;
            if (code === "auth/email-already-in-use") {
              const cred = await signInWithEmailAndPassword(secAuth, acct.email, acct.password);
              uid = cred.user.uid;
              displayName = cred.user.displayName ?? acct.name;
            } else {
              throw e;
            }
          }

          // Firestore users doc (role=astrologer).
          await setDoc(doc(secDb, "users", uid), {
            uid,
            name: displayName,
            role: "astrologer",
            email: acct.email,
            avatar_url: profile.avatar_url ?? null,
            skills: profile.skills ?? [],
            languages: profile.languages ?? [],
            bio: profile.bio ?? null,
            online: profile.is_online ?? false,
            astrologer_id: uid,
            updatedAt: serverTimestamp(),
          }, { merge: true });

          // Firestore astrologers collection
          await setDoc(doc(secDb, "astrologers", uid), {
            id: uid,
            ...profile,
            firebase_uid: uid,
          });

          // Sign secondary auth out so the next iteration starts clean.
          await secAuth.signOut().catch(() => undefined);

          out.push({ name: acct.name, status: "ok", uid });
          setLog([...out]);
        } catch (e) {
          out.push({
            name: acct.name, status: "err",
            msg: e instanceof Error ? e.message : String(e),
          });
          setLog([...out]);
        }
      }
    } finally {
      try { await deleteApp(secondary); } catch { /* noop */ }
      setRunning(false);
    }
  }

  return (
    <div className="mx-auto max-w-md p-6">
      <h1 className="font-display text-2xl">Seed astrologer accounts</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        One-time setup. Creates real Firebase Auth accounts for the demo astrologers,
        stores their profile in Firestore (<code>users</code>), and seeds the
        <code>astrologers</code> collection.
      </p>

      <button
        onClick={run}
        disabled={running}
        className="mt-5 w-full rounded-full gold-bg py-3 text-sm font-semibold disabled:opacity-60"
      >
        {running ? "Seeding…" : "Run seeder"}
      </button>

      <div className="mt-6 grid gap-2">
        {log.map((l, i) => (
          <div key={i} className={`rounded-xl border p-3 text-xs ${l.status === "ok" ? "border-emerald-300 bg-emerald-50" : "border-red-300 bg-red-50"}`}>
            <div className="font-semibold">{l.name}</div>
            {l.uid && <div className="mt-0.5 text-muted-foreground">uid: {l.uid}</div>}
            {l.msg && <div className="mt-0.5 text-red-700">{l.msg}</div>}
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-xl border border-border bg-card p-4 text-xs leading-relaxed">
        <p className="font-semibold">Login credentials (share with each astrologer):</p>
        <ul className="mt-2 space-y-1">
          {ASTROLOGER_ACCOUNTS.map((a) => (
            <li key={a.email}>
              <span className="font-semibold">{a.name}</span> — {a.email} / {a.password}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-muted-foreground">
          Astrologer login page: <code>/astrologer-login</code>
        </p>
      </div>
    </div>
  );
}

