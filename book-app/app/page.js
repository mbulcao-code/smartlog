"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import BookSidebar from "@/app/components/BookSidebar";
import { BOOK_MAP, PAIN_LINKS } from "@/lib/book-map";

// ─── MAP TREE ─────────────────────────────────────────────────────────────────

function ChapterNode({ chapter, depth = 0 }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const isTopLevel = depth === 0;
  const hasChildren = chapter.children && chapter.children.length > 0;

  return (
    <div className={`map-chapter ${open ? "open" : ""}`}>
      <button
        className={`map-chapter-header depth-${depth}`}
        onClick={() => {
          if (hasChildren) setOpen((o) => !o);
          else if (chapter.slug) router.push(`/book/${chapter.slug}`);
        }}
        aria-expanded={open}
      >
        <span className="chapter-label">
          {isTopLevel ? (
            <>
              <span className="chapter-title">{chapter.title}</span>
              <span className="chapter-subtitle">{chapter.subtitle}</span>
            </>
          ) : (
            <>
              <span className="section-id">{chapter.title}</span>
              <span className="section-subtitle">{chapter.subtitle}</span>
              {chapter.starred && <span className="star-badge">⭐</span>}
            </>
          )}
        </span>
        {hasChildren && (
          <span className="chevron" aria-hidden="true">
            {open ? "▾" : "▸"}
          </span>
        )}
        {!chapter.free && !isTopLevel && (
          <span className="pro-badge">PRO</span>
        )}
      </button>
      {hasChildren && open && (
        <div className="map-children">
          {chapter.children.map((child) => (
            <ChapterNode key={child.id} chapter={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

function MapTree() {
  return (
    <div className="map-tree">
      {BOOK_MAP.map((chapter) => (
        <ChapterNode key={chapter.id} chapter={chapter} />
      ))}
    </div>
  );
}

// ─── PAIN FINDER ──────────────────────────────────────────────────────────────

function PainFinder({ onNavigate }) {
  return (
    <div className="pain-finder">
      <p className="pain-finder-label">Or go straight to your pattern:</p>
      <div className="pain-grid">
        {PAIN_LINKS.map((item) => (
          <button
            key={item.slug}
            className="pain-chip"
            onClick={() => onNavigate(`/book/${item.slug}`)}
          >
            {item.pain}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── PLANS ────────────────────────────────────────────────────────────────────

const PLANS = [
  {
    id: "free",
    label: "Free",
    price: null,
    perMonth: null,
    description: "Entry sections + one AI conversation",
    cta: "Start reading",
    ctaFree: true,
    priceId: null,
  },
  {
    id: "monthly",
    label: "Monthly",
    price: "$29",
    perMonth: "$29/mo",
    description: "Full access · Unlimited AI conversations",
    cta: "Get full access",
    priceId: process.env.NEXT_PUBLIC_BOOK_MONTHLY_PRICE_ID,
  },
  {
    id: "yearly",
    label: "Yearly",
    price: "$79",
    perMonth: "$6.58/mo",
    description: "Full access · Save 77% vs monthly",
    cta: "Get full access",
    badge: "Best value",
    priceId: process.env.NEXT_PUBLIC_BOOK_YEARLY_PRICE_ID,
  },
  {
    id: "lifetime",
    label: "Lifetime",
    price: "$199",
    perMonth: "one-time",
    description: "Full access forever · Founders price",
    cta: "Get lifetime access",
    badge: "Founders price",
    priceId: process.env.NEXT_PUBLIC_BOOK_LIFETIME_PRICE_ID,
  },
];

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [accessLevel, setAccessLevel] = useState(null); // "free" | "pro" | null
  const [loadingCheckout, setLoadingCheckout] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        checkAccess(session.user);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          setUser(session.user);
          checkAccess(session.user);
        } else {
          setUser(null);
          setAccessLevel(null);
        }
      }
    );
    return () => subscription.unsubscribe();
  }, []);

  async function checkAccess(u) {
    if (!u) return;
    try {
      const res = await fetch("/api/check-access");
      const data = await res.json();
      setAccessLevel(data.hasAccess ? "pro" : "free");
    } catch {
      setAccessLevel("free");
    }
  }

  async function handleCheckout(plan) {
    if (plan.ctaFree) {
      router.push("/book/entry/1");
      return;
    }
    if (!user) {
      router.push("/auth?redirect=/subscribe");
      return;
    }
    setLoadingCheckout(plan.id);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priceId: plan.priceId,
          mode: plan.id === "lifetime" ? "payment" : "subscription",
          product: "book",
        }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch {
      // silently fail — retry
    } finally {
      setLoadingCheckout(null);
    }
  }

  return (
    <>
      <BookSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        user={user}
        accessLevel={accessLevel}
      />

      <main className="home-main">
        {/* ── HEADER ──────────────────────────────────────────────── */}
        <header className="home-header">
          <button
            className="sidebar-toggle"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            ☰
          </button>
          <span className="home-logo">Trading Without Ego</span>
          <div className="header-actions">
            {user ? (
              <span className="header-user">
                {user.user_metadata?.full_name || user.email?.split("@")[0]}
              </span>
            ) : (
              <button
                className="btn-ghost"
                onClick={() => router.push("/auth")}
              >
                Sign in
              </button>
            )}
          </div>
        </header>

        {/* ── HERO ─────────────────────────────────────────────────── */}
        <section className="hero">
          <p className="hero-eyebrow">A book about trading psychology</p>
          <h1 className="hero-title">Trading Without Ego</h1>
          <p className="hero-lead">
            Every trader reading this page has lost money they shouldn&apos;t have.
            Not because they lacked information — but because something inside them
            had a different goal. This book is about that something. It doesn&apos;t
            ask you to feel less. It asks you to understand <em>what</em> you feel,
            and <em>why</em> — so the feeling stops costing you.
          </p>
          <p className="hero-sub">
            An interactive experience: read the framework, talk to an AI that
            knows the full book, and build an emotionally stable strategy that
            actually fits how you trade.
          </p>
          <div className="hero-cta-row">
            <button
              className="btn-primary"
              onClick={() => router.push("/book/entry/1")}
            >
              Start reading — it&apos;s free →
            </button>
            <button
              className="btn-ghost"
              onClick={() => {
                document
                  .getElementById("the-map")
                  ?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              See the full map ↓
            </button>
          </div>
        </section>

        {/* ── THE MAP ──────────────────────────────────────────────── */}
        <section className="map-section" id="the-map">
          <div className="map-section-header">
            <h2 className="map-heading">The Map</h2>
            <p className="map-subheading">
              Every section of the book. Click any chapter to expand it —
              click any section to read.
            </p>
          </div>
          <MapTree />
          <PainFinder onNavigate={(path) => router.push(path)} />
        </section>

        {/* ── WHAT MAKES THIS DIFFERENT ────────────────────────────── */}
        <section className="differentiators">
          <div className="diff-card">
            <span className="diff-icon">🧠</span>
            <h3>A framework, not advice</h3>
            <p>
              Most trading psychology books give you advice. This one gives you
              a model — a way to diagnose what&apos;s happening, not just what to
              do differently.
            </p>
          </div>
          <div className="diff-card">
            <span className="diff-icon">🗣</span>
            <h3>An AI that knows the book</h3>
            <p>
              Every page has an AI companion that has read the whole book. Ask
              it anything — about your specific pattern, about the framework,
              about what to log.
            </p>
          </div>
          <div className="diff-card">
            <span className="diff-icon">🧩</span>
            <h3>15 specific patterns</h3>
            <p>
              FOMO. Revenge trading. Stop tampering. Early exit. Each one gets
              its own chapter: the hidden goal behind it, the mechanism, and a
              concrete experiment to run.
            </p>
          </div>
        </section>

        {/* ── PRICING ──────────────────────────────────────────────── */}
        <section className="pricing-section" id="pricing">
          <h2 className="pricing-heading">Get full access</h2>
          <p className="pricing-sub">
            The Entry sections are free. Everything else — the full framework,
            all 15 patterns, glossary, FAQ, depth dives, and unlimited AI
            conversations — requires a subscription.
          </p>
          <div className="plans-grid">
            {PLANS.map((plan) => (
              <div
                key={plan.id}
                className={`plan-card ${plan.badge ? "plan-featured" : ""}`}
              >
                {plan.badge && (
                  <div className="plan-badge">{plan.badge}</div>
                )}
                <div className="plan-label">{plan.label}</div>
                {plan.price ? (
                  <>
                    <div className="plan-price">{plan.price}</div>
                    <div className="plan-per-month">{plan.perMonth}</div>
                  </>
                ) : (
                  <div className="plan-price plan-free">Free</div>
                )}
                <p className="plan-description">{plan.description}</p>
                <button
                  className={`btn-plan ${plan.badge ? "btn-plan-primary" : ""}`}
                  onClick={() => handleCheckout(plan)}
                  disabled={loadingCheckout === plan.id}
                >
                  {loadingCheckout === plan.id
                    ? "Loading…"
                    : user && accessLevel === "pro" && !plan.ctaFree
                    ? "Current plan"
                    : plan.cta}
                </button>
              </div>
            ))}
          </div>
          <p className="pricing-disclaimer">
            All plans include the same content. Pricing is in USD. Cancel
            anytime. Questions?{" "}
            <a href="mailto:marcos@smartlogtrading.com">
              marcos@smartlogtrading.com
            </a>
          </p>
        </section>

        {/* ── FOOTER ───────────────────────────────────────────────── */}
        <footer className="home-footer">
          <p>
            <a href="https://smartlogtrading.com">SmartLog</a> ·{" "}
            <a href="/privacy">Privacy</a> ·{" "}
            <a href="/terms">Terms</a>
          </p>
          <p className="footer-copy">
            © 2026 SmartLog. Built by Marcos Bulcão.
          </p>
        </footer>
      </main>

      <style jsx>{`
        /* ── LAYOUT ── */
        .home-main {
          min-height: 100vh;
          background: var(--bg, #0f0f10);
          color: var(--text, #e8e6e1);
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        /* ── HEADER ── */
        .home-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 2rem;
          border-bottom: 1px solid var(--border, #2a2a2c);
          position: sticky;
          top: 0;
          background: var(--bg, #0f0f10);
          z-index: 10;
        }
        .sidebar-toggle {
          background: none;
          border: none;
          color: var(--muted, #8b8685);
          font-size: 1.25rem;
          cursor: pointer;
          padding: 0.25rem 0.5rem;
        }
        .home-logo {
          font-weight: 600;
          font-size: 1rem;
          color: var(--text, #e8e6e1);
        }
        .header-actions {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .header-user {
          font-size: 0.875rem;
          color: var(--muted, #8b8685);
        }

        /* ── HERO ── */
        .hero {
          max-width: 700px;
          margin: 0 auto;
          padding: 5rem 2rem 4rem;
          text-align: center;
        }
        .hero-eyebrow {
          font-size: 0.75rem;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--muted, #8b8685);
          margin-bottom: 1rem;
        }
        .hero-title {
          font-size: clamp(2rem, 5vw, 3.5rem);
          font-weight: 700;
          line-height: 1.15;
          margin-bottom: 1.5rem;
          background: linear-gradient(135deg, #e8e6e1 0%, #a09890 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .hero-lead {
          font-size: 1.125rem;
          line-height: 1.75;
          color: var(--text, #e8e6e1);
          margin-bottom: 1rem;
        }
        .hero-lead em {
          font-style: italic;
          color: var(--accent, #c8a96e);
        }
        .hero-sub {
          font-size: 0.9375rem;
          line-height: 1.65;
          color: var(--muted, #8b8685);
          margin-bottom: 2rem;
        }
        .hero-cta-row {
          display: flex;
          gap: 1rem;
          justify-content: center;
          flex-wrap: wrap;
        }

        /* ── BUTTONS ── */
        .btn-primary {
          background: var(--accent, #c8a96e);
          color: #0f0f10;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          font-size: 0.9375rem;
          font-weight: 600;
          cursor: pointer;
          transition: opacity 0.15s;
        }
        .btn-primary:hover {
          opacity: 0.88;
        }
        .btn-ghost {
          background: none;
          border: 1px solid var(--border, #2a2a2c);
          color: var(--muted, #8b8685);
          padding: 0.75rem 1.25rem;
          border-radius: 8px;
          font-size: 0.9375rem;
          cursor: pointer;
          transition: border-color 0.15s, color 0.15s;
        }
        .btn-ghost:hover {
          border-color: var(--muted, #8b8685);
          color: var(--text, #e8e6e1);
        }

        /* ── MAP SECTION ── */
        .map-section {
          max-width: 800px;
          margin: 0 auto;
          padding: 4rem 2rem;
        }
        .map-section-header {
          margin-bottom: 2rem;
        }
        .map-heading {
          font-size: 1.5rem;
          font-weight: 700;
          margin-bottom: 0.5rem;
        }
        .map-subheading {
          font-size: 0.875rem;
          color: var(--muted, #8b8685);
        }

        /* ── MAP TREE ── */
        .map-tree {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        .map-chapter {
          border-radius: 8px;
          overflow: hidden;
        }
        .map-chapter-header {
          width: 100%;
          background: none;
          border: 1px solid var(--border, #2a2a2c);
          color: var(--text, #e8e6e1);
          padding: 0.875rem 1rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          cursor: pointer;
          text-align: left;
          border-radius: 8px;
          transition: background 0.12s, border-color 0.12s;
          gap: 0.75rem;
        }
        .map-chapter-header:hover {
          background: var(--surface, #1a1a1c);
          border-color: var(--muted, #8b8685);
        }
        .open > .map-chapter-header {
          background: var(--surface, #1a1a1c);
          border-bottom-left-radius: 0;
          border-bottom-right-radius: 0;
          border-color: var(--accent, #c8a96e);
        }
        .map-chapter-header.depth-0 {
          padding: 1rem 1.125rem;
        }
        .map-chapter-header.depth-1 {
          padding: 0.625rem 1rem;
          border-left: 3px solid transparent;
        }
        .map-chapter-header.depth-1:hover {
          border-left-color: var(--accent, #c8a96e);
        }
        .chapter-label {
          display: flex;
          align-items: baseline;
          gap: 0.75rem;
          flex: 1;
          min-width: 0;
        }
        .chapter-title {
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--accent, #c8a96e);
          white-space: nowrap;
          flex-shrink: 0;
        }
        .chapter-subtitle {
          font-size: 0.9375rem;
          color: var(--text, #e8e6e1);
          font-weight: 500;
        }
        .section-id {
          font-size: 0.7rem;
          font-weight: 600;
          letter-spacing: 0.06em;
          color: var(--muted, #8b8685);
          white-space: nowrap;
          flex-shrink: 0;
          min-width: 2.5rem;
        }
        .section-subtitle {
          font-size: 0.875rem;
          color: var(--text, #e8e6e1);
          flex: 1;
          min-width: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .star-badge {
          font-size: 0.75rem;
          flex-shrink: 0;
        }
        .pro-badge {
          font-size: 0.65rem;
          font-weight: 700;
          letter-spacing: 0.05em;
          background: rgba(200, 169, 110, 0.12);
          color: var(--accent, #c8a96e);
          border: 1px solid rgba(200, 169, 110, 0.25);
          padding: 0.15em 0.45em;
          border-radius: 4px;
          flex-shrink: 0;
        }
        .chevron {
          color: var(--muted, #8b8685);
          font-size: 0.75rem;
          flex-shrink: 0;
        }
        .map-children {
          border: 1px solid var(--border, #2a2a2c);
          border-top: none;
          border-radius: 0 0 8px 8px;
          padding: 0.375rem 0.5rem;
          display: flex;
          flex-direction: column;
          gap: 0.125rem;
          background: var(--surface, #1a1a1c);
        }

        /* ── PAIN FINDER ── */
        .pain-finder {
          margin-top: 2rem;
          padding-top: 2rem;
          border-top: 1px solid var(--border, #2a2a2c);
        }
        .pain-finder-label {
          font-size: 0.875rem;
          color: var(--muted, #8b8685);
          margin-bottom: 1rem;
        }
        .pain-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }
        .pain-chip {
          background: none;
          border: 1px solid var(--border, #2a2a2c);
          color: var(--muted, #8b8685);
          padding: 0.4rem 0.75rem;
          border-radius: 20px;
          font-size: 0.8125rem;
          cursor: pointer;
          transition: border-color 0.12s, color 0.12s;
          text-align: left;
        }
        .pain-chip:hover {
          border-color: var(--accent, #c8a96e);
          color: var(--text, #e8e6e1);
        }

        /* ── DIFFERENTIATORS ── */
        .differentiators {
          max-width: 800px;
          margin: 0 auto;
          padding: 2rem 2rem 4rem;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 1.5rem;
          border-top: 1px solid var(--border, #2a2a2c);
        }
        .diff-card {
          padding: 1.5rem;
          background: var(--surface, #1a1a1c);
          border: 1px solid var(--border, #2a2a2c);
          border-radius: 10px;
        }
        .diff-icon {
          font-size: 1.5rem;
          display: block;
          margin-bottom: 0.75rem;
        }
        .diff-card h3 {
          font-size: 0.9375rem;
          font-weight: 600;
          margin-bottom: 0.5rem;
          color: var(--text, #e8e6e1);
        }
        .diff-card p {
          font-size: 0.875rem;
          line-height: 1.6;
          color: var(--muted, #8b8685);
        }

        /* ── PRICING ── */
        .pricing-section {
          max-width: 800px;
          margin: 0 auto;
          padding: 4rem 2rem;
          border-top: 1px solid var(--border, #2a2a2c);
        }
        .pricing-heading {
          font-size: 1.5rem;
          font-weight: 700;
          margin-bottom: 0.5rem;
        }
        .pricing-sub {
          font-size: 0.9rem;
          color: var(--muted, #8b8685);
          max-width: 560px;
          line-height: 1.6;
          margin-bottom: 2.5rem;
        }
        .plans-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
          gap: 1rem;
          margin-bottom: 1.5rem;
        }
        .plan-card {
          position: relative;
          padding: 1.5rem 1.25rem;
          border: 1px solid var(--border, #2a2a2c);
          border-radius: 10px;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .plan-featured {
          border-color: var(--accent, #c8a96e);
          background: rgba(200, 169, 110, 0.04);
        }
        .plan-badge {
          position: absolute;
          top: -0.75rem;
          left: 50%;
          transform: translateX(-50%);
          font-size: 0.7rem;
          font-weight: 700;
          background: var(--accent, #c8a96e);
          color: #0f0f10;
          padding: 0.2em 0.6em;
          border-radius: 20px;
          white-space: nowrap;
        }
        .plan-label {
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--muted, #8b8685);
        }
        .plan-price {
          font-size: 1.75rem;
          font-weight: 700;
          color: var(--text, #e8e6e1);
        }
        .plan-free {
          font-size: 1.25rem;
        }
        .plan-per-month {
          font-size: 0.75rem;
          color: var(--muted, #8b8685);
          margin-top: -0.375rem;
        }
        .plan-description {
          font-size: 0.8125rem;
          color: var(--muted, #8b8685);
          line-height: 1.5;
          flex: 1;
        }
        .btn-plan {
          margin-top: 0.5rem;
          width: 100%;
          background: var(--surface, #1a1a1c);
          border: 1px solid var(--border, #2a2a2c);
          color: var(--text, #e8e6e1);
          padding: 0.625rem;
          border-radius: 6px;
          font-size: 0.875rem;
          cursor: pointer;
          transition: border-color 0.12s;
        }
        .btn-plan:hover {
          border-color: var(--muted, #8b8685);
        }
        .btn-plan:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .btn-plan-primary {
          background: var(--accent, #c8a96e);
          color: #0f0f10;
          border-color: transparent;
          font-weight: 600;
        }
        .btn-plan-primary:hover {
          opacity: 0.88;
          border-color: transparent;
        }
        .pricing-disclaimer {
          font-size: 0.8125rem;
          color: var(--muted, #8b8685);
          line-height: 1.6;
        }
        .pricing-disclaimer a {
          color: var(--accent, #c8a96e);
          text-decoration: none;
        }

        /* ── FOOTER ── */
        .home-footer {
          text-align: center;
          padding: 2rem;
          border-top: 1px solid var(--border, #2a2a2c);
          font-size: 0.8125rem;
          color: var(--muted, #8b8685);
          line-height: 2;
        }
        .home-footer a {
          color: var(--muted, #8b8685);
          text-decoration: none;
          transition: color 0.12s;
        }
        .home-footer a:hover {
          color: var(--text, #e8e6e1);
        }
        .footer-copy {
          margin-top: 0.25rem;
        }
      `}</style>
    </>
  );
}
