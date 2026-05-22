"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getLang } from "@/lib/i18n";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { PAINS } from "@/lib/journal-helpers";

// ── Helpers ────────────────────────────────────────────────────────────────────

function LoadingSpinner() {
  return (
    <div className="flex gap-1 justify-center py-16">
      <span className="w-1.5 h-1.5 bg-slate-600 rounded-full animate-bounce [animation-delay:0ms]" />
      <span className="w-1.5 h-1.5 bg-slate-600 rounded-full animate-bounce [animation-delay:150ms]" />
      <span className="w-1.5 h-1.5 bg-slate-600 rounded-full animate-bounce [animation-delay:300ms]" />
    </div>
  );
}

function StatChip({ label, value, color }) {
  return (
    <div className="flex flex-col items-center px-4 py-3 rounded-xl bg-slate-900 border border-slate-800 min-w-[72px]">
      <span className={`text-xl font-bold ${color || "text-slate-100"}`}>{value}</span>
      <span className="text-[10px] text-slate-500 mt-0.5 text-center">{label}</span>
    </div>
  );
}

// ── Behavioral report ──────────────────────────────────────────────────────────

function BehavioralReport({ trades, lang }) {
  const pt = lang === "pt";
  const total = trades.length;

  if (total < 5) {
    return (
      <div className="text-center py-16 px-6">
        <p className="text-3xl mb-3">📊</p>
        <p className="text-slate-300 font-medium mb-1">
          {pt ? "Dados insuficientes" : "Not enough data yet"}
        </p>
        <p className="text-sm text-slate-500">
          {pt
            ? `Você tem ${total} operação${total !== 1 ? "ões" : ""} registrada${total !== 1 ? "s" : ""}. Registre pelo menos 5 para ver padrões comportamentais.`
            : `You have ${total} trade${total !== 1 ? "s" : ""} logged. Log at least 5 to see behavioral patterns.`}
        </p>
      </div>
    );
  }

  const wins    = trades.filter(t => t.outcome === "win").length;
  const losses  = trades.filter(t => t.outcome === "loss").length;
  const winRate = Math.round((wins / total) * 100);

  // Separate clean vs issue trades
  const cleanTrades = trades.filter(t => {
    const pts = Array.isArray(t.pain_types) && t.pain_types.length > 0 ? t.pain_types : [t.pain_type || "clean"];
    return pts.every(p => !p || p === "clean");
  });
  const issueTrades = trades.filter(t => {
    const pts = Array.isArray(t.pain_types) && t.pain_types.length > 0 ? t.pain_types : [t.pain_type || "clean"];
    return pts.some(p => p && p !== "clean");
  });
  const cleanWR = cleanTrades.length > 0
    ? Math.round((cleanTrades.filter(t => t.outcome === "win").length / cleanTrades.length) * 100)
    : null;
  const issueWR = issueTrades.length > 0
    ? Math.round((issueTrades.filter(t => t.outcome === "win").length / issueTrades.length) * 100)
    : null;

  // Per-pain stats (only show pains with 3+ trades)
  const painStats = {};
  trades.forEach(t => {
    const pts = Array.isArray(t.pain_types) && t.pain_types.length > 0
      ? t.pain_types.filter(p => p && p !== "clean")
      : t.pain_type ? [t.pain_type] : [];
    pts.forEach(p => {
      if (!painStats[p]) painStats[p] = { wins: 0, total: 0 };
      painStats[p].total++;
      if (t.outcome === "win") painStats[p].wins++;
    });
  });

  const painCards = Object.entries(painStats)
    .filter(([, s]) => s.total >= 3)
    .sort((a, b) => b[1].total - a[1].total);

  // Plan deviation analysis
  const deviationTrades = trades.filter(t => t.after_trade?.plan_deviation);
  const followedPlan    = deviationTrades.filter(t => t.after_trade.plan_deviation === "no_followed");
  const deviatedWorse   = deviationTrades.filter(t => t.after_trade.plan_deviation === "yes_worse");
  const deviatedBetter  = deviationTrades.filter(t => t.after_trade.plan_deviation === "yes_better");

  // Stop outcome analysis
  const stopTrades  = trades.filter(t => t.after_trade?.stop_outcome);
  const stopPanics  = stopTrades.filter(t => t.after_trade.stop_outcome === "panic");
  const stopReverse = stopTrades.filter(t => t.after_trade.stop_outcome === "reversal");

  // Recent trend (last 10 vs previous 10)
  const recent = trades.slice(0, 10);
  const prev   = trades.slice(10, 20);
  const recentWR = recent.length >= 5
    ? Math.round((recent.filter(t => t.outcome === "win").length / recent.length) * 100)
    : null;
  const prevWR = prev.length >= 5
    ? Math.round((prev.filter(t => t.outcome === "win").length / prev.length) * 100)
    : null;

  return (
    <div className="space-y-8">

      {/* ── Overview stats ── */}
      <div>
        <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">
          {pt ? "Resumo geral" : "Overview"}
        </p>
        <div className="flex gap-3 flex-wrap">
          <StatChip
            label={pt ? "Operações" : "Trades"}
            value={total}
          />
          <StatChip
            label={pt ? "Acerto" : "Win rate"}
            value={`${winRate}%`}
            color={winRate >= 50 ? "text-green-400" : "text-red-400"}
          />
          <StatChip label={pt ? "Ganhou" : "Wins"} value={wins} color="text-green-400" />
          <StatChip label={pt ? "Perdeu" : "Losses"} value={losses} color="text-red-400" />
        </div>
      </div>

      {/* ── Clean vs Issue ── */}
      {(cleanWR !== null || issueWR !== null) && (
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">
            {pt ? "Limpa vs. com comportamento" : "Clean vs. behavioral issue"}
          </p>
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
            {cleanWR !== null && (
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm text-green-500 font-medium">
                    {pt ? "✓ Operações limpas" : "✓ Clean trades"}
                  </span>
                  <span className="text-xs text-slate-500 ml-2">({cleanTrades.length})</span>
                </div>
                <span className="text-sm font-bold text-green-400">{cleanWR}%</span>
              </div>
            )}
            {issueWR !== null && (
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm text-slate-400">
                    {pt ? "Operações com issues" : "Trades with issues"}
                  </span>
                  <span className="text-xs text-slate-600 ml-2">({issueTrades.length})</span>
                </div>
                <span className={`text-sm font-bold ${issueWR < (cleanWR ?? 50) ? "text-red-400" : "text-slate-300"}`}>
                  {issueWR}%
                </span>
              </div>
            )}
            {cleanWR !== null && issueWR !== null && (
              <p className="text-xs text-slate-500 pt-1 border-t border-slate-800">
                {cleanWR > issueWR
                  ? (pt
                    ? `Suas operações limpas têm ${cleanWR - issueWR}pp de acerto a mais. Os dados confirmam: o comportamento tem custo.`
                    : `Your clean trades win ${cleanWR - issueWR}pp more. The data confirms: behavior has a cost.`)
                  : cleanWR === issueWR
                  ? (pt ? "Acerto igual entre operações limpas e com issues. Amostra ainda pequena." : "Equal win rate between clean and issue trades. Sample still small.")
                  : (pt
                    ? `Acerto similar. Com mais amostragem, o padrão deve aparecer.`
                    : `Similar win rate. With more data, the pattern should emerge.`)}
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Per-pain cards ── */}
      {painCards.length > 0 && (
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">
            {pt ? "Por tipo de comportamento" : "By behavior type"}
          </p>
          <div className="space-y-3">
            {painCards.map(([painId, stats]) => {
              const painInfo = PAINS.find(p => p.id === painId);
              const wr = Math.round((stats.wins / stats.total) * 100);
              const barWidth = Math.max(4, wr);
              return (
                <div key={painId} className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-300">
                      {painInfo ? (pt ? painInfo.pt : painInfo.en) : painId}
                    </span>
                    <span className="text-xs text-slate-500">{stats.total} {pt ? "op." : "trades"}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${wr >= 50 ? "bg-green-500" : "bg-red-500"}`}
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                    <span className={`text-sm font-bold w-10 text-right ${wr >= 50 ? "text-green-400" : "text-red-400"}`}>
                      {wr}%
                    </span>
                  </div>
                  {stats.total < 10 && (
                    <p className="text-[10px] text-slate-600 mt-2">
                      {pt ? `Amostra pequena (${stats.total}). Padrão mais confiável com 10+.` : `Small sample (${stats.total}). Pattern more reliable at 10+.`}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Recent trend ── */}
      {recentWR !== null && prevWR !== null && (
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">
            {pt ? "Tendência recente" : "Recent trend"}
          </p>
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
            <div className="flex items-center gap-6">
              <div className="text-center">
                <p className="text-xs text-slate-500 mb-1">{pt ? "Últimas 10" : "Last 10"}</p>
                <p className={`text-2xl font-bold ${recentWR >= 50 ? "text-green-400" : "text-red-400"}`}>{recentWR}%</p>
              </div>
              <div className="text-slate-700 text-lg">→</div>
              <div className="text-center">
                <p className="text-xs text-slate-500 mb-1">{pt ? "10 anteriores" : "Previous 10"}</p>
                <p className={`text-2xl font-bold ${prevWR >= 50 ? "text-green-400" : "text-red-400"}`}>{prevWR}%</p>
              </div>
              <div className="flex-1 text-right">
                {recentWR > prevWR
                  ? <span className="text-xs text-green-500">↑ {pt ? "Melhora" : "Improving"}</span>
                  : recentWR < prevWR
                  ? <span className="text-xs text-red-500">↓ {pt ? "Queda" : "Declining"}</span>
                  : <span className="text-xs text-slate-500">{pt ? "Estável" : "Stable"}</span>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Plan deviation ── */}
      {deviationTrades.length >= 3 && (
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">
            {pt ? "Desvio do plano" : "Plan deviation"}
          </p>
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
            {followedPlan.length > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">{pt ? "Seguiu o plano" : "Followed plan"}</span>
                <span className="text-slate-300 font-medium">{followedPlan.length}×</span>
              </div>
            )}
            {deviatedWorse.length > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">{pt ? "Desviou → resultado pior" : "Deviated → worse result"}</span>
                <span className="text-red-400 font-medium">{deviatedWorse.length}×</span>
              </div>
            )}
            {deviatedBetter.length > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">{pt ? "Desviou → resultado melhor" : "Deviated → better result"}</span>
                <span className="text-green-400 font-medium">{deviatedBetter.length}×</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Stop outcomes ── */}
      {stopTrades.length >= 3 && (stopPanics.length > 0 || stopReverse.length > 0) && (
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">
            {pt ? "Stops" : "Stop outcomes"}
          </p>
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
            {stopPanics.length > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">{pt ? "Saída por pânico" : "Panic exits"}</span>
                <span className="text-red-400 font-medium">{stopPanics.length}×</span>
              </div>
            )}
            {stopReverse.length > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">{pt ? "Stop ativado → reverteu (doloroso)" : "Stop hit → reversed (painful)"}</span>
                <span className="text-amber-400 font-medium">{stopReverse.length}×</span>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}

// ── AI report ─────────────────────────────────────────────────────────────────

function AIReport({ token, lang, totalTrades }) {
  const pt = lang === "pt";
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function fetchReport() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/journal/reports/ai", {
        headers: {
          Authorization: `Bearer ${token}`,
          "x-lang": lang,
        },
      });
      const data = await res.json();
      if (data.error === "insufficient_data") {
        setError("insufficient_data");
      } else if (data.error) {
        setError("generic");
      } else {
        setReport(data.report);
      }
    } catch {
      setError("generic");
    } finally {
      setLoading(false);
    }
  }

  if (totalTrades < 10) {
    return (
      <div className="text-center py-16 px-6">
        <p className="text-3xl mb-3">🤖</p>
        <p className="text-slate-300 font-medium mb-1">
          {pt ? "Análise IA disponível em breve" : "AI analysis coming soon"}
        </p>
        <p className="text-sm text-slate-500">
          {pt
            ? `Você tem ${totalTrades} operação${totalTrades !== 1 ? "ões" : ""}. São necessárias 10 para ativar a análise por IA.`
            : `You have ${totalTrades} trade${totalTrades !== 1 ? "s" : ""}. 10 are needed to activate AI analysis.`}
        </p>
        <div className="mt-4 w-48 mx-auto h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full transition-all"
            style={{ width: `${Math.min(100, (totalTrades / 10) * 100)}%` }}
          />
        </div>
        <p className="text-xs text-slate-600 mt-1">{totalTrades}/10</p>
      </div>
    );
  }

  if (!report && !loading) {
    return (
      <div className="text-center py-16 px-6">
        <p className="text-3xl mb-3">🤖</p>
        <p className="text-slate-300 font-medium mb-2">
          {pt ? "Análise comportamental com IA" : "AI behavioral analysis"}
        </p>
        <p className="text-sm text-slate-500 mb-6 max-w-xs mx-auto">
          {pt
            ? "O SmartLog analisa seus padrões comportamentais e gera uma síntese baseada nos seus dados e nos princípios de trading."
            : "SmartLog analyzes your behavioral patterns and generates a synthesis based on your data and trading principles."}
        </p>
        <button
          onClick={fetchReport}
          className="px-5 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-400 text-white text-sm font-medium transition-colors"
        >
          {pt ? "Gerar análise" : "Generate analysis"}
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-16">
        <LoadingSpinner />
        <p className="text-xs text-slate-500 mt-4">
          {pt ? "Analisando seus padrões..." : "Analyzing your patterns..."}
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 px-6">
        <p className="text-sm text-slate-400 mb-4">
          {pt ? "Erro ao gerar análise." : "Error generating analysis."}
        </p>
        <button onClick={fetchReport} className="text-sm text-blue-400 hover:text-blue-300 transition-colors">
          {pt ? "Tentar novamente" : "Try again"}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
        <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{report}</p>
      </div>
      <div className="flex justify-end">
        <button
          onClick={fetchReport}
          className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
        >
          ↻ {pt ? "Regenerar" : "Regenerate"}
        </button>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const router = useRouter();
  const [lang] = useState(() => getLang());
  const [token, setToken] = useState(null);
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("behavioral"); // "behavioral" | "ai"

  const pt = lang === "pt";

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabaseBrowser.auth.getSession();
      if (!session) { router.push("/auth"); return; }
      setToken(session.access_token);
      try {
        const res = await fetch("/api/journal", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const data = await res.json();
        setTrades(Array.isArray(data) ? data : (data.entries || []));
      } catch {
        setTrades([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="px-6 py-5 border-b border-slate-800">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <button
            onClick={() => router.push("/journal")}
            className="text-slate-400 hover:text-white text-sm transition-colors"
          >
            ← {pt ? "Diário" : "Journal"}
          </button>
          <span className="text-sm font-semibold text-slate-200">
            {pt ? "Relatórios" : "Reports"}
          </span>
          <div className="w-16" />
        </div>
      </header>

      <main className="max-w-xl mx-auto px-6 py-8">

        {/* Tab switcher */}
        <div className="flex gap-1 p-1 rounded-xl bg-slate-900 border border-slate-800 mb-8">
          <button
            onClick={() => setTab("behavioral")}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === "behavioral"
                ? "bg-slate-700 text-white"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            {pt ? "Comportamental" : "Behavioral"}
          </button>
          <button
            onClick={() => setTab("ai")}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === "ai"
                ? "bg-slate-700 text-white"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            {pt ? "Síntese IA" : "AI Summary"}
          </button>
        </div>

        {loading ? (
          <LoadingSpinner />
        ) : tab === "behavioral" ? (
          <BehavioralReport trades={trades} lang={lang} />
        ) : (
          <AIReport token={token} lang={lang} totalTrades={trades.length} />
        )}

      </main>
    </div>
  );
}
