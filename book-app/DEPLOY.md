# Deploy Checklist — book.smartlogtrading.com

## 1. Supabase — run SQL migrations

Open Supabase → SQL Editor → run this block:

```sql
-- Book conversations (free tier tracking)
CREATE TABLE IF NOT EXISTS book_conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  last_message_at TIMESTAMPTZ DEFAULT now(),
  entry_point TEXT,
  message_count INT DEFAULT 0
);
ALTER TABLE book_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own book conversations"
  ON book_conversations FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_book_conversations_user
  ON book_conversations(user_id);

-- Book subscriptions (monthly / yearly)
CREATE TABLE IF NOT EXISTS book_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT UNIQUE,
  stripe_customer_id TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  plan TEXT, -- 'monthly' | 'yearly'
  period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE book_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own book subscriptions"
  ON book_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Book lifetime users
CREATE TABLE IF NOT EXISTS book_lifetime_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  stripe_customer_id TEXT,
  stripe_payment_intent_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE book_lifetime_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own book lifetime"
  ON book_lifetime_users FOR SELECT
  USING (auth.uid() = user_id);
```

---

## 2. Supabase — Auth redirect allowlist

Supabase → Authentication → URL Configuration → Redirect URLs. Add:

```
https://book.smartlogtrading.com/**
https://book.smartlogtrading.com/auth/confirm
```

---

## 3. Stripe — create products + price IDs

Stripe Dashboard → Products → Add product: **Trading Without Ego — Interactive Book**

Create 3 prices:
- Monthly recurring: $29/month → copy price ID → `NEXT_PUBLIC_BOOK_MONTHLY_PRICE_ID`
- Yearly recurring: $79/year → copy price ID → `NEXT_PUBLIC_BOOK_YEARLY_PRICE_ID`
- One-time: $199 → copy price ID → `NEXT_PUBLIC_BOOK_LIFETIME_PRICE_ID`

---

## 4. Stripe — webhook

Stripe Dashboard → Developers → Webhooks → Add endpoint:

- URL: `https://book.smartlogtrading.com/api/stripe/webhook`
- Events to listen for:
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
- Copy signing secret → `STRIPE_BOOK_WEBHOOK_SECRET`

---

## 5. Vercel — create project

1. Vercel Dashboard → Add New → Project
2. Import from GitHub (or upload)
3. Framework: Next.js
4. Root directory: `book-app/` (if inside the smartlog monorepo) — OR deploy as standalone repo
5. Add all env vars from `.env.example` (filled in with real values)
6. Deploy

---

## 6. DNS — add subdomain

Namecheap → Advanced DNS → Add CNAME record:

| Type  | Host | Value              |
|-------|------|--------------------|
| CNAME | book | cname.vercel-dns.com |

---

## 7. Vercel — add custom domain

Vercel → Project → Settings → Domains → Add `book.smartlogtrading.com`

---

## 8. Smoke test checklist

- [ ] Homepage loads at book.smartlogtrading.com
- [ ] Clicking a pain card → redirects to /auth (if not signed in)
- [ ] Sign in with Google → redirected back to /chat
- [ ] Chat loads with opening message from AI
- [ ] Send a message → AI responds (streaming)
- [ ] After 1 conversation, free user sees upgrade wall
- [ ] Subscribe → Stripe checkout → webhook fires → access granted
- [ ] SmartLog yearly/lifetime user → has book access automatically (same Supabase project)

---

## Notes

- The book app shares the same Supabase project (`jxftwnwvdkmolnufvmcj`) as SmartLog — same auth.users, same lifetime_users table. No separate signup needed.
- SmartLog yearly + lifetime plans give book access via the existing `subscriptions` and `lifetime_users` tables — the check-access route already handles this.
- AI model: `claude-sonnet-4-6` (not Haiku — conversations require deeper reasoning).
