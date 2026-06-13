"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getLang } from "@/lib/i18n";
import { supabaseBrowser } from "@/lib/supabase-browser";

// ── Micro-components ──────────────────────────────────────────────────────────

function LoadingSpinner() {
  return (
    <div className="flex gap-1 justify-center py-16">
      <span className="w-1.5 h-1.5 bg-slate-600 rounded-full animate-bounce [animation-delay:0ms]" />
      <span className="w-1.5 h-1.5 bg-slate-600 rounded-full animate-bounce [animation-delay:150ms]" />
      <span className="w-1.5 h-1.5 bg-slate-600 rounded-full animate-bounce [animation-delay:300ms]" />
    </div>
  );
}

function Card({ children, className = "" }) {
  return <div className={`p-4 rounded-xl bg-slate-900 border border-slate-800 ${className}`}>{children}</div>;
}

function SectionLabel({ text }) {
  return <p className="text-xs text-slate-500 uppercase tracking-wider mb-2 mt-5 first:mt-0">{text}</p>;
}

function StatRow({ label, wins, losses, total, note, pt }) {
  const be = total != null ? Math.max(0, total - wins - losses) : 0;
  const decisive = wins + losses;
  const rate = decisive > 0 ? Math.round((wins / decisive) * 100) : null;
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-slate-800 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-300">{label}</p>
        {note && <p className="text-xs text-slate-600 mt-0.5">{note}</p>}
      </div>
      <div className="flex items-center gap-3 flex-shrink-0 ml-3">
        <span className="text-xs text-slate-500 tabular-nums">
          {wins}W · {losses}L{be > 0 ? ` · ${be}BE` : ""}
        </span>
        {rate !== null ? (
          <span className={`text-sm font-bold tabular-nums w-10 text-right ${rate >= 50 ? "text-green-400" : "text-red-400"}`}>{rate}%</span>
        ) : (
          <span className="w-10" />
        )}
      </div>
    </div>
  );
}

function CountRow({ label, count, sub, countColor, note }) {
  const cc = countColor || "text-slate-300";
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-800 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-400">{label}</p>
        {note && <p className="text-xs text-slate-600 mt-0.5">{note}</p>}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
        {sub && <span className="text-xs text-slate-600">{sub}</span>}
        <span className={`text-sm font-bold tabular-nums ${cc}`}>{count}×</span>
      </div>
    </div>
  );
}

function Moral({ text, highlight }) {
  return (
    <p className={`text-xs mt-3 pt-3 border-t border-slate-800 leading-relaxed ${highlight ? "text-blue-300" : "text-slate-500"}`}>
      {text}
    </p>
  );
}

function BehSection({ title, count, children }) {
  const [open, setOpen] = useState(false);
  if (!count) return null;
  return (
    <div className="mb-2 rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3.5 text-left"
      >
        <span className="text-sm font-medium text-slate-200">{title}</span>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-slate-500 tabular-nums">{count}</span>
          <span className="text-xs text-slate-500">{open ? "▲" : "▼"}</span>
        </div>
      </button>
      {open && (
        <div className="border-t border-slate-800 px-4 pt-3 pb-4">
          {children}
        </div>
      )}
    </div>
  );
}

// ── Issue helpers ─────────────────────────────────────────────────────────────

function hasIssue(trade, issueId) {
  const items = trade.after_trade?.other_issues;
  if (!Array.isArray(items) || items.length === 0) return false;
  return items.some(i => (typeof i === "string" ? i === issueId : i.id === issueId));
}

function getIssueSetupType(trade, issueId) {
  const items = trade.after_trade?.other_issues;
  if (!Array.isArray(items)) return null;
  const item = items.find(i => typeof i !== "string" && i.id === issueId);
  return item?.setup_type || null;
}

// ── Data computation ──────────────────────────────────────────────────────────

