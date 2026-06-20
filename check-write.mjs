import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, serverTimestamp } from "firebase/firestore";

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDkGt3cm94SVtTW7_raEwfmpvwdUR-tU5E",
  authDomain: "omastro-42ea9.firebaseapp.com",
  projectId: "omastro-42ea9",
  storageBucket: "omastro-42ea9.firebasestorage.app",
  messagingSenderId: "24968482924",
  appId: "1:24968482924:web:4e49dc39d76fadd7d3c849",
};

async function checkWrite() {
  const app = initializeApp(FIREBASE_CONFIG, "check-write");
  const db = getFirestore(app);
  
  try {
    const ref = await addDoc(collection(db, "calls"), {
      test: true,
      status: "ringing",
      createdAt: serverTimestamp()
    });
    console.log("Successfully wrote document:", ref.id);
  } catch (e) {
    console.error("Write failed:", e.message);
  }
  process.exit(0);
}

checkWrite();
