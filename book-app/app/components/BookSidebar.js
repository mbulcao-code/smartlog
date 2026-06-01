"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { useT } from "@/lib/i18n-book";

const CHAPTERS = [
  {
    section: "foundations",
    items: [
      { id: "f1", label: "Emotions as Goal Protectors", labelPt: "Emoções como Protetores de Metas" },
      { id: "f2", label: "All Habits Are Successful", labelPt: "Todo Hábito É Bem-Sucedido" },
      { id: "f3", label: "The Mental Congress", labelPt: "O Congresso Mental" },
      { id: "f4", label: "The Pirates' Dilemma", labelPt: "O Dilema dos Piratas" },
      { id: "f5", label: "Keys to Sustainable Discipline", labelPt: "Chaves para Disciplina Sustentável" },
      { id: "f6", label: "The Mind as a Problem-Solver", labelPt: "A Mente como Solucionadora de Problemas" },
      { id: "f7", label: "The Probabilistic Trader", labelPt: "O Trader Probabilístico" },
    ],
  },
  {
    section: "patterns",
    items: [
      { id: "fomo", label: "FOMO", labelPt: "FOMO" },
      { id: "hesitation", label: "Hesitation", labelPt: "Hesitação" },
      { id: "early_exit", label: "Early exit", labelPt: "Saída antecipada" },
      { id: "revenge", label: "Revenge trading", labelPt: "Revenge trading" },
      { id: "stop_tampering", label: "Stop tampering", labelPt: "Mexer no stop" },
      { id: "overtrading", label: "Overtrading", labelPt: "Overtrading" },
      { id: "greed", label: "Greed", labelPt: "Ganância" },
      { id: "loss_aversion", label: "Loss aversion", labelPt: "Aversão à perda" },
      { id: "confirmation_bias", label: "Confirmation bias", labelPt: "Viés de confirmação" },
      { id: "hindsight_bias", label: "Hindsight bias", labelPt: "Viés retrospectivo" },
      { id: "anchoring", label: "Anchoring / recency", labelPt: "Ancoragem / recência" },
      { id: "herd", label: "Herd mentality", labelPt: "Mentalidade de manada" },
      { id: "redemption", label: "Redemption trap", labelPt: "Armadilha da redenção" },
      { id: "overconfidence", label: "Overconfidence", labelPt: "Excesso de confiança" },
      { id: "limiting_beliefs", label: "Limiting beliefs", labelPt: "Crenças limitantes" },
    ],
  },
];

