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

## Pending

### Resend SPF (contact form full fix)
- DKIM ✅ Verified
- SPF TXT (`send`) → still Pending
- When green: change `app/api/contact/route.js` back to `from: "SmartLog <noreply@smartlogtrading.com>"` + `to: "marcos@smartlogtrading.com"`

### Report fine-tuning
- First batch of real reports to be tested tomorrow
- Potential adjustments to prompt tone/wording after testing

### Pre-launch
- Send to 2 close friends for testing
- All 3 user flows confirmed working (free, paid, lifetime)

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
