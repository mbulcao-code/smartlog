"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import BookSidebar from "@/app/components/BookSidebar";
import { useLang } from "@/lib/use-lang";

// Lightweight markdown renderer — handles bold, italic, bullet lists, paragraphs
function MarkdownText({ content }) {
  if (!content) return null;

  const paragraphs = content.split(/\n\n+/);

  return (
    <div>
      {paragraphs.map((para, pi) => {
        const lines = para.split("\n");
        const isList = lines.every((l) => l.trim().startsWith("- ") || l.trim().startsWith("* ") || l.trim() === "");

        if (isList) {
          return (
            <ul key={pi} style={{ margin: "8px 0", paddingLeft: "20px" }}>
              {lines
                .filter((l) => l.trim().startsWith("- ") || l.trim().startsWith("* "))
                .map((l, li) => (
                  <li key={li} style={{ marginBottom: "4px" }}>
                    <InlineMarkdown text={l.replace(/^[-*]\s+/, "")} />
                  </li>
                ))}
            </ul>
          );
        }

        return (
          <p key={pi} style={{ margin: pi === 0 ? "0 0 10px" : "10px 0", lineHeight: 1.65 }}>
            {lines.map((line, li) => (
              <span key={li}>
                <InlineMarkdown text={line} />
                {li < lines.length - 1 && <br />}
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}

function InlineMarkdown({ text }) {
  // Parse bold (**text**) and italic (*text*)
  const parts = [];
  const re = /(\*\*(.+?)\*\*|\*(.+?)\*)/g;
  let last = 0;
  let match;
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    if (match[0].startsWith("**")) {
      parts.push(<strong key={match.index}>{match[2]}</strong>);
    } else {
      parts.push(<em key={match.index}>{match[3]}</em>);
    }
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}

const ENTRY_LABELS = {
  fomo: "FOMO",
  hesitation: "Hesitation",
  early_exit: "Early exit",
  revenge: "Revenge trading",
  stop_tampering: "Stop tampering",
  overtrading: "Overtrading",
  greed: "Greed",
  loss_aversion: "Loss aversion",
  confirmation_bias: "Confirmation bias",
  hindsight_bias: "Hindsight bias",
  anchoring: "Anchoring / recency bias",
  herd: "Herd mentality",
  redemption: "Redemption trap",
  overconfidence: "Overconfidence",
  limiting_beliefs: "Limiting beliefs",
  f1: "Emotions as Goal Protectors",
  f2: "All Habits Are Successful",
  f3: "The Mental Congress",
  f4: "The Pirates' Dilemma",
  f5: "Keys to Sustainable Discipline",
  f6: "The Mind as a Problem-Solver",
  f7: "The Probabilistic Trader",
  browse: "Browse",
};

function getOpeningMessage(entryId, type) {
  if (type === "browse" || entryId === "browse") {
    return "The book covers two layers — the psychological foundations (why the mind does what it does) and the specific patterns (FOMO, revenge trading, hesitation, and others). Which feels more relevant to where you are right now?";
  }
  if (type === "pain") {
    const label = ENTRY_LABELS[entryId] || entryId;
    return `Tell me more about when ${label.toLowerCase()} hits hardest — is it in a specific type of setup, or does it show up across the board?`;
  }
  if (type === "concept") {
    const conceptOpeners = {
      f1: "Emotions as goal protectors — that's the foundation everything else is built on. The standard take is that emotions are the problem. What's actually happening is different. Ready to start there?",
      f2: "Every habit — including the ones destroying your P&L — is successful. It's solving a problem. Just not the right one. Want to see how that works?",
      f3: "The Mental Congress model changes how you relate to your own mind. Instead of one voice you can't control, you have a parliament — and the Strategist can learn to chair it. Want to start there?",
      f4: "The Pirates' Dilemma: you can't eliminate the Speculator or the Protector. But you can negotiate with them in advance. That's the whole game. Ready?",
      f5: "Discipline isn't willpower. It's the outcome of reduced inner conflict. When your rules account for your emotional voices, you stop fighting yourself. Want to see how that works?",
      f6: "The mind doesn't need certainty. It needs a complete problem to solve. When your plan is vague — even slightly — the mind treats it as an unsolved equation and runs. Want to go there?",
      f7: "Confidence is a statistic, not a feeling. That's the whole reframe. And it changes what you actually need to build it. Want to start there?",
    };
    return conceptOpeners[entryId] || "Where do you want to start?";
  }
  return "The whole method sits on one idea: your emotions aren't the problem — your uncertainty is. Want to start with a specific pattern you're dealing with, or with how the foundations work?";
}

function generateConversationId() {
  return crypto.randomUUID();
}

function ChatContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const entryId = searchParams.get("entry");
  const type = searchParams.get("type");

  const supabase = createClient();
  const [user, setUser] = useState(null);
  const [access, setAccess] = useState(null); // null | "free" | "pro" | "locked"
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId] = useState(() => generateConversationId());
  const [conversationStarted, setConversationStarted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [lang, setLang] = useLang();
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  // Auth check + guard: must arrive with an entry point
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        const dest = entryId ? `/chat?entry=${entryId}&type=${type}` : "/";
        router.push(`/auth?redirectTo=${encodeURIComponent(dest)}`);
        return;
      }
      // No entry point selected → send back to homepage to pick one
      if (!entryId) {
        router.push("/");
        return;
      }
      setUser(user);
    });
  }, []);

  // Access check
  useEffect(() => {
    if (!user) return;
    fetch("/api/check-access")
      .then((r) => r.json())
      .then((data) => {
        setAccess(data.access);
        if (data.access === "locked") {
          // Will show upgrade wall
        }
      });
  }, [user]);

  // Load opening message from AI
  useEffect(() => {
    if (!user || !access || access === "locked" || conversationStarted) return;
    setConversationStarted(true);

    const opener = getOpeningMessage(entryId, type);
    setMessages([{ role: "assistant", content: opener }]);

    // Register the conversation in DB on first load
    const langCtx = lang === "pt"
      ? " Respond in Brazilian Portuguese."
      : "";
    fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [
          {
            role: "user",
            content: `[Entry point: ${entryId || "general"}, type: ${type || "browse"}]${langCtx}`,
          },
        ],
        conversationId,
        entryPoint: entryId,
        entryType: type,
      }),
    })
      .then((r) => r.body.getReader())
      .then(async (reader) => {
        const decoder = new TextDecoder();
        let aiText = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          const lines = chunk.split("\n").filter(Boolean);
          for (const line of lines) {
            try {
              const parsed = JSON.parse(line);
              if (parsed.text) aiText += parsed.text;
              if (parsed.done) break;
            } catch {}
          }
        }
        if (aiText) {
          setMessages([{ role: "assistant", content: aiText }]);
        }
      })
      .catch(() => {
        // If error, keep the static opener
      });
  }, [user, access]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function sendMessage(e) {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = { role: "user", content: input.trim() };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);

    // Prepend entry context + language instruction so Claude knows the topic and language
    const langInstruction = lang === "pt"
      ? "Respond entirely in Brazilian Portuguese throughout this conversation. Maintain the same tone and method — direct, warm, precise — just in Portuguese."
      : "";
    const contextContent = [
      entryId
        ? `[Session context: The trader selected "${ENTRY_LABELS[entryId] || entryId}" (type: ${type || "browse"}) as their entry point. Stay within this thread unless they explicitly redirect.]`
        : null,
      langInstruction || null,
    ]
      .filter(Boolean)
      .join(" ");

    const contextPrefix = contextContent
      ? [
          { role: "user", content: contextContent },
          { role: "assistant", content: "Understood." },
        ]
      : [];

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...contextPrefix, ...updatedMessages],
          conversationId,
        }),
      });

      if (res.status === 403) {
        setAccess("locked");
        setLoading(false);
        return;
      }

      if (!res.ok) {
        throw new Error("API error");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let aiText = "";

      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split("\n").filter(Boolean);
        for (const line of lines) {
          try {
            const parsed = JSON.parse(line);
            if (parsed.text) {
              aiText += parsed.text;
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  role: "assistant",
                  content: aiText,
                };
                return updated;
              });
            }
          } catch {}
        }
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Something went wrong. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  if (!user || access === null) {
    return (
      <div style={styles.loading}>
        <div style={styles.dot} />
      </div>
    );
  }

  if (access === "locked") {
    return (
      <div style={styles.wall}>
        <div style={styles.wallInner}>
          <h2 style={styles.wallTitle}>That&apos;s your free conversation.</h2>
          <p style={styles.wallText}>
            One conversation is enough to see how this works. To keep going —
            into the mechanisms, the case studies, the full architecture — you
            need a plan.
          </p>
          <button
            onClick={() => router.push("/subscribe")}
            style={styles.upgradeBtn}
          >
            See plans →
          </button>
          <button
            onClick={() => router.push("/")}
            style={styles.wallSecondary}
          >
            Back to home
          </button>
        </div>
      </div>
    );
  }

  const entryLabel = ENTRY_LABELS[entryId] || (type === "browse" ? "Browsing" : "General");

  return (
    <div style={styles.layout}>
      <BookSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        lang={lang}
        setLang={setLang}
      />
      <header style={styles.chatHeader}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", width: 80 }}>
          <button onClick={() => setSidebarOpen(true)} style={styles.menuBtn} title="Menu">
            ☰
          </button>
          <button onClick={() => router.push("/")} style={styles.backBtn}>
            ←
          </button>
        </div>
        <span style={styles.topicLabel}>{entryLabel}</span>
        <div style={{ width: 80 }} />
      </header>

      <div style={styles.messages}>
        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              ...styles.message,
              ...(msg.role === "user" ? styles.userMessage : styles.aiMessage),
            }}
          >
            <div
              style={{
                ...styles.bubble,
                ...(msg.role === "user"
                  ? styles.userBubble
                  : styles.aiBubble),
              }}
            >
              {msg.content ? (
                msg.role === "assistant" ? (
                  <MarkdownText content={msg.content} />
                ) : (
                  msg.content
                )
              ) : (
                <span style={styles.typing}>
                  <span />
                  <span />
                  <span />
                </span>
              )}
            </div>
          </div>
        ))}
        {loading && messages[messages.length - 1]?.role === "user" && (
          <div style={{ ...styles.message, ...styles.aiMessage }}>
            <div style={{ ...styles.bubble, ...styles.aiBubble }}>
              <span style={styles.typing}>
                <span />
                <span />
                <span />
              </span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={sendMessage} style={styles.inputArea}>
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Your response..."
          style={styles.input}
          disabled={loading}
          autoFocus
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          style={{
            ...styles.sendBtn,
            ...(loading || !input.trim() ? styles.sendBtnDisabled : {}),
          }}
        >
          Send
        </button>
      </form>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense>
      <ChatContent />
    </Suspense>
  );
}

