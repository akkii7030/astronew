
ALTER TABLE public.astrologers
  ADD COLUMN IF NOT EXISTS followers integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS orders_completed integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gallery_urls text[] NOT NULL DEFAULT '{}'::text[];

CREATE TABLE IF NOT EXISTS public.astrologer_reviews (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  astrologer_id uuid NOT NULL REFERENCES public.astrologers(id) ON DELETE CASCADE,
  reviewer_name text NOT NULL,
  reviewer_avatar text,
  rating numeric NOT NULL DEFAULT 5,
  comment text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.astrologer_reviews TO anon, authenticated;
GRANT ALL ON public.astrologer_reviews TO service_role;

ALTER TABLE public.astrologer_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reviews public read"
  ON public.astrologer_reviews FOR SELECT
  USING (true);

CREATE INDEX IF NOT EXISTS astrologer_reviews_astro_idx
  ON public.astrologer_reviews(astrologer_id, created_at DESC);
