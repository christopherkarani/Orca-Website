CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  clerk_user_id TEXT,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS clerk_user_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS accounts_clerk_user_id_idx
  ON accounts(clerk_user_id)
  WHERE clerk_user_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS account_api_keys (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL,
  key_last4 TEXT NOT NULL,
  scopes JSONB NOT NULL,
  last_used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS account_api_keys_account_created_idx
  ON account_api_keys(account_id, created_at DESC);

CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  stripe_customer_id TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  customer_id TEXT NOT NULL,
  stripe_subscription_id TEXT NOT NULL UNIQUE,
  tier TEXT NOT NULL CHECK (tier IN ('free', 'pro', 'team')),
  status TEXT NOT NULL,
  seat_count INTEGER NOT NULL DEFAULT 1,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS licenses (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  customer_id TEXT NOT NULL,
  subscription_id TEXT,
  tier TEXT NOT NULL CHECK (tier IN ('free', 'pro', 'team')),
  status TEXT NOT NULL CHECK (status IN ('active', 'revoked')),
  seat_count INTEGER NOT NULL DEFAULT 1,
  features JSONB NOT NULL,
  license_key TEXT NOT NULL,
  signature TEXT NOT NULL,
  issued_at TIMESTAMPTZ NOT NULL,
  renews_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS licenses_account_updated_idx ON licenses(account_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS webhook_events (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  stripe_created BIGINT NOT NULL,
  status TEXT NOT NULL DEFAULT 'processed' CHECK (status IN ('processing', 'processed')),
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE webhook_events
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'processed'
    CHECK (status IN ('processing', 'processed'));

ALTER TABLE webhook_events
  ALTER COLUMN processed_at DROP NOT NULL;

ALTER TABLE webhook_events
  ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ NOT NULL DEFAULT now();
