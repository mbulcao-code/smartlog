"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getLang, setLang } from "@/lib/i18n";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { PAINS, getNextQuestion, ENTRY_TYPE_LABELS } from "@/lib/journal-helpers";

// ── Stats computation ─────────────────────────────────────────────────────────

function computeStats(entries) {
  const byPain = {};
  entries.forEach((e) => {
    const key = e.pain_type || "clean";
    if (!byPain[key]) byPain[key] = [];
    byPain[key].push(e);
  });

  const insights = [];

  // FOMO
  const fomo = byPain.fomo || [];
  if (fomo.length >= 5) {
    const early = fomo.filter((e) => e.behavior?.entry_type === "early");
    const levelHit = early.filter((e) => e.behavior?.level_reached === true);
    const waited = fomo.filter((e) => e.behavior?.entry_type === "waited");
    if (early.length >= 3) {
      const pct = Math.round((levelHit.length / early.length) * 100);
      insights.push({
        pain: "fomo",
        en: `${early.length} early entries — level was hit anyway ${levelHit.length}x (${pct}%).${waited.length > 0 ? ` You waited ${waited.length}x.` : ""}`,
        pt: `${early.length} entradas antecipadas — nível atingido assim mesmo ${levelHit.length}x (${pct}%).${waited.length > 0 ? ` Você esperou ${waited.length}x.` : ""}`,
      });
    }
  }

  // Stop tampering
  const stops = byPain.stoploss || [];
  if (stops.length >= 3) {
    const tampered = stops.filter((e) => e.behavior?.tampered === true);
    const reversals = tampered.filter((e) => e.behavior?.tamper_outcome === "reversal");
    const protections = tampered.filter((e) => e.behavior?.tamper_outcome === "protection");
    if (tampered.length >= 2) {
      insights.push({
        pain: "stoploss",
        en: `${tampered.length} stops moved — ${reversals.length} led to reversals, ${protections.length} protected profit.`,
        pt: `${tampered.length} stops mexidos — ${reversals.length} levaram a reversão, ${protections.length} protegeram lucro.`,
      });
    }
  }

  // Revenge
  const revenge = byPain.revenge || [];
  if (revenge.length >= 4) {
    const best = revenge.filter((e) => e.behavior?.used_best_setup === true);
    const other = revenge.filter((e) => e.behavior?.used_best_setup === false);
    if (best.length >= 2 && other.length >= 2) {
      const bestWR = Math.round((best.filter((e) => e.outcome === "win").length / best.length) * 100);
      const otherWR = Math.round((other.filter((e) => e.outcome === "win").length / other.length) * 100);
      insights.push({
        pain: "revenge",
        en: `Best setup: ${bestWR}% win rate (${best.length} trades). Random: ${otherWR}% win rate (${other.length} trades).`,
        pt: `Melhor setup: ${bestWR}% de acerto (${best.length} op.). Aleatório: ${otherWR}% (${other.length} op.).`,
      });
    }
  }

  // Early exit
  const exits = byPain.exit || [];
  if (exits.length >= 4) {
    const hitAfter = exits.filter((e) => e.behavior?.target_hit_after === true);
    const pct = Math.round((hitAfter.length / exits.length) * 100);
    insights.push({
      pain: "exit",
      en: `${exits.length} early exits — target was hit after you left ${hitAfter.length}x (${pct}%).`,
      pt: `${exits.length} saídas prematuras — alvo atingido depois ${hitAfter.length}x (${pct}%).`,
    });
  }

  return { byPain, insights };
}

// ── Behavior summary (one-liner for trade list row) ───────────────────────────

