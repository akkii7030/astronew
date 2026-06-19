// Canonical astrologer accounts. Used by the seeder + the login page hint.
// These map a Supabase astrologer.name -> the Firebase email/password used
// to authenticate the astrologer side of the call.
export const ASTROLOGER_ACCOUNTS = [
  { name: "Acharya Shivam",  email: "acharya.shivam@omastro.app",  password: "Astro@2026" },
  { name: "Astro Priya",     email: "astro.priya@omastro.app",     password: "Astro@2026" },
  { name: "Pandit Ramesh",   email: "pandit.ramesh@omastro.app",   password: "Astro@2026" },
  { name: "Yogini Meera",    email: "yogini.meera@omastro.app",    password: "Astro@2026" },
] as const;

export type AstrologerAccount = (typeof ASTROLOGER_ACCOUNTS)[number];
