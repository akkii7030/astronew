ALTER TABLE public.astrologers ADD COLUMN IF NOT EXISTS firebase_uid text;
CREATE INDEX IF NOT EXISTS astrologers_firebase_uid_idx ON public.astrologers (firebase_uid);
GRANT UPDATE (firebase_uid) ON public.astrologers TO authenticated;