function computeData(trades, setups) {
  const v2 = trades.filter(t => t.after_trade?.entry_type);

  function wins(arr)   { return arr.filter(t => t.outcome === "win").length; }
  function losses(arr) { return arr.filter(t => t.outcome === "loss").length; }
  function wr(arr) {
    const w = wins(arr), l = losses(arr), d = w + l;
    return d > 0 ? Math.round((w / d) * 100) : null;
  }

  // Read from v3 trade_outcomes array
  function withOutcome(arr, type, detail = null) {
    return arr.filter(t => {
      const outcomes = t.after_trade?.trade_outcomes;
      if (!Array.isArray(outcomes)) return false;
      return outcomes.some(o => o.type === type && (detail === null || o.detail === detail));
    });
  }

  // Entry groupings
  const full        = v2.filter(t => t.after_trade.entry_type === "full_setup");
  const early       = v2.filter(t => t.after_trade.entry_type === "early");
  const hesitBetter = v2.filter(t => t.after_trade.entry_type === "hesitation_better");
  const hesitWorse  = v2.filter(t => t.after_trade.entry_type === "hesitation_worse");
  const chaseProfit = v2.filter(t => t.after_trade.entry_type === "chase_profit");
  const chaseLoss   = v2.filter(t => t.after_trade.entry_type === "chase_loss");
  const random      = v2.filter(t => t.after_trade.entry_type === "random");
  const incomplete  = [...early, ...hesitBetter, ...hesitWorse, ...chaseProfit, ...chaseLoss];
  const hesitation  = [...hesitBetter, ...hesitWorse];
  const chase       = [...chaseProfit, ...chaseLoss];

  // Early-entry specific
  const earlyLevelMet    = early.filter(t => t.after_trade?.level_met_after === true);
  const earlyLevelNotMet = early.filter(t => t.after_trade?.level_met_after === false);
  const trueMissedOpps   = earlyLevelNotMet.filter(t => t.outcome === "win");

  // Exit outcomes (v3 trade_outcomes)
  const respStop       = withOutcome(v2, "respected_stop");
  const respProtect    = withOutcome(v2, "respected_stop",  "protected");
  const respReverse    = withOutcome(v2, "respected_stop",  "reversed");
  const changedStop    = withOutcome(v2, "changed_stop");
  const changedBetter  = withOutcome(v2, "changed_stop",    "better");
  const changedWorse   = withOutcome(v2, "changed_stop",    "worse");
  const trailing       = withOutcome(v2, "trailing_stop");
  const trailProtect   = withOutcome(v2, "trailing_stop",   "protected");
  const trailTight     = withOutcome(v2, "trailing_stop",   "too_tight");
  const panic          = withOutcome(v2, "panic_exit");
  const noStop         = withOutcome(v2, "no_stop");
  const tgtNotHit      = withOutcome(v2, "target_not_hit");
  const tgtNeverOnside = withOutcome(v2, "target_not_hit",  "never_onside");
  const tgtOnsideBE    = withOutcome(v2, "target_not_hit",  "onside_be");
  const tgtOnsideLoss  = withOutcome(v2, "target_not_hit",  "onside_loss");
  const earlyExit      = withOutcome(v2, "early_exit");
  const earlyExitHit   = withOutcome(v2, "early_exit",      "hit_after");
  const earlyExitNotHit= withOutcome(v2, "early_exit",      "not_hit_after");
  const lastTarget     = withOutcome(v2, "last_target_hit");
  const lastOptimal    = withOutcome(v2, "last_target_hit",  "optimal");
  const lastKept       = withOutcome(v2, "last_target_hit",  "kept_going");
  const lastDelayWorse = withOutcome(v2, "last_target_hit",  "delayed_worse");
  const lastDelayBetter= withOutcome(v2, "last_target_hit",  "delayed_better");
  const multiTarget    = withOutcome(v2, "multiple_targets");
  const multiAll       = withOutcome(v2, "multiple_targets", "all_hit");
  const multiPartial   = withOutcome(v2, "multiple_targets", "partial_hit");

  const totalExitCount = respStop.length + changedStop.length + trailing.length + panic.length + noStop.length + tgtNotHit.length + earlyExit.length + lastTarget.length + multiTarget.length;

  // Other issues
  const revengeT     = v2.filter(t => hasIssue(t, "revenge"));
  const overtradingT = v2.filter(t => hasIssue(t, "overtrading"));
  const oversizingT  = v2.filter(t => hasIssue(t, "oversizing"));

  function issueSplit(id, arr) {
    return {
      trusted: arr.filter(t => getIssueSetupType(t, id) === "trusted"),
      random:  arr.filter(t => getIssueSetupType(t, id) === "random"),
    };
  }

  // P&L
  const pnlTrades = trades.filter(t => t.pnl != null);
  const totalPnl  = pnlTrades.reduce((s, t) => s + (parseFloat(t.pnl) || 0), 0);

  // Per-setup stats
  const setupStats = setups
    .map(setup => {
      const st   = v2.filter(t => t.setup_id === setup.id);
      const freq = v2.length > 0 ? Math.round((st.length / v2.length) * 100) : 0;
      const pnlSt    = pnlTrades.filter(t => t.setup_id === setup.id);
      const setupPnl = pnlSt.reduce((s, t) => s + (parseFloat(t.pnl) || 0), 0);
      const condStats = (setup.conditions || []).map(cond => {
        const condTrades = st.filter(t =>
          Array.isArray(t.conditions_met) && t.conditions_met.some(cm => cm.id === cond.id)
        );
        const varStats = (cond.variants || []).map(v => {
          const vTrades = st.filter(t =>
            Array.isArray(t.conditions_met) &&
            t.conditions_met.some(cm => cm.id === cond.id && cm.selected_variant === v.id)
          );
          return { variant: v, trades: vTrades, w: wins(vTrades), l: losses(vTrades), rate: wr(vTrades) };
        });
        return { cond, trades: condTrades, varStats };
      });
      return {
        setup, trades: st,
        w: wins(st), l: losses(st),
        be: st.filter(t => t.outcome === "be").length,
        rate: wr(st), freq,
        setupPnl, pnlCount: pnlSt.length,
        condStats,
      };
    })
    .filter(s => s.trades.length > 0);

  return {
    total: trades.length, v2Total: v2.length, v2,
    allWithOutcome: trades.filter(t => t.outcome),
    full, incomplete, random,
    early, hesitation, hesitBetter, hesitWorse,
    chase, chaseProfit, chaseLoss,
    earlyLevelMet, earlyLevelNotMet, trueMissedOpps,
    respStop, respProtect, respReverse,
    changedStop, changedBetter, changedWorse,
    trailing, trailProtect, trailTight,
    panic, noStop,
    tgtNotHit, tgtNeverOnside, tgtOnsideBE, tgtOnsideLoss,
    earlyExit, earlyExitHit, earlyExitNotHit,
    lastTarget, lastOptimal, lastKept, lastDelayWorse, lastDelayBetter,
    multiTarget, multiAll, multiPartial,
    totalExitCount,
    revengeT, overtradingT, oversizingT,
    revengeSplit:     issueSplit("revenge",     revengeT),
    overtradingSplit: issueSplit("overtrading", overtradingT),
    oversizingSplit:  issueSplit("oversizing",  oversizingT),
    pnlTrades, totalPnl,
    setupStats,
    wins, losses, wr,
  };
}

// ── Universal reminder ─────────────────────────────────────────────────────────

const UNIVERSAL_REMINDER = {
  en: "Confidence is not a feeling. It's a function of past performance. Trusted setups — profitable and repeatable — are the way to build reliable confidence. Size should reflect both profitability and sample size. A setup tested only 5 times is not enough. Grow your financial size with your sample size.",
  pt: "Confiança não é um estado de espírito. É uma função do desempenho passado. Setups testados e lucrativos são o caminho para construir confiança real. O tamanho da posição deve refletir tanto a lucratividade quanto o tamanho da amostragem. Um setup testado 5 vezes não é suficiente. Aumente seu tamanho financeiro com sua amostragem.",
};

// ── Tab 1: Raw Data ───────────────────────────────────────────────────────────

