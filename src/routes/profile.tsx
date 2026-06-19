import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { LogOut, User, Mail, Phone, Cake, ShieldCheck } from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { sendPhoneOtp, verifyPhoneOtp } from "@/lib/otp.functions";
import { requireAuth } from "@/lib/auth-guard";

export const Route = createFileRoute("/profile")({
  ssr: false,
  head: () => ({ meta: [{ title: "Profile — Om Astro" }] }),
  beforeLoad: ({ location }) => requireAuth({ location }),
  component: ProfilePage,
});

type Profile = {
  id: string;
  full_name: string | null;
  phone: string | null;
  phone_verified: boolean | null;
  date_of_birth: string | null;
  gender: string | null;
  avatar_url: string | null;
};

function initials(name?: string | null, email?: string | null) {
  const src = name || email || "U";
  return src.split(/[ @.]/).filter(Boolean).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

function ProfilePage() {
  const { user, loading } = useSession();
  const navigate = useNavigate();
  const sendOtp = useServerFn(sendPhoneOtp);
  const verifyOtp = useServerFn(verifyPhoneOtp);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth", search: { redirect: "/profile" } });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle().then(({ data }) => {
      if (data) {
        setProfile(data as Profile);
        setName(data.full_name ?? "");
        setDob(data.date_of_birth ?? "");
        setGender(data.gender ?? "");
        setPhone(data.phone ?? "");
      }
    });
  }, [user]);

  if (loading || !user) {
    return <MobileShell><div className="p-10 text-center text-sm text-muted-foreground">Loading…</div></MobileShell>;
  }

  async function save() {
    setSaving(true);
    const { error } = await supabase.from("profiles").upsert({
      id: user!.id, full_name: name || null, date_of_birth: dob || null, gender: gender || null,
    });
    setSaving(false);
    if (error) { console.error(error); toast.error("Failed to save profile. Please try again."); }
    else toast.success("Profile saved");
  }

  async function handleSendOtp() {
    if (!/^\+[1-9]\d{7,14}$/.test(phone)) {
      toast.error("Enter phone in international format, e.g. +919812345678");
      return;
    }
    setVerifying(true);
    try {
      await sendOtp({ data: { phone } });
      setOtpSent(true);
      toast.success("We sent a 6-digit code via SMS");
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Could not send SMS");
    } finally { setVerifying(false); }
  }

  async function handleVerifyOtp() {
    setVerifying(true);
    try {
      await verifyOtp({ data: { phone, code: otp } });
      toast.success("Phone verified");
      setOtpSent(false); setOtp("");
      setProfile((p) => p ? { ...p, phone, phone_verified: true } : p);
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Invalid or expired code");
    } finally { setVerifying(false); }
  }

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  const isVerified = !!profile?.phone_verified && profile?.phone === phone;

  return (
    <MobileShell>
      <div className="space-y-5 px-5 pt-2">
        <div className="card-luxe p-5">
          <div className="flex items-center gap-3">
            <div className="grid h-14 w-14 place-items-center rounded-full gold-bg font-display text-lg shadow-luxe">
              {initials(profile?.full_name, user.email)}
            </div>
            <div className="min-w-0">
              <h1 className="truncate font-display text-xl">{profile?.full_name || "Your profile"}</h1>
              <p className="truncate text-xs text-muted-foreground">{user.email ?? profile?.phone}</p>
            </div>
          </div>
        </div>

        <section className="card-luxe space-y-3 p-5">
          <h2 className="font-display text-lg">Personal details</h2>
          <Field icon={<User className="h-4 w-4" />} placeholder="Full name" value={name} onChange={setName} />
          <Field icon={<Mail className="h-4 w-4" />} placeholder="Email" value={user.email ?? ""} onChange={() => {}} disabled />
          <Field icon={<Cake className="h-4 w-4" />} type="date" placeholder="Date of birth" value={dob} onChange={setDob} />
          <div className="flex gap-2">
            {(["Male", "Female", "Other"] as const).map((g) => (
              <button key={g} onClick={() => setGender(g)}
                className={`flex-1 rounded-full border py-2 text-xs font-medium transition ${
                  gender === g ? "gold-bg border-transparent" : "border-border bg-card text-muted-foreground"
                }`}>
                {g}
              </button>
            ))}
          </div>
          <button onClick={save} disabled={saving} className="w-full rounded-full gold-bg py-3 text-sm font-semibold shadow-luxe disabled:opacity-60">
            {saving ? "Saving…" : "Save changes"}
          </button>
        </section>

        <section className="card-luxe space-y-3 p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg">Phone verification</h2>
            {isVerified && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-700">
                <ShieldCheck className="h-3 w-3" /> Verified
              </span>
            )}
          </div>
          <Field
            icon={<Phone className="h-4 w-4" />}
            placeholder="+919812345678"
            value={phone}
            onChange={(v) => { setPhone(v); setOtpSent(false); }}
          />
          {otpSent && (
            <Field icon={<ShieldCheck className="h-4 w-4" />} placeholder="6-digit code" value={otp} onChange={setOtp} />
          )}
          {!isVerified && (
            <button
              onClick={otpSent ? handleVerifyOtp : handleSendOtp}
              disabled={verifying || !phone || (otpSent && otp.length < 6)}
              className="w-full rounded-full gold-bg py-3 text-sm font-semibold shadow-luxe disabled:opacity-60"
            >
              {verifying ? "Please wait…" : otpSent ? "Verify code" : "Send OTP"}
            </button>
          )}
          <p className="text-[11px] text-muted-foreground">SMS rates may apply. Code expires in 5 minutes.</p>
        </section>

        <button onClick={signOut} className="flex w-full items-center justify-center gap-2 rounded-full border border-border bg-card py-3 text-sm font-medium text-destructive">
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </div>
    </MobileShell>
  );
}

function Field({
  icon, type = "text", placeholder, value, onChange, disabled,
}: {
  icon: React.ReactNode; type?: string; placeholder: string; value: string; onChange: (v: string) => void; disabled?: boolean;
}) {
  return (
    <label className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 text-sm shadow-soft focus-within:border-[var(--gold)]">
      <span className="text-muted-foreground">{icon}</span>
      <input type={type} placeholder={placeholder} value={value}
        onChange={(e) => onChange(e.target.value)} disabled={disabled}
        className="w-full bg-transparent outline-none placeholder:text-muted-foreground disabled:text-muted-foreground" />
    </label>
  );
}
