import { useEffect, useState } from "react";
import { type User } from "firebase/auth";
import { getFirebaseAuth } from "@/integrations/firebase/client";

export function useSession() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getFirebaseAuth();
    const unsubscribe = auth.onAuthStateChanged((u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return { session: user ? { user } : null, user, loading };
}