export default function BookSidebar({ isOpen, onClose, lang, setLang }) {
  const router = useRouter();
  const t = useT(lang);
  const supabase = createClient();

  const [user, setUser] = useState(null);
  const [access, setAccess] = useState(null);
  const [periodEnd, setPeriodEnd] = useState(null);
  const [history, setHistory] = useState([]);
  const [chaptersOpen, setChaptersOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("foundations"); // foundations | patterns

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    fetch("/api/check-access")
      .then((r) => r.json())
      .then((d) => {
        setAccess(d.access);
        setPeriodEnd(d.periodEnd || null);
      });
    fetch("/api/history")
      .then((r) => r.json())
      .then((d) => setHistory(d.conversations || []));
  }, [isOpen]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/");
    onClose();
  }

  function navigate(path) {
    router.push(path);
    onClose();
  }

  function formatDate(iso) {
    if (!iso) return "";
    return new Date(iso).toLocaleDateString(lang === "pt" ? "pt-BR" : "en-US", {
      month: "short",
      day: "numeric",
    });
  }

  function planLabel() {
    if (!access || access === "free" || access === "locked") return t.free;
    return t.pro;
  }

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            zIndex: 100,
          }}
        />
      )}

      {/* Sidebar panel */}
      <aside
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          bottom: 0,
          width: 280,
          background: "var(--surface)",
          borderRight: "1px solid var(--border)",
          zIndex: 101,
          display: "flex",
          flexDirection: "column",
          transform: isOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 0.25s ease",
          overflowY: "auto",
        }}
      >
        {/* Header */}
        <div style={s.sidebarHeader}>
          <span style={s.sidebarTitle}>{t.title}</span>
          <button onClick={onClose} style={s.closeBtn}>✕</button>
        </div>

        {/* Language toggle */}
        <div style={s.langRow}>
          {["en", "pt"].map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              style={{
                ...s.langBtn,
                ...(lang === l ? s.langBtnActive : {}),
              }}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>

        {/* User info */}
        {user && (
          <div style={s.userSection}>
            <div style={s.userEmail}>{user.email}</div>
            <div
              style={{
                ...s.planBadge,
                background: access === "pro" ? "var(--accent)" : "var(--border)",
                color: access === "pro" ? "#000" : "var(--muted)",
              }}
            >
              {planLabel()}
            </div>
          </div>
        )}

        {/* Nav links */}
        <nav style={s.nav}>
          <button onClick={() => navigate("/")} style={s.navItem}>
            {lang === "pt" ? "Início" : "Home"}
          </button>
          <a
            href="https://smartlogtrading.com/about"
            target="_blank"
            style={s.navItemLink}
            onClick={onClose}
          >
            {t.aboutUs}
          </a>
          <a
            href="https://smartlogtrading.com/contact"
            target="_blank"
            style={s.navItemLink}
            onClick={onClose}
          >
            {t.contactUs}
          </a>
        </nav>

        <div style={s.divider} />

        {/* Settings */}
        <div style={s.section}>
          <div style={s.sectionTitle}>{t.settings}</div>
          <div style={s.settingRow}>
            <span style={s.settingLabel}>{t.currentPlan}</span>
            <span style={s.settingValue}>{planLabel()}</span>
          </div>
          {periodEnd && (
            <div style={s.settingRow}>
              <span style={s.settingLabel}>{t.validUntil}</span>
              <span style={s.settingValue}>{formatDate(periodEnd)}</span>
            </div>
          )}
          <button onClick={() => navigate("/subscribe")} style={s.settingAction}>
            {t.changePlan}
          </button>
          {access === "pro" && (
            <button
              onClick={() => navigate("/subscribe?manage=1")}
              style={{ ...s.settingAction, color: "var(--danger)" }}
            >
              {t.cancelSubscription}
            </button>
          )}
        </div>

        <div style={s.divider} />

        {/* Book Chapters */}
        <div style={s.section}>
          <button
            onClick={() => setChaptersOpen((o) => !o)}
            style={s.sectionToggle}
          >
            <span style={s.sectionTitle}>{t.bookChapters}</span>
            <span style={{ color: "var(--muted)", fontSize: "12px" }}>
              {chaptersOpen ? "▲" : "▼"}
            </span>
          </button>

          {chaptersOpen && (
            <div>
              {/* Sub-tab: Foundations / Patterns */}
              <div style={s.subTabRow}>
                {["foundations", "patterns"].map((sec) => (
                  <button
                    key={sec}
                    onClick={() => setActiveSection(sec)}
                    style={{
                      ...s.subTab,
                      ...(activeSection === sec ? s.subTabActive : {}),
                    }}
                  >
                    {sec === "foundations" ? t.foundations : t.patterns}
                  </button>
                ))}
              </div>
              {CHAPTERS.find((c) => c.section === activeSection)?.items.map((item) => (
                <button
                  key={item.id}
                  onClick={() =>
                    navigate(
                      `/chat?entry=${item.id}&type=${activeSection === "foundations" ? "concept" : "pain"}`
                    )
                  }
                  style={s.chapterItem}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "var(--accent)")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "var(--muted)")}
                >
                  {lang === "pt" ? item.labelPt : item.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div style={s.divider} />

        {/* Chat History */}
        <div style={s.section}>
          <button
            onClick={() => setHistoryOpen((o) => !o)}
            style={s.sectionToggle}
          >
            <span style={s.sectionTitle}>{t.chatHistory}</span>
            <span style={{ color: "var(--muted)", fontSize: "12px" }}>
              {historyOpen ? "▲" : "▼"}
            </span>
          </button>

          {historyOpen && (
            <div>
              {history.length === 0 ? (
                <p style={s.emptyNote}>{t.noHistory}</p>
              ) : (
                history.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() =>
                      navigate(`/chat?entry=${conv.chapterId || "browse"}&type=${conv.type}&cid=${conv.id}`)
                    }
                    style={s.historyItem}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <span style={s.historyLabel}>{conv.label}</span>
                    <span style={s.historyMeta}>
                      {conv.messageCount} msg · {formatDate(conv.lastMessageAt)}
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ flex: 1 }} />
        {user && (
          <div style={s.sidebarFooter}>
            <button onClick={handleSignOut} style={s.signOutBtn}>
              {t.signOut}
            </button>
          </div>
        )}
      </aside>
    </>
  );
}

const s = {
  sidebarHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "20px 20px 16px",
    borderBottom: "1px solid var(--border)",
  },
  sidebarTitle: {
    fontSize: "13px",
    fontWeight: 600,
    color: "var(--accent)",
    letterSpacing: "0.04em",
  },
  closeBtn: {
    background: "none",
    border: "none",
    color: "var(--muted)",
    fontSize: "16px",
    cursor: "pointer",
    padding: "2px 6px",
  },
  langRow: {
    display: "flex",
    gap: "6px",
    padding: "12px 20px",
    borderBottom: "1px solid var(--border)",
  },
  langBtn: {
    background: "transparent",
    border: "1px solid var(--border)",
    borderRadius: "6px",
    padding: "4px 12px",
    color: "var(--muted)",
    fontSize: "12px",
    fontWeight: 600,
    cursor: "pointer",
    letterSpacing: "0.04em",
  },
  langBtnActive: {
    background: "var(--accent)",
    color: "#000",
    borderColor: "var(--accent)",
  },
  userSection: {
    padding: "14px 20px",
    borderBottom: "1px solid var(--border)",
  },
  userEmail: {
    fontSize: "13px",
    color: "var(--text)",
    marginBottom: "6px",
    wordBreak: "break-all",
  },
  planBadge: {
    display: "inline-block",
    fontSize: "11px",
    fontWeight: 700,
    padding: "2px 8px",
    borderRadius: "20px",
    letterSpacing: "0.04em",
  },
  nav: {
    display: "flex",
    flexDirection: "column",
    padding: "8px 0",
  },
  navItem: {
    background: "none",
    border: "none",
    color: "var(--muted)",
    fontSize: "14px",
    padding: "9px 20px",
    textAlign: "left",
    cursor: "pointer",
  },
  navItemLink: {
    color: "var(--muted)",
    fontSize: "14px",
    padding: "9px 20px",
    display: "block",
    textDecoration: "none",
  },
  divider: {
    borderTop: "1px solid var(--border)",
    margin: "0",
  },
  section: {
    padding: "12px 0",
  },
  sectionTitle: {
    fontSize: "11px",
    fontWeight: 700,
    color: "var(--muted)",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    paddingLeft: "20px",
  },
  sectionToggle: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "4px 20px 8px",
    textAlign: "left",
  },
  settingRow: {
    display: "flex",
    justifyContent: "space-between",
    padding: "5px 20px",
  },
  settingLabel: {
    fontSize: "13px",
    color: "var(--muted)",
  },
  settingValue: {
    fontSize: "13px",
    color: "var(--text)",
  },
  settingAction: {
    background: "none",
    border: "none",
    color: "var(--accent)",
    fontSize: "13px",
    padding: "6px 20px",
    cursor: "pointer",
    textAlign: "left",
    width: "100%",
  },
  subTabRow: {
    display: "flex",
    gap: "6px",
    padding: "8px 20px",
  },
  subTab: {
    background: "transparent",
    border: "1px solid var(--border)",
    borderRadius: "6px",
    padding: "3px 10px",
    color: "var(--muted)",
    fontSize: "11px",
    fontWeight: 600,
    cursor: "pointer",
    letterSpacing: "0.03em",
  },
  subTabActive: {
    background: "var(--surface)",
    borderColor: "var(--accent)",
    color: "var(--accent)",
  },
  chapterItem: {
    display: "block",
    width: "100%",
    background: "none",
    border: "none",
    color: "var(--muted)",
    fontSize: "13px",
    padding: "6px 20px 6px 28px",
    textAlign: "left",
    cursor: "pointer",
    transition: "color 0.12s",
  },
  historyItem: {
    display: "flex",
    flexDirection: "column",
    width: "100%",
    background: "transparent",
    border: "none",
    padding: "7px 20px",
    cursor: "pointer",
    textAlign: "left",
    borderRadius: 0,
    transition: "background 0.12s",
  },
  historyLabel: {
    fontSize: "13px",
    color: "var(--text)",
    marginBottom: "2px",
  },
  historyMeta: {
    fontSize: "11px",
    color: "var(--muted)",
  },
  emptyNote: {
    fontSize: "13px",
    color: "var(--muted)",
    padding: "8px 20px",
  },
  sidebarFooter: {
    borderTop: "1px solid var(--border)",
    padding: "12px 20px",
  },
  signOutBtn: {
    background: "none",
    border: "none",
    color: "var(--muted)",
    fontSize: "13px",
    cursor: "pointer",
    padding: 0,
  },
};
