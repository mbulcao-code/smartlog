"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const PAIN_LABELS = {
  fomo: "FOMO / Early Entry",
  late: "Hesitation / Late Entry",
  exit: "Early Exit",
  revenge: "Revenge / Overtrading",
  stoploss: "Stop Loss Tampering",
  boredom: "Boredom / Forcing Trades",
};

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateShort(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ── Sessions tab ──────────────────────────────────────────────────────────────

function SessionsTab({ token }) {
  const [conversations, setConversations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => { fetchConversations(); }, []);

  async function fetchConversations() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/conversations", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setConversations(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function downloadJSON() {
    const blob = new Blob([JSON.stringify(conversations, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `smartlog-sessions-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function downloadCSV() {
    const rows = [
      ["session_id", "trader_name", "pain_type", "messages", "updated_at", "has_setup"],
      ...conversations.map((c) => [
        c.session_id,
        c.trader_name || "",
        c.pain_type || "",
        (c.messages || []).length,
        c.updated_at || "",
        c.setup_data ? "yes" : "no",
      ]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `smartlog-sessions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return <p className="text-slate-400 py-12 text-center">Loading sessions…</p>;
  }
  if (error) {
    return <p className="text-red-400 py-12 text-center">Error: {error}</p>;
  }

  return (
    <div className="flex gap-6">
      {/* Session list */}
      <div className="w-80 flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <p className="text-slate-500 text-xs uppercase tracking-wider">
            {conversations.length} session{conversations.length !== 1 ? "s" : ""}
          </p>
          <div className="flex gap-2">
            <button
              onClick={downloadCSV}
              className="text-xs text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500 px-2 py-1 rounded-lg transition-colors"
            >
              ↓ CSV
            </button>
            <button
              onClick={downloadJSON}
              className="text-xs text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500 px-2 py-1 rounded-lg transition-colors"
            >
              ↓ JSON
            </button>
          </div>
        </div>
        {conversations.length === 0 ? (
          <p className="text-slate-600 text-sm">No sessions yet.</p>
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
                  <span className="font-medium text-sm">{c.trader_name || "Unknown"}</span>
                  {c.setup_data && (
                    <span className="text-xs text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full">
                      Complete
                    </span>
                  )}
                </div>
                <p className="text-slate-500 text-xs">
                  {PAIN_LABELS[c.pain_type] || c.pain_type || "—"}
                </p>
                <p className="text-slate-600 text-xs mt-1">
                  {c.messages?.length || 0} messages · {formatDateShort(c.updated_at)}
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
            <div className="mb-6 flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold">{selected.trader_name || "Unknown"}</h2>
                <p className="text-slate-400 text-sm">
                  {PAIN_LABELS[selected.pain_type] || selected.pain_type || "—"} ·{" "}
                  {formatDate(selected.updated_at)}
                </p>
              </div>
              <button
                onClick={() => {
                  const blob = new Blob([JSON.stringify(selected, null, 2)], {
                    type: "application/json",
                  });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `session-${selected.session_id}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="text-xs text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500 px-3 py-1.5 rounded-lg transition-colors"
              >
                ↓ Download this session
              </button>
            </div>

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
  );
}

// ── Journal tab ───────────────────────────────────────────────────────────────

function JournalTab({ token }) {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => { fetchJournal(); }, []);

  async function fetchJournal() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/journal", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setUsers(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function winRate(trades) {
    const decided = trades.filter((t) => t.outcome === "win" || t.outcome === "loss");
    if (decided.length === 0) return null;
    const wins = decided.filter((t) => t.outcome === "win").length;
    return Math.round((wins / decided.length) * 100);
  }

  function outcomeColor(outcome) {
    if (outcome === "win") return "text-green-400";
    if (outcome === "loss") return "text-red-400";
    return "text-slate-500";
  }

  function outcomeLabel(outcome) {
    if (outcome === "win") return "W";
    if (outcome === "loss") return "L";
    if (outcome === "be") return "BE";
    return "—";
  }

  if (loading) {
    return <p className="text-slate-400 py-12 text-center">Loading journal data…</p>;
  }
  if (error) {
    return <p className="text-red-400 py-12 text-center">Error: {error}</p>;
  }
  if (users.length === 0) {
    return <p className="text-slate-600 py-12 text-center">No journal activity yet.</p>;
  }

  return (
    <div className="flex gap-6">
      {/* User list */}
      <div className="w-72 flex-shrink-0">
        <p className="text-slate-500 text-xs uppercase tracking-wider mb-4">
          {users.length} active user{users.length !== 1 ? "s" : ""}
        </p>
        <div className="flex flex-col gap-2">
          {users.map((u) => {
            const wr = winRate(u.trades);
            return (
              <button
                key={u.user_id}
                onClick={() => setSelectedUser(u)}
                className={`text-left p-4 rounded-xl border transition-colors ${
                  selectedUser?.user_id === u.user_id
                    ? "border-blue-500 bg-blue-950/30"
                    : "border-slate-800 hover:border-slate-700 bg-slate-900"
                }`}
              >
                <p className="text-sm font-medium truncate">
                  {u.email || u.user_id.slice(0, 8) + "…"}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-slate-400">
                    {u.trades.length} trade{u.trades.length !== 1 ? "s" : ""}
                  </span>
                  <span className="text-slate-700 text-xs">·</span>
                  <span className="text-xs text-slate-400">
                    {u.setups.length} setup{u.setups.length !== 1 ? "s" : ""}
                  </span>
                  {wr !== null && (
                    <>
                      <span className="text-slate-700 text-xs">·</span>
                      <span className={`text-xs font-medium ${wr >= 50 ? "text-green-400" : "text-red-400"}`}>
                        {wr}% W
                      </span>
                    </>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* User detail */}
      <div className="flex-1 min-w-0">
        {!selectedUser ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-slate-600 text-sm">Select a user to view their journal</p>
          </div>
        ) : (
          <div>
            {/* User header */}
            <div className="mb-6">
              <h2 className="text-lg font-semibold">
                {selectedUser.email || selectedUser.user_id}
              </h2>
              <p className="text-slate-400 text-sm">
                Joined {formatDate(selectedUser.joined_at)} ·{" "}
                {selectedUser.trades.length} trades · {selectedUser.setups.length} setups
                {winRate(selectedUser.trades) !== null && (
                  <> · <span className="text-white">{winRate(selectedUser.trades)}% win rate</span></>
                )}
              </p>
            </div>

            {/* Setups */}
            {selectedUser.setups.length > 0 && (
              <div className="mb-8">
                <p className="text-slate-500 text-xs uppercase tracking-wider mb-3">Setups</p>
                <div className="flex flex-col gap-2">
                  {selectedUser.setups.map((s) => {
                    const setupTrades = selectedUser.trades.filter((t) => t.setup_id === s.id);
                    const wr = winRate(setupTrades);
                    return (
                      <div
                        key={s.id}
                        className="p-4 rounded-xl border border-slate-800 bg-slate-900"
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium">{s.name}</p>
                          <div className="flex items-center gap-3">
                            {setupTrades.length > 0 && (
                              <span className="text-xs text-slate-400">
                                {setupTrades.length} trade{setupTrades.length !== 1 ? "s" : ""}
                                {wr !== null && (
                                  <span className={`ml-1 font-medium ${wr >= 50 ? "text-green-400" : "text-red-400"}`}>
                                    · {wr}% W
                                  </span>
                                )}
                              </span>
                            )}
                            <span className="text-xs text-slate-600">{formatDate(s.created_at)}</span>
                          </div>
                        </div>
                        {s.conditions?.length > 0 && (
                          <p className="text-xs text-slate-500 mt-1">
                            {s.conditions.length} condition{s.conditions.length !== 1 ? "s" : ""}
                            {s.conditions.map((c) => `: ${c.text || ""}`).join(", ").slice(0, 80)}
                            {JSON.stringify(s.conditions).length > 80 ? "…" : ""}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Trades */}
            {selectedUser.trades.length > 0 && (
              <div>
                <p className="text-slate-500 text-xs uppercase tracking-wider mb-3">Trades</p>
                <div className="flex flex-col gap-2">
                  {selectedUser.trades.map((t) => {
                    const setupName = selectedUser.setups.find((s) => s.id === t.setup_id)?.name;
                    const entryType = t.after_trade?.entry_type || t.after_trade?.trade_outcome_type;
                    return (
                      <div
                        key={t.id}
                        className="p-4 rounded-xl border border-slate-800 bg-slate-900"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-sm font-semibold ${outcomeColor(t.outcome)}`}>
                                {outcomeLabel(t.outcome)}
                              </span>
                              {t.direction && (
                                <span className={`text-xs px-1.5 py-0.5 rounded ${
                                  t.direction === "long"
                                    ? "bg-green-900/50 text-green-400"
                                    : "bg-red-900/50 text-red-400"
                                }`}>
                                  {t.direction.toUpperCase()}
                                </span>
                              )}
                              {t.instrument && (
                                <span className="text-xs text-slate-300">{t.instrument}</span>
                              )}
                              {setupName && (
                                <span className="text-xs text-blue-400 bg-blue-900/30 px-2 py-0.5 rounded-full">
                                  {setupName}
                                </span>
                              )}
                              {entryType && (
                                <span className="text-xs text-slate-500">{entryType}</span>
                              )}
                              {t.pnl != null && (
                                <span className={`text-xs font-medium ${t.pnl >= 0 ? "text-green-400" : "text-red-400"}`}>
                                  {t.pnl >= 0 ? "+" : ""}${t.pnl}
                                </span>
                              )}
                            </div>
                            {t.notes && (
                              <p className="text-xs text-slate-500 mt-1 truncate">{t.notes}</p>
                            )}
                          </div>
                          <span className="text-xs text-slate-600 flex-shrink-0">
                            {formatDateShort(t.trade_date || t.logged_at)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main admin page ───────────────────────────────────────────────────────────

export default function AdminPage() {
  const router = useRouter();
  const [token, setToken] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [tab, setTab] = useState("sessions");

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace("/auth");
        return;
      }
      // Quick server-side check — hit the secured conversations endpoint
      const probe = await fetch("/api/admin/conversations", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (probe.status === 403) {
        router.replace("/");
        return;
      }
      setToken(session.access_token);
      setAuthChecked(true);
    })();
  }, []);

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <p className="text-slate-400 text-sm">Checking access…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="px-8 py-5 border-b border-slate-800">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl font-semibold tracking-tight">
              Smart<span className="text-blue-400">Log</span>
            </span>
            <span className="text-slate-600 text-sm">·</span>
            <span className="text-slate-400 text-sm">Admin</span>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 bg-slate-900 rounded-xl p-1 border border-slate-800">
            <button
              onClick={() => setTab("sessions")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === "sessions"
                  ? "bg-slate-700 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Sessions
            </button>
            <button
              onClick={() => setTab("journal")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === "journal"
                  ? "bg-slate-700 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Journal
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-8 py-8">
        {tab === "sessions" && <SessionsTab token={token} />}
        {tab === "journal" && <JournalTab token={token} />}
      </div>
    </div>
  );
}
