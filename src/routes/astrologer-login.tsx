// Astrologer-only login. Signs into Firebase Auth (email/password) and
// drops the user on the astrologer dashboard where they can receive
// realtime call popups via the global IncomingCallModal.
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { toast } from "sonner";
import { Lock, Mail } from "lucide-react";
import { getFirebaseAuth } from "@/integrations/firebase/client";
import { ASTROLOGER_ACCOUNTS } from "@/lib/astrologer-accounts";

export const Route = createFileRoute("/astrologer-login")({
  ssr: false,
  head: () => ({ meta: [{ title: "Astrologer sign in — Om Astro" }] }),
  component: AstrologerLogin,
});

function AstrologerLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    try {
      await signInWithEmailAndPassword(getFirebaseAuth(), email.trim(), password);
      toast.success("Signed in");
      navigate({ to: "/astrologer" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Sign-in failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center bg-background px-6 py-10">
      <h1 className="font-display text-3xl">Astrologer <span className="gold-text">Sign in</span></h1>
      <p className="mt-1 text-sm text-muted-foreground">Use the credentials shared by admin.</p>

      <div className="mt-6 card-luxe space-y-3 p-5">
        <label className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-3 text-sm">
          <Mail className="h-4 w-4 text-muted-foreground" />
          <input
            type="email" placeholder="email@omastro.app" value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-transparent outline-none"
          />
        </label>
        <label className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-3 text-sm">
          <Lock className="h-4 w-4 text-muted-foreground" />
          <input
            type="password" placeholder="Password" value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-transparent outline-none"
          />
        </label>
        <button
          onClick={submit}
          disabled={loading || !email || !password}
          className="w-full rounded-full gold-bg py-3 text-sm font-semibold disabled:opacity-60"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </div>

      <div className="mt-6 rounded-xl border border-border bg-card p-3 text-[11px] text-muted-foreground">
        <p className="font-semibold text-foreground">Test accounts</p>
        <ul className="mt-1 space-y-0.5">
          {ASTROLOGER_ACCOUNTS.map((a) => (
            <li key={a.email}>{a.name} — {a.email} / {a.password}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
