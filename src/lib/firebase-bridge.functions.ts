// Bridge: verify a Firebase ID token (phone provider) and issue a Lovable Cloud
// magic-link URL that signs the user into the existing Supabase backend so the
// existing profile / wallet / astrologer data keeps working.
import { createServerFn } from "@tanstack/react-start";
import { jwtVerify, createRemoteJWKSet } from "jose";

const FIREBASE_PROJECT_ID = "omastro-42ea9";
const JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"),
);

export const exchangeFirebaseToken = createServerFn({ method: "POST" })
  .inputValidator((data: { idToken: string; redirectTo: string }) => {
    if (!data || typeof data.idToken !== "string" || data.idToken.length < 20) {
      throw new Error("idToken required");
    }
    if (typeof data.redirectTo !== "string" || !/^https?:\/\//.test(data.redirectTo)) {
      throw new Error("redirectTo required");
    }
    return data;
  })
  .handler(async ({ data }) => {
    // 1. Verify Firebase ID token signature, issuer, audience, and expiry.
    const { payload } = await jwtVerify(data.idToken, JWKS, {
      issuer: `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`,
      audience: FIREBASE_PROJECT_ID,
    });
    const phone = typeof payload.phone_number === "string" ? payload.phone_number : null;
    if (!phone || !/^\+[1-9]\d{7,14}$/.test(phone)) {
      throw new Error("Firebase token has no verified phone number");
    }

    // 2. Find-or-create a Supabase user keyed by phone. We synthesize a stable
    //    email so the magiclink generator (which requires an email) can issue
    //    a session for phone-first users without losing the phone identifier.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const digits = phone.replace(/[^\d]/g, "");
    const syntheticEmail = `phone-${digits}@phone.omastro.app`;

    // Try lookup by phone first (works for legacy Supabase phone OTP users).
    let userId: string | null = null;
    {
      const { data: list, error } = await supabaseAdmin.auth.admin.listUsers({
        page: 1, perPage: 200,
      });
      if (error) throw error;
      const found = list.users.find(
        (u) => u.phone === digits || u.phone === phone || u.email === syntheticEmail,
      );
      if (found) userId = found.id;
    }

    if (!userId) {
      const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
        email: syntheticEmail,
        phone: digits,
        email_confirm: true,
        phone_confirm: true,
        user_metadata: { phone, provider: "firebase" },
      });
      if (error) throw error;
      userId = created.user.id;
    } else {
      // Make sure the user has the synthetic email so magiclink works.
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        email: syntheticEmail,
        phone: digits,
        email_confirm: true,
        phone_confirm: true,
      });
    }

    // 3. Generate a magic link Supabase will accept to set a session.
    const { data: link, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email: syntheticEmail,
      options: { redirectTo: data.redirectTo },
    });
    if (linkErr) throw linkErr;
    const actionLink = link?.properties?.action_link;
    if (!actionLink) throw new Error("Could not generate sign-in link");

    return { actionLink, userId };
  });

// ─────────────────────────────────────────────────────────────────────────────
// Google sign-in bridge
// Uses Firebase Google Auth (already configured) to authenticate, then maps
// the verified Google email into a Supabase session via magic link.
// This avoids needing Supabase Google OAuth credentials entirely.
// ─────────────────────────────────────────────────────────────────────────────
export const exchangeGoogleToken = createServerFn({ method: "POST" })
  .inputValidator((data: { idToken: string; redirectTo: string }) => {
    if (!data || typeof data.idToken !== "string" || data.idToken.length < 20) {
      throw new Error("idToken required");
    }
    if (typeof data.redirectTo !== "string" || !/^https?:\/\//.test(data.redirectTo)) {
      throw new Error("redirectTo required");
    }
    return data;
  })
  .handler(async ({ data }) => {
    // 1. Verify Firebase ID token — Google sign-in tokens carry an `email` claim.
    const { payload } = await jwtVerify(data.idToken, JWKS, {
      issuer: `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`,
      audience: FIREBASE_PROJECT_ID,
    });

    const email = typeof payload.email === "string" ? payload.email.toLowerCase().trim() : null;
    const emailVerified = payload.email_verified === true;
    const name = typeof payload.name === "string" ? payload.name : undefined;
    const picture = typeof payload.picture === "string" ? payload.picture : undefined;

    if (!email) throw new Error("Firebase Google token has no email claim");
    if (!emailVerified) throw new Error("Google email is not verified");

    // 2. Find-or-create Supabase user keyed by email.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let userId: string | null = null;
    {
      const { data: list, error } = await supabaseAdmin.auth.admin.listUsers({
        page: 1, perPage: 1000,
      });
      if (error) throw error;
      const found = list.users.find((u) => u.email === email);
      if (found) userId = found.id;
    }

    if (!userId) {
      const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: {
          full_name: name,
          avatar_url: picture,
          provider: "google_firebase",
        },
      });
      if (error) throw error;
      userId = created.user.id;
    } else {
      // Keep metadata fresh on every login.
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        email_confirm: true,
        user_metadata: {
          ...(name ? { full_name: name } : {}),
          ...(picture ? { avatar_url: picture } : {}),
        },
      });
    }

    // 3. Issue a Supabase magic-link to hydrate the client session.
    const { data: link, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: { redirectTo: data.redirectTo },
    });
    if (linkErr) throw linkErr;
    const actionLink = link?.properties?.action_link;
    if (!actionLink) throw new Error("Could not generate sign-in link");

    return { actionLink, userId };
  });
