@AGENTS.md

# SmartLog — Session Notes

## Completed (May 7, 2026)

### Google OAuth ✅
- Created Google Cloud project "Smartlog" (project ID: smartlog-495617)
- OAuth client ID for Web application
- Authorized redirect URI: `https://jxftwnwvdkmolnufvmcj.supabase.co/auth/v1/callback`
- Authorized JS origin: `https://jxftwnwvdkmolnufvmcj.supabase.co`
- Published OAuth app to production (External, In production)
- Configured Google provider in Supabase with Client ID + Secret
- Root bug: Client Secret had `l` misread as `I` — fixed by generating new secret
- Auth page: Google button + email/password + sign up + forgot password
- Supabase redirect allowlist: `https://app.smartlogtrading.com/**` + `https://app.smartlogtrading.com/auth/confirm`

### Auth flow
- Google OAuth → redirectTo: `https://app.smartlogtrading.com/auth/confirm`
- Confirm page (app/auth/confirm/page.js): uses onAuthStateChange + exchangeCodeForSession + getSession fallback
- Homepage (app/page.js): uses onAuthStateChange to catch Google OAuth redirect

---

## Completed (May 8, 2026)

### Lifetime plan ✅
- Stripe price ID: `price_1TUk8dRM3M9yYyOAaNENfSJc`
- `app/api/stripe/checkout/route.js`: mode = "payment" for lifetime, "subscription" for others
- `app/api/stripe/webhook/route.js`: handles `checkout.session.completed` with `mode === "payment"` → upserts into `lifetime_users` table
- `app/api/check-access/route.js`: checks `lifetime_users` table (between beta_users and subscriptions checks)
- `lifetime_users` table already created in Supabase

### Subscribe page ✅
- 3-plan layout: Monthly (Launch price), Yearly (Best value), Lifetime (Founders price amber badge)
- Disclaimer text below plans
- No fake strikethrough prices

### Homepage pricing ✅
- 4-plan grid: Free, Monthly, Yearly, Lifetime
- Footer links are `<a href>` tags (not buttons) for Google crawler
- Personalized greeting: `Hi ${getDisplayName(user)}, what's been bothering you lately?`
- `getDisplayName()` uses `user_metadata.full_name` (Google OAuth) or cleaned email prefix

### Auth — name field on signup ✅
- Name input shown only in signup mode
- Passes `options: { data: { full_name: name.trim() } }` to Supabase signUp

### Language toggle on /log/[sessionId] ✅
- PT/EN toggle button added to the log page header

