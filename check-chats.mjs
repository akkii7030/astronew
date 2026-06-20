import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

async function main() {
  if (!getApps().length) {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID ?? "omastro-42ea9",
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL ?? "",
        privateKey: (process.env.FIREBASE_PRIVATE_KEY ?? "").replace(/\\n/g, "\n"),
      }),
    });
  }
  const db = getFirestore();
  const chatsSnap = await db.collection("chats").get();
  
  console.log(`Found ${chatsSnap.docs.length} chat rooms`);
  chatsSnap.docs.forEach((doc) => {
    console.log(`\nChat ID: ${doc.id}`);
    console.log(`Data:`, doc.data());
  });
}
main().catch(console.error);