function getBehaviorSummary(painType, behavior, lang) {
  const pt = lang === "pt";
  if (!behavior) return null;
  switch (painType) {
    case "fomo":
      if (behavior.entry_type === "early") {
        if (behavior.level_reached === true)  return pt ? "Antecipado · nível atingido"     : "Early · level hit";
        if (behavior.level_reached === false) return pt ? "Antecipado · nível não atingido" : "Early · level not hit";
        return pt ? "Entrada antecipada" : "Early entry";
      }
      if (behavior.entry_type === "waited") return pt ? "Esperou o nível" : "Waited for level";
      return null;
    case "stoploss":
      if (behavior.tampered === false)                      return pt ? "Stop mantido"       : "Stop kept";
      if (behavior.tamper_outcome === "reversal")           return pt ? "Reversão dolorosa"  : "Painful reversal";
      if (behavior.tamper_outcome === "protection")         return pt ? "Lucro protegido"    : "Profit protected";
      if (behavior.tampered === true)                       return pt ? "Stop mexido"        : "Stop moved";
      return null;
    case "revenge":
      if (behavior.used_best_setup === true)  return pt ? "Melhor setup"   : "Best setup";
      if (behavior.used_best_setup === false) return pt ? "Setup aleatório" : "Random setup";
      return null;
    case "exit":
      if (behavior.target_hit_after === true)  return pt ? "Alvo atingido depois" : "Target hit after";
      if (behavior.target_hit_after === false) return pt ? "Alvo não atingido"    : "Target not hit";
      return null;
    case "late":
      if (behavior.outcome_type === "missed")      return pt ? "Movimento perdido"  : "Missed move";
      if (behavior.outcome_type === "caught_late") return pt ? "Entrada tardia"     : "Late entry";
      return null;
    case "boredom":
      if (behavior.had_plan === false) return pt ? "Sem plano"   : "No plan";
      if (behavior.had_plan === true)  return pt ? "Tinha plano" : "Had a plan";
      return null;
    default:
      return null;
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function JournalPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="flex gap-1">
          <span className="w-1.5 h-1.5 bg-slate-600 rounded-full animate-bounce [animation-delay:0ms]" />
          <span className="w-1.5 h-1.5 bg-slate-600 rounded-full animate-bounce [animation-delay:150ms]" />
          <span className="w-1.5 h-1.5 bg-slate-600 rounded-full animate-bounce [animation-delay:300ms]" />
        </div>
      </div>
    }>
      <JournalContent />
    </Suspense>
  );
}

function JournalContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [lang, setLangState] = useState(() => getLang());
  const [authReady, setAuthReady] = useState(false);
  const [token, setToken] = useState(null);
  const [entries, setEntries] = useState([]);
  const [setups, setSetups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [setupCreated, setSetupCreated] = useState(false);
  const [setupDeleted, setSetupDeleted] = useState(false);
  const [tradeLogged, setTradeLogged] = useState(false);
  const [deletingSetupId, setDeletingSetupId] = useState(null);
  const [confirmDeleteSetupId, setConfirmDeleteSetupId] = useState(null);
  const [confirmDeleteTradeId, setConfirmDeleteTradeId] = useState(null);
  const [deletingTradeId, setDeletingTradeId] = useState(null);

  const pt = lang === "pt";

  function toggleLang() {
    const next = lang === "en" ? "pt" : "en";
    setLang(next);
    setLangState(next);
  }

  // ── Auth + data load ──────────────────────────────────────────────────────

  useEffect(() => {
    if (searchParams.get("setup") === "created") {
      setSetupCreated(true);
      setTimeout(() => setSetupCreated(false), 4000);
    }
    if (searchParams.get("setup") === "deleted") {
      setSetupDeleted(true);
      setTimeout(() => setSetupDeleted(false), 4000);
    }
    if (searchParams.get("trade") === "logged" || searchParams.get("logged") === "1") {
      setTradeLogged(true);
      setTimeout(() => setTradeLogged(false), 4000);
    }
  }, [searchParams]);

  useEffect(() => {
    async function checkAuth() {
      const { data: { session } } = await supabaseBrowser.auth.getSession();
      if (!session) {
        localStorage.setItem("smartlog_auth_next", "/journal");
        router.push("/auth");
        return;
      }
      setToken(session.access_token);
      setAuthReady(true);
      await Promise.all([
        loadEntries(session.access_token),
        loadSetups(session.access_token),
      ]);
    }
    checkAuth();
  }, []);

  async function loadEntries(tok) {
    try {
      const res = await fetch("/api/journal", {
        headers: { Authorization: `Bearer ${tok || token}` },
      });
      const data = await res.json();
      setEntries(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Journal load error:", e);
    } finally {
      setLoading(false);
    }
  }

  async function loadSetups(tok) {
    try {
      const res = await fetch("/api/journal/setups", {
        headers: { Authorization: `Bearer ${tok || token}` },
      });
      const data = await res.json();
      setSetups(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Setups load error:", e);
    }
  }

  // ── Setup delete ──────────────────────────────────────────────────────────

  async function handleDeleteSetup(setupId) {
    if (deletingSetupId) return;
    setDeletingSetupId(setupId);
    try {
      const res = await fetch(`/api/journal/setups/${setupId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSetups((prev) => prev.filter((s) => s.id !== setupId));
      setSetupDeleted(true);
      setTimeout(() => setSetupDeleted(false), 4000);
    } catch (e) {
      alert(pt ? "Erro ao excluir setup." : "Failed to delete setup.");
    } finally {
      setDeletingSetupId(null);
      setConfirmDeleteSetupId(null);
    }
  }

  // ── Trade delete ─────────────────────────────────────────────────────────

  async function handleDeleteTrade(tradeId) {
    if (deletingTradeId) return;
    setDeletingTradeId(tradeId);
    try {
      const res = await fetch(`/api/journal/${tradeId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setEntries((prev) => prev.filter((e) => e.id !== tradeId));
    } catch (e) {
      alert(pt ? "Erro ao excluir operação." : "Failed to delete trade.");
    } finally {
      setDeletingTradeId(null);
      setConfirmDeleteTradeId(null);
    }
  }

  // ── Computed ──────────────────────────────────────────────────────────────

  const stats = computeStats(entries);

  // ── Loading state ─────────────────────────────────────────────────────────

  if (!authReady || loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="flex gap-1">
          <span className="w-1.5 h-1.5 bg-slate-600 rounded-full animate-bounce [animation-delay:0ms]" />
          <span className="w-1.5 h-1.5 bg-slate-600 rounded-full animate-bounce [animation-delay:150ms]" />
          <span className="w-1.5 h-1.5 bg-slate-600 rounded-full animate-bounce [animation-delay:300ms]" />
        </div>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-950 text-white">

      {/* Header */}
      <header className="px-8 py-5 border-b border-slate-800">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/")}
              className="text-xl font-semibold tracking-tight hover:opacity-80 transition-opacity"
            >
              Smart<span className="text-blue-400">Log</span>
            </button>
            <span className="text-slate-600 text-sm">·</span>
            <span className="text-slate-400 text-sm">{pt ? "Diário" : "Journal"}</span>
          </div>
          <button
            onClick={toggleLang}
            className="text-xs px-2.5 py-1 rounded-full border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 transition-colors"
          >
            {pt ? "EN" : "PT"}
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8">

        {/* Setup created banner */}
        {setupCreated && (
          <div className="mb-6 px-4 py-3 rounded-xl border border-green-500/30 bg-green-950/20 text-green-400 text-sm flex items-center gap-2">
            <span>✓</span>
            <span>{pt ? "Setup criado com sucesso!" : "Setup created successfully!"}</span>
          </div>
        )}

        {/* Setup deleted banner */}
        {setupDeleted && (
          <div className="mb-6 px-4 py-3 rounded-xl border border-slate-600/30 bg-slate-800/50 text-slate-400 text-sm flex items-center gap-2">
            <span>✓</span>
            <span>{pt ? "Setup excluído." : "Setup deleted."}</span>
          </div>
        )}

        {/* Trade logged banner */}
        {tradeLogged && (
          <div className="mb-6 px-4 py-3 rounded-xl border border-blue-500/30 bg-blue-950/20 text-blue-300 text-sm flex items-center gap-2">
            <span>✓</span>
            <span>{pt ? "Operação registrada!" : "Trade logged!"}</span>
          </div>
        )}

        {/* Your setups section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-slate-500 uppercase tracking-wider">
              {pt ? "Seus setups" : "Your setups"}
            </p>
            <button
              onClick={() => router.push("/journal/setups/new")}
              className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
            >
              + {pt ? "Novo setup" : "New setup"}
            </button>
          </div>

          {setups.length === 0 ? (
            <button
              onClick={() => router.push("/journal/setups/new")}
              className="w-full py-4 rounded-xl border border-dashed border-slate-700 hover:border-slate-500 text-slate-500 hover:text-slate-300 text-sm transition-colors"
            >
              {pt ? "Defina seu primeiro setup →" : "Define your first setup →"}
            </button>
          ) : (
            <div className="flex flex-col gap-2">
              {setups.map((setup) => (
                <div key={setup.id}>
                  {/* Confirm delete inline */}
                  {confirmDeleteSetupId === setup.id ? (
                    <div className="flex items-center justify-between px-4 py-3 rounded-xl border border-red-800/50 bg-red-950/20">
                      <p className="text-xs text-red-300">
                        {pt ? "Excluir setup?" : "Delete setup?"}
                      </p>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setConfirmDeleteSetupId(null)}
                          className="text-xs text-slate-500 hover:text-white transition-colors"
                        >
                          {pt ? "Cancelar" : "Cancel"}
                        </button>
                        <button
                          onClick={() => handleDeleteSetup(setup.id)}
                          disabled={deletingSetupId === setup.id}
                          className="text-xs text-red-400 hover:text-red-300 font-medium disabled:opacity-50 transition-colors"
                        >
                          {deletingSetupId === setup.id ? "..." : (pt ? "Excluir" : "Delete")}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => router.push(`/journal/setups/${setup.id}`)}
                      className="flex items-center justify-between px-4 py-3 rounded-xl border border-slate-800 bg-slate-900 cursor-pointer hover:border-slate-700 hover:bg-slate-800/60 transition-colors"
                    >
                      <div>
                        <p className="text-sm text-slate-200 font-medium">{setup.name}</p>
                        {setup.conditions?.length > 0 && (
                          <p className="text-xs text-slate-500 mt-0.5">
                            {setup.conditions.length} {pt ? "condições" : "conditions"}
                            {setup.stop_config?.initial || setup.stop_strategy
                              ? ` · ${pt ? "saídas definidas" : "exits defined"}`
                              : ""}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={(e) => { e.stopPropagation(); router.push(`/journal/setups/${setup.id}`); }}
                          className="text-xs text-slate-500 hover:text-blue-400 transition-colors"
                        >
                          {pt ? "Editar" : "Edit"}
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setConfirmDeleteSetupId(setup.id); }}
                          className="text-slate-700 hover:text-red-400 text-xs px-1 transition-colors"
                          title={pt ? "Excluir" : "Delete"}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              <button
                onClick={() => router.push("/journal/setups/new")}
                className="mt-1 text-xs text-slate-500 hover:text-slate-300 transition-colors text-left px-1"
              >
                + {pt ? "Adicionar outro setup" : "Add another setup"}
              </button>
            </div>
          )}
        </div>

        {/* Log button */}
        <button
          onClick={() => router.push("/journal/log/new")}
          className="w-full py-4 rounded-full bg-blue-500 hover:bg-blue-400 text-white font-medium transition-colors mb-8"
        >
          {pt ? "+ Registrar operação" : "+ Log a trade"}
        </button>

        {/* ── Behavioral insights ── */}
        {stats.insights.length > 0 && (
          <div className="mb-8">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">
              {pt ? "Padrões comportamentais" : "Behavioral patterns"}
            </p>
            <div className="flex flex-col gap-3">
              {stats.insights.map((insight, i) => (
                <div key={i} className="p-4 rounded-xl border border-slate-700 bg-slate-900">
                  <p className="text-xs text-blue-400 mb-1 uppercase tracking-wider">
                    {PAINS.find((p) => p.id === insight.pain)?.[pt ? "pt" : "en"]}
                  </p>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    {pt ? insight.pt : insight.en}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Summary counts ── */}
        {entries.length > 0 && (
          <div className="mb-6 flex items-center gap-3 flex-wrap">
            <span className="text-sm text-slate-400">
              {entries.length} {pt ? "operações" : "trades"}
            </span>
            {Object.entries(stats.byPain)
              .filter(([painId]) => painId !== "clean")
              .sort((a, b) => b[1].length - a[1].length)
              .slice(0, 4)
              .map(([painId, painEntries]) => (
                <span
                  key={painId}
                  className="text-xs px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-400"
                >
                  {PAINS.find((p) => p.id === painId)?.[pt ? "pt" : "en"] || painId}
                  {" · "}
                  {painEntries.length}
                </span>
              ))}
          </div>
        )}

        {/* ── Trade list ── */}
        {entries.length > 0 ? (
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">
              {pt ? "Operações recentes" : "Recent trades"}
            </p>
            <div className="flex flex-col gap-2">
              {entries.slice(0, 50).map((entry) => {
                // Resolve setup name
                const setupName = entry.setup_id
                  ? setups.find((s) => s.id === entry.setup_id)?.name
                  : null;

                // Resolve secondary label for row 2
                // v2 trades: show entry type; legacy trades: show non-clean pain labels (or nothing)
                let painLabels = [];
                const entryType = entry.after_trade?.entry_type;
                if (entryType) {
                  // v2 trade — show entry type label
                  const etLabel = ENTRY_TYPE_LABELS[entryType];
                  if (etLabel) {
                    const label = pt ? etLabel.pt : etLabel.en;
                    const isIssue = entryType !== "full_setup";
                    painLabels = [{ label, clean: !isIssue }];
                  }
                } else if (Array.isArray(entry.pain_types) && entry.pain_types.length > 0) {
                  // legacy v1 multi-pain
                  const nonClean = entry.pain_types.filter((p) => p !== "clean");
                  painLabels = nonClean.map((pid) => {
                    const p = PAINS.find((x) => x.id === pid);
                    return { label: p ? (pt ? p.pt : p.en) : pid, clean: false };
                  });
                } else if (entry.pain_type && entry.pain_type !== "clean") {
                  // legacy single pain
                  const p = PAINS.find((x) => x.id === entry.pain_type);
                  painLabels = [{ label: p ? (pt ? p.pt : p.en) : entry.pain_type, clean: false }];
                }
                // else: no label shown (clean trades show nothing)

                return (
                  <div key={entry.id}>
                    {confirmDeleteTradeId === entry.id ? (
                      <div className="flex items-center justify-between px-4 py-3 rounded-xl border border-red-800/50 bg-red-950/20">
                        <p className="text-xs text-red-300">
                          {pt ? "Excluir operação?" : "Delete trade?"}
                        </p>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => setConfirmDeleteTradeId(null)}
                            className="text-xs text-slate-500 hover:text-white transition-colors"
                          >
                            {pt ? "Cancelar" : "Cancel"}
                          </button>
                          <button
                            onClick={() => handleDeleteTrade(entry.id)}
                            disabled={deletingTradeId === entry.id}
                            className="text-xs text-red-400 hover:text-red-300 font-medium disabled:opacity-50 transition-colors"
                          >
                            {deletingTradeId === entry.id ? "..." : (pt ? "Excluir" : "Delete")}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        onClick={() => router.push(`/journal/log/${entry.id}`)}
                        className="px-4 py-3 rounded-xl bg-slate-900 border border-slate-800 cursor-pointer hover:border-slate-700 hover:bg-slate-800/60 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-3">
                          {/* Left: setup name + secondary info */}
                          <div className="flex flex-col gap-0.5 min-w-0">
                            {/* Row 1: direction arrow + setup name + instrument */}
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {entry.direction && (
                                <span className={`text-xs font-bold flex-shrink-0 ${
                                  entry.direction === "long" ? "text-green-400" : "text-red-400"
                                }`}>
                                  {entry.direction === "long" ? "↑" : "↓"}
                                </span>
                              )}
                              <span className={`text-sm font-medium flex-shrink-0 ${
                                setupName ? "text-slate-100" : "text-slate-500 italic"
                              }`}>
                                {setupName || (pt ? "Sem setup" : "No setup")}
                              </span>
                              {entry.instrument && (
                                <>
                                  <span className="text-slate-700 text-xs flex-shrink-0">·</span>
                                  <span className="text-xs text-slate-400 flex-shrink-0">{entry.instrument}</span>
                                </>
                              )}
                            </div>
                            {/* Row 2: entry type / pain labels */}
                            {painLabels.length > 0 && (
                              <div className="flex items-center gap-1">
                                {painLabels.map((pl, i) => (
                                  <span key={i} className={`text-xs ${pl.clean ? "text-slate-600" : "text-slate-500"}`}>
                                    {pl.label}
                                    {i < painLabels.length - 1 && (
                                      <span className="text-slate-700 ml-1">·</span>
                                    )}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Right: outcome + date + delete */}
                          <div className="flex items-center gap-3 flex-shrink-0">
                            <div className="flex flex-col items-end gap-0.5">
                              <span className={`text-sm font-medium ${
                                entry.outcome === "win"
                                  ? "text-green-400"
                                  : entry.outcome === "loss"
                                  ? "text-red-400"
                                  : "text-slate-500"
                              }`}>
                                {entry.outcome === "win"
                                  ? (pt ? "Ganhou" : "Win")
                                  : entry.outcome === "loss"
                                  ? (pt ? "Perdeu" : "Loss")
                                  : "BE"}
                              </span>
                              <span className="text-slate-600 text-xs">
                                {new Date(entry.trade_date || entry.logged_at).toLocaleDateString(
                                  pt ? "pt-BR" : "en-GB",
                                  { day: "2-digit", month: "short" }
                                )}
                              </span>
                            </div>
                            <button
                              onClick={(e) => { e.stopPropagation(); setConfirmDeleteTradeId(entry.id); }}
                              className="text-slate-700 hover:text-red-400 text-xs px-1 transition-colors"
                              title={pt ? "Excluir" : "Delete"}
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {entries.length > 50 && (
              <p className="text-center text-slate-600 text-xs mt-4">
                {pt ? `Mostrando 50 de ${entries.length}` : `Showing 50 of ${entries.length}`}
              </p>
            )}
          </div>
        ) : (
          (
            <div className="text-center py-16">
              <p className="text-slate-600 text-sm">
                {pt ? "Nenhuma operação registrada ainda." : "No trades logged yet."}
              </p>
              <p className="text-slate-700 text-xs mt-2">
                {pt
                  ? "Registre cada operação, independente do resultado. Os padrões aparecem com tempo."
                  : "Log every trade, regardless of result. Patterns emerge over time."}
              </p>
            </div>
          )
        )}
      </main>
    </div>
  );
}
