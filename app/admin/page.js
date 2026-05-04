"use client";

import { useState, useEffect } from "react";

const PAIN_LABELS = {
  fomo: "FOMO / Early Entry",
  late: "Hesitation / Late Entry",
  exit: "Early Exit",
  revenge: "Revenge / Overtrading",
  stoploss: "Stop Loss Tampering",
  boredom: "Boredom / Forcing Trades",
};

export default function AdminPage() {
  const [conversations, setConversations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchConversations();
  }, []);

  async function fetchConversations() {
    try {
      const res = await fetch("/api/admin/conversations");
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setConversations(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function formatDate(iso) {
    return new Date(iso).toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <p className="text-slate-400">Loading sessions...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <p className="text-red-400">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="px-8 py-5 border-b border-slate-800">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl font-semibold tracking-tight">
              Smart<span className="text-blue-400">Log</span>
            </span>
            <span className="text-slate-600 text-sm">·</span>
            <span className="text-slate-400 text-sm">Admin — Trader Sessions</span>
          </div>
          <button
            onClick={fetchConversations}
            className="text-slate-400 hover:text-white text-sm transition-colors"
          >
            ↻ Refresh
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-8 py-8 flex gap-6">
        {/* Session list */}
        <div className="w-80 flex-shrink-0">
          <p className="text-slate-500 text-xs uppercase tracking-wider mb-4">
            {conversations.length} session{conversations.length !== 1 ? "s" : ""}
          </p>
          {conversations.length === 0 ? (
            <p className="text-slate-600 text-sm">No sessions yet. Send the link to your traders!</p>
          ) : (
            <div className="flex flex-col gap-2">
              {conversations.map((c) => (
                <button
                  key={c.session_id}
                  onClick={() => setSelected(c)}
                  className={`text-left p-4 rounded-xl border transition-colors ${
                    selected?.session_id === c.session_id
                      ? "border-blue-500 bg-blue-950/30"
                      : "border-slate-800 hover:border-slate-700 bg-slate-900"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm">{c.trader_name}</span>
                    {c.setup_data && (
                      <span className="text-xs text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full">
                        Complete
                      </span>
                    )}
                  </div>
                  <p className="text-slate-500 text-xs">
                    {PAIN_LABELS[c.pain_type] || c.pain_type}
                  </p>
                  <p className="text-slate-600 text-xs mt-1">
                    {c.messages?.length || 0} messages · {formatDate(c.updated_at)}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Conversation view */}
        <div className="flex-1 min-w-0">
          {!selected ? (
            <div className="flex items-center justify-center h-64">
              <p className="text-slate-600 text-sm">Select a session to read</p>
            </div>
          ) : (
            <div>
              <div className="mb-6">
                <h2 className="text-lg font-semibold">{selected.trader_name}</h2>
                <p className="text-slate-400 text-sm">
                  {PAIN_LABELS[selected.pain_type] || selected.pain_type} · {formatDate(selected.updated_at)}
                </p>
              </div>

              {/* Messages */}
              <div className="flex flex-col gap-3 mb-6">
                {(selected.messages || []).map((msg, i) => (
                  <div
                    key={i}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-line ${
                        msg.role === "assistant"
                          ? "bg-slate-800 text-slate-100 rounded-tl-sm"
                          : "bg-blue-600 text-white rounded-tr-sm"
                      }`}
                    >
                      <p className="text-xs opacity-50 mb-1">
                        {msg.role === "assistant" ? "SmartLog" : selected.trader_name}
                      </p>
                      {msg.content}
                    </div>
                  </div>
                ))}
              </div>

              {/* Setup data if complete */}
              {selected.setup_data && (
                <div className="p-5 rounded-2xl border border-green-500/30 bg-green-950/20">
                  <p className="text-green-400 text-xs font-medium uppercase tracking-wider mb-3">
                    Setup Defined
                  </p>
                  <p className="text-white font-medium mb-1">{selected.setup_data.setup_name}</p>
                  <p className="text-slate-400 text-sm mb-3">{selected.setup_data.setup_description}</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-800 rounded-xl p-3">
                      <p className="text-xs text-slate-500 mb-1">Variant A</p>
                      <p className="text-sm text-white font-medium">{selected.setup_data.variant_a_name}</p>
                      <p className="text-xs text-slate-400 mt-1">{selected.setup_data.variant_a_description}</p>
                    </div>
                    <div className="bg-slate-800 rounded-xl p-3">
                      <p className="text-xs text-slate-500 mb-1">Variant B</p>
                      <p className="text-sm text-white font-medium">{selected.setup_data.variant_b_name}</p>
                      <p className="text-xs text-slate-400 mt-1">{selected.setup_data.variant_b_description}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
