import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Lock, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

import { getFirebaseAuth } from "@/integrations/firebase/client";
import { exchangeFirebaseToken, exchangeGoogleToken } from "@/lib/firebase-bridge.functions";
import logoAsset from "@/assets/om-astro-logo.jpeg.asset.json";

const searchSchema = z.object({ redirect: z.string().optional() });

export const Route = createFileRoute("/auth")({
  ssr: false,
  validateSearch: searchSchema,
  beforeLoad: async ({ search }) => {
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: (search.redirect as "/") ?? "/" });
  },
  head: () => ({ meta: [{ title: "Sign in — Om Astro" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const exchange = useServerFn(exchangeFirebaseToken);
  const googleExchange = useServerFn(exchangeGoogleToken);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const recaptchaRef = useRef<HTMLDivElement | null>(null);
  const verifierRef = useRef<unknown>(null);
  const confirmationRef = useRef<{ confirm: (code: string) => Promise<{ user: { getIdToken: () => Promise<string> } }> } | null>(null);

  useEffect(() => {
    return () => {
      // Cleanup reCAPTCHA on unmount.
      const v = verifierRef.current as { clear?: () => void } | null;
      if (v && typeof v.clear === "function") v.clear();
      verifierRef.current = null;
    };
  }, []);

  async function ensureVerifier() {
    if (verifierRef.current) return verifierRef.current;
    const { RecaptchaVerifier } = await import("firebase/auth");
    const auth = getFirebaseAuth();
    const v = new RecaptchaVerifier(auth, recaptchaRef.current!, { size: "invisible" });
    await v.render();
    verifierRef.current = v;
    return v;
  }

  async function handleGoogle() {
    setLoading(true);
    try {
      // Use Firebase Google popup (Firebase project already has Google OAuth
      // configured) — avoids needing Supabase Google OAuth credentials.
      const { GoogleAuthProvider, signInWithPopup } = await import("firebase/auth");
      const auth = getFirebaseAuth();
      const result = await signInWithPopup(auth, new GoogleAuthProvider());
      const idToken = await result.user.getIdToken();

      // Bridge the Firebase Google token into a Supabase session via magic link.
      const { actionLink } = await googleExchange({
        data: {
          idToken,
          redirectTo: window.location.origin + (search.redirect ?? "/"),
        },
      });
      // Magic link sets the Supabase session in the URL hash on load.
      window.location.replace(actionLink);
    } catch (err: unknown) {
      // User cancelled the popup — don't show an error toast.
      const code = (err as { code?: string })?.code;
      if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
        return;
      }
      console.error(err);
      alert("Login Error: " + (err instanceof Error ? err.message : String(err)));
      toast.error(err instanceof Error ? err.message : "Google sign-in failed");
    } finally {
      setLoading(false);
    }
  }

  async function sendPhoneOtp() {
    const e164 = phone.trim();
    if (!/^\+[1-9]\d{7,14}$/.test(e164)) {
      toast.error("Enter phone in international format, e.g. +919876543210");
      return;
    }
    setLoading(true);
    try {
      const { signInWithPhoneNumber } = await import("firebase/auth");
      const auth = getFirebaseAuth();
      const verifier = await ensureVerifier();
      const confirmation = await signInWithPhoneNumber(auth, e164, verifier as Parameters<typeof signInWithPhoneNumber>[2]);
      confirmationRef.current = confirmation;
      setOtpSent(true);
      toast.success("We sent a 6-digit code to your phone.");
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Could not send code");
      // Reset reCAPTCHA on failure so user can retry.
      const v = verifierRef.current as { clear?: () => void } | null;
      if (v && typeof v.clear === "function") v.clear();
      verifierRef.current = null;
    } finally {
      setLoading(false);
    }
  }

  async function verifyPhoneOtp() {
    if (!confirmationRef.current) {
      toast.error("Please request a new code");
      setOtpSent(false);
      return;
    }
    setLoading(true);
    try {
      const cred = await confirmationRef.current.confirm(otp);
      const idToken = await cred.user.getIdToken();
      const { actionLink } = await exchange({
        data: { idToken, redirectTo: window.location.origin + (search.redirect ?? "/") },
      });
      // Follow the magic link — Supabase sets the session in URL hash and the
      // client picks it up on load, then auth-guard routes to /details if needed.
      window.location.replace(actionLink);
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Invalid or expired code");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-background px-6 py-10">
      <motion.div
        initial={{ y: 16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center text-center"
      >
        <span className="grid h-16 w-16 place-items-center overflow-hidden rounded-2xl bg-white ring-1 ring-[color-mix(in_oklab,var(--gold)_45%,transparent)] shadow-luxe">
          <img src={logoAsset.url} alt="Om Astro" className="h-full w-full object-cover" />
        </span>
        <p className="mt-5 text-[11px] uppercase tracking-[0.4em] text-muted-foreground">Sacred Journey</p>
        <h1 className="mt-2 font-display text-3xl">
          Welcome to <span className="gold-text">Om Astro</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Sign in to consult with verified astrologers.</p>
      </motion.div>

      <motion.div
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.55, delay: 0.1 }}
        className="mt-8 card-luxe p-5"
      >
        <div className="space-y-3">
          <Field
            icon={<Phone className="h-4 w-4" />}
            type="tel"
            placeholder="Phone, e.g. +919876543210"
            value={phone}
            onChange={setPhone}
            disabled={otpSent}
          />
          {otpSent && (
            <Field icon={<Lock className="h-4 w-4" />} type="text" placeholder="Enter 6-digit code" value={otp} onChange={setOtp} />
          )}
          <button
            disabled={loading || !phone || (otpSent && otp.length < 6)}
            onClick={otpSent ? verifyPhoneOtp : sendPhoneOtp}
            className="w-full rounded-full gold-bg py-3 text-sm font-semibold shadow-luxe disabled:opacity-60"
          >
            {loading ? "Please wait…" : otpSent ? "Verify & sign in" : "Send SMS code"}
          </button>
          {otpSent ? (
            <button
              type="button"
              onClick={() => {
                setOtpSent(false);
                setOtp("");
                confirmationRef.current = null;
              }}
              className="w-full text-center text-xs text-muted-foreground"
            >
              Use a different number
            </button>
          ) : (
            <p className="px-2 text-[11px] text-muted-foreground">
              Standard SMS rates may apply. Include your country code (e.g. +91 for India).
            </p>
          )}
        </div>

        <div className="my-5 flex items-center gap-3 text-[11px] uppercase tracking-widest text-muted-foreground">
          <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
        </div>

        <button
          onClick={handleGoogle}
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-full border border-border bg-card py-3 text-sm font-medium hover:shadow-soft disabled:opacity-60"
        >
          <GoogleIcon /> Continue with Google
        </button>

        {/* Invisible reCAPTCHA host for Firebase Phone Auth */}
        <div ref={recaptchaRef} />
      </motion.div>

      <p className="mt-6 text-center text-[11px] text-muted-foreground">
        By continuing you agree to our Terms and Privacy Policy.
      </p>
    </div>
  );
}

function Field({
  icon, type, placeholder, value, onChange, disabled,
}: {
  icon: React.ReactNode; type: string; placeholder: string; value: string; onChange: (v: string) => void; disabled?: boolean;
}) {
  return (
    <label className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-3 text-sm shadow-soft focus-within:border-[var(--gold)]">
      <span className="text-muted-foreground">{icon}</span>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent outline-none placeholder:text-muted-foreground disabled:opacity-60"
      />
    </label>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.6 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C33.9 6.1 29.2 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C33.9 6.1 29.2 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 44c5.1 0 9.8-2 13.3-5.2l-6.1-5.2c-2 1.4-4.5 2.4-7.2 2.4-5.3 0-9.7-3.4-11.3-8.1l-6.5 5C9.6 39.6 16.2 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.4 4.3-4.5 5.6l6.1 5.2C40.9 35.9 44 30.4 44 24c0-1.2-.1-2.3-.4-3.5z"/>
    </svg>
  );
}
