// Firebase client (browser-only) for Phone OTP + Firestore chat.
import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, signInAnonymously, type Auth, browserLocalPersistence, setPersistence } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDkGt3cm94SVtTW7_raEwfmpvwdUR-tU5E",
  authDomain: "omastro-42ea9.firebaseapp.com",
  databaseURL: "https://omastro-42ea9-default-rtdb.firebaseio.com",
  projectId: "omastro-42ea9",
  storageBucket: "omastro-42ea9.firebasestorage.app",
  messagingSenderId: "24968482924",
  appId: "1:24968482924:web:4e49dc39d76fadd7d3c849",
  measurementId: "G-EXVPVC2BHZ",
};

let _app: FirebaseApp | undefined;
let _auth: Auth | undefined;
let _db: Firestore | undefined;

function app() {
  if (typeof window === "undefined") throw new Error("Firebase is browser-only");
  if (!_app) {
    console.log("[Firebase] Initializing Firebase app...");
    _app = getApps()[0] ?? initializeApp(firebaseConfig);
    console.log("[Firebase] Firebase app initialized:", _app.name);
  }
  return _app;
}

export function getFirebaseAuth(): Auth {
  if (!_auth) {
    console.log("[Firebase] Getting Firebase auth...");
    _auth = getAuth(app());
    console.log("[Firebase] Firebase auth obtained:", _auth);
    // Set persistence to LOCAL so Firebase auth survives page reloads
    setPersistence(_auth, browserLocalPersistence).catch((e) => {
      console.error("[Firebase] Failed to set persistence:", e);
    });
    console.log("[Firebase] Persistence set to LOCAL");
  }
  return _auth;
}

export function getDb(): Firestore {
  if (!_db) _db = getFirestore(app());
  return _db;
}

export async function ensureFirebaseUser() {
  const auth = getFirebaseAuth();

  // Wait for the first auth state emission so we don't accidentally overwrite
  // an existing session loading from IndexedDB
  await new Promise<void>((resolve) => {
    const unsub = auth.onAuthStateChanged(() => {
      unsub();
      resolve();
    });
  });

  if (auth.currentUser) return auth.currentUser;
  try {
    const cred = await signInAnonymously(auth);
    return cred.user;
  } catch (e: unknown) {
    const code = (e as { code?: string })?.code;
    if (code === "auth/operation-not-allowed") {
      throw new Error(
        "Anonymous sign-in is disabled. Enable it in Firebase Console → Authentication → Sign-in method → Anonymous."
      );
    }
    throw e;
  }
}

export const FIREBASE_PROJECT_ID = firebaseConfig.projectId;
