"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import AiCompanion from "@/app/components/AiCompanion";
import BookSidebar from "@/app/components/BookSidebar";
import {
  getSectionBySlug,
  getAdjacentSections,
  getParentChapter,
} from "@/lib/book-map";

// ─── MARKDOWN RENDERER ──────────────────────────────────────────────────────
// Lightweight — handles headings, bold, italic, code, blockquote, hr, lists

function renderMarkdown(md) {
  if (!md) return null;
  const lines = md.split("\n");
  const elements = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Headings
    if (line.startsWith("### ")) {
      elements.push(<h3 key={i}>{inlineFormat(line.slice(4))}</h3>);
      i++; continue;
    }
    if (line.startsWith("## ")) {
      elements.push(<h2 key={i}>{inlineFormat(line.slice(3))}</h2>);
      i++; continue;
    }
    if (line.startsWith("# ")) {
      elements.push(<h1 key={i}>{inlineFormat(line.slice(2))}</h1>);
      i++; continue;
    }

    // Blockquote
    if (line.startsWith("> ")) {
      const quoteLines = [];
      while (i < lines.length && lines[i].startsWith("> ")) {
        quoteLines.push(lines[i].slice(2));
        i++;
      }
      elements.push(
        <blockquote key={i}>
          {quoteLines.map((l, j) => <p key={j}>{inlineFormat(l)}</p>)}
        </blockquote>
      );
      continue;
    }

    // HR
    if (line.match(/^---+$/) || line.match(/^\*\*\*+$/)) {
      elements.push(<hr key={i} />);
      i++; continue;
    }

    // Unordered list
    if (line.match(/^[-*] /)) {
      const items = [];
      while (i < lines.length && lines[i].match(/^[-*] /)) {
        items.push(<li key={i}>{inlineFormat(lines[i].slice(2))}</li>);
        i++;
      }
      elements.push(<ul key={i}>{items}</ul>);
      continue;
    }

    // Ordered list
    if (line.match(/^\d+\. /)) {
      const items = [];
      while (i < lines.length && lines[i].match(/^\d+\. /)) {
        items.push(<li key={i}>{inlineFormat(lines[i].replace(/^\d+\. /, ""))}</li>);
        i++;
      }
      elements.push(<ol key={i}>{items}</ol>);
      continue;
    }

    // Empty line
    if (line.trim() === "") {
      i++; continue;
    }

    // Paragraph
    const paraLines = [];
    while (i < lines.length && lines[i].trim() !== "" && !lines[i].startsWith("#") && !lines[i].startsWith(">") && !lines[i].match(/^---+$/) && !lines[i].match(/^[-*] /) && !lines[i].match(/^\d+\. /)) {
      paraLines.push(lines[i]);
      i++;
    }
    if (paraLines.length > 0) {
      elements.push(
        <p key={i}>{inlineFormat(paraLines.join(" "))}</p>
      );
    }
  }

  return elements;
}

function inlineFormat(text) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|_[^_]+_)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**"))
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    if ((part.startsWith("*") && part.endsWith("*")) || (part.startsWith("_") && part.endsWith("_")))
      return <em key={i}>{part.slice(1, -1)}</em>;
    if (part.startsWith("`") && part.endsWith("`"))
      return <code key={i}>{part.slice(1, -1)}</code>;
    return part;
  });
}

// ─── BOOK READER ─────────────────────────────────────────────────────────────

