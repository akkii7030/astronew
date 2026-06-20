import { redirect } from "@tanstack/react-router";
import { getFirebaseAuth } from "@/integrations/firebase/client";

export async function requireAuth(opts: { location: { href: string } }) {
  if (typeof window === "undefined") return;

  const auth = getFirebaseAuth();
  // Wait for Firebase auth to fully initialize (critical on page refresh)
  await new Promise((resolve) => {
    const unsub = auth.onAuthStateChanged((u) => {
      unsub();
      resolve(u);
    });
  });

  const user = auth.currentUser;
  if (!user) {
    const onboarded = localStorage.getItem("om-onboarded") === "1";
    if (!onboarded) throw redirect({ to: "/splash" });
    throw redirect({ to: "/auth", search: { redirect: opts.location.href } });
  }
  // Signed in (even anonymously) — allow access
}
