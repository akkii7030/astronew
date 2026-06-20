import { queryOptions } from "@tanstack/react-query";
import { getDb } from "@/integrations/firebase/client";
import { collection, getDocs, doc, getDoc, query, where, orderBy, limit } from "firebase/firestore";

export type Astrologer = {
  id: string;
  name: string;
  avatar_url: string | null;
  bio: string | null;
  experience_years: number;
  languages: string[];
  skills: string[];
  categories: string[];
  price_per_minute: number;
  rating: number;
  reviews_count: number;
  is_online: boolean;
  is_featured: boolean;
  followers: number;
  orders_completed: number;
  gallery_urls: string[];
  firebase_uid: string | null;
};

export type AstrologerReview = {
  id: string;
  astrologer_id: string;
  reviewer_name: string;
  reviewer_avatar: string | null;
  rating: number;
  comment: string;
  created_at: string;
};

export const astrologersQuery = (filter?: { category?: string; search?: string; onlineOnly?: boolean }) =>
  queryOptions({
    queryKey: ["astrologers", filter ?? {}],
    queryFn: async (): Promise<Astrologer[]> => {
      const db = getDb();
      let constraints: any[] = [];
      if (filter?.category) constraints.push(where("categories", "array-contains", filter.category));
      if (filter?.onlineOnly) constraints.push(where("is_online", "==", true));
      
      const q = query(collection(db, "astrologers"), ...constraints);
      const snap = await getDocs(q);
      let results = snap.docs.map(d => ({ id: d.id, ...d.data() } as Astrologer));

      if (filter?.search) {
        const term = filter.search.toLowerCase();
        results = results.filter(a => a.name.toLowerCase().includes(term));
      }

      results.sort((a, b) => {
        if (a.is_featured && !b.is_featured) return -1;
        if (!a.is_featured && b.is_featured) return 1;
        return b.rating - a.rating;
      });

      return results;
    },
  });

export const astrologerQuery = (id: string) =>
  queryOptions({
    queryKey: ["astrologer", id],
    queryFn: async (): Promise<Astrologer | null> => {
      const db = getDb();
      const snap = await getDoc(doc(db, "astrologers", id));
      if (!snap.exists()) return null;
      return { id: snap.id, ...snap.data() } as Astrologer;
    },
  });

export const astrologerReviewsQuery = (id: string) =>
  queryOptions({
    queryKey: ["astrologer-reviews", id],
    queryFn: async (): Promise<AstrologerReview[]> => {
      const db = getDb();
      const q = query(
        collection(db, "astrologer_reviews"),
        where("astrologer_id", "==", id),
        orderBy("created_at", "desc"),
        limit(20)
      );
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as AstrologerReview));
    },
  });
