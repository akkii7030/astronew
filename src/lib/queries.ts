import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
      let q = supabase.from("astrologers").select("*").order("is_featured", { ascending: false }).order("rating", { ascending: false });
      if (filter?.category) q = q.contains("categories", [filter.category]);
      if (filter?.onlineOnly) q = q.eq("is_online", true);
      if (filter?.search) q = q.ilike("name", `%${filter.search}%`);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Astrologer[];
    },
  });

export const astrologerQuery = (id: string) =>
  queryOptions({
    queryKey: ["astrologer", id],
    queryFn: async (): Promise<Astrologer | null> => {
      const { data, error } = await supabase.from("astrologers").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data as Astrologer | null;
    },
  });

export const astrologerReviewsQuery = (id: string) =>
  queryOptions({
    queryKey: ["astrologer-reviews", id],
    queryFn: async (): Promise<AstrologerReview[]> => {
      const { data, error } = await supabase
        .from("astrologer_reviews")
        .select("*")
        .eq("astrologer_id", id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as AstrologerReview[];
    },
  });