export default function BookPage() {
  const params = useParams();
  const router = useRouter();
  const slug = Array.isArray(params.slug) ? params.slug.join("/") : params.slug;

  const section = getSectionBySlug(slug);
  const parent = section ? getParentChapter(slug) : null;
  const { prev, next } = section ? getAdjacentSections(slug) : { prev: null, next: null };

  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accessError, setAccessError] = useState(null); // "auth_required" | "access_required"
  const [user, setUser] = useState(null);
  const [accessLevel, setAccessLevel] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Auth
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        checkAccess();
      }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user) {
        setUser(session.user);
        checkAccess();
      } else {
        setUser(null);
        setAccessLevel(null);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  async function checkAccess() {
    try {
      const res = await fetch("/api/check-access");
      const data = await res.json();
      setAccessLevel(data.hasAccess ? "pro" : "free");
    } catch {
      setAccessLevel("free");
    }
  }

  // Load content
  const loadContent = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    setAccessError(null);
    try {
      const res = await fetch(`/api/content/${slug}`);
      if (res.status === 401) { setAccessError("auth_required"); return; }
      if (res.status === 403) { setAccessError("access_required"); return; }
      if (!res.ok) { setContent("*Content not found.*"); return; }
      const data = await res.json();
      setContent(data.content);
    } catch {
      setContent("*Failed to load content.*");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => { loadContent(); }, [loadContent]);

  // After login, retry content
  useEffect(() => {
    if (user && accessError) loadContent();
  }, [user, accessError, loadContent]);

  if (!section) {
    return (
      <div className="not-found">
        <p>Section not found.</p>
        <button onClick={() => router.push("/")}>← Back to map</button>
      </div>
    );
  }

  return (
    <>
      <BookSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        user={user}
        accessLevel={accessLevel}
        currentSlug={slug}
      />

      <div className="reader-layout">
        {/* ── TOPBAR ─────────────────────────────────────────────────── */}
        <header className="reader-topbar">
          <button className="topbar-back" onClick={() => router.push("/")}>
            ← Map
          </button>
          <div className="topbar-breadcrumb">
            {parent && (
              <>
                <span className="crumb-parent">{parent.title}</span>
                <span className="crumb-sep">›</span>
              </>
            )}
            <span className="crumb-current">{section.subtitle}</span>
          </div>
          <button
            className="topbar-menu"
            onClick={() => setSidebarOpen(true)}
            aria-label="Menu"
          >
            ☰
          </button>
        </header>

        {/* ── CONTENT ────────────────────────────────────────────────── */}
        <main className="reader-main">
          <article className="reader-article">
            {/* Section label */}
            <div className="section-label">
              {parent && <span className="label-parent">{parent.title}</span>}
              <span className="label-title">{section.title}</span>
            </div>

            {loading ? (
              <div className="reader-loading">
                <div className="loading-bar" />
                <div className="loading-bar short" />
                <div className="loading-bar" />
              </div>
            ) : accessError === "auth_required" ? (
              <div className="access-gate">
                <h2>Sign in to read this section</h2>
                <p>The Entry sections are free. Sign in to access Act I — free with an account.</p>
                <button
                  className="gate-btn-primary"
                  onClick={() => router.push(`/auth?redirect=/book/${slug}`)}
                >
                  Sign in →
                </button>
                <button className="gate-btn-ghost" onClick={() => router.push("/")}>
                  ← Back to map
                </button>
              </div>
            ) : accessError === "access_required" ? (
              <div className="access-gate">
                <h2>This section requires full access</h2>
                <p>
                  Get full access to all sections, all 15 patterns, the AI companion,
                  glossary, FAQ, and depth dives.
                </p>
                <button
                  className="gate-btn-primary"
                  onClick={() => router.push("/#pricing")}
                >
                  See plans →
                </button>
                <button className="gate-btn-ghost" onClick={() => router.push("/")}>
                  ← Back to map
                </button>
              </div>
            ) : (
              <div className="prose">{renderMarkdown(content)}</div>
            )}
          </article>

          {/* ── PREV / NEXT NAV ── */}
          {!accessError && !loading && (
            <nav className="reader-nav">
              {prev ? (
                <button
                  className="nav-btn nav-prev"
                  onClick={() => router.push(`/book/${prev.slug}`)}
                >
                  <span className="nav-dir">← Previous</span>
                  <span className="nav-title">{prev.subtitle}</span>
                </button>
              ) : (
                <div />
              )}
              {next ? (
                <button
                  className="nav-btn nav-next"
                  onClick={() => router.push(`/book/${next.slug}`)}
                >
                  <span className="nav-dir">Next →</span>
                  <span className="nav-title">{next.subtitle}</span>
                </button>
              ) : (
                <div />
              )}
            </nav>
          )}
        </main>
      </div>

      {/* ── AI COMPANION ── */}
      {!accessError && (
        <AiCompanion
          sectionContent={content}
          sectionTitle={`${section.title} — ${section.subtitle}`}
          slug={slug}
          user={user}
          accessLevel={accessLevel}
        />
      )}

      <style jsx>{`
        /* ── LAYOUT ── */
        .reader-layout {
          min-height: 100vh;
          background: var(--bg, #0f0f10);
          color: var(--text, #e8e6e1);
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        /* ── TOPBAR ── */
        .reader-topbar {
          position: sticky;
          top: 0;
          display: flex;
          align-items: center;
          padding: 0.75rem 1.25rem;
          border-bottom: 1px solid var(--border, #2a2a2c);
          background: var(--bg, #0f0f10);
          z-index: 10;
          gap: 1rem;
        }
        .topbar-back {
          background: none;
          border: none;
          color: var(--muted, #8b8685);
          font-size: 0.8125rem;
          cursor: pointer;
          white-space: nowrap;
          padding: 0;
          transition: color 0.12s;
          flex-shrink: 0;
        }
        .topbar-back:hover {
          color: var(--text, #e8e6e1);
        }
        .topbar-breadcrumb {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 0.375rem;
          min-width: 0;
          font-size: 0.8125rem;
          overflow: hidden;
        }
        .crumb-parent {
          color: var(--muted, #8b8685);
          white-space: nowrap;
          flex-shrink: 0;
        }
        .crumb-sep {
          color: var(--border, #2a2a2c);
          flex-shrink: 0;
        }
        .crumb-current {
          color: var(--text, #e8e6e1);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .topbar-menu {
          background: none;
          border: none;
          color: var(--muted, #8b8685);
          font-size: 1.125rem;
          cursor: pointer;
          padding: 0.25rem 0.5rem;
          flex-shrink: 0;
        }

        /* ── MAIN ── */
        .reader-main {
          max-width: 680px;
          margin: 0 auto;
          padding: 3rem 2rem 6rem;
        }

        /* ── ARTICLE ── */
        .reader-article {
          margin-bottom: 3rem;
        }
        .section-label {
          display: flex;
          align-items: baseline;
          gap: 0.75rem;
          margin-bottom: 2rem;
        }
        .label-parent {
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--muted, #8b8685);
        }
        .label-title {
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--accent, #c8a96e);
        }

        /* ── LOADING ── */
        .reader-loading {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          padding-top: 1rem;
        }
        .loading-bar {
          height: 0.9rem;
          border-radius: 4px;
          background: var(--surface, #1a1a1c);
          animation: pulse 1.4s ease-in-out infinite;
        }
        .loading-bar.short {
          width: 60%;
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }

        /* ── PROSE ── */
        :global(.prose h1) {
          font-size: clamp(1.5rem, 3vw, 2rem);
          font-weight: 700;
          line-height: 1.25;
          margin: 0 0 1.5rem;
          color: var(--text, #e8e6e1);
        }
        :global(.prose h2) {
          font-size: 1.25rem;
          font-weight: 600;
          margin: 2.5rem 0 1rem;
          color: var(--text, #e8e6e1);
        }
        :global(.prose h3) {
          font-size: 1rem;
          font-weight: 600;
          margin: 2rem 0 0.75rem;
          color: var(--accent, #c8a96e);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          font-size: 0.8125rem;
        }
        :global(.prose p) {
          font-size: 1.0625rem;
          line-height: 1.8;
          margin: 0 0 1.25rem;
          color: var(--text, #e8e6e1);
        }
        :global(.prose blockquote) {
          border-left: 3px solid var(--accent, #c8a96e);
          margin: 1.75rem 0;
          padding: 0.5rem 1.25rem;
          background: rgba(200, 169, 110, 0.04);
          border-radius: 0 6px 6px 0;
        }
        :global(.prose blockquote p) {
          font-size: 1rem;
          font-style: italic;
          color: var(--muted, #8b8685);
          margin: 0;
        }
        :global(.prose ul),
        :global(.prose ol) {
          margin: 0 0 1.25rem 1.5rem;
        }
        :global(.prose li) {
          font-size: 1.0625rem;
          line-height: 1.75;
          color: var(--text, #e8e6e1);
          margin-bottom: 0.375rem;
        }
        :global(.prose code) {
          font-size: 0.875em;
          background: var(--surface, #1a1a1c);
          border: 1px solid var(--border, #2a2a2c);
          padding: 0.1em 0.35em;
          border-radius: 4px;
          font-family: "SF Mono", "Fira Code", monospace;
        }
        :global(.prose hr) {
          border: none;
          border-top: 1px solid var(--border, #2a2a2c);
          margin: 2.5rem 0;
        }
        :global(.prose strong) {
          color: var(--text, #e8e6e1);
          font-weight: 600;
        }
        :global(.prose em) {
          color: var(--muted, #8b8685);
        }

        /* ── ACCESS GATE ── */
        .access-gate {
          text-align: center;
          padding: 4rem 2rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
        }
        .access-gate h2 {
          font-size: 1.25rem;
          font-weight: 600;
          color: var(--text, #e8e6e1);
          margin: 0;
        }
        .access-gate p {
          font-size: 0.9375rem;
          color: var(--muted, #8b8685);
          max-width: 400px;
          line-height: 1.65;
          margin: 0;
        }
        .gate-btn-primary {
          background: var(--accent, #c8a96e);
          color: #0f0f10;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          font-size: 0.9375rem;
          font-weight: 600;
          cursor: pointer;
          margin-top: 0.5rem;
        }
        .gate-btn-primary:hover { opacity: 0.88; }
        .gate-btn-ghost {
          background: none;
          border: 1px solid var(--border, #2a2a2c);
          color: var(--muted, #8b8685);
          padding: 0.6rem 1.25rem;
          border-radius: 8px;
          font-size: 0.875rem;
          cursor: pointer;
        }
        .gate-btn-ghost:hover {
          border-color: var(--muted, #8b8685);
          color: var(--text, #e8e6e1);
        }

        /* ── PREV/NEXT NAV ── */
        .reader-nav {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
          padding-top: 2rem;
          border-top: 1px solid var(--border, #2a2a2c);
        }
        .nav-btn {
          background: var(--surface, #1a1a1c);
          border: 1px solid var(--border, #2a2a2c);
          color: var(--text, #e8e6e1);
          padding: 1rem;
          border-radius: 8px;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          transition: border-color 0.12s;
        }
        .nav-btn:hover {
          border-color: var(--accent, #c8a96e);
        }
        .nav-prev { text-align: left; }
        .nav-next { text-align: right; }
        .nav-dir {
          font-size: 0.75rem;
          color: var(--muted, #8b8685);
          font-weight: 500;
        }
        .nav-title {
          font-size: 0.875rem;
          color: var(--text, #e8e6e1);
        }

        /* ── NOT FOUND ── */
        .not-found {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 60vh;
          gap: 1rem;
          font-size: 0.9375rem;
          color: var(--muted, #8b8685);
        }
        .not-found button {
          background: none;
          border: 1px solid var(--border, #2a2a2c);
          color: var(--muted, #8b8685);
          padding: 0.5rem 1rem;
          border-radius: 6px;
          cursor: pointer;
        }
      `}</style>
    </>
  );
}
