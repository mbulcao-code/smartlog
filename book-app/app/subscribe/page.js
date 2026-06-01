"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

const FREE_PLAN = {
  id: "free",
  label: "Free",
  price: "$0",
  period: "",
  description: "One free conversation to see how the method works. No card required.",
};

const PLANS = [
  {
    id: "monthly",
    label: "Monthly",
    price: "$29",
    period: "/month",
    description: "Full access to every conversation, every depth layer, every pattern.",
    priceId: process.env.NEXT_PUBLIC_BOOK_MONTHLY_PRICE_ID,
  },
  {
    id: "yearly",
    label: "Yearly",
    price: "$79",
    period: "/year",
    badge: "Best value",
    description: "Full access + included in SmartLog yearly plan. Two tools, one subscription.",
    priceId: process.env.NEXT_PUBLIC_BOOK_YEARLY_PRICE_ID,
  },
  {
    id: "lifetime",
    label: "Lifetime",
    price: "$199",
    period: "one-time",
    badge: "Founders price",
    badgeColor: "#c8a96e",
    description: "Pay once. Access forever. Includes all future updates and SmartLog lifetime.",
    priceId: process.env.NEXT_PUBLIC_BOOK_LIFETIME_PRICE_ID,
  },
];

const SMARTLOG_NOTE = "Already on SmartLog yearly or lifetime? You already have access — sign in with the same account.";

export default function SubscribePage() {
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
  }, []);

  async function handleSubscribe(plan) {
    if (!user) {
      router.push("/auth?redirectTo=/subscribe");
      return;
    }
    setLoading(plan.id);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priceId: plan.priceId,
          mode: plan.id === "lifetime" ? "payment" : "subscription",
          successUrl: `${window.location.origin}/chat?subscribed=1`,
          cancelUrl: `${window.location.origin}/subscribe`,
        }),
      });
      const { url } = await res.json();
      if (url) window.location.href = url;
    } catch {
      setLoading(null);
    }
  }

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <a href="/" style={styles.logo}>Trading Without Ego</a>
        {user && (
          <a href="/chat" style={styles.navLink}>Back to book</a>
        )}
      </header>

      <div style={styles.content}>
        <div style={styles.hero}>
          <h1 style={styles.title}>Full access to every layer</h1>
          <p style={styles.subtitle}>
            One free conversation to see how it works. Upgrade to go as deep as you need.
          </p>
        </div>

        <div style={styles.grid}>
          {/* Free plan card */}
          <div style={styles.card}>
            <div style={styles.cardTop}>
              <div style={styles.planName}>{FREE_PLAN.label}</div>
            </div>
            <div style={styles.priceRow}>
              <span style={styles.price}>{FREE_PLAN.price}</span>
            </div>
            <p style={styles.desc}>{FREE_PLAN.description}</p>
            <button
              onClick={() => user ? router.push("/") : router.push("/auth")}
              style={styles.cta}
            >
              {user ? "Back to book" : "Create free account"}
            </button>
          </div>

          {PLANS.map((plan) => (
            <div
              key={plan.id}
              style={{
                ...styles.card,
                ...(plan.id === "yearly" ? styles.cardFeatured : {}),
              }}
            >
              <div style={styles.cardTop}>
                <div style={styles.planName}>{plan.label}</div>
                {plan.badge && (
                  <div
                    style={{
                      ...styles.badge,
                      background: plan.badgeColor || "var(--surface)",
                      color: plan.badgeColor ? "#000" : "var(--accent)",
                      border: plan.badgeColor ? "none" : "1px solid var(--accent)",
                    }}
                  >
                    {plan.badge}
                  </div>
                )}
              </div>
              <div style={styles.priceRow}>
                <span style={styles.price}>{plan.price}</span>
                <span style={styles.period}>{plan.period}</span>
              </div>
              <p style={styles.desc}>{plan.description}</p>
              <button
                onClick={() => handleSubscribe(plan)}
                disabled={loading === plan.id}
                style={{
                  ...styles.cta,
                  ...(plan.id === "yearly" ? styles.ctaFeatured : {}),
                }}
              >
                {loading === plan.id ? "..." : `Get ${plan.label}`}
              </button>
            </div>
          ))}
        </div>

        <div style={styles.note}>{SMARTLOG_NOTE}</div>

        <div style={styles.fine}>
          <a href="https://smartlogtrading.com/terms" target="_blank">Terms</a>
          {" · "}
          <a href="https://smartlogtrading.com/privacy" target="_blank">Privacy</a>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    maxWidth: "900px",
    margin: "0 auto",
    padding: "0 24px",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "20px 0",
    borderBottom: "1px solid var(--border)",
  },
  logo: {
    fontSize: "15px",
    fontWeight: 600,
    color: "var(--text)",
    textDecoration: "none",
  },
  navLink: {
    color: "var(--muted)",
    fontSize: "14px",
    textDecoration: "none",
  },
  content: {
    padding: "48px 0",
  },
  hero: {
    textAlign: "center",
    marginBottom: "48px",
  },
  title: {
    fontSize: "32px",
    fontWeight: 700,
    marginBottom: "12px",
  },
  subtitle: {
    color: "var(--muted)",
    fontSize: "16px",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: "16px",
    marginBottom: "32px",
  },
  card: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: "14px",
    padding: "28px",
  },
  cardFeatured: {
    border: "1px solid var(--accent)",
  },
  cardTop: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "16px",
  },
  planName: {
    fontSize: "16px",
    fontWeight: 600,
  },
  badge: {
    fontSize: "11px",
    fontWeight: 700,
    padding: "3px 8px",
    borderRadius: "20px",
    letterSpacing: "0.04em",
  },
  priceRow: {
    display: "flex",
    alignItems: "baseline",
    gap: "4px",
    marginBottom: "12px",
  },
  price: {
    fontSize: "32px",
    fontWeight: 700,
    color: "var(--text)",
  },
  period: {
    fontSize: "14px",
    color: "var(--muted)",
  },
  desc: {
    fontSize: "13px",
    color: "var(--muted)",
    lineHeight: 1.6,
    marginBottom: "24px",
  },
  cta: {
    width: "100%",
    padding: "12px",
    background: "transparent",
    border: "1px solid var(--accent)",
    color: "var(--accent)",
    borderRadius: "8px",
    fontWeight: 600,
    fontSize: "14px",
    cursor: "pointer",
  },
  ctaFeatured: {
    background: "var(--accent)",
    color: "#000",
    border: "none",
  },
  note: {
    textAlign: "center",
    color: "var(--muted)",
    fontSize: "13px",
    padding: "0 40px",
    lineHeight: 1.6,
    marginBottom: "24px",
  },
  fine: {
    textAlign: "center",
    color: "var(--muted)",
    fontSize: "12px",
  },
};
