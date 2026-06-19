// Hidden one-time seeder. Visit /seed-astrologers, click the button, and it:
//  1. Creates (or signs in to) a real Firebase Auth account per astrologer
//  2. Writes users/{uid} doc in Firestore with role=astrologer + profile
//  3. Stores the real firebase_uid back on the Supabase astrologers row
//
// Uses a SECONDARY firebase app instance so the currently-signed-in user
// (you) is not signed out while accounts are being created.
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { initializeApp, deleteApp } from "firebase/app";
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { getDb } from "@/integrations/firebase/client";
import { supabase } from "@/integrations/supabase/client";
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

function SeedPage() {
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState<LogEntry[]>([]);

  async function run() {
    setRunning(true);
    setLog([]);
    const out: LogEntry[] = [];
    const secondary = initializeApp(FIREBASE_CONFIG, "astro-seeder-" + Date.now());
    const secAuth = getAuth(secondary);

    try {
      // Look up supabase astrologers by name once.
      const { data: astros, error } = await supabase
        .from("astrologers")
        .select("id, name, avatar_url, skills, languages, is_online, bio");
      if (error) throw error;

      for (const acct of ASTROLOGER_ACCOUNTS) {
        try {
          const profile = astros?.find((a) => a.name === acct.name);
          if (!profile) {
            out.push({ name: acct.name, status: "err", msg: "no matching supabase row" });
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
          await setDoc(doc(getDb(), "users", uid), {
            uid,
            name: displayName,
            role: "astrologer",
            email: acct.email,
            avatar_url: profile.avatar_url ?? null,
            skills: profile.skills ?? [],
            languages: profile.languages ?? [],
            bio: profile.bio ?? null,
            online: profile.is_online ?? false,
            astrologer_id: profile.id,
            updatedAt: serverTimestamp(),
          }, { merge: true });

          // Persist real uid on the Supabase astrologer row.
          const { error: upErr } = await supabase
            .from("astrologers")
            .update({ firebase_uid: uid })
            .eq("id", profile.id);
          if (upErr) throw upErr;

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
        One-time setup. Creates real Firebase Auth accounts for the 4 astrologers,
        stores their profile in Firestore (<code>users</code>), and links the
        Firebase UID back to each Supabase astrologer row.
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