function RawDataTab({ d, pt }) {
  const { wins, losses, wr } = d;
  const totalW  = wins(d.allWithOutcome);
  const totalL  = losses(d.allWithOutcome);
  const totalBE = d.allWithOutcome.length - totalW - totalL;
  const totalWR = wr(d.allWithOutcome);

  const hasIssues = d.revengeT.length + d.overtradingT.length + d.oversizingT.length;

  function subStr(parts) {
    return parts.filter(Boolean).join(" · ");
  }

  return (
    <div className="pb-8">

      {/* Summary */}
      <Card className="text-center py-5 mb-6">
        <p className="text-xl font-bold text-slate-100">
          {totalW}W · {totalL}L{totalBE > 0 ? ` · ${totalBE}BE` : ""}
        </p>
        {totalWR !== null && (
          <p className={`text-4xl font-bold mt-1 ${totalWR >= 50 ? "text-green-400" : "text-red-400"}`}>{totalWR}%</p>
        )}
        <p className="text-xs text-slate-600 mt-1">{d.total} {pt ? "operações totais" : "total trades"}</p>
      </Card>

      {/* Entry types */}
      {d.v2Total > 0 && (
        <>
          <SectionLabel text={pt ? "Tipo de entrada" : "Entry type"} />
          <Card>
            {d.full.length > 0 && (
              <StatRow label={pt ? "Setup completo" : "Full setup"} wins={wins(d.full)} losses={losses(d.full)} total={d.full.length} pt={pt} />
            )}
            {d.incomplete.length > 0 && (
              <StatRow label={pt ? "Setup incompleto" : "Incomplete setup"} wins={wins(d.incomplete)} losses={losses(d.incomplete)} total={d.incomplete.length} pt={pt} />
            )}
            {d.random.length > 0 && (
              <StatRow
                label={pt ? "Aleatória" : "Random"}
                wins={wins(d.random)} losses={losses(d.random)} total={d.random.length}
                note={pt ? "Operações aleatórias não ensinam nada." : "Random trades teach nothing."}
                pt={pt}
              />
            )}
          </Card>
        </>
      )}

      {/* Exit outcomes */}
      {d.totalExitCount > 0 && (
        <>
          <SectionLabel text={pt ? "Resultados" : "Exit outcomes"} />
          <Card>
            {d.respStop.length > 0 && (
              <CountRow
                label={pt ? "Stop respeitado" : "Respected stop"}
                count={d.respStop.length}
                sub={subStr([
                  d.respProtect.length ? `${pt ? "protegeu" : "protected"}: ${d.respProtect.length}` : "",
                  d.respReverse.length ? `${pt ? "reverteu" : "reversed"}: ${d.respReverse.length}` : "",
                ])}
              />
            )}
            {d.changedStop.length > 0 && (
              <CountRow
                label={pt ? "Stop alterado" : "Changed stop"}
                count={d.changedStop.length}
                sub={subStr([
                  d.changedBetter.length ? `${pt ? "melhor" : "better"}: ${d.changedBetter.length}` : "",
                  d.changedWorse.length  ? `${pt ? "pior" : "worse"}: ${d.changedWorse.length}` : "",
                ])}
                countColor={d.changedWorse.length > d.changedBetter.length ? "text-red-400" : "text-slate-300"}
              />
            )}
            {d.trailing.length > 0 && (
              <CountRow
                label={pt ? "Stop móvel (trailing)" : "Trailing stop"}
                count={d.trailing.length}
                sub={subStr([
                  d.trailProtect.length ? `${pt ? "protegeu" : "protected"}: ${d.trailProtect.length}` : "",
                  d.trailTight.length   ? `${pt ? "curto demais" : "too tight"}: ${d.trailTight.length}` : "",
                ])}
              />
            )}
            {d.panic.length > 0 && (
              <CountRow label={pt ? "Saída por pânico" : "Panic exit"} count={d.panic.length} countColor="text-red-400" />
            )}
            {d.noStop.length > 0 && (
              <CountRow label={pt ? "Sem stop" : "No stop"} count={d.noStop.length} countColor="text-amber-400" />
            )}
            {d.tgtNotHit.length > 0 && (
              <CountRow
                label={pt ? "Alvo não atingido" : "Target not hit"}
                count={d.tgtNotHit.length}
                sub={subStr([
                  d.tgtNeverOnside.length ? `${pt ? "nunca favorável" : "never onside"}: ${d.tgtNeverOnside.length}` : "",
                  d.tgtOnsideBE.length    ? `→BE: ${d.tgtOnsideBE.length}` : "",
                  d.tgtOnsideLoss.length  ? `→${pt ? "perda" : "loss"}: ${d.tgtOnsideLoss.length}` : "",
                ])}
              />
            )}
            {d.earlyExit.length > 0 && (
              <CountRow
                label={pt ? "Saída prematura" : "Early exit"}
                count={d.earlyExit.length}
                sub={subStr([
                  d.earlyExitHit.length    ? `${pt ? "atingido depois" : "hit after"}: ${d.earlyExitHit.length}` : "",
                  d.earlyExitNotHit.length ? `${pt ? "não atingido" : "not hit"}: ${d.earlyExitNotHit.length}` : "",
                ])}
                countColor={d.earlyExitHit.length > d.earlyExitNotHit.length ? "text-amber-400" : "text-slate-300"}
              />
            )}
            {d.lastTarget.length > 0 && (
              <CountRow
                label={pt ? "Último alvo atingido" : "Last target hit"}
                count={d.lastTarget.length}
                sub={subStr([
                  d.lastOptimal.length    ? `${pt ? "ótimo" : "optimal"}: ${d.lastOptimal.length}` : "",
                  d.lastKept.length       ? `${pt ? "continuou" : "kept going"}: ${d.lastKept.length}` : "",
                  d.lastDelayWorse.length ? `${pt ? "atrasado/pior" : "delayed/worse"}: ${d.lastDelayWorse.length}` : "",
                  d.lastDelayBetter.length? `${pt ? "atrasado/melhor" : "delayed/better"}: ${d.lastDelayBetter.length}` : "",
                ])}
                countColor="text-green-400"
              />
            )}
            {d.multiTarget.length > 0 && (
              <CountRow
                label={pt ? "Múltiplos alvos" : "Multiple targets"}
                count={d.multiTarget.length}
                sub={subStr([
                  d.multiAll.length     ? `${pt ? "todos" : "all"}: ${d.multiAll.length}` : "",
                  d.multiPartial.length ? `${pt ? "parcial" : "partial"}: ${d.multiPartial.length}` : "",
                ])}
                countColor="text-green-400"
              />
            )}
          </Card>
        </>
      )}

      {/* Other issues */}
      {hasIssues > 0 && (
        <>
          <SectionLabel text={pt ? "Outros problemas" : "Other issues"} />
          <Card>
            {[
              { label: pt ? "Vingança"              : "Revenge",     arr: d.revengeT,     split: d.revengeSplit     },
              { label: pt ? "Excesso de operações"  : "Overtrading", arr: d.overtradingT, split: d.overtradingSplit },
              { label: pt ? "Tamanho excessivo"     : "Oversizing",  arr: d.oversizingT,  split: d.oversizingSplit  },
            ].filter(({ arr }) => arr.length > 0).map(({ label, arr, split }) => (
              <div key={label} className="border-b border-slate-800 last:border-0">
                <div className="flex justify-between py-2.5">
                  <span className="text-sm text-slate-300">{label}</span>
                  <span className="text-sm text-red-400 font-bold">{arr.length}×</span>
                </div>
                {(split.trusted.length > 0 || split.random.length > 0) && (
                  <div className="pl-4 pb-2 space-y-1">
                    {split.trusted.length > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">{pt ? "↳ Setup testado" : "↳ Trusted setup"}</span>
                        <span className="text-slate-400">
                          {wins(split.trusted)}W · {losses(split.trusted)}L{wr(split.trusted) !== null ? ` · ${wr(split.trusted)}%` : ""}
                        </span>
                      </div>
                    )}
                    {split.random.length > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-amber-700">{pt ? "↳ Aleatória" : "↳ Random"}</span>
                        <span className="text-amber-700">{split.random.length}× — {pt ? "sem aprendizado" : "no learning"}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </Card>
        </>
      )}

      {/* P&L */}
      {d.pnlTrades.length > 0 && (
        <>
          <SectionLabel text="P&L" />
          <Card>
            <div className="flex justify-between py-1">
              <span className="text-sm text-slate-300">{pt ? "Total registrado" : "Total logged"}</span>
              <span className={`text-sm font-bold ${d.totalPnl >= 0 ? "text-green-400" : "text-red-400"}`}>
                {d.totalPnl >= 0 ? "+" : ""}{d.totalPnl.toFixed(2)}
              </span>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

// ── Tab 2: Behavioural ────────────────────────────────────────────────────────

function BehaviouralTab({ d, pt }) {
  const { wins, losses, wr } = d;

  if (d.v2Total === 0) {
    return (
      <div className="text-center py-16 px-6">
        <p className="text-slate-400 text-sm">
          {pt ? "Nenhum dado disponível. Registre uma operação para ver a análise comportamental." : "No data yet. Log a trade to see behavioral analysis."}
        </p>
      </div>
    );
  }

  const stopCount   = d.changedStop.length + d.respStop.length + d.trailing.length + d.panic.length;
  const targetCount = d.earlyExit.length + d.tgtNotHit.length + d.lastTarget.length + d.multiTarget.length;
  const issueCount  = d.revengeT.length + d.overtradingT.length + d.oversizingT.length;

  function sampleTag(n) {
    if (n < 5)  return pt ? "amostra muito pequena" : "very small sample";
    if (n < 10) return pt ? "amostra pequena" : "small sample";
    if (n < 20) return pt ? "amostra em construção" : "data building up";
    return null;
  }

  function SampleNote({ n }) {
    const tag = sampleTag(n);
    if (!tag) return null;
    return (
      <p className="text-xs text-slate-600 leading-relaxed italic">
        {pt
          ? `Atenção: ${tag} (${n} operações). Continue registrando para insights mais confiáveis.`
          : `Mind you, this is a ${tag} (${n} trades). Keep logging for more reliable insights.`}
      </p>
    );
  }

  function TooSmall() {
    return (
      <p className="text-xs text-slate-600 mt-2 pt-2 border-t border-slate-800 italic">
        {pt ? "Amostra pequena demais para insights. Continue registrando." : "Sample too small for insights. Keep logging."}
      </p>
    );
  }

  return (
    <div className="pb-8">
      <div className="space-y-2">

        {/* FOMO / Early entry */}
        <BehSection title={pt ? "Entrada antecipada (FOMO)" : "Early entry (FOMO)"} count={d.early.length}>
          {/* Full setup vs early entry comparison */}
          {d.full.length > 0 && (
            <StatRow label={pt ? "Setup completo" : "Full setup"} wins={wins(d.full)} losses={losses(d.full)} total={d.full.length} pt={pt} />
          )}
          <StatRow label={pt ? "Entrada antecipada (incompleto)" : "Early entry (incomplete)"} wins={wins(d.early)} losses={losses(d.early)} total={d.early.length} pt={pt} />

          {/* Punchy breakdown */}
          <div className="mt-3 pt-3 border-t border-slate-800">
            <p className="text-xs text-slate-600 uppercase tracking-wider mb-2">
              {pt ? "Detalhamento" : "Breakdown"}
            </p>
            <div className="flex items-center justify-between py-2 border-b border-slate-800">
              <span className="text-sm text-slate-400">{pt ? "a. Lucrativas" : "a. Profitable"}</span>
              <span className="text-sm text-green-400 font-medium">
                {wins(d.early)} {pt ? "de" : "out of"} {d.early.length}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-slate-800">
              <span className="text-sm text-slate-400">{pt ? "b. Nível NÃO atingido depois" : "b. Level NOT reached after"}</span>
              <span className="text-sm text-slate-300 font-medium">
                {d.earlyLevelNotMet.length} {pt ? "de" : "out of"} {d.early.length}
              </span>
            </div>
            <div className="flex items-center justify-between py-2">
              <div>
                <span className="text-sm text-slate-300">{pt ? "c. Oportunidades realmente perdidas" : "c. Truly missed opportunities"}</span>
                <p className="text-xs text-slate-600 mt-0.5">{pt ? "(antecipada + nível não atingido + lucro)" : "(early + level not met + profit)"}</p>
              </div>
              <span className={`text-sm font-bold ${d.trueMissedOpps.length === 0 ? "text-green-400" : "text-amber-400"}`}>
                {d.trueMissedOpps.length} {pt ? "de" : "out of"} {d.early.length}
              </span>
            </div>
          </div>

          {d.early.length >= 3 ? (() => {
            const n = d.early.length;
            const earlyWR = wr(d.early);
            const missedPct = Math.round((d.trueMissedOpps.length / n) * 100);
            const payingOff = earlyWR !== null && earlyWR >= 50;

            const finding = d.trueMissedOpps.length === 0
              ? (pt
                  ? `Zero oportunidades verdadeiramente perdidas em ${n} entradas antecipadas.`
                  : `Zero truly missed opportunities out of ${n} early entries.`)
              : (pt
                  ? `${d.trueMissedOpps.length} oportunidade${d.trueMissedOpps.length !== 1 ? "s" : ""} verdadeiramente perdida${d.trueMissedOpps.length !== 1 ? "s" : ""} em ${n} entradas antecipadas (${missedPct}%).`
                  : `${d.trueMissedOpps.length} truly missed opportunit${d.trueMissedOpps.length !== 1 ? "ies" : "y"} out of ${n} early entries (${missedPct}%).`);

            const moral = d.trueMissedOpps.length === 0
              ? (pt
                  ? "Por enquanto, suas entradas antecipadas não estão te fazendo perder movimentos reais."
                  : "Right now, your early entries aren't making you miss real moves.")
              : (pt
                  ? "Suas entradas antecipadas estão te custando — você está perdendo movimentos que esperava pegar."
                  : "Your early entries are costing you — you're missing moves you waited for.");

            const extra = payingOff
              ? (pt
                  ? ` Taxa de acerto de ${earlyWR}% nas antecipadas — considere transformar em variante oficial de um setup.`
                  : ` ${earlyWR}% win rate on early entries — consider making it an official setup variant.`)
              : (!payingOff && n >= 5
                  ? (pt
                      ? ` Se FOMO é inevitável, entre com tamanho reduzido — a "taxa pirata do FOMO".`
                      : ` If FOMO is unavoidable, enter with reduced size — the FOMO pirate fee.`)
                  : "");

            return (
              <div className="mt-3 pt-3 border-t border-slate-800 space-y-2">
                <p className={`text-xs leading-relaxed font-medium ${d.trueMissedOpps.length === 0 ? "text-blue-300" : "text-amber-300"}`}>{finding}</p>
                <p className="text-xs text-slate-400 leading-relaxed">{moral}{extra}</p>
                <SampleNote n={n} />
              </div>
            );
          })() : d.early.length > 0 ? <TooSmall /> : null}
        </BehSection>

        {/* Hesitation & Chasing */}
        {(d.hesitation.length + d.chase.length) > 0 && (
          <BehSection
            title={pt ? "Hesitação e perseguição" : "Hesitation & chasing"}
            count={d.hesitation.length + d.chase.length}
          >
            {d.hesitBetter.length > 0 && (
              <StatRow label={pt ? "Hesitação — preço melhor" : "Hesitation — better price"}
                wins={wins(d.hesitBetter)} losses={losses(d.hesitBetter)} total={d.hesitBetter.length} pt={pt} />
            )}
            {d.hesitWorse.length > 0 && (
              <StatRow label={pt ? "Hesitação — preço pior" : "Hesitation — worse price"}
                wins={wins(d.hesitWorse)} losses={losses(d.hesitWorse)} total={d.hesitWorse.length} pt={pt} />
            )}
            {d.chaseProfit.length > 0 && (
              <StatRow label={pt ? "Perseguiu — lucro" : "Chased — profit"}
                wins={wins(d.chaseProfit)} losses={losses(d.chaseProfit)} total={d.chaseProfit.length} pt={pt} />
            )}
            {d.chaseLoss.length > 0 && (
              <StatRow label={pt ? "Perseguiu — perda" : "Chased — loss"}
                wins={wins(d.chaseLoss)} losses={losses(d.chaseLoss)} total={d.chaseLoss.length} pt={pt} />
            )}
            {(d.hesitation.length + d.chase.length) >= 3 ? (
              <div className="mt-3 pt-3 border-t border-slate-800 space-y-2">
                <p className="text-xs text-slate-400 leading-relaxed">
                  {pt
                    ? "Comportamento inconsistente não permite aprendizado estruturado. Se funcionar com frequência, considere transformar em um setup."
                    : "Inconsistent behavior prevents structured learning. If it works consistently, consider making it a setup."}
                </p>
                <SampleNote n={d.hesitation.length + d.chase.length} />
              </div>
            ) : <TooSmall />}
          </BehSection>
        )}

        {/* Stop optimization */}
        {stopCount > 0 && (
          <BehSection title={pt ? "Otimização de stop" : "Stop optimization"} count={stopCount}>
            {d.changedStop.length > 0 && (
              <>
                <p className="text-xs text-slate-600 uppercase tracking-wider pb-1 pt-1">{pt ? "Stop alterado" : "Changed stop"}</p>
                {d.changedWorse.length > 0 && (
                  <CountRow label={pt ? "→ Resultado pior" : "→ Worse result"} count={d.changedWorse.length} countColor="text-red-400" />
                )}
                {d.changedBetter.length > 0 && (
                  <CountRow label={pt ? "→ Resultado melhor" : "→ Better result"} count={d.changedBetter.length} countColor="text-green-400" />
                )}
                {d.changedStop.length >= 3 ? (() => {
                  const bad = d.changedWorse.length, good = d.changedBetter.length;
                  return (
                    <div className="mt-2 space-y-1.5">
                      <p className={`text-xs leading-relaxed font-medium ${good > bad ? "text-blue-300" : "text-amber-300"}`}>
                        {good > bad
                          ? (pt
                              ? `Em ${d.changedStop.length} alterações de stop, ${good} melhoraram o resultado.`
                              : `Out of ${d.changedStop.length} stop changes, ${good} improved the result.`)
                          : (pt
                              ? `Em ${d.changedStop.length} alterações de stop, ${bad} pioraram o resultado.`
                              : `Out of ${d.changedStop.length} stop changes, ${bad} made things worse.`)}
                      </p>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        {good > bad
                          ? (pt
                              ? "Cuidado: isso pode criar viés de confirmação perigoso — certifique-se que é julgamento, não esperança."
                              : "Watch out: this can build dangerous confirmation bias — make sure it's judgment, not hope.")
                          : (pt
                              ? "O dado é claro: respeite seu ponto de invalidação."
                              : "The data is clear: respect your invalidation point.")}
                      </p>
                      <SampleNote n={d.changedStop.length} />
                    </div>
                  );
                })() : <TooSmall />}
              </>
            )}

            {d.respStop.length > 0 && (
              <>
                <p className="text-xs text-slate-600 uppercase tracking-wider pb-1 pt-3">{pt ? "Stop respeitado" : "Respected stop"}</p>
                {d.respProtect.length > 0 && (
                  <CountRow label={pt ? "→ Protegeu de perda pior" : "→ Protected from worse loss"} count={d.respProtect.length} countColor="text-green-400" />
                )}
                {d.respReverse.length > 0 && (
                  <CountRow label={pt ? "→ Preço reverteu (doloroso)" : "→ Price reversed (painful)"} count={d.respReverse.length} countColor="text-amber-400" />
                )}
                {d.respStop.length >= 3 ? (() => {
                  const pct = Math.round((d.respProtect.length / d.respStop.length) * 100);
                  const mostly = d.respProtect.length >= d.respReverse.length;
                  return (
                    <div className="mt-2 space-y-1.5">
                      <p className={`text-xs leading-relaxed font-medium ${mostly ? "text-blue-300" : "text-slate-400"}`}>
                        {mostly
                          ? (pt
                              ? `Seu stop protegeu de perda pior em ${d.respProtect.length} de ${d.respStop.length} vezes (${pct}%).`
                              : `Your stop protected you from a worse loss ${d.respProtect.length} of ${d.respStop.length} times (${pct}%).`)
                          : (pt
                              ? `O preço reverteu depois do stop em ${d.respReverse.length} de ${d.respStop.length} vezes.`
                              : `Price reversed after the stop ${d.respReverse.length} of ${d.respStop.length} times.`)}
                      </p>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        {mostly
                          ? (pt
                              ? `Ver o preço reverter dói — mas aconteceu em apenas ${100 - pct}% das vezes. Bom gerenciamento de risco.`
                              : `Watching price reverse hurts — but that happened only ${100 - pct}% of the time. Good risk management.`)
                          : (pt
                              ? "Doloroso — mas o stop impediu uma perda ainda maior?"
                              : "Painful — but did the stop prevent an even bigger loss?")}
                      </p>
                      <SampleNote n={d.respStop.length} />
                    </div>
                  );
                })() : <TooSmall />}
              </>
            )}

            {d.trailing.length > 0 && (
              <>
                <p className="text-xs text-slate-600 uppercase tracking-wider pb-1 pt-3">{pt ? "Stop móvel (trailing)" : "Trailing stop"}</p>
                {d.trailProtect.length > 0 && (
                  <CountRow label={pt ? "→ Protegeu — perda menor / lucro garantido" : "→ Protected — smaller loss / locked profit"} count={d.trailProtect.length} countColor="text-green-400" />
                )}
                {d.trailTight.length > 0 && (
                  <CountRow label={pt ? "→ Curto demais — alvo atingido depois" : "→ Too tight — target hit after"} count={d.trailTight.length} countColor="text-amber-400" />
                )}
                {d.trailing.length < 3 && <TooSmall />}
              </>
            )}

            {d.panic.length > 0 && (
              <>
                <p className="text-xs text-slate-600 uppercase tracking-wider pb-1 pt-3">{pt ? "Pânico" : "Panic"}</p>
                <CountRow label={pt ? "Saída por pânico" : "Panic exit"} count={d.panic.length} countColor="text-red-400" />
                {d.panic.length >= 2 && (
                  <p className="text-xs text-amber-400 leading-relaxed mt-2">
                    {pt
                      ? `${d.panic.length} saída${d.panic.length !== 1 ? "s" : ""} por pânico registrada${d.panic.length !== 1 ? "s" : ""}. Saídas por pânico nunca fazem parte de um plano — e nunca ensinam nada.`
                      : `${d.panic.length} panic exit${d.panic.length !== 1 ? "s" : ""} logged. Panic exits are never part of a plan — and they never teach you anything.`}
                  </p>
                )}
              </>
            )}
          </BehSection>
        )}

        {/* Target optimization */}
        {targetCount > 0 && (
          <BehSection title={pt ? "Otimização de alvos" : "Target optimization"} count={targetCount}>
            {d.tgtNotHit.length > 0 && (
              <>
                <p className="text-xs text-slate-600 uppercase tracking-wider pb-1 pt-1">{pt ? "Alvo não atingido" : "Target not hit"}</p>
                {d.tgtNeverOnside.length > 0 && (
                  <CountRow label={pt ? "→ Nunca favorável" : "→ Never onside"} count={d.tgtNeverOnside.length} countColor="text-red-400" />
                )}
                {d.tgtOnsideBE.length > 0 && (
                  <CountRow label={pt ? "→ Favorável → reverteu ao BE" : "→ Onside → reversed to BE"} count={d.tgtOnsideBE.length} countColor="text-amber-400" />
                )}
                {d.tgtOnsideLoss.length > 0 && (
                  <CountRow label={pt ? "→ Favorável → reverteu à perda" : "→ Onside → reversed to loss"} count={d.tgtOnsideLoss.length} countColor="text-red-400" />
                )}
                {d.tgtNotHit.length >= 3 ? (() => {
                  const gaveBack = d.tgtOnsideBE.length + d.tgtOnsideLoss.length;
                  const neverThere = d.tgtNeverOnside.length;
                  const gaveBackPct = Math.round((gaveBack / d.tgtNotHit.length) * 100);
                  const setupIssue = neverThere >= gaveBack;
                  return (
                    <div className="mt-2 space-y-1.5">
                      <p className="text-xs text-slate-400 leading-relaxed font-medium">
                        {setupIssue
                          ? (pt
                              ? `A maioria (${neverThere}×) nunca foi favorável.`
                              : `Most (${neverThere}×) never went onside.`)
                          : (pt
                              ? `Você estava favorável mas devolveu em ${gaveBackPct}% dos casos.`
                              : `You were onside but gave it back in ${gaveBackPct}% of cases.`)}
                      </p>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        {setupIssue
                          ? (pt
                              ? "O setup pode ser a questão — não apenas o gerenciamento."
                              : "The setup itself may be the question — not just your management.")
                          : (pt
                              ? "Seu gerenciamento depois de estar favorável está te custando dinheiro."
                              : "Your management after going onside is costing you money.")}
                      </p>
                      <SampleNote n={d.tgtNotHit.length} />
                    </div>
                  );
                })() : <TooSmall />}
              </>
            )}

            {d.earlyExit.length > 0 && (
              <>
                <p className="text-xs text-slate-600 uppercase tracking-wider pb-1 pt-3">{pt ? "Saída prematura" : "Early exit"}</p>
                {d.earlyExitHit.length > 0 && (
                  <CountRow label={pt ? "→ Alvo foi atingido depois" : "→ Target was hit after"} count={d.earlyExitHit.length} countColor="text-amber-400" />
                )}
                {d.earlyExitNotHit.length > 0 && (
                  <CountRow label={pt ? "→ Alvo NÃO foi atingido" : "→ Target NOT hit"} count={d.earlyExitNotHit.length} countColor="text-green-400" />
                )}
                {d.earlyExit.length >= 3 ? (() => {
                  const hitPct = Math.round((d.earlyExitHit.length / d.earlyExit.length) * 100);
                  const costly = d.earlyExitHit.length > d.earlyExit.length / 2;
                  return (
                    <div className="mt-2 space-y-1.5">
                      <p className={`text-xs leading-relaxed font-medium ${costly ? "text-amber-300" : "text-blue-300"}`}>
                        {costly
                          ? (pt
                              ? `Você saiu antes do alvo ${d.earlyExit.length} vezes — e o alvo foi atingido depois em ${hitPct}% delas.`
                              : `You exited early ${d.earlyExit.length} times — and the target was hit after in ${hitPct}% of those.`)
                          : (pt
                              ? `Alvo atingido depois da sua saída em apenas ${hitPct}% dos casos.`
                              : `Target hit after your exit in only ${hitPct}% of cases.`)}
                      </p>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        {costly
                          ? (pt
                              ? "Isso está te custando dinheiro. Seu alvo original pode estar mais certo do que você imagina."
                              : "That's costing you money. Your original target may be more right than you think.")
                          : (pt
                              ? "Suas saídas prematuras podem estar corretas — considere tornar esse ponto seu alvo real."
                              : "Your early exits may be right — consider making that level your actual target.")}
                      </p>
                      <SampleNote n={d.earlyExit.length} />
                    </div>
                  );
                })() : <TooSmall />}
              </>
            )}

            {d.lastTarget.length > 0 && (
              <>
                <p className="text-xs text-slate-600 uppercase tracking-wider pb-1 pt-3">{pt ? "Último alvo" : "Last target"}</p>
                {d.lastOptimal.length > 0 && (
                  <CountRow label={pt ? "→ Saída ótima" : "→ Optimal exit"} count={d.lastOptimal.length} countColor="text-green-400" />
                )}
                {d.lastKept.length > 0 && (
                  <CountRow label={pt ? "→ Preço continuou — deixei dinheiro na mesa" : "→ Price kept going — left money on table"} count={d.lastKept.length} countColor="text-amber-400" />
                )}
                {d.lastDelayWorse.length > 0 && (
                  <CountRow label={pt ? "→ Saída atrasada — resultado pior que o plano" : "→ Delayed exit — worse than plan"} count={d.lastDelayWorse.length} countColor="text-red-400" />
                )}
                {d.lastDelayBetter.length > 0 && (
                  <CountRow label={pt ? "→ Saída atrasada — resultado melhor que o plano" : "→ Delayed exit — better than plan"} count={d.lastDelayBetter.length} countColor="text-green-400" />
                )}
                {d.lastTarget.length >= 3 ? (() => {
                  const keptPct = Math.round((d.lastKept.length / d.lastTarget.length) * 100);
                  const delayWorsePct = Math.round((d.lastDelayWorse.length / d.lastTarget.length) * 100);
                  let finding, moral;
                  if (d.lastDelayWorse.length >= 2 && d.lastDelayWorse.length >= d.lastKept.length) {
                    finding = pt
                      ? `Ficou além do plano ${d.lastDelayWorse.length} vezes — e o resultado foi pior (${delayWorsePct}% dos casos).`
                      : `You stayed beyond plan ${d.lastDelayWorse.length} times — and it was worse (${delayWorsePct}% of cases).`;
                    moral = pt
                      ? "O dado sugere: quando você atinge seu último alvo, saia. A ganância extra tem um custo."
                      : "The data suggests: when you hit your last target, exit. The extra greed has a cost.";
                  } else if (keptPct > 40 && d.lastKept.length >= 2) {
                    finding = pt
                      ? `Preço continuou além do seu último alvo em ${keptPct}% das operações (${d.lastKept.length}×).`
                      : `Price kept going past your last target in ${keptPct}% of trades (${d.lastKept.length}×).`;
                    moral = pt
                      ? "Considere adicionar um runner ao seu plano para capturar mais do movimento sem mudar sua estrutura."
                      : "Consider adding a runner to your plan to capture more of the move without changing your structure.";
                  } else {
                    finding = pt
                      ? `${d.lastOptimal.length}× saída ótima em ${d.lastTarget.length} operações.`
                      : `${d.lastOptimal.length}× optimal exit out of ${d.lastTarget.length} trades.`;
                    moral = pt
                      ? "Seu gerenciamento no último alvo parece bem calibrado."
                      : "Your last-target management looks well calibrated.";
                  }
                  return (
                    <div className="mt-2 space-y-1.5">
                      <p className="text-xs text-slate-400 leading-relaxed font-medium">{finding}</p>
                      <p className="text-xs text-slate-400 leading-relaxed">{moral}</p>
                      <SampleNote n={d.lastTarget.length} />
                    </div>
                  );
                })() : <TooSmall />}
              </>
            )}

            {d.multiTarget.length > 0 && (
              <>
                <p className="text-xs text-slate-600 uppercase tracking-wider pb-1 pt-3">{pt ? "Múltiplos alvos" : "Multiple targets"}</p>
                {d.multiAll.length > 0 && (
                  <CountRow label={pt ? "→ Todos os alvos atingidos" : "→ All targets hit"} count={d.multiAll.length} countColor="text-green-400" />
                )}
                {d.multiPartial.length > 0 && (
                  <CountRow label={pt ? "→ Alvos parcialmente atingidos" : "→ Partial targets hit"} count={d.multiPartial.length} countColor="text-amber-400" />
                )}
                {d.multiTarget.length >= 3 ? (() => {
                  const partialPct = Math.round((d.multiPartial.length / d.multiTarget.length) * 100);
                  const allPct = Math.round((d.multiAll.length / d.multiTarget.length) * 100);
                  const mostlyPartial = d.multiPartial.length > d.multiAll.length;
                  return (
                    <div className="mt-2 space-y-1.5">
                      <p className="text-xs text-slate-400 leading-relaxed">
                        {mostlyPartial
                          ? (pt
                              ? `Alvos parcialmente atingidos em ${partialPct}% das operações. Seu último alvo pode estar muito ambicioso — os dados sugerem reduzir ou remover.`
                              : `Partial targets in ${partialPct}% of trades. Your last target may be too ambitious — the data suggests scaling back or removing it.`)
                          : (pt
                              ? `Todos os alvos foram atingidos em ${allPct}% das operações. Bom sinal — seu sizing está bem calibrado.`
                              : `All targets hit in ${allPct}% of trades. Good sign — your sizing looks well calibrated.`)}
                      </p>
                      <SampleNote n={d.multiTarget.length} />
                    </div>
                  );
                })() : <TooSmall />}
              </>
            )}
          </BehSection>
        )}

        {/* Revenge & excesses */}
        {issueCount > 0 && (
          <BehSection title={pt ? "Revenge e excessos" : "Revenge & excesses"} count={issueCount}>
            {[
              { label: pt ? "Vingança"              : "Revenge",     arr: d.revengeT,     split: d.revengeSplit     },
              { label: pt ? "Excesso de operações"  : "Overtrading", arr: d.overtradingT, split: d.overtradingSplit },
              { label: pt ? "Tamanho excessivo"     : "Oversizing",  arr: d.oversizingT,  split: d.oversizingSplit  },
            ].filter(({ arr }) => arr.length > 0).map(({ label, arr, split }) => (
              <div key={label} className="border-b border-slate-800 last:border-0 pb-2 mb-2 last:mb-0 last:pb-0">
                <div className="flex justify-between py-1.5">
                  <span className="text-sm text-slate-300">{label}</span>
                  <span className="text-sm text-red-400 font-bold">{arr.length}×</span>
                </div>
                {(split.trusted.length > 0 || split.random.length > 0) && (
                  <div className="pl-4 space-y-1">
                    {split.trusted.length > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">{pt ? "↳ Setup testado" : "↳ Trusted setup"}</span>
                        <span className="text-slate-400">
                          {wins(split.trusted)}W · {losses(split.trusted)}L{wr(split.trusted) !== null ? ` · ${wr(split.trusted)}%` : ""}
                        </span>
                      </div>
                    )}
                    {split.random.length > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-amber-700">{pt ? "↳ Aleatória" : "↳ Random"}</span>
                        <span className="text-amber-700">{split.random.length}× — {pt ? "sem aprendizado" : "no learning"}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            {(() => {
              const eligible = d.setupStats.filter(s => s.trades.length >= 3 && s.rate !== null);
              if (!eligible.length) return null;
              const best = eligible.reduce((a, b) => (b.rate > a.rate ? b : a));
              const profitable = eligible.filter(s => s.rate >= 50);
              const profWR = profitable.length > 1
                ? (() => { const all = profitable.flatMap(s => s.trades); return wr(all); })()
                : null;
              return (
                <Moral highlight text={
                  pt
                    ? `"${best.setup.name}" tem ${best.rate}% de acerto (${best.trades.length} operações).${profWR !== null ? ` Seus setups lucrativos têm ${profWR}% em conjunto.` : ""} Esse é o caminho mais rápido para recuperar — não tentar "salvar" trades ruins.`
                    : `"${best.setup.name}" has a ${best.rate}% win rate (${best.trades.length} trades).${profWR !== null ? ` Your profitable setups combined: ${profWR}%.` : ""} That's your fastest way to recover — not trying to "save" bad trades.`
                } />
              );
            })()}
            )}
          </BehSection>
        )}

      </div>

      <div className="mt-6 p-4 rounded-xl border border-slate-700 bg-slate-900/50">
        <p className="text-xs text-slate-500 leading-relaxed">{pt ? UNIVERSAL_REMINDER.pt : UNIVERSAL_REMINDER.en}</p>
      </div>
    </div>
  );
}

// ── Tab 3: Setups ─────────────────────────────────────────────────────────────

const VARIANT_BADGE = {
  a: "bg-blue-900/60 text-blue-300",
  b: "bg-purple-900/60 text-purple-300",
  c: "bg-green-900/60 text-green-300",
  d: "bg-amber-900/60 text-amber-300",
  e: "bg-rose-900/60 text-rose-300",
};

function SetupCard({ data, pt, wins, losses, wr }) {
  const { setup, trades, w, l, be, rate, freq, setupPnl, pnlCount, condStats } = data;
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
      <button onClick={() => setOpen(v => !v)} className="w-full px-4 py-4 text-left">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-200 leading-snug">{setup.name}</p>
            <p className="text-xs text-slate-500 mt-0.5">
              {trades.length} {pt ? "op" : "trades"} · {freq}% {pt ? "do total" : "of all trades"}
            </p>
          </div>
          <div className="flex items-center gap-2.5 flex-shrink-0 ml-3">
            <span className="text-xs text-slate-500 tabular-nums">{w}W · {l}L{be > 0 ? ` · ${be}BE` : ""}</span>
            {rate !== null && (
              <span className={`text-sm font-bold ${rate >= 50 ? "text-green-400" : "text-red-400"}`}>{rate}%</span>
            )}
            <span className="text-xs text-slate-600">{open ? "▲" : "▼"}</span>
          </div>
        </div>
      </button>

      {open && (
        <div className="border-t border-slate-800 px-4 pb-5">
          {/* P&L */}
          {pnlCount > 0 && (
            <div className="flex justify-between py-3 border-b border-slate-800 mb-3">
              <span className="text-xs text-slate-500">P&L ({pnlCount} {pt ? "op" : "trades"})</span>
              <span className={`text-sm font-bold ${setupPnl >= 0 ? "text-green-400" : "text-red-400"}`}>
                {setupPnl >= 0 ? "+" : ""}{setupPnl.toFixed(2)}
              </span>
            </div>
          )}

          {/* Conditions */}
          {condStats.length > 0 ? (
            condStats.map(({ cond, trades: condTrades, varStats }) => {
              const naCount = condTrades.length - varStats.reduce((s, v) => s + v.trades.length, 0);
              return (
                <div key={cond.id} className="mt-4 first:mt-2">
                  <p className="text-xs text-slate-500 mb-2 leading-snug">{cond.text}</p>
                  <div className="space-y-1.5">
                    {varStats.map(({ variant, trades: vt, w: vw, l: vl, rate: vrate }) => (
                      <div key={variant.id} className="flex items-center gap-2">
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${VARIANT_BADGE[variant.id?.toLowerCase()] || "bg-slate-800 text-slate-300"}`}>
                          {variant.label || variant.id?.toUpperCase()}
                        </span>
                        {vt.length > 0 ? (
                          <>
                            <span className="text-xs text-slate-500 tabular-nums">{vt.length}× · {vw}W · {vl}L</span>
                            {vrate !== null && (
                              <span className={`text-xs font-bold ${vrate >= 50 ? "text-green-400" : "text-red-400"}`}>{vrate}%</span>
                            )}
                          </>
                        ) : (
                          <span className="text-xs text-slate-700">0×</span>
                        )}
                      </div>
                    ))}
                    {naCount > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-1.5 py-0.5 rounded font-medium bg-slate-800 text-slate-600">N/A</span>
                        <span className="text-xs text-slate-700">{naCount}×</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-xs text-slate-600 pt-3">{pt ? "Sem condições definidas neste setup." : "No conditions defined for this setup."}</p>
          )}
        </div>
      )}
    </div>
  );
}

function SetupTab({ d, pt }) {
  if (d.setupStats.length === 0) {
    return (
      <div className="text-center py-16 px-6">
        <p className="text-slate-400 text-sm">
          {pt ? "Nenhum setup com operações registradas ainda." : "No setups with logged trades yet."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 pb-8">
      {d.setupStats.map(data => (
        <SetupCard key={data.setup.id} data={data} pt={pt} wins={d.wins} losses={d.losses} wr={d.wr} />
      ))}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const router = useRouter();
  const [lang]   = useState(() => getLang());
  const [token,  setToken]  = useState(null);
  const [trades, setTrades] = useState([]);
  const [setups, setSetups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("raw");
  const pt = lang === "pt";

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabaseBrowser.auth.getSession();
      if (!session) { router.push("/auth"); return; }
      setToken(session.access_token);
      try {
        const [tradesRes, setupsRes] = await Promise.all([
          fetch("/api/journal",        { headers: { Authorization: `Bearer ${session.access_token}` } }),
          fetch("/api/journal/setups", { headers: { Authorization: `Bearer ${session.access_token}` } }),
        ]);
        const tradesData = await tradesRes.json();
        const setupsData = await setupsRes.json();
        setTrades(Array.isArray(tradesData) ? tradesData : (tradesData.entries || []));
        setSetups(Array.isArray(setupsData) ? setupsData : []);
      } catch { setTrades([]); }
      finally  { setLoading(false); }
    }
    load();
  }, []);

  const d = !loading ? computeData(trades, setups) : null;

  const tabs = [
    { id: "raw",         en: "Raw Data",    pt: "Dados brutos"    },
    { id: "behavioural", en: "Behavioural", pt: "Comportamental"  },
    { id: "setups",      en: "Setups",      pt: "Setups"          },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="px-6 py-5 border-b border-slate-800">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <button onClick={() => router.push("/journal")} className="text-slate-400 hover:text-white text-sm transition-colors">
            ← {pt ? "Diário" : "Journal"}
          </button>
          <span className="text-sm font-semibold text-slate-200">{pt ? "Relatórios" : "Reports"}</span>
          <div className="w-16" />
        </div>
      </header>

      <main className="max-w-xl mx-auto px-6 py-6">
        {/* Tab nav */}
        <div className="flex gap-1 p-1 rounded-xl bg-slate-900 border border-slate-800 mb-6">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                tab === t.id ? "bg-slate-700 text-white" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              {pt ? t.pt : t.en}
            </button>
          ))}
        </div>

        {loading ? (
          <LoadingSpinner />
        ) : d.total === 0 ? (
          <div className="text-center py-16 px-6">
            <p className="text-3xl mb-3">📊</p>
            <p className="text-slate-300 font-medium mb-2">{pt ? "Nenhuma operação registrada" : "No trades logged yet"}</p>
            <p className="text-sm text-slate-500">{pt ? "Registre sua primeira operação para ver os relatórios." : "Log your first trade to see reports."}</p>
          </div>
        ) : tab === "raw"         ? <RawDataTab      d={d} pt={pt} />
          : tab === "behavioural" ? <BehaviouralTab   d={d} pt={pt} />
          :                         <SetupTab          d={d} pt={pt} />
        }
      </main>
    </div>
  );
}
