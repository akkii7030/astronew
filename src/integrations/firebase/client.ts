// Firebase client (browser-only) for Phone OTP + Firestore chat.
import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, signInAnonymously, type Auth } from "firebase/auth";
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
  if (!_app) _app = getApps()[0] ?? initializeApp(firebaseConfig);
  return _app;
}

export function getFirebaseAuth(): Auth {
  if (!_auth) _auth = getAuth(app());
  return _auth;
}

export function getDb(): Firestore {
  if (!_db) _db = getFirestore(app());
  return _db;
}

/** Ensure there is a Firebase user (anon fallback for Google-via-Supabase sessions). */
export async function ensureFirebaseUser() {
  const auth = getFirebaseAuth();
  if (auth.currentUser) return auth.currentUser;
  const cred = await signInAnonymously(auth);
  return cred.user;
}

export const FIREBASE_PROJECT_ID = firebaseConfig.projectId;
