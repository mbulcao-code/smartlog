"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { getLang, t } from "@/lib/i18n";

const DONE_MARKER = "[SMARTLOG_DONE]";
const ERROR_MARKER = "[SMARTLOG_ERROR]";

function ConversationInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pain = searchParams.get("pain") || "fomo";

  const [lang] = useState(() => getLang());
  const painLabel = t(lang, "painLabels")[pain] || pain;

  const [traderName, setTraderName] = useState("");
  const [nameSubmitted, setNameSubmitted] = useState(false);
  const [sessionId] = useState(
    () => Date.now().toString(36) + Math.random().toString(36).substr(2, 9)
  );
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);      // dots before first chunk
  const [streamingContent, setStreamingContent] = useState(""); // live text
  const [setupData, setSetupData] = useState(null);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const initialized = useRef(false);

  // Opening message — only after name is submitted
  useEffect(() => {
    if (!nameSubmitted || initialized.current) return;
    initialized.current = true;
    const opening = t(lang, "openingMessage")(painLabel);
    setMessages([{ role: "assistant", content: opening }]);
  }, [nameSubmitted, painLabel, lang]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, streamingContent]);

  useEffect(() => {
    if (!loading && !streamingContent && nameSubmitted) {
      inputRef.current?.focus();
    }
  }, [loading, streamingContent, nameSubmitted]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading || streamingContent) return;

    const newMessages = [...messages, { role: "user", content: text }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    setStreamingContent("");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages,
          sessionId,
          traderName,
          painType: pain,
          lang,
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error("Stream failed");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";
      let firstChunk = true;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        accumulated += chunk;

        // Hide dots on first chunk, streaming bubble takes over
        if (firstChunk) {
          setLoading(false);
          firstChunk = false;
        }

        // Check for done marker
        const doneIdx = accumulated.indexOf(DONE_MARKER);
        if (doneIdx !== -1) {
          // Parse setupData from final marker
          try {
            const afterMarker = accumulated.slice(doneIdx + DONE_MARKER.length);
            const finalData = JSON.parse(afterMarker);
            if (finalData.setupData?.complete) {
              setSetupData(finalData.setupData);
            }
          } catch (e) {
            // parse error — no setup data
          }

          // Finalize message: strip JSON block and marker
          const rawText = accumulated.slice(0, doneIdx);
          const cleanText = rawText
            .replace(/```json\n[\s\S]*?\n```/, "")
            .trim();

          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: cleanText },
          ]);
          setStreamingContent("");
          break;
        }

        // Check for error marker
        if (accumulated.includes(ERROR_MARKER)) {
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: "Something went wrong. Please try again." },
          ]);
          setStreamingContent("");
          break;
        }

        // Live display: hide JSON block if it starts appearing at the end
        const jsonStart = accumulated.indexOf("```json");
        const displayText =
          jsonStart !== -1
            ? accumulated.slice(0, jsonStart).trim()
            : accumulated;

        setStreamingContent(displayText);
      }
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Connection error. Please try again." },
      ]);
      setStreamingContent("");
      setLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  const isResponding = loading || !!streamingContent;

  // Name entry screen
  if (!nameSubmitted) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-md">
          <div className="mb-10 text-center">
            <span className="text-2xl font-semibold tracking-tight">
              Smart<span className="text-blue-400">Log</span>
            </span>
            <p className="text-slate-400 mt-3 text-sm">
              {t(lang, "namePrompt")}
            </p>
          </div>
          <input
            type="text"
            value={traderName}
            onChange={(e) => setTraderName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && traderName.trim()) {
                setNameSubmitted(true);
              }
            }}
            placeholder={t(lang, "namePlaceholder")}
            autoFocus
            className="w-full bg-slate-800 text-white placeholder-slate-500 rounded-2xl px-5 py-4 text-base focus:outline-none focus:ring-1 focus:ring-blue-500 mb-4"
          />
          <button
            onClick={() => {
              if (traderName.trim()) setNameSubmitted(true);
            }}
            disabled={!traderName.trim()}
            className="w-full py-4 rounded-full bg-blue-500 hover:bg-blue-400 disabled:bg-slate-700 disabled:text-slate-500 text-white font-medium transition-colors"
          >
            {t(lang, "nameStart")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      {/* Header */}
      <header className="px-8 py-5 border-b border-slate-800 flex-shrink-0">
        <div className="max-w-2xl mx-auto w-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl font-semibold tracking-tight">
              Smart<span className="text-blue-400">Log</span>
            </span>
            <span className="text-slate-600 text-sm">·</span>
            <span className="text-slate-400 text-sm">{painLabel}</span>
          </div>
          <button
            onClick={() => router.push("/")}
            className="text-slate-500 hover:text-slate-300 text-sm transition-colors"
          >
            {t(lang, "backButton")}
          </button>
        </div>
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-2xl mx-auto flex flex-col gap-4">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] px-5 py-4 rounded-2xl text-sm leading-relaxed whitespace-pre-line ${
                  msg.role === "assistant"
                    ? "bg-slate-800 text-slate-100 rounded-tl-sm"
                    : "bg-blue-600 text-white rounded-tr-sm"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {/* Typing dots — only before first chunk arrives */}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-slate-800 px-5 py-4 rounded-2xl rounded-tl-sm">
                <div className="flex gap-1 items-center h-4">
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0ms]" />
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          )}

          {/* Streaming bubble — live text as it arrives */}
          {streamingContent && (
            <div className="flex justify-start">
              <div className="max-w-[85%] px-5 py-4 rounded-2xl rounded-tl-sm text-sm leading-relaxed whitespace-pre-line bg-slate-800 text-slate-100">
                {streamingContent}
              </div>
            </div>
          )}

          {/* Setup complete card */}
          {setupData && (
            <div className="mt-4 p-5 rounded-2xl border border-blue-500/30 bg-blue-950/20">
              <p className="text-blue-400 text-xs font-medium uppercase tracking-wider mb-3">
                {t(lang, "setupDefinedLabel")}
              </p>
              <p className="text-white font-medium mb-1">{setupData.setup_name}</p>
              <p className="text-slate-400 text-sm mb-4">{setupData.setup_description}</p>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-slate-800 rounded-xl p-3">
                  <p className="text-xs text-slate-500 mb-1">{t(lang, "variantA")}</p>
                  <p className="text-sm text-white font-medium">{setupData.variant_a_name}</p>
                  <p className="text-xs text-slate-400 mt-1">{setupData.variant_a_description}</p>
                </div>
                <div className="bg-slate-800 rounded-xl p-3">
                  <p className="text-xs text-slate-500 mb-1">{t(lang, "variantB")}</p>
                  <p className="text-sm text-white font-medium">{setupData.variant_b_name}</p>
                  <p className="text-xs text-slate-400 mt-1">{setupData.variant_b_description}</p>
                </div>
              </div>
              <button
                onClick={() => router.push(`/log/${sessionId}`)}
                className="w-full py-3 rounded-full bg-blue-500 hover:bg-blue-400 text-white text-sm font-medium transition-colors"
              >
                {t(lang, "startLogging")}
              </button>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </main>

      {/* Input */}
      {!setupData && (
        <div className="flex-shrink-0 border-t border-slate-800 px-6 py-4">
          <div className="max-w-2xl mx-auto flex gap-3 items-end">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t(lang, "inputPlaceholder")}
              rows={1}
              disabled={isResponding}
              className="flex-1 bg-slate-800 text-white placeholder-slate-500 rounded-2xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50 leading-relaxed"
              style={{ minHeight: "44px", maxHeight: "120px" }}
              onInput={(e) => {
                e.target.style.height = "auto";
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
              }}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || isResponding}
              className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-500 hover:bg-blue-400 disabled:bg-slate-700 disabled:text-slate-500 text-white flex items-center justify-center transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 2L8 14M8 2L3 7M8 2L13 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
          <p className="text-center text-slate-600 text-xs mt-2">
            {t(lang, "inputHint")}
          </p>
        </div>
      )}
    </div>
  );
}

export default function ConversationPage() {
  return (
    <Suspense>
      <ConversationInner />
    </Suspense>
  );
}
