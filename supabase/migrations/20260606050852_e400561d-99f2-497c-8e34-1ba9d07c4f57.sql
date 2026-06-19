
CREATE TABLE public.wallets (
  user_id UUID PRIMARY KEY,
  balance_paise BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.wallets TO authenticated;
GRANT ALL ON public.wallets TO service_role;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own wallet read" ON public.wallets FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  amount_paise BIGINT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('credit','debit')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','success','failed')),
  provider TEXT,
  provider_order_id TEXT UNIQUE,
  provider_payment_id TEXT,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX wallet_tx_user_idx ON public.wallet_transactions(user_id, created_at DESC);
GRANT SELECT ON public.wallet_transactions TO authenticated;
GRANT ALL ON public.wallet_transactions TO service_role;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own tx read" ON public.wallet_transactions FOR SELECT TO authenticated USING (auth.uid() = user_id);
