
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE public.phone_otps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  phone TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  attempts INT NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX phone_otps_user_idx ON public.phone_otps(user_id, created_at DESC);
GRANT ALL ON public.phone_otps TO service_role;
ALTER TABLE public.phone_otps ENABLE ROW LEVEL SECURITY;
-- No policies: only service role accesses these via server functions.
