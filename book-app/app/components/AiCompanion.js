"use client";

import { useState, useRef, useEffect } from "react";

// ─── MARKDOWN helpers (inline-only; good enough for chat bubbles) ────────────

function InlineMarkdown({ text }) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**"))
          return <strong key={i}>{part.slice(2, -2)}</strong>;
        if (part.startsWith("*") && part.endsWith("*"))
          return <em key={i}>{part.slice(1, -1)}</em>;
        if (part.startsWith("`") && part.endsWith("`"))
          return <code key={i}>{part.slice(1, -1)}</code>;
        return part;
      })}
    </>
  );
}

function BubbleText({ text }) {
  return (
    <div className="bubble-text">
      {text.split("\n").map((line, i) => (
        <p key={i} style={{ margin: "0.25rem 0" }}>
          <InlineMarkdown text={line} />
        </p>
      ))}
    </div>
  );
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

export default function AiCompanion({
  sectionContent,   // full markdown of the current section — used as context
  sectionTitle,     // e.g. "I.2 — Why the Loop is Inevitable"
  slug,             // e.g. "act/1/2"
  user,
  accessLevel,      // "free" | "pro" | null
}) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [conversationId] = useState(() =>
    typeof crypto !== "undefined" ? crypto.randomUUID() : Math.random().toString(36).slice(2)
  );
  const [error, setError] = useState(null);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  // Scroll to bottom when messages update
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when panel opens
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 80);
  }, [open]);

  const systemContext = sectionContent
    ? `The reader is currently on the section titled "${sectionTitle}". Here is the full text of that section for context:\n\n---\n${sectionContent}\n---\n\nAnswer questions that relate to this section — or any other part of the book. Be concrete and specific.`
    : "";

  async function sendMessage(text) {
    if (!text.trim() || streaming) return;
    if (!user) {
      setError("Sign in to use the AI companion.");
      return;
    }
    setError(null);

    const userMsg = { role: "user", content: text.trim() };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setStreaming(true);

    const assistantMsg = { role: "assistant", content: "" };
    setMessages([...next, assistantMsg]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next,
          conversationId,
          entryPoint: slug,
          systemContext,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.error === "access_required") {
          setError("Full AI access requires a subscription.");
        } else if (data.error === "access_required_free_used") {
          setError("Your free conversation has been used. Upgrade for unlimited access.");
        } else {
          setError("Something went wrong. Try again.");
        }
        setMessages(next); // remove empty assistant bubble
        setStreaming(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") break;
          try {
            const parsed = JSON.parse(data);
            const delta = parsed.delta?.text || "";
            if (delta) {
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  role: "assistant",
                  content: updated[updated.length - 1].content + delta,
                };
                return updated;
              });
            }
          } catch {
            // skip malformed chunk
          }
        }
      }
    } catch {
      setError("Connection error. Try again.");
      setMessages(next);
    } finally {
      setStreaming(false);
    }
  }

  function handleKey(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  // ── TOGGLE BUTTON (always visible) ────────────────────────────────────────
  const toggleBtn = (
    <button
      className="companion-toggle"
      onClick={() => setOpen((o) => !o)}
      aria-label={open ? "Close AI companion" : "Open AI companion"}
      title={open ? "Close AI" : "Ask the AI"}
    >
      {open ? (
        <span className="toggle-icon">✕</span>
      ) : (
        <span className="toggle-icon">💬</span>
      )}
      {!open && <span className="toggle-label">Ask AI</span>}
    </button>
  );

  return (
    <>
      {toggleBtn}

      {open && (
        <aside className="companion-panel">
          <div className="companion-header">
            <div className="companion-header-left">
              <span className="companion-name">AI Companion</span>
              {sectionTitle && (
                <span className="companion-context">
                  Knows: <em>{sectionTitle}</em> + full book
                </span>
              )}
            </div>
            <button
              className="companion-close"
              onClick={() => setOpen(false)}
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          <div className="companion-messages">
            {messages.length === 0 && (
              <div className="companion-empty">
                <p>Ask anything about this section, the framework, or your specific pattern.</p>
                <div className="starter-chips">
                  {[
                    "What is the HUG?",
                    "What should I log?",
                    "How does the ESS work?",
                    "Give me an experiment to run",
                  ].map((q) => (
                    <button
                      key={q}
                      className="starter-chip"
                      onClick={() => sendMessage(q)}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                className={`bubble bubble-${msg.role}`}
              >
                <BubbleText text={msg.content} />
                {msg.role === "assistant" && streaming && i === messages.length - 1 && (
                  <span className="typing-cursor">▋</span>
                )}
              </div>
            ))}

            {error && (
              <div className="companion-error">
                {error}{" "}
                {error.includes("subscription") || error.includes("Upgrade") ? (
                  <a href="/subscribe">Upgrade →</a>
                ) : null}
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          <div className="companion-input-row">
            <textarea
              ref={inputRef}
              className="companion-input"
              placeholder="Ask anything…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              rows={1}
              disabled={streaming}
            />
            <button
              className="companion-send"
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || streaming}
              aria-label="Send"
            >
              ↑
            </button>
          </div>
        </aside>
      )}

      <style jsx>{`
        /* ── TOGGLE BUTTON ── */
        .companion-toggle {
          position: fixed;
          bottom: 1.5rem;
          right: 1.5rem;
          display: flex;
          align-items: center;
          gap: 0.4rem;
          background: var(--accent, #c8a96e);
          color: #0f0f10;
          border: none;
          border-radius: 24px;
          padding: 0.6rem 1rem;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 0 4px 16px rgba(0,0,0,0.4);
          z-index: 100;
          transition: opacity 0.15s, transform 0.15s;
        }
        .companion-toggle:hover {
          opacity: 0.9;
          transform: translateY(-1px);
        }
        .toggle-icon {
          font-size: 1rem;
          line-height: 1;
        }
        .toggle-label {
          font-size: 0.8125rem;
        }

        /* ── PANEL ── */
        .companion-panel {
          position: fixed;
          bottom: 0;
          right: 0;
          width: 380px;
          max-width: 100vw;
          height: 100vh;
          max-height: 100vh;
          background: var(--bg, #0f0f10);
          border-left: 1px solid var(--border, #2a2a2c);
          display: flex;
          flex-direction: column;
          z-index: 99;
          box-shadow: -4px 0 24px rgba(0,0,0,0.4);
        }

        /* ── HEADER ── */
        .companion-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          padding: 1rem 1rem 0.75rem;
          border-bottom: 1px solid var(--border, #2a2a2c);
          flex-shrink: 0;
        }
        .companion-header-left {
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
        }
        .companion-name {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text, #e8e6e1);
        }
        .companion-context {
          font-size: 0.75rem;
          color: var(--muted, #8b8685);
        }
        .companion-context em {
          color: var(--accent, #c8a96e);
          font-style: normal;
        }
        .companion-close {
          background: none;
          border: none;
          color: var(--muted, #8b8685);
          cursor: pointer;
          font-size: 1rem;
          padding: 0.25rem;
          line-height: 1;
        }
        .companion-close:hover {
          color: var(--text, #e8e6e1);
        }

        /* ── MESSAGES ── */
        .companion-messages {
          flex: 1;
          overflow-y: auto;
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .companion-empty {
          color: var(--muted, #8b8685);
          font-size: 0.875rem;
          line-height: 1.6;
        }
        .starter-chips {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          margin-top: 1rem;
        }
        .starter-chip {
          background: var(--surface, #1a1a1c);
          border: 1px solid var(--border, #2a2a2c);
          color: var(--muted, #8b8685);
          text-align: left;
          padding: 0.5rem 0.75rem;
          border-radius: 8px;
          font-size: 0.8125rem;
          cursor: pointer;
          transition: border-color 0.12s, color 0.12s;
        }
        .starter-chip:hover {
          border-color: var(--accent, #c8a96e);
          color: var(--text, #e8e6e1);
        }

        /* ── BUBBLES ── */
        .bubble {
          max-width: 100%;
          padding: 0.625rem 0.875rem;
          border-radius: 10px;
          font-size: 0.875rem;
          line-height: 1.65;
        }
        .bubble-user {
          background: rgba(200, 169, 110, 0.1);
          border: 1px solid rgba(200, 169, 110, 0.2);
          color: var(--text, #e8e6e1);
          margin-left: 1.5rem;
        }
        .bubble-assistant {
          background: var(--surface, #1a1a1c);
          border: 1px solid var(--border, #2a2a2c);
          color: var(--text, #e8e6e1);
          margin-right: 1.5rem;
        }
        .bubble-text p:first-child {
          margin-top: 0;
        }
        .bubble-text p:last-child {
          margin-bottom: 0;
        }
        .typing-cursor {
          animation: blink 1s step-end infinite;
          color: var(--accent, #c8a96e);
          margin-left: 2px;
        }
        @keyframes blink {
          50% { opacity: 0; }
        }
        .companion-error {
          font-size: 0.8125rem;
          color: #e57373;
          padding: 0.5rem 0.75rem;
          background: rgba(229, 115, 115, 0.08);
          border: 1px solid rgba(229, 115, 115, 0.2);
          border-radius: 8px;
        }
        .companion-error a {
          color: var(--accent, #c8a96e);
          text-decoration: none;
          margin-left: 0.25rem;
        }

        /* ── INPUT ── */
        .companion-input-row {
          display: flex;
          align-items: flex-end;
          gap: 0.5rem;
          padding: 0.75rem 1rem 1rem;
          border-top: 1px solid var(--border, #2a2a2c);
          flex-shrink: 0;
        }
        .companion-input {
          flex: 1;
          background: var(--surface, #1a1a1c);
          border: 1px solid var(--border, #2a2a2c);
          color: var(--text, #e8e6e1);
          border-radius: 8px;
          padding: 0.625rem 0.75rem;
          font-size: 0.875rem;
          resize: none;
          font-family: inherit;
          line-height: 1.5;
          transition: border-color 0.12s;
          min-height: 2.5rem;
        }
        .companion-input:focus {
          outline: none;
          border-color: var(--accent, #c8a96e);
        }
        .companion-input::placeholder {
          color: var(--muted, #8b8685);
        }
        .companion-send {
          background: var(--accent, #c8a96e);
          color: #0f0f10;
          border: none;
          border-radius: 8px;
          width: 2.25rem;
          height: 2.25rem;
          font-size: 1rem;
          font-weight: 700;
          cursor: pointer;
          flex-shrink: 0;
          transition: opacity 0.12s;
        }
        .companion-send:disabled {
          opacity: 0.35;
          cursor: not-allowed;
        }
        .companion-send:not(:disabled):hover {
          opacity: 0.85;
        }
      `}</style>
    </>
  );
}
