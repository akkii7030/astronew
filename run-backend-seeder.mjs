import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from "firebase/auth";
import { getFirestore, doc, setDoc, serverTimestamp } from "firebase/firestore";

// Firebase Config
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDkGt3cm94SVtTW7_raEwfmpvwdUR-tU5E",
  authDomain: "omastro-42ea9.firebaseapp.com",
  projectId: "omastro-42ea9",
  storageBucket: "omastro-42ea9.firebasestorage.app",
  messagingSenderId: "24968482924",
  appId: "1:24968482924:web:4e49dc39d76fadd7d3c849",
};

const ASTROLOGER_ACCOUNTS = [
  { name: "Acharya Shivam",  email: "acharya.shivam@omastro.app",  password: "Astro@2026" },
  { name: "Astro Priya",     email: "astro.priya@omastro.app",     password: "Astro@2026" },
  { name: "Pandit Ramesh",   email: "pandit.ramesh@omastro.app",   password: "Astro@2026" },
  { name: "Yogini Meera",    email: "yogini.meera@omastro.app",    password: "Astro@2026" },
];

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

async function run() {
  console.log("Starting Firebase seeder...");
  const app = initializeApp(FIREBASE_CONFIG, "backend-seeder");
  const auth = getAuth(app);
  const db = getFirestore(app);

  for (const acct of ASTROLOGER_ACCOUNTS) {
    console.log(`Processing ${acct.name}...`);
    try {
      const profile = DEMO_PROFILES.find((a) => a.name === acct.name);
      if (!profile) {
        console.error(`  -> no matching demo profile for ${acct.name}`);
        continue;
      }

      let uid;
      let displayName = acct.name;
      try {
        const cred = await createUserWithEmailAndPassword(auth, acct.email, acct.password);
        uid = cred.user.uid;
        try { await updateProfile(cred.user, { displayName }); } catch {}
      } catch (e) {
        if (e.code === "auth/email-already-in-use") {
          const cred = await signInWithEmailAndPassword(auth, acct.email, acct.password);
          uid = cred.user.uid;
        } else {
          throw e;
        }
      }

      console.log(`  -> Firebase UID: ${uid}`);

      // Firestore users doc
      await setDoc(doc(db, "users", uid), {
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
      }, { merge: true });

      // Firestore astrologers doc
      await setDoc(doc(db, "astrologers", uid), {
        id: uid,
        ...profile,
        firebase_uid: uid,
      });

      await auth.signOut();
      console.log(`  -> Successfully seeded!`);
    } catch (e) {
      console.error(`  -> Failed: ${e.message}`);
    }
  }

  console.log("Done seeding Firebase!");
  process.exit(0);
}

run();
