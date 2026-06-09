"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { BOOK_MAP } from "@/lib/book-map";

export default function BookSidebar({
  // Support both old (isOpen) and new (open) prop names
  open,
  isOpen,
  onClose,
  user: userProp,
  accessLevel,
  currentSlug,
  // Legacy props — kept for backward compat, not used in new layout
  lang,
  setLang,
}) {
  const router = useRouter();
  const isVisible = open ?? isOpen ?? false;
  const supabase = createClient();

  const [user, setUser] = useState(userProp || null);
  const [access, setAccess] = useState(accessLevel || null);
  const [periodEnd, setPeriodEnd] = useState(null);
  const [expandedChapters, setExpandedChapters] = useState({});

  // Sync user from prop or auth
  useEffect(() => {
    if (userProp) { setUser(userProp); return; }
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
  }, [userProp]);

  useEffect(() => {
    if (accessLevel) { setAccess(accessLevel); return; }
    if (!isVisible) return;
    fetch("/api/check-access")
      .then((r) => r.json())
      .then((d) => {
        setAccess(d.hasAccess ? "pro" : "free");
        setPeriodEnd(d.periodEnd || null);
      });
  }, [isVisible, accessLevel]);

  // Auto-expand the chapter containing currentSlug
  useEffect(() => {
    if (!currentSlug) return;
    const parent = BOOK_MAP.find((ch) =>
      ch.children?.some((c) => c.slug === currentSlug)
    );
    if (parent) {
      setExpandedChapters((prev) => ({ ...prev, [parent.id]: true }));
    }
  }, [currentSlug]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/");
    onClose?.();
  }

  function navigate(path) {
    router.push(path);
    onClose?.();
  }

  function toggleChapter(id) {
    setExpandedChapters((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function formatDate(iso) {
    if (!iso) return "";
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  return (
    <>
      {isVisible && (
        <div
          onClick={onClose}
          style={{
            position: "fixed", inset: 0,
            background: "rgba(0,0,0,0.6)",
            zIndex: 100,
          }}
        />
      )}

      <aside style={{
        position: "fixed",
        top: 0, left: 0, bottom: 0,
        width: 288,
        background: "var(--surface, #1a1a1c)",
        borderRight: "1px solid var(--border, #2a2a2c)",
        zIndex: 101,
        display: "flex",
        flexDirection: "column",
        transform: isVisible ? "translateX(0)" : "translateX(-100%)",
        transition: "transform 0.22s ease",
        overflowY: "auto",
      }}>

        {/* Header */}
        <div style={s.header}>
          <button onClick={() => navigate("/")} style={s.logoBtn}>
            Trading Without Ego
          </button>
          <button onClick={onClose} style={s.closeBtn}>✕</button>
        </div>

        {/* User + plan */}
        {user && (
          <div style={s.userBlock}>
            <div style={s.userEmail}>{user.email}</div>
            <div style={{
              ...s.planBadge,
              background: access === "pro" ? "var(--accent, #c8a96e)" : "transparent",
              color: access === "pro" ? "#0f0f10" : "var(--muted, #8b8685)",
              border: access === "pro" ? "none" : "1px solid var(--border, #2a2a2c)",
            }}>
              {access === "pro" ? "PRO" : "FREE"}
            </div>
            {access === "pro" && periodEnd && (
              <div style={s.validUntil}>Valid until {formatDate(periodEnd)}</div>
            )}
            {access !== "pro" && (
              <button onClick={() => navigate("/#pricing")} style={s.upgradeLink}>
                Upgrade to Pro →
              </button>
            )}
          </div>
        )}
        {!user && (
          <div style={s.userBlock}>
            <button onClick={() => navigate("/auth")} style={s.signInBtn}>
              Sign in →
            </button>
          </div>
        )}

        <div style={s.divider} />

        {/* Book chapters — expandable per chapter */}
        <nav style={s.nav}>
          <div style={s.sectionLabel}>Contents</div>
          {BOOK_MAP.map((chapter) => (
            <div key={chapter.id}>
              <button
                onClick={() => toggleChapter(chapter.id)}
                style={s.chapterHeader}
              >
                <span>
                  <span style={s.chapterTag}>{chapter.title}</span>
                  <span style={s.chapterName}>{chapter.subtitle}</span>
                </span>
                <span style={s.chevron}>
                  {expandedChapters[chapter.id] ? "▾" : "▸"}
                </span>
              </button>

              {expandedChapters[chapter.id] && chapter.children && (
                <div style={s.children}>
                  {chapter.children.map((child) => {
                    const isCurrent = child.slug === currentSlug;
                    return (
                      <button
                        key={child.id}
                        onClick={() => navigate(`/book/${child.slug}`)}
                        style={{
                          ...s.childItem,
                          color: isCurrent
                            ? "var(--accent, #c8a96e)"
                            : "var(--muted, #8b8685)",
                          borderLeft: isCurrent
                            ? "2px solid var(--accent, #c8a96e)"
                            : "2px solid transparent",
                        }}
                        onMouseEnter={(e) => {
                          if (!isCurrent) e.currentTarget.style.color = "var(--text, #e8e6e1)";
                        }}
                        onMouseLeave={(e) => {
                          if (!isCurrent) e.currentTarget.style.color = "var(--muted, #8b8685)";
                        }}
                      >
                        <span style={s.childId}>{child.title}</span>
                        <span style={s.childName}>{child.subtitle}</span>
                        {!child.free && access !== "pro" && (
                          <span style={s.lockIcon}>🔒</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </nav>

        <div style={s.divider} />

        {/* Settings */}
        <div style={s.settingsBlock}>
          <div style={s.sectionLabel}>Account</div>
          <button onClick={() => navigate("/#pricing")} style={s.settingLink}>
            {access === "pro" ? "Change plan" : "Upgrade to Pro"}
          </button>
          {access === "pro" && (
            <button
              onClick={() => navigate("/subscribe?manage=1")}
              style={{ ...s.settingLink, color: "var(--muted, #8b8685)" }}
            >
              Cancel subscription
            </button>
          )}
        </div>

        <div style={{ flex: 1 }} />

        <div style={s.footer}>
          <a href="https://smartlogtrading.com" target="_blank" style={s.footerLink}>
            SmartLog
          </a>
          <span style={s.footerSep}>·</span>
          <a href="mailto:marcos@smartlogtrading.com" style={s.footerLink}>
            Contact
          </a>
          {user && (
            <>
              <span style={s.footerSep}>·</span>
              <button onClick={handleSignOut} style={s.signOutBtn}>
                Sign out
              </button>
            </>
          )}
        </div>
      </aside>
    </>
  );
}

const s = {
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "1rem 1.25rem",
    borderBottom: "1px solid var(--border, #2a2a2c)",
    flexShrink: 0,
  },
  logoBtn: {
    background: "none",
    border: "none",
    color: "var(--accent, #c8a96e)",
    fontSize: "0.8125rem",
    fontWeight: 700,
    cursor: "pointer",
    letterSpacing: "0.03em",
    padding: 0,
  },
  closeBtn: {
    background: "none",
    border: "none",
    color: "var(--muted, #8b8685)",
    fontSize: "1rem",
    cursor: "pointer",
    padding: "0.2rem 0.4rem",
  },
  userBlock: {
    padding: "0.875rem 1.25rem",
    borderBottom: "1px solid var(--border, #2a2a2c)",
    display: "flex",
    flexDirection: "column",
    gap: "0.375rem",
  },
  userEmail: {
    fontSize: "0.8125rem",
    color: "var(--text, #e8e6e1)",
    wordBreak: "break-all",
  },
  planBadge: {
    alignSelf: "flex-start",
    fontSize: "0.65rem",
    fontWeight: 700,
    letterSpacing: "0.06em",
    padding: "0.2em 0.55em",
    borderRadius: "20px",
  },
  validUntil: {
    fontSize: "0.75rem",
    color: "var(--muted, #8b8685)",
  },
  upgradeLink: {
    background: "none",
    border: "none",
    color: "var(--accent, #c8a96e)",
    fontSize: "0.8125rem",
    padding: 0,
    cursor: "pointer",
    textAlign: "left",
  },
  signInBtn: {
    background: "none",
    border: "1px solid var(--border, #2a2a2c)",
    color: "var(--text, #e8e6e1)",
    padding: "0.4rem 0.75rem",
    borderRadius: "6px",
    fontSize: "0.8125rem",
    cursor: "pointer",
    alignSelf: "flex-start",
  },
  divider: {
    borderTop: "1px solid var(--border, #2a2a2c)",
  },
  nav: {
    display: "flex",
    flexDirection: "column",
    overflowY: "auto",
    flex: 1,
    paddingBottom: "0.5rem",
  },
  sectionLabel: {
    fontSize: "0.65rem",
    fontWeight: 700,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    color: "var(--muted, #8b8685)",
    padding: "0.75rem 1.25rem 0.375rem",
  },
  chapterHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    background: "none",
    border: "none",
    color: "var(--text, #e8e6e1)",
    padding: "0.5rem 1.25rem",
    textAlign: "left",
    cursor: "pointer",
    gap: "0.5rem",
  },
  chapterTag: {
    fontSize: "0.65rem",
    fontWeight: 700,
    color: "var(--accent, #c8a96e)",
    letterSpacing: "0.06em",
    marginRight: "0.5rem",
  },
  chapterName: {
    fontSize: "0.8125rem",
    color: "var(--text, #e8e6e1)",
  },
  chevron: {
    fontSize: "0.75rem",
    color: "var(--muted, #8b8685)",
    flexShrink: 0,
  },
  children: {
    paddingBottom: "0.25rem",
  },
  childItem: {
    display: "flex",
    alignItems: "baseline",
    gap: "0.4rem",
    width: "100%",
    background: "none",
    border: "none",
    padding: "0.375rem 1.25rem 0.375rem 1.5rem",
    textAlign: "left",
    cursor: "pointer",
    transition: "color 0.12s",
    borderLeft: "2px solid transparent",
  },
  childId: {
    fontSize: "0.65rem",
    color: "inherit",
    fontWeight: 600,
    letterSpacing: "0.04em",
    flexShrink: 0,
    minWidth: "2rem",
  },
  childName: {
    fontSize: "0.8125rem",
    color: "inherit",
    flex: 1,
    minWidth: 0,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  lockIcon: {
    fontSize: "0.6rem",
    flexShrink: 0,
  },
  settingsBlock: {
    padding: "0.75rem 0",
  },
  settingLink: {
    display: "block",
    width: "100%",
    background: "none",
    border: "none",
    color: "var(--accent, #c8a96e)",
    fontSize: "0.8125rem",
    padding: "0.5rem 1.25rem",
    textAlign: "left",
    cursor: "pointer",
  },
  footer: {
    display: "flex",
    alignItems: "center",
    gap: "0.375rem",
    padding: "0.875rem 1.25rem",
    borderTop: "1px solid var(--border, #2a2a2c)",
    flexWrap: "wrap",
  },
  footerLink: {
    fontSize: "0.75rem",
    color: "var(--muted, #8b8685)",
    textDecoration: "none",
  },
  footerSep: {
    fontSize: "0.75rem",
    color: "var(--border, #2a2a2c)",
  },
  signOutBtn: {
    background: "none",
    border: "none",
    color: "var(--muted, #8b8685)",
    fontSize: "0.75rem",
    cursor: "pointer",
    padding: 0,
  },
};
