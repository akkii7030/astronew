import { redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export async function requireAuth(opts: { location: { href: string } }) {
  if (typeof window === "undefined") return;
  const { data } = await supabase.auth.getSession();
  if (!data.session) {
    const onboarded = localStorage.getItem("om-onboarded") === "1";
    if (!onboarded) throw redirect({ to: "/splash" });
    throw redirect({ to: "/auth", search: { redirect: opts.location.href } });
  }

  // Skip the check on the details page itself
  if (opts.location.href.startsWith("/details")) return;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, date_of_birth, time_of_birth, birth_location")
    .eq("id", data.session.user.id)
    .maybeSingle();

  const complete =
    profile &&
    profile.full_name &&
    profile.date_of_birth &&
    profile.time_of_birth &&
    profile.birth_location;

  if (!complete) {
    throw redirect({ to: "/details", search: { redirect: opts.location.href } });
  }
}
