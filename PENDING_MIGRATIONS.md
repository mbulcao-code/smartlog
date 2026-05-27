# Pending Supabase Migrations

Run all of these in Supabase → SQL Editor in one pass.

## SmartLog App — May 23–25 additions

```sql
-- Trade journal: P&L column (May 23)
ALTER TABLE trade_journal ADD COLUMN IF NOT EXISTS pnl NUMERIC;

-- Trade journal: multi-select outcomes array (May 25)
ALTER TABLE trade_journal ADD COLUMN IF NOT EXISTS trade_outcomes JSONB DEFAULT '[]'::jsonb;

-- Journal setups: structured stop + profit configs (May 23)
ALTER TABLE journal_setups ADD COLUMN IF NOT EXISTS stop_config JSONB DEFAULT '{}'::jsonb;
ALTER TABLE journal_setups ADD COLUMN IF NOT EXISTS profit_config JSONB DEFAULT '{}'::jsonb;
```

## Interactive AI Book — new tables (run when deploying book app)

```sql
-- Track which users have had a conversation (free tier gate)
CREATE TABLE IF NOT EXISTS book_conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  last_message_at TIMESTAMPTZ DEFAULT now(),
  entry_point TEXT, -- 'pain', 'concept', 'browse'
  chapter_id TEXT,  -- e.g. 'fomo', 'f1', etc.
  message_count INT DEFAULT 0
);
ALTER TABLE book_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own book conversations"
  ON book_conversations FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Index for fast per-user lookup
CREATE INDEX IF NOT EXISTS idx_book_conversations_user_id ON book_conversations(user_id);

-- Book subscriptions (monthly / yearly paid plans)
CREATE TABLE IF NOT EXISTS book_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT UNIQUE,
  stripe_customer_id TEXT,
  status TEXT NOT NULL DEFAULT 'active', -- 'active' | 'canceled' | 'past_due'
  plan TEXT, -- 'monthly' | 'yearly'
  period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE book_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own book subscriptions"
  ON book_subscriptions FOR SELECT
  USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_book_subscriptions_user_id ON book_subscriptions(user_id);

-- Book lifetime users (one-time payment)
CREATE TABLE IF NOT EXISTS book_lifetime_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  stripe_customer_id TEXT,
  stripe_payment_intent_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);
ALTER TABLE book_lifetime_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own book lifetime"
  ON book_lifetime_users FOR SELECT
  USING (auth.uid() = user_id);
```

## Status

- [ ] SmartLog migrations (run ASAP — app features already deployed but columns missing)
- [ ] Book migrations (run when deploying book.smartlogtrading.com)