const styles = {
  loading: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: "100vh",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: "var(--accent)",
    animation: "pulse 1s infinite",
  },
  layout: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    maxWidth: "720px",
    margin: "0 auto",
  },
  chatHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 24px",
    borderBottom: "1px solid var(--border)",
    flexShrink: 0,
  },
  menuBtn: {
    background: "none",
    border: "none",
    color: "var(--muted)",
    fontSize: "18px",
    cursor: "pointer",
    padding: "0 2px",
    lineHeight: 1,
  },
  backBtn: {
    background: "none",
    border: "none",
    color: "var(--muted)",
    fontSize: "14px",
    cursor: "pointer",
    padding: 0,
  },
  topicLabel: {
    fontSize: "14px",
    color: "var(--text)",
    fontWeight: 500,
  },
  messages: {
    flex: 1,
    overflowY: "auto",
    padding: "24px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  message: {
    display: "flex",
  },
  aiMessage: {
    justifyContent: "flex-start",
  },
  userMessage: {
    justifyContent: "flex-end",
  },
  bubble: {
    maxWidth: "85%",
    padding: "14px 18px",
    borderRadius: "16px",
    fontSize: "15px",
    lineHeight: 1.6,
  },
  aiBubble: {
    background: "var(--surface)",
    color: "var(--text)",
    borderBottomLeftRadius: "4px",
  },
  userBubble: {
    background: "var(--accent)",
    color: "#000",
    borderBottomRightRadius: "4px",
  },
  typing: {
    display: "inline-flex",
    gap: "4px",
    alignItems: "center",
  },
  inputArea: {
    display: "flex",
    gap: "8px",
    padding: "16px 24px",
    borderTop: "1px solid var(--border)",
    flexShrink: 0,
  },
  input: {
    flex: 1,
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: "10px",
    padding: "12px 16px",
    color: "var(--text)",
    fontSize: "15px",
    outline: "none",
  },
  sendBtn: {
    background: "var(--accent)",
    color: "#000",
    border: "none",
    borderRadius: "10px",
    padding: "12px 20px",
    fontWeight: 600,
    fontSize: "14px",
    cursor: "pointer",
    transition: "opacity 0.15s",
  },
  sendBtnDisabled: {
    opacity: 0.4,
    cursor: "not-allowed",
  },
  // Upgrade wall
  wall: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: "100vh",
    padding: "24px",
  },
  wallInner: {
    maxWidth: "440px",
    textAlign: "center",
  },
  wallTitle: {
    fontSize: "24px",
    fontWeight: 700,
    marginBottom: "16px",
  },
  wallText: {
    color: "var(--muted)",
    lineHeight: 1.6,
    marginBottom: "32px",
  },
  upgradeBtn: {
    background: "var(--accent)",
    color: "#000",
    border: "none",
    borderRadius: "10px",
    padding: "14px 32px",
    fontWeight: 700,
    fontSize: "16px",
    cursor: "pointer",
    display: "block",
    width: "100%",
    marginBottom: "12px",
  },
  wallSecondary: {
    background: "none",
    border: "none",
    color: "var(--muted)",
    fontSize: "14px",
    cursor: "pointer",
  },
};
