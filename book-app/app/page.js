"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

const ENTRY_POINTS = [
  {
    id: "fomo",
    label: "FOMO",
    description: "You enter before your level is reached — and you know it.",
    type: "pain",
  },
  {
    id: "hesitation",
    label: "Hesitation",
    description: "The setup is there. You don't take it. Then you watch it move.",
    type: "pain",
  },
  {
    id: "early_exit",
    label: "Early exit",
    description: "You get out before target. Usually it keeps going.",
    type: "pain",
  },
  {
    id: "revenge",
    label: "Revenge trading",
    description: "After a loss, you take a trade you shouldn't.",
    type: "pain",
  },
  {
    id: "stop_tampering",
    label: "Stop tampering",
    description: "You move your stop — and it almost always makes things worse.",
    type: "pain",
  },
  {
    id: "overtrading",
    label: "Overtrading",
    description: "You take trades outside your plan. More trades, worse results.",
    type: "pain",
  },
  {
    id: "f1",
    label: "Why emotions feel like the enemy",
    description: "The foundation: emotions as goal protectors.",
    type: "concept",
  },
  {
    id: "f3",
    label: "The Mental Congress",
    description: "Why your mind has multiple competing voices — and what to do with them.",
    type: "concept",
  },
  {
    id: "f6",
    label: "The Mind as a Problem-Solver",
    description: "Why vague plans create emotional turbulence.",
    type: "concept",
  },
  {
    id: "f7",
    label: "Confidence as a statistic",
    description: "Why conviction is built through logging, not through winning.",
    type: "concept",
  },
];

export default function Home() {
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState("all"); // "all" | "pain" | "concept"

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setLoading(false);
    });
  }, []);

  function startConversation(entry) {
    const params = new URLSearchParams({
      entry: entry.id,
      type: entry.type,
    });
    router.push(`/chat?${params.toString()}`);
  }

  const filtered =
    filter === "all"
      ? ENTRY_POINTS
      : ENTRY_POINTS.filter((e) => e.type === filter);

  return (
    <main style={styles.main}>
      <header style={styles.header}>
        <div style={styles.logo}>Trading Without Ego</div>
        <div style={styles.headerRight}>
          {loading ? null : user ? (
            <a href="/chat" style={styles.navLink}>
              Continue
            </a>
          ) : (
            <a href="/auth" style={styles.navLink}>
              Sign in
            </a>
          )}
        </div>
      </header>

      <section style={styles.hero}>
        <p style={styles.eyebrow}>Interactive Book</p>
        <h1 style={styles.headline}>
          You can&apos;t remove uncertainty from trading.
          <br />
          <span style={styles.accentText}>
            But you can remove regret from your decisions.
          </span>
        </h1>
        <p style={styles.subhead}>
          Start from a pattern you&apos;re struggling with, or a concept you
          want to understand. The AI conducts the conversation — you choose how
          deep to go.
        </p>
      </section>

      <section style={styles.entries}>
        <div style={styles.filterRow}>
          {["all", "pain", "concept"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                ...styles.filterBtn,
                ...(filter === f ? styles.filterBtnActive : {}),
              }}
            >
              {f === "all" ? "Everything" : f === "pain" ? "I struggle with..." : "I want to understand..."}
            </button>
          ))}
        </div>

        <div style={styles.grid}>
          {filtered.map((entry) => (
            <button
              key={entry.id}
              onClick={() => startConversation(entry)}
              style={styles.card}
              onMouseEnter={(e) =>
                (e.currentTarget.style.borderColor = "var(--accent)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.borderColor = "var(--border)")
              }
            >
              <div style={styles.cardLabel}>{entry.label}</div>
              <div style={styles.cardDesc}>{entry.description}</div>
            </button>
          ))}
        </div>

        <div style={styles.browseHint}>
          Not sure where to start?{" "}
          <button
            onClick={() => router.push("/chat?type=browse")}
            style={styles.browseLink}
          >
            Browse the full map →
          </button>
        </div>
      </section>

      <footer style={styles.footer}>
        <div>
          By{" "}
          <a href="https://smartlogtrading.com/about" target="_blank">
            Marcos Bulcao
          </a>{" "}
          · Part of{" "}
          <a href="https://app.smartlogtrading.com" target="_blank">
            SmartLog
          </a>
        </div>
        <div>
          <a href="/subscribe">Pricing</a> ·{" "}
          <a href="https://smartlogtrading.com/privacy" target="_blank">
            Privacy
          </a>
        </div>
      </footer>
    </main>
  );
}

const styles = {
  main: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    maxWidth: "860px",
    margin: "0 auto",
    padding: "0 24px",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "20px 0",
    borderBottom: "1px solid var(--border)",
  },
  logo: {
    fontSize: "15px",
    fontWeight: 600,
    color: "var(--text)",
    letterSpacing: "0.02em",
  },
  headerRight: { display: "flex", gap: "16px", alignItems: "center" },
  navLink: {
    color: "var(--muted)",
    fontSize: "14px",
    textDecoration: "none",
  },
  hero: {
    padding: "64px 0 40px",
  },
  eyebrow: {
    fontSize: "13px",
    color: "var(--accent)",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    marginBottom: "16px",
  },
  headline: {
    fontSize: "clamp(24px, 4vw, 40px)",
    fontWeight: 700,
    lineHeight: 1.2,
    marginBottom: "20px",
    color: "var(--text)",
  },
  accentText: {
    color: "var(--accent)",
  },
  subhead: {
    fontSize: "17px",
    color: "var(--muted)",
    maxWidth: "560px",
    lineHeight: 1.6,
  },
  entries: {
    flex: 1,
    paddingBottom: "60px",
  },
  filterRow: {
    display: "flex",
    gap: "8px",
    marginBottom: "28px",
    flexWrap: "wrap",
  },
  filterBtn: {
    padding: "6px 14px",
    borderRadius: "20px",
    border: "1px solid var(--border)",
    background: "transparent",
    color: "var(--muted)",
    fontSize: "13px",
    cursor: "pointer",
    transition: "all 0.15s",
  },
  filterBtnActive: {
    background: "var(--accent)",
    color: "#000",
    borderColor: "var(--accent)",
    fontWeight: 600,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
    gap: "12px",
    marginBottom: "32px",
  },
  card: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: "10px",
    padding: "20px",
    textAlign: "left",
    transition: "border-color 0.15s",
    cursor: "pointer",
  },
  cardLabel: {
    fontSize: "15px",
    fontWeight: 600,
    color: "var(--text)",
    marginBottom: "8px",
  },
  cardDesc: {
    fontSize: "13px",
    color: "var(--muted)",
    lineHeight: 1.5,
  },
  browseHint: {
    color: "var(--muted)",
    fontSize: "14px",
    textAlign: "center",
  },
  browseLink: {
    background: "none",
    border: "none",
    color: "var(--accent)",
    fontSize: "14px",
    cursor: "pointer",
    padding: 0,
  },
  footer: {
    display: "flex",
    justifyContent: "space-between",
    padding: "20px 0",
    borderTop: "1px solid var(--border)",
    color: "var(--muted)",
    fontSize: "13px",
    flexWrap: "wrap",
    gap: "8px",
  },
};