### Contact link in sidebar ✅
- `app/components/Sidebar.js`: "Contact us" / "Fale conosco" link in account section
- Committed but **needs `git push` from local machine** (sandbox can't authenticate to GitHub)

### Contact form ✅ (code done, email delivery pending DNS)
- `app/contact/page.js`: form with name, email, message
- `app/api/contact/route.js`: sends via Resend to `marcos@smartlogtrading.com`
  - from: `SmartLog <noreply@smartlogtrading.com>`
  - replyTo: user's email

### Privacy Policy + Terms of Service ✅
- `app/privacy/page.js`: full privacy policy
- `app/terms/page.js`: full ToS including lifetime refund policy
- Footer links as real `<a href>` tags

### Google OAuth branding ✅ RESOLVED
- Domain verified via Google Search Console (under bulcaoacademy@gmail.com)
- Privacy policy deployed at `https://app.smartlogtrading.com/privacy`
- Branding verified: "Your branding has been verified and is being shown to users"

---

## Pending / In progress

### Resend domain verification (contact form emails not arriving yet)
- Domain: `smartlogtrading.com` added to Resend account (`mbulcao@gmail.com`)
- DKIM TXT (`resend._domainkey`) → **Verified ✅**
- SPF TXT (`send`) → still Pending (DNS propagating)
- SPF MX (`send`) → still Pending (not strictly required for sending)
- Once SPF TXT turns green, contact form will deliver emails
- Resend account being `mbulcao@gmail.com` is fine — only the API key and domain matter

### Tests still to run
1. **Free user flow**: full session → trade logging blocked → redirects to pricing
2. **Beta/paid user flow**: unlimited sessions and logging
3. **Lifetime user flow**: test by inserting row directly into `lifetime_users` table in Supabase
   - Get user_id from Supabase → Authentication → Users
   - Insert: user_id, email, stripe_customer_id (can use "test_manual"), stripe_payment_intent_id
   - Delete row after testing

### Git push needed — DONE ✅
- Sidebar contact link deployed
- Report feature deployed
- Contact form fix deployed

---

## Completed (May 8, 2026 — afternoon)

### Contact form fix ✅
- `from` changed to `onboarding@resend.dev` (Resend restriction: unverified domain can only send to account email)
- `to` changed to `mbulcao@gmail.com` (Resend restriction: onboarding@resend.dev can only deliver to account owner email)
- When SPF TXT turns green in Resend → revert both to `noreply@smartlogtrading.com` / `marcos@smartlogtrading.com`

### Hit/miss labels fix ✅
- EN: "✓ Hit" / "✗ Miss" → "Alvo? Sim" / "Alvo? Não"
- PT: "✓ Atingiu" / "✗ Errou" → "Alvo? Sim" / "Alvo? Não"
- Changed in `lib/i18n.js`

### Report feature ✅
- `app/api/report/route.js`: new endpoint, calls Claude Haiku
- Unlocks at 10 total trades
- Progress bar on log page: X/10 trades (visible from first trade)
- Method phrase shown at 0 trades: "Confiança não é um estado de espírito..."
- Report structured in 2 blocks:
  - Block 1: data comparison ("Os dados são claros:... Ou seja,... [behavioral statement]")
  - Block 2: "Uma observação importante: [sample size direction] ... Bom trabalho. Continue crescendo sua amostragem."
- Refresh button to regenerate after more trades
- Both PT and EN supported

### Subscription test ✅
- Tested lifetime flow: insert row in `lifetime_users` → access changes to PRO → delete row after
- Tested paid flow: insert row in `subscriptions` with status=active → access confirmed
- Free user flow already tested with tradersminds3@gmail.com

---

## Completed (May 12–13, 2026)

### Dashboard UI improvements ✅
- Free/Pro badge shown next to email on main screen (`app/page.js`)
- `periodEnd` state added; passed to Sidebar
- Free plan CTA changed: logged-out → "Create free account →" → redirects to `/auth`; logged-in free user → "Get started →"
- `lib/i18n.js`: `planFreeCta` updated in EN + PT

### Leads capture ✅
- Supabase `leads` table created
- Trigger on `auth.users` auto-populates `leads` on every new signup
- Backfill SQL provided to seed existing users

### Subscribe page cleanup ✅
- Removed "30-day guarantee" from Lifetime card
- Added ToS + Privacy Policy link line below plans
- Updated disclaimer text (permanent service discontinuation)
- Removed R$1/R$2 beta test buttons (`app/subscribe/page.js`)

### Stripe webhook fix ✅ (critical)
- Stripe SDK v22 / basil API: `current_period_end` returns `undefined`
- Added `resolvePeriodEnd()` helper: tries raw value → `billing_cycle_anchor + interval` → 30-day fallback
- Fixed `session.subscription` handled as string or object
- Both `checkout.session.completed` and `customer.subscription.updated` use `resolvePeriodEnd()`
- `check-access` API now returns `periodEnd` and `plan`

### Sidebar improvements ✅
- Settings section always visible (no longer collapsible)
- "Valid until [date]" shown below Pro badge for active subscribers
- Free users see "Upgrade →" link; Pro users see "Change plan →" and "Cancel subscription →"
- Cancel subscription triggers Stripe Customer Portal via `/api/stripe/portal`
- All fonts brightened (slate-600/500/400 → slate-300/200)
- Free/Pro badge added next to email in account section

### FOMO experiment redesign ✅
- Logging question for Variant A changed from "Did it hit target?" → "Did your level also get hit?"
- Rationale: level also hit = early entry always suboptimal (worse R:R on wins, bigger loss on stops); level NOT hit = early entry was the only way to catch the move
- `lib/i18n.js`: added `levelsHit`, `levelAlsoHit`, `levelHit`, `levelNotHit` keys (EN + PT)
- `app/log/[sessionId]/page.js`: all four FOMO-specific labels and question applied conditionally via `isFomo && variant === "a"`
- `lib/trees/fomo.js`: `build` message fully rewritten to explain all four outcome cases, including the non-obvious stop-loss case
- `app/api/report/route.js`: separate FOMO prompt (EN + PT) with full conceptual context passed to Claude Haiku

---

## Completed (May 14, 2026)

### DNS fix ✅
- Namecheap DNS type had silently switched to cPanel mode — all records were hidden/inactive, both sites went down
- Fixed: changed back to Namecheap BasicDNS
- All records confirmed present and correct:
  - A @ → 75.2.60.5 (Netlify, marketing site)
  - CNAME www → serene-seahorse-ccb5a2.netlify.app
  - CNAME app → vercel-dns (webapp)
  - TXT resend._domainkey → DKIM ✅
  - TXT send → v=spf1 include:amazonses.com ~all (Resend SPF ✅ confirmed present)
  - TXT @ → Google site verification
  - TXT _dmarc → v=DMARC1; p=none;
- DNS propagation in progress at time of writing

---

## Completed (May 21, 2026)

### Shared journal helpers module ✅
- Created `lib/journal-helpers.js` — shared module imported by all journal pages
- Exports `PAINS` array: 7 pain types (fomo, late, exit, revenge, stoploss, boredom, clean) with EN + PT labels
- Exports `getNextQuestion(painType, behavior)`: behavioral question tree returning next question or null when done
- Stop tamper outcome options fixed: "protegeu meu lucro" → "protegeu de perda maior" (semantically correct); added third option "still_open" (stop not hit — trade still running)

### Setup wizard v2 ✅ (`app/journal/setups/new/page.js`)
- Conditions now support up to **5 variants** (A–E), color-coded: A=blue, B=purple, C=green, D=amber, E=rose
- New condition shape: `{ id, text, variants: [{ id, label, description }] }` (min 2 variants, max 5)
- **Structured stop strategy**: initial placement text + up to 2 move rules (e.g. "move to entry after 1R")
- **Multi-target profit strategy**: up to 3 targets, each with size (e.g. "1/3"), description, and runner toggle
- Saves `stop_config` as `{ initial, rules: [] }` and `profit_config` as `{ targets: [{label, size, description, isRunner}] }` in new JSONB columns

### Supabase SQL migrations ✅ (run in SQL Editor)
```sql
-- journal_setups table
CREATE TABLE journal_setups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  conditions JSONB DEFAULT '[]'::jsonb,
  stop_strategy TEXT,
  profit_strategy TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE journal_setups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own setups" ON journal_setups FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- trade_journal table (extended)
ALTER TABLE trade_journal
  ADD COLUMN IF NOT EXISTS setup_id UUID REFERENCES journal_setups(id),
  ADD COLUMN IF NOT EXISTS instrument TEXT,
  ADD COLUMN IF NOT EXISTS direction TEXT,
  ADD COLUMN IF NOT EXISTS trade_date DATE,
  ADD COLUMN IF NOT EXISTS entry_price NUMERIC,
  ADD COLUMN IF NOT EXISTS stop_price NUMERIC,
  ADD COLUMN IF NOT EXISTS exit_price NUMERIC,
  ADD COLUMN IF NOT EXISTS conditions_met JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS variant_used TEXT;
```

⚠️ **Still pending in Supabase:**
```sql
ALTER TABLE journal_setups
  ADD COLUMN IF NOT EXISTS stop_config JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS profit_config JSONB DEFAULT '{}'::jsonb;
```

### Trade logging wizard ✅ (`app/journal/log/new/page.js`)
- 5-step wizard: (1) Setup selection, (2) Instrument/Direction/Date, (3) Prices, (4) Execution (conditions + variants), (5) Behavior + outcome
- Step 3 (Prices) conditionally skipped if no setup selected
- **Execution step v2**: each condition shows all its variants as selectable chips (A–E color-coded) + N/A chip; no separate "qual variante você operou?" question (was redundant)
- Backward-compatible: old `{variantA, variantB}` format auto-converted to variant chip format on render
- `conditions_met` stored as: `[{ id, text, selected_variant, selected_description }]`
- Behavioral questions imported from `lib/journal-helpers.js`
- On success: redirects to `/journal?trade=logged`

### API updates ✅
- `app/api/journal/route.js` (POST): accepts all new fields — `setup_id`, `instrument`, `direction`, `trade_date`, `entry_price`, `stop_price`, `exit_price`, `conditions_met`, `variant_used`
- `app/api/journal/setups/route.js` (POST): accepts and saves `stop_config` and `profit_config`
- `app/api/journal/[id]/route.js` (GET): **new file** — fetches single trade entry by ID, auth-gated and user-scoped

### Trade detail view ✅ (`app/journal/log/[id]/page.js`)
- Full detail page for any logged trade
- Shows: direction + instrument header, outcome (colored), prices section with auto-calculated R:R, conditions_met with color-coded variant labels, behavioral summary in plain language (`behaviorLines()` function), notes, logged timestamp
- Uses `Suspense` wrapper pattern (required by Next.js App Router for `useParams`)
- Back button → `/journal`

### Journal page updates ✅ (`app/journal/page.js`)
- Removed inline PAINS/getNextQuestion definitions → imports from `lib/journal-helpers.js`
- Added `Suspense` wrapper; inner component renamed `JournalContent`
- Removed inline logging form state (replaced by `/journal/log/new` route)
- Loads setups in parallel with trade entries on mount
- "Your setups" section with setup cards (name + condition count)
- "New setup" and "Log a trade" buttons both navigate to dedicated pages
- Trade list rows are **clickable** → `router.push(\`/journal/log/${entry.id}\`)` with hover state
- Richer row format: shows instrument + direction arrow + pain label for full trades; legacy format for older entries
- Success banners: `?setup=created` and `?trade=logged` query params trigger toast-style messages

---

## Completed (May 23, 2026)

### Journal v3 — logging wizard + reports + trade detail ✅

#### Trade logging wizard (`app/journal/log/new/page.js`) — full rewrite
- **6-step wizard** (was 7): Setup → Trade details → Entry type → Conditions/Level → Stop → Target → Other issues + save
- **Step 2 (Trade details)** now captures everything factual in one place:
  - Direction (Long/Short, required) + Date (required) + Instrument (optional)
  - Entry price / Exit price (optional, two-column row)
  - Result: Win / Loss / BE (required — moved here from old step 7)
  - P&L in $ (optional — full-width input below result)
  - Continue button gated on direction + date + outcome
- **Step 6 (Other issues)** — expanded from flat multi-select to two-level selector:
  - Issues: Revenge, Overtrading, Oversizing, Other
  - Each selected issue reveals inline sub-options: "Used a trusted setup" (blue) or "Random trade — you can't learn from random trades" (amber)
  - "Other" shows a free-text input instead
  - Save button disabled until every selected issue has its sub-answer filled
  - Notes textarea also lives in step 6 (was step 7)
- `other_issues` data shape changed from `["revenge"]` → `[{ id: "revenge", setup_type: "trusted"|"random" }]` or `{ id: "other", text: "..." }`
- `buildOtherIssues()` helper serializes the keyed state object to the array

#### Trade detail view (`app/journal/log/[id]/page.js`) — v2 display
- **Detects v2 trades** via `entry.after_trade?.entry_type` (new wizard format)
- **v2 Behavior section** shows: Entry type, Level also hit? (early entries only, color-coded), Stop outcome, Target outcome, Other issues (each with trusted/random badge)
- **P&L section** renders below Behavior when `entry.pnl` is set (green/red)
- **Backward compat**: mid-format (pain_types array) and legacy (single pain_type) trades still render correctly
- Old `AFTER_TRADE_LABELS` renamed to `LEGACY_AFTER_TRADE_LABELS`; v2 uses imported constants from `lib/journal-helpers.js`

#### Reports page (`app/journal/reports/page.js`) — other issues redesign
- Added `hasIssue(trade, issueId)` and `getIssueSetupType(trade, issueId)` helpers — handle both old string[] and new object[] format
- `computeReportData` now computes per-issue trusted/random splits: `revengeSplit`, `overtradingSplit`, `oversizingSplit`
- Other issues section shows each issue with count + indented trusted (W·L·%) / random (count + "no learning") breakdown

#### lib/journal-helpers.js — new label constants
- Added `ENTRY_TYPE_LABELS`, `STOP_OUTCOME_LABELS`, `TARGET_OUTCOME_LABELS`, `OTHER_ISSUE_LABELS`
- Legacy `PAINS` array and `getNextQuestion` kept for backward-compat display

#### API (`app/api/journal/route.js`)
- POST accepts `pnl` field; stores as `NUMERIC` with `parseFloat`

#### Sidebar + setup limit
- TRADE JOURNAL section added to `app/components/Sidebar.js`: Log a trade / All trades / Reports / flat setups list with n/10 counter
- 10-setup hard limit enforced in API (422 `setup_limit_reached`) and UI (limit-reached screen)

#### AI report endpoint (`app/api/journal/reports/ai/route.js`)
- GET endpoint, fetches all trades, builds structured data packet
- Calls `claude-haiku-4-5-20251001` with SmartLog principles as system prompt
- Returns 2-paragraph synthesis; minimum 10 trades required

---

## Completed (May 25, 2026)

### Wizard polish + label cleanup ✅
- `app/journal/log/new/page.js`: cleaned up wizard labels, hid legacy blocks that were cluttering the UI
- `app/journal/log/[id]/page.js`: renamed "Incomplete" label to something less judgmental
- `app/journal/reports/page.js`: minor label fix

### Sidebar: remove dead "New Session" button ✅
- `app/components/Sidebar.js`: removed the dead "New Session" button (experiment flow no longer primary)
- "Log a trade" promoted to primary CTA throughout sidebar

### Reports: data-driven insights redesign ✅ (`app/journal/reports/page.js`)
- FOMO section reframed: "Is your FOMO really paying off?" — leads with the question, then shows data
- Zero missed-opps case highlighted in green: "zero truly missed opportunities out of N early entries"
- "FOMO pirate fee" concept added: if FOMO is unavoidable, enter with reduced size — you're in the trade but it doesn't hurt your R:R
- Stop section reframed: counts worse vs better outcomes and gives a data verdict ("X made things worse vs Y that improved — the data is clear" or inverse warning about confirmation bias)
- Sample size notes added to insights: "small sample, keep logging" / "something is consolidating" / "reliable data" based on N
- Win rate threshold raised from 3 to 5 trades minimum; now always shows the stat (not just when >50%)

### Step 4: multi-select outcomes (wizard overhaul) ✅
- `app/journal/log/new/page.js`: Step 4 completely redesigned as **multi-select** — user can select all outcomes that apply
- New outcome types (each with sub-detail options):
  - `respected_stop` → `protected` / `reversed`
  - `changed_stop` → `better` / `worse`
  - `panic_exit` (no sub-detail required)
  - `target_not_hit` → `never_onside` / `onside_be` / `onside_loss`
  - `early_exit` → `hit_after` / `not_hit_after`
  - `last_target_hit` (runner outcome)
- Data shape: `trade_outcomes: [{ type, detail }]` array
- Backward-compat: also stores `trade_outcome_type` + `trade_outcome_detail` (first item) for legacy display
- Step 3: early entry label softened ("B. Early entry (includes FOMO / incomplete setup)")
- Report button styled blue

### Admin dashboard overhaul ✅
- `app/admin/page.js`: complete rewrite with auth gate — only whitelisted emails can access
- `lib/admin-config.js`: new file, admin whitelist array — currently `[bulcaoacademy@gmail.com, mbulcao@gmail.com]`
- **Sessions tab**: shows all user conversations with download button per session
- **Journal tab**: per-user view of all trade journal entries
- `app/api/admin/conversations/route.js`: updated to support admin queries
- `app/api/admin/journal/route.js`: **new file** — fetches all trades across all users, admin-gated

---

---

## Completed (May 26, 2026)

### Contact form fix ✅
- `app/api/contact/route.js`: updated to real addresses now that SPF/DNS is verified
  - `from: "SmartLog <noreply@smartlogtrading.com>"`
  - `to: "marcos@smartlogtrading.com"`
- **Needs git push from local machine**

### Interactive AI Book — full scaffold ✅
- App created at `/Users/marcosbulcao/Documents/smartlog/book-app/`
- Full Next.js app: landing, chat UI, auth, subscribe, API routes
- Shared Supabase auth (same project `jxftwnwvdkmolnufvmcj`)
- Claude Sonnet streaming with full system prompt
- Access check: lifetime_users → subscriptions → book_subscriptions → free tier (1 conv)
- New Supabase tables needed: `book_conversations`, `book_subscriptions`, `book_lifetime_users`
- Deploy instructions: `book-app/DEPLOY.md`
- All pending SQL in `PENDING_MIGRATIONS.md`

---

## Completed (June 2, 2026)

### Production outage fix ✅
- Root cause: `claude-sonnet-4-5` model deprecated → all `/api/chat` calls were failing with stream error
- Fixed: `app/api/chat/route.js` → updated model to `claude-sonnet-4-6`
- Secondary cause: `ANTHROPIC_API_KEY` in Vercel was stale/wrong — updated to active key in both projects
- Book app had unescaped backticks in `book-app/lib/system-prompt.js` causing build failure → escaped all three instances
- Both SmartLog and book app confirmed working in production

### API key note
- Active Anthropic API key: `sk-ant-api03-_1ZUH...` (updated in `.env.local` and both Vercel projects)
- Old key `sk-ant-api03-PGhh...` was invalid — do not use

---

## Pending — User actions required

### SmartLog
- [ ] **Run Supabase migrations** — "SmartLog App" block in `PENDING_MIGRATIONS.md`
- [ ] Recreate test setup (delete "Reversal 1" with old `variantA`/`variantB` format)
- [ ] Send to 2 friends for beta testing

### Interactive AI Book (deploy checklist in `book-app/DEPLOY.md`)
- [ ] Run "Interactive AI Book" SQL block in `PENDING_MIGRATIONS.md`
- [ ] Create 3 Stripe price IDs for the book ($29/mo, $79/yr, $199 lifetime)
- [ ] Add `book.smartlogtrading.com/**` to Supabase redirect allowlist
- [ ] Add CNAME `book` → `cname.vercel-dns.com` in Namecheap
- [ ] Add domain in Vercel project settings

### Deferred features (SmartLog)
- **Stop question on clean trades**: even clean trades can get stopped out
- **Insights/Pro paywall**: behavioral patterns section, teaser mechanic for free users
- **Setup Refinement report**: variant heatmap in setup detail page (`/journal/setups/[id]`)
- **Bridge from experiment to journal**: prompt after experiment completion

---

## Marketing site — smartlogtrading.com

### File locations
- **Live files (source of truth):** `/Users/marcosbulcao/Library/Application Support/Claude/local-agent-mode-sessions/.../outputs/smartlog-site/`
  - Easier to find via: the outputs folder from the most recent Cowork session
- **Deploy zip:** `/Users/marcosbulcao/Downloads/smartlog-site/smartlog-site-deploy.zip`
- **Old/outdated copy:** `/Users/marcosbulcao/Downloads/smartlog-site/` (April 28 — do not use as source)

### Hosting
- **Platform:** Netlify, drag-and-drop deployment
- **Project:** `serene-seahorse-ccb5a2` (NOT `cool-semifreddo-2faf5f`)
- **Domain:** `smartlogtrading.com` (DNS managed via Netlify)
- To deploy: Netlify → project `serene-seahorse-ccb5a2` → Deploys → drag the zip

### Site structure
- `index.html` — Homepage / landing page
- `smartlog.html` — The Tool page
- `book.html` — Trading Without Ego book page
- `about.html` — About Marcos
- `work-together.html` — Enrollment / pricing page
- `iotaf.html` — IOTAF referral page
- `waitlist.html` + `waitlist-thank-you.html` — Waitlist flow
- `book-thank-you.html` — Book download confirmation
- `styles.css` — Shared stylesheet
- `images/` — All images including `book-cover.jpg`, `marcos.jpg`, SmartLog screenshots

### Images
- `images/book-cover.jpg` — Updated May 8, 2026 to new cover (author name at top, no IOTAF logo)
  - Source file: `/Users/marcosbulcao/Downloads/trading-without-ego (new).jpg`
- `images/marcos.jpg` — Headshot photo

### Changes made May 8, 2026
- `iotaf.html`: removed 10% discount, changed to referral code `SMARTLOG2026` (mention at enrollment, no discount promised)
- `images/book-cover.jpg`: updated to new cover design
