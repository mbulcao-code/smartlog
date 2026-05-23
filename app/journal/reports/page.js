"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getLang } from "@/lib/i18n";
import { supabaseBrowser } from "@/lib/supabase-browser";

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

function Section({ title, children }) {
  return (
    <div className="mb-8">
      <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">{title}</p>
      {children}
    </div>
  );
}

function Card({ children }) {
  return <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">{children}</div>;
}

function StatRow({ label, wins, losses, total, winRate, note, pt }) {
  const wr = winRate ?? (total > 0 ? Math.round((wins / total) * 100) : null);
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-slate-800 last:border-0">
      <div className="min-w-0">
        <p className="text-sm text-slate-300">{label}</p>
        {note && <p className="text-xs text-slate-600 mt-0.5">{note}</p>}
      </div>
      <div className="flex items-center gap-3 flex-shrink-0 ml-3">
        <span className="text-xs text-slate-500 tabular-nums">
          {wins}W · {losses}L{total != null ? ` · ${total}` : ""}
        </span>
        {wr !== null && (
          <span className={`text-sm font-bold tabular-nums w-10 text-right ${wr >= 50 ? "text-green-400" : "text-red-400"}`}>
            {wr}%
          </span>
        )}
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

const UNIVERSAL_REMINDER = {
  en: "Confidence is not a feeling. It's a function of past performance. Trusted setups — profitable and repeatable — are the way to build reliable confidence. Size should reflect both profitability and sample size. A setup tested only 5 times is not enough. Grow your financial size with your sample size.",
  pt: "Confiança não é um estado de espírito. É uma função do desempenho passado. Setups testados e lucrativos são o caminho para construir confiança real. O tamanho da posição deve refletir tanto a lucratividade quanto o tamanho da amostragem. Um setup testado 5 vezes não é suficiente. Aumente seu tamanho financeiro com sua amostragem.",
};

// ── Compute report data from trades ──────────────────────────────────────────

function computeReportData(trades) {
  // Only v2 trades (have after_trade.entry_type)
  const v2 = trades.filter(t => t.after_trade?.entry_type);
  const total = trades.length;
  const v2Total = v2.length;

  // Overall by entry type
  const byEntry = { full_setup: [], early: [], hesitation: [], chase: [], random: [] };
  v2.forEach(t => {
    const et = t.after_trade.entry_type;
    if (et === "full_setup") byEntry.full_setup.push(t);
    else if (et === "early") byEntry.early.push(t);
    else if (et === "hesitation_better" || et === "hesitation_worse") byEntry.hesitation.push(t);
    else if (et === "chase_profit" || et === "chase_loss") byEntry.chase.push(t);
    else if (et === "random") byEntry.random.push(t);
  });

  function wr(arr) {
    if (!arr.length) return null;
    return Math.round((arr.filter(t => t.outcome === "win").length / arr.length) * 100);
  }
  function wins(arr) { return arr.filter(t => t.outcome === "win").length; }
  function losses(arr) { return arr.filter(t => t.outcome === "loss").length; }

  // FOMO
  const earlyTrades = byEntry.early;
  const earlyWithLevelMet = earlyTrades.filter(t => t.after_trade?.level_met_after === true);
  const earlyWithLevelNotMet = earlyTrades.filter(t => t.after_trade?.level_met_after === false);
  // "True missed opportunity" = early + level NOT met + trade was profitable (win)
  const trueMissedOpps = earlyWithLevelNotMet.filter(t => t.outcome === "win");
  // These are the real FOMO wins where waiting would have meant missing out
  const earlyWR = wr(earlyTrades);

  // Hesitation/chasing
  const hesitationBetter = v2.filter(t => t.after_trade.entry_type === "hesitation_better");
  const hesitationWorse  = v2.filter(t => t.after_trade.entry_type === "hesitation_worse");
  const chaseProfit      = v2.filter(t => t.after_trade.entry_type === "chase_profit");
  const chaseLoss        = v2.filter(t => t.after_trade.entry_type === "chase_loss");
  const allChase         = [...chaseProfit, ...chaseLoss];
  const allHesitation    = [...hesitationBetter, ...hesitationWorse];

  // Stop outcomes
  const stopTrades = v2.filter(t => t.after_trade?.stop_outcome);
  const stopChanged = stopTrades.filter(t => ["changed_worse","changed_smaller","changed_profit"].includes(t.after_trade.stop_outcome));
  const stopChangedWorse   = stopTrades.filter(t => t.after_trade.stop_outcome === "changed_worse");
  const stopChangedSmaller = stopTrades.filter(t => t.after_trade.stop_outcome === "changed_smaller");
  const stopChangedProfit  = stopTrades.filter(t => t.after_trade.stop_outcome === "changed_profit");
  const stopRespected = stopTrades.filter(t => ["respected_protected","respected_reversal"].includes(t.after_trade.stop_outcome));
  const stopProtected  = stopTrades.filter(t => t.after_trade.stop_outcome === "respected_protected");
  const stopReversal   = stopTrades.filter(t => t.after_trade.stop_outcome === "respected_reversal");
  const stopPanic      = stopTrades.filter(t => t.after_trade.stop_outcome === "panic");

  // Target outcomes
  const targetTrades = v2.filter(t => t.after_trade?.target_outcome);
  const earlyExits     = targetTrades.filter(t => ["early_not_hit","early_hit"].includes(t.after_trade.target_outcome));
  const earlyExitHit   = targetTrades.filter(t => t.after_trade.target_outcome === "early_hit");
  const earlyExitNoHit = targetTrades.filter(t => t.after_trade.target_outcome === "early_not_hit");
  const lastOptimal    = targetTrades.filter(t => t.after_trade.target_outcome === "last_optimal");
  const lastKeptGoing  = targetTrades.filter(t => t.after_trade.target_outcome === "last_kept_going");

  // Other issues
  const otherIssuesTrades = v2.filter(t => t.after_trade?.other_issues?.length > 0);
  const revengeT    = v2.filter(t => t.after_trade?.other_issues?.includes("revenge"));
  const overtradingT= v2.filter(t => t.after_trade?.other_issues?.includes("overtrading"));
  const oversizingT = v2.filter(t => t.after_trade?.other_issues?.includes("oversizing"));
  // For other issues: trusted (had a setup) vs random
  const otherWithSetup    = otherIssuesTrades.filter(t => t.setup_id);
  const otherWithoutSetup = otherIssuesTrades.filter(t => !t.setup_id);

  // P&L
  const pnlTrades = v2.filter(t => t.pnl != null);
  const totalPnl  = pnlTrades.reduce((sum, t) => sum + (parseFloat(t.pnl) || 0), 0);

  // P&L per setup
  const pnlBySetup = {};
  pnlTrades.forEach(t => {
    if (!t.setup_id) return;
    if (!pnlBySetup[t.setup_id]) pnlBySetup[t.setup_id] = { pnl: 0, count: 0 };
    pnlBySetup[t.setup_id].pnl += parseFloat(t.pnl) || 0;
    pnlBySetup[t.setup_id].count++;
  });

  return {
    total, v2Total,
    byEntry, wr, wins, losses,
    earlyTrades, earlyWR, earlyWithLevelMet, earlyWithLevelNotMet, trueMissedOpps,
    hesitationBetter, hesitationWorse, chaseProfit, chaseLoss, allChase, allHesitation,
    stopTrades, stopChanged, stopChangedWorse, stopChangedSmaller, stopChangedProfit,
    stopRespected, stopProtected, stopReversal, stopPanic,
    targetTrades, earlyExits, earlyExitHit, earlyExitNoHit, lastOptimal, lastKeptGoing,
    otherIssuesTrades, revengeT, overtradingT, oversizingT, otherWithSetup, otherWithoutSetup,
    pnlTrades, totalPnl, pnlBySetup,
  };
}

// ── Behavioral report ─────────────────────────────────────────────────────────

function BehavioralReport({ trades, setups, lang }) {
  const pt = lang === "pt";
  const d = computeReportData(trades);

  if (d.total < 3) {
    return (
      <div className="text-center py-16 px-6">
        <p className="text-3xl mb-3">📊</p>
        <p className="text-slate-300 font-medium mb-2">{pt ? "Dados insuficientes" : "Not enough data yet"}</p>
        <p className="text-sm text-slate-500">
          {pt ? `Você tem ${d.total} operação${d.total !== 1?"ões":""} registrada${d.total !== 1?"s":""}. Registre pelo menos 3 para ver os relatórios.`
               : `You have ${d.total} trade${d.total !== 1?"s":""} logged. Log at least 3 to see reports.`}
        </p>
      </div>
    );
  }

  if (d.v2Total === 0) {
    return (
      <div className="text-center py-16 px-6">
        <p className="text-slate-400 text-sm">{pt ? "Seus registros anteriores usam o formato antigo. Registre uma nova operação com o formulário atualizado para ver os relatórios." : "Your existing trades use the old format. Log a new trade with the updated form to see reports."}</p>
      </div>
    );
  }

  const allV2     = trades.filter(t => t.after_trade?.entry_type);
  const fullTrades = d.byEntry.full_setup;
  const incTrades  = [...d.byEntry.early, ...d.byEntry.hesitation, ...d.byEntry.chase];
  const randTrades = d.byEntry.random;

  return (
    <div className="space-y-2 pb-8">

      {/* ── OVERALL ── */}
      <Section title={pt ? "Visão geral" : "Overall"}>
        <Card>
          <StatRow label={pt ? "Total" : "Total"} wins={d.wins(allV2)} losses={d.losses(allV2)} total={allV2.length} pt={pt} />
          {fullTrades.length > 0 && (
            <StatRow label={pt ? "Setup completo" : "Full setup"} wins={d.wins(fullTrades)} losses={d.losses(fullTrades)} total={fullTrades.length} pt={pt} />
          )}
          {incTrades.length > 0 && (
            <StatRow label={pt ? "Incompleto / hesitação / perseguiu" : "Incomplete / hesitation / chased"} wins={d.wins(incTrades)} losses={d.losses(incTrades)} total={incTrades.length} pt={pt} />
          )}
          {randTrades.length > 0 && (
            <StatRow
              label={pt ? "Aleatória (sem setup)" : "Random (no setup)"}
              wins={d.wins(randTrades)} losses={d.losses(randTrades)} total={randTrades.length}
              note={pt ? "Você não pode aprender com operações aleatórias." : "You can't learn from random trades."}
              pt={pt}
            />
          )}
        </Card>
      </Section>

      {/* ── P&L ── */}
      {d.pnlTrades.length > 0 && (
        <Section title="P&L">
          <Card>
            <div className="flex items-center justify-between py-2.5 border-b border-slate-800">
              <span className="text-sm text-slate-300">{pt ? "P&L total" : "Total P&L"}</span>
              <span className={`text-sm font-bold ${d.totalPnl >= 0 ? "text-green-400" : "text-red-400"}`}>
                {d.totalPnl >= 0 ? "+" : ""}{d.totalPnl.toFixed(2)}
              </span>
            </div>
            {Object.entries(d.pnlBySetup).map(([sid, info]) => {
              const setup = setups.find(s => s.id === sid);
              return (
                <div key={sid} className="flex items-center justify-between py-2.5 border-b border-slate-800 last:border-0">
                  <span className="text-sm text-slate-400">{setup?.name || (pt ? "Setup desconhecido" : "Unknown setup")}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-600">{info.count} {pt ? "op." : "trades"}</span>
                    <span className={`text-sm font-bold ${info.pnl >= 0 ? "text-green-400" : "text-red-400"}`}>
                      {info.pnl >= 0 ? "+" : ""}{info.pnl.toFixed(2)}
                    </span>
                  </div>
                </div>
              );
            })}
            {fullTrades.length >= 3 && d.wins(fullTrades) / fullTrades.length > 0.5 && (
              <Moral pt={pt} highlight text={
                pt ? `Seu melhor setup (${fullTrades.length} operações) tem ${d.wr(fullTrades)}% de acerto. Esse é o caminho mais rápido para recuperar e crescer.`
                   : `Your best setup (${fullTrades.length} trades) has a ${d.wr(fullTrades)}% win rate. That's your fastest way to recover and grow.`
              } />
            )}
          </Card>
        </Section>
      )}

      {/* ── FOMO (entry question) ── */}
      {d.earlyTrades.length > 0 && (
        <Section title={pt ? "Entrada antecipada (FOMO)" : "Early entry (FOMO)"}>
          <Card>
            <div className="flex items-center justify-between py-2.5 border-b border-slate-800">
              <span className="text-sm text-slate-300">{pt ? "Entradas antecipadas" : "Early entries"}</span>
              <span className="text-sm font-bold text-slate-200">{d.earlyTrades.length}</span>
            </div>
            <div className="flex items-center justify-between py-2.5 border-b border-slate-800">
              <span className="text-sm text-slate-400">
                {pt ? "↳ Nível atingido depois" : "↳ Level reached after"}
              </span>
              <span className="text-sm text-slate-300">{d.earlyWithLevelMet.length}</span>
            </div>
            <div className="flex items-center justify-between py-2.5 border-b border-slate-800">
              <span className="text-sm text-slate-400">
                {pt ? "↳ Nível NÃO atingido" : "↳ Level NOT reached"}
              </span>
              <span className="text-sm text-slate-300">{d.earlyWithLevelNotMet.length}</span>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <div>
                <span className="text-sm text-slate-300">
                  {pt ? "Oportunidades realmente perdidas" : "Truly missed opportunities"}
                </span>
                <p className="text-xs text-slate-600 mt-0.5">
                  {pt ? "(entrada antecipada + nível não atingido + lucro)" : "(early + level not met + profit)"}
                </p>
              </div>
              <span className={`text-sm font-bold ${d.trueMissedOpps.length === 0 ? "text-green-400" : "text-amber-400"}`}>
                {d.trueMissedOpps.length}
              </span>
            </div>

            {d.earlyTrades.length >= 3 && (
              <>
                <Moral pt={pt} text={
                  pt ? `As verdadeiras oportunidades perdidas representam ${d.trueMissedOpps.length} de ${d.earlyTrades.length} entradas antecipadas.`
                     : `The truly missed opportunities represent ${d.trueMissedOpps.length} of ${d.earlyTrades.length} early entries.`
                } />
                {d.earlyWR !== null && d.earlyWR >= 50 && (
                  <Moral pt={pt} highlight text={
                    pt ? `Taxa de acerto de ${d.earlyWR}% nas entradas antecipadas. Considere transformar a entrada antecipada em uma variante oficial do seu setup.`
                       : `${d.earlyWR}% win rate on early entries. Consider making early entry an official variant of your setup.`
                  } />
                )}
                {d.earlyWR !== null && d.earlyWR < 50 && (
                  <Moral pt={pt} text={
                    pt ? `Taxa de acerto de ${d.earlyWR}% nas entradas antecipadas — abaixo do ponto de equilíbrio. Considere (a) abandonar esse comportamento ou (b) reduzir o tamanho (a "taxa do FOMO").`
                       : `${d.earlyWR}% win rate on early entries — below breakeven. Consider (a) abandoning this or (b) reducing size (the "FOMO fee").`
                  } />
                )}
              </>
            )}
          </Card>
        </Section>
      )}

      {/* ── Hesitation + Chasing ── */}
      {(d.allHesitation.length > 0 || d.allChase.length > 0) && (
        <Section title={pt ? "Hesitação e perseguição" : "Hesitation & chasing"}>
          <Card>
            {d.hesitationBetter.length > 0 && (
              <StatRow label={pt ? "Hesitação — preço melhor" : "Hesitation — better price"}
                wins={d.wins(d.hesitationBetter)} losses={d.losses(d.hesitationBetter)} total={d.hesitationBetter.length} pt={pt} />
            )}
            {d.hesitationWorse.length > 0 && (
              <StatRow label={pt ? "Hesitação — preço pior" : "Hesitation — worse price"}
                wins={d.wins(d.hesitationWorse)} losses={d.losses(d.hesitationWorse)} total={d.hesitationWorse.length} pt={pt} />
            )}
            {d.chaseProfit.length > 0 && (
              <StatRow label={pt ? "Perseguiu — lucro" : "Chased — profit"}
                wins={d.wins(d.chaseProfit)} losses={d.losses(d.chaseProfit)} total={d.chaseProfit.length} pt={pt} />
            )}
            {d.chaseLoss.length > 0 && (
              <StatRow label={pt ? "Perseguiu — perda" : "Chased — loss"}
                wins={d.wins(d.chaseLoss)} losses={d.losses(d.chaseLoss)} total={d.chaseLoss.length} pt={pt} />
            )}
            <Moral pt={pt} text={
              pt ? "Você não pode aprender de forma estruturada com comportamento aleatório. Se a hesitação ou perseguição funcionar com frequência, considere testá-la como variante de um setup."
                 : "You can't learn in a structured way from random behavior. If hesitation or chasing works consistently, consider testing it as a variant of a setup."
            } />
          </Card>
        </Section>
      )}

      {/* ── Stop outcomes ── */}
      {d.stopTrades.length > 0 && (
        <Section title={pt ? "Stops" : "Stops"}>
          <Card>
            {d.stopChanged.length > 0 && (
              <>
                <p className="text-xs text-slate-600 uppercase tracking-wider mb-2">{pt ? "Alterado" : "Changed"}</p>
                {d.stopChangedWorse.length > 0 && (
                  <div className="flex justify-between py-2 border-b border-slate-800">
                    <span className="text-sm text-slate-400">{pt ? "→ Perda maior" : "→ Worse loss"}</span>
                    <span className="text-sm text-red-400 font-medium">{d.stopChangedWorse.length}×</span>
                  </div>
                )}
                {d.stopChangedSmaller.length > 0 && (
                  <div className="flex justify-between py-2 border-b border-slate-800">
                    <span className="text-sm text-slate-400">{pt ? "→ Perda menor" : "→ Smaller loss"}</span>
                    <span className="text-sm text-green-400 font-medium">{d.stopChangedSmaller.length}×</span>
                  </div>
                )}
                {d.stopChangedProfit.length > 0 && (
                  <div className="flex justify-between py-2 border-b border-slate-800">
                    <span className="text-sm text-slate-400">{pt ? "→ Virou lucro" : "→ Turned to profit"}</span>
                    <span className="text-sm text-green-400 font-medium">{d.stopChangedProfit.length}×</span>
                  </div>
                )}
                {d.stopChanged.length >= 3 && (
                  <Moral pt={pt} text={
                    pt ? "Você não pode aprender com comportamento aleatório de stop. Mantenha-se fiel ao seu ponto de invalidação."
                       : "You can't learn from random stop behavior. Stick to your invalidation point."
                  } />
                )}
              </>
            )}

            {d.stopRespected.length > 0 && (
              <>
                <p className="text-xs text-slate-600 uppercase tracking-wider mt-4 mb-2">{pt ? "Respeitado" : "Respected"}</p>
                {d.stopProtected.length > 0 && (
                  <div className="flex justify-between py-2 border-b border-slate-800">
                    <span className="text-sm text-slate-400">{pt ? "→ Protegeu de perda pior" : "→ Protected from worse loss"}</span>
                    <span className="text-sm text-green-400 font-medium">{d.stopProtected.length}×</span>
                  </div>
                )}
                {d.stopReversal.length > 0 && (
                  <div className="flex justify-between py-2 border-b border-slate-800">
                    <span className="text-sm text-slate-400">{pt ? "→ Preço reverteu (doloroso)" : "→ Price reversed (painful)"}</span>
                    <span className="text-sm text-amber-400 font-medium">{d.stopReversal.length}×</span>
                  </div>
                )}
                {d.stopRespected.length >= 3 && (
                  <Moral pt={pt}
                    highlight={d.stopProtected.length > d.stopReversal.length}
                    text={
                      d.stopProtected.length > d.stopReversal.length
                        ? (pt ? "Seu stop protegeu mais vezes do que causou dor. Isso é bom gerenciamento de risco." : "Your stop protected you more often than it caused pain. That's good risk management.")
                        : (pt ? "O preço reverteu depois do seu stop mais vezes do que o stop protegeu. Considere revisar seu ponto de invalidação." : "Price reversed after your stop more often than your stop protected you. Consider reviewing your invalidation point.")
                    }
                  />
                )}
              </>
            )}

            {d.stopPanic.length > 0 && (
              <div className="flex justify-between py-2 mt-3 border-t border-slate-800">
                <span className="text-sm text-slate-400">{pt ? "Saída por pânico" : "Panic exits"}</span>
                <span className="text-sm text-red-400 font-medium">{d.stopPanic.length}×</span>
              </div>
            )}
          </Card>
        </Section>
      )}

      {/* ── Target optimization ── */}
      {d.targetTrades.length > 0 && (
        <Section title={pt ? "Otimização de alvos" : "Target optimization"}>
          <Card>
            {d.earlyExits.length > 0 && (
              <>
                <div className="flex justify-between py-2 border-b border-slate-800">
                  <span className="text-sm text-slate-400">{pt ? "Saída prematura (total)" : "Early exits (total)"}</span>
                  <span className="text-sm text-slate-300 font-medium">{d.earlyExits.length}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-800">
                  <span className="text-sm text-slate-400">{pt ? "↳ Alvo foi atingido depois" : "↳ Target was hit after"}</span>
                  <span className="text-sm text-amber-400 font-medium">{d.earlyExitHit.length}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-800">
                  <span className="text-sm text-slate-400">{pt ? "↳ Alvo não foi atingido" : "↳ Target not hit"}</span>
                  <span className="text-sm text-slate-300 font-medium">{d.earlyExitNoHit.length}</span>
                </div>
              </>
            )}
            {d.lastKeptGoing.length > 0 && (
              <div className="flex justify-between py-2 border-b border-slate-800">
                <span className="text-sm text-slate-400">{pt ? "Último alvo — preço continuou depois" : "Last target — price kept going"}</span>
                <span className="text-sm text-slate-300 font-medium">{d.lastKeptGoing.length}</span>
              </div>
            )}
            {d.lastOptimal.length > 0 && (
              <div className="flex justify-between py-2">
                <span className="text-sm text-slate-400">{pt ? "Último alvo — saída ótima" : "Last target — optimal exit"}</span>
                <span className="text-sm text-green-400 font-medium">{d.lastOptimal.length}</span>
              </div>
            )}

            {d.earlyExits.length >= 3 && (
              <Moral pt={pt}
                highlight={d.earlyExitHit.length > d.earlyExits.length / 2}
                text={
                  pt
                    ? `Em suas saídas prematuras, o alvo foi atingido depois em ${d.earlyExitHit.length} de ${d.earlyExits.length} vezes (${Math.round(d.earlyExitHit.length/d.earlyExits.length*100)}%). ${d.earlyExitHit.length > d.earlyExits.length / 2 ? "Suas saídas prematuras claramente custam dinheiro." : "Seus alvos raramente são atingidos depois — suas saídas podem estar corretas."}`
                    : `In your early exits, the target was hit after in ${d.earlyExitHit.length} of ${d.earlyExits.length} cases (${Math.round(d.earlyExitHit.length/d.earlyExits.length*100)}%). ${d.earlyExitHit.length > d.earlyExits.length / 2 ? "Your early exits are clearly costing you money." : "Your targets are rarely hit after — your exits may be correct."}`
                }
              />
            )}
            {d.lastKeptGoing.length >= 3 && d.targetTrades.length >= 5 && (
              <Moral pt={pt}
                highlight={d.lastKeptGoing.length > d.targetTrades.length * 0.4}
                text={
                  d.lastKeptGoing.length > d.targetTrades.length * 0.4
                    ? (pt ? `O preço continuou depois do seu último alvo em ${d.lastKeptGoing.length} vezes. Considere adicionar um runner (posição residual) ao seu plano.` : `Price kept going after your last target ${d.lastKeptGoing.length} times. Consider adding a runner (residual position) to your plan.`)
                    : (pt ? `O preço raramente continua depois do último alvo. Seu sizing atual pode estar bem calibrado.` : `Price rarely keeps going after the last target. Your current sizing may be well calibrated.`)
                }
              />
            )}
          </Card>
        </Section>
      )}

      {/* ── Other issues ── */}
      {d.otherIssuesTrades.length > 0 && (
        <Section title={pt ? "Outros problemas" : "Other issues"}>
          <Card>
            {d.revengeT.length > 0    && <div className="flex justify-between py-2 border-b border-slate-800"><span className="text-sm text-slate-400">{pt ? "Vingança" : "Revenge"}</span><span className="text-sm text-red-400 font-medium">{d.revengeT.length}×</span></div>}
            {d.overtradingT.length > 0 && <div className="flex justify-between py-2 border-b border-slate-800"><span className="text-sm text-slate-400">{pt ? "Excesso de operações" : "Overtrading"}</span><span className="text-sm text-amber-400 font-medium">{d.overtradingT.length}×</span></div>}
            {d.oversizingT.length > 0  && <div className="flex justify-between py-2 border-b border-slate-800"><span className="text-sm text-slate-400">{pt ? "Tamanho excessivo" : "Oversizing"}</span><span className="text-sm text-amber-400 font-medium">{d.oversizingT.length}×</span></div>}

            {d.otherWithSetup.length > 0 && (
              <div className="mt-3 pt-3 border-t border-slate-800">
                <StatRow label={pt ? "Com setup testado" : "With trusted setup"} wins={d.wins(d.otherWithSetup)} losses={d.losses(d.otherWithSetup)} total={d.otherWithSetup.length} pt={pt} />
              </div>
            )}
            {d.otherWithoutSetup.length > 0 && (
              <StatRow label={pt ? "Sem setup (aleatória)" : "No setup (random)"} wins={d.wins(d.otherWithoutSetup)} losses={d.losses(d.otherWithoutSetup)} total={d.otherWithoutSetup.length} pt={pt} />
            )}

            {fullTrades.length >= 3 && d.wr(fullTrades) !== null && (
              <Moral pt={pt} highlight text={
                pt ? `Seu setup testado tem ${d.wr(fullTrades)}% de acerto (${fullTrades.length} operações). Não é esse o caminho mais rápido para recuperar o dinheiro?`
                   : `Your trusted setup has a ${d.wr(fullTrades)}% win rate (${fullTrades.length} trades). Isn't that your fastest way to recover?`
              } />
            )}
          </Card>
        </Section>
      )}

      {/* ── Universal reminder ── */}
      <div className="mt-8 p-4 rounded-xl border border-slate-700 bg-slate-900/50">
        <p className="text-xs text-slate-500 leading-relaxed">{pt ? UNIVERSAL_REMINDER.pt : UNIVERSAL_REMINDER.en}</p>
      </div>

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
        headers: { Authorization: `Bearer ${token}`, "x-lang": lang },
      });
      const data = await res.json();
      if (data.error === "insufficient_data") { setError("insufficient_data"); }
      else if (data.error) { setError("generic"); }
      else { setReport(data.report); }
    } catch { setError("generic"); }
    finally { setLoading(false); }
  }

  if (totalTrades < 10) {
    return (
      <div className="text-center py-16 px-6">
        <p className="text-3xl mb-3">🤖</p>
        <p className="text-slate-300 font-medium mb-2">{pt ? "Análise IA disponível em breve" : "AI analysis coming soon"}</p>
        <p className="text-sm text-slate-500 mb-4">
          {pt ? `${totalTrades}/10 operações. São necessárias 10 para ativar a análise por IA.` : `${totalTrades}/10 trades. 10 needed to activate AI analysis.`}
        </p>
        <div className="w-48 mx-auto h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(100, (totalTrades/10)*100)}%` }} />
        </div>
      </div>
    );
  }

  if (!report && !loading) {
    return (
      <div className="text-center py-16 px-6">
        <p className="text-3xl mb-3">🤖</p>
        <p className="text-slate-300 font-medium mb-2">{pt ? "Síntese comportamental por IA" : "AI behavioral synthesis"}</p>
        <p className="text-sm text-slate-500 mb-6 max-w-xs mx-auto">
          {pt ? "O SmartLog analisa seus padrões e gera uma síntese baseada nos seus dados e nos princípios de trading disciplinado."
               : "SmartLog analyzes your patterns and generates a synthesis based on your data and disciplined trading principles."}
        </p>
        <button onClick={fetchReport} className="px-5 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-400 text-white text-sm font-medium transition-colors">
          {pt ? "Gerar análise" : "Generate analysis"}
        </button>
      </div>
    );
  }

  if (loading) return <div className="py-16 text-center"><LoadingSpinner /><p className="text-xs text-slate-500 mt-4">{pt ? "Analisando seus padrões…" : "Analyzing your patterns…"}</p></div>;

  if (error) return (
    <div className="text-center py-12">
      <p className="text-sm text-slate-400 mb-4">{pt ? "Erro ao gerar análise." : "Error generating analysis."}</p>
      <button onClick={fetchReport} className="text-sm text-blue-400 hover:text-blue-300">{pt ? "Tentar novamente" : "Try again"}</button>
    </div>
  );

  return (
    <div className="space-y-6 pb-8">
      <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
        <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{report}</p>
      </div>
      <div className="flex justify-end">
        <button onClick={fetchReport} className="text-xs text-slate-500 hover:text-slate-300 transition-colors">↻ {pt ? "Regenerar" : "Regenerate"}</button>
      </div>
      <div className="p-4 rounded-xl border border-slate-700 bg-slate-900/50">
        <p className="text-xs text-slate-500 leading-relaxed">{pt ? UNIVERSAL_REMINDER.pt : UNIVERSAL_REMINDER.en}</p>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const router = useRouter();
  const [lang] = useState(() => getLang());
  const [token, setToken] = useState(null);
  const [trades, setTrades] = useState([]);
  const [setups, setSetups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("behavioral");
  const pt = lang === "pt";

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabaseBrowser.auth.getSession();
      if (!session) { router.push("/auth"); return; }
      setToken(session.access_token);
      try {
        const [tradesRes, setupsRes] = await Promise.all([
          fetch("/api/journal", { headers: { Authorization: `Bearer ${session.access_token}` } }),
          fetch("/api/journal/setups", { headers: { Authorization: `Bearer ${session.access_token}` } }),
        ]);
        const tradesData = await tradesRes.json();
        const setupsData = await setupsRes.json();
        setTrades(Array.isArray(tradesData) ? tradesData : (tradesData.entries || []));
        setSetups(Array.isArray(setupsData) ? setupsData : []);
      } catch { setTrades([]); }
      finally { setLoading(false); }
    }
    load();
  }, []);

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

      <main className="max-w-xl mx-auto px-6 py-8">
        <div className="flex gap-1 p-1 rounded-xl bg-slate-900 border border-slate-800 mb-8">
          {[
            { id: "behavioral", en: "Behavioral", pt: "Comportamental" },
            { id: "ai",         en: "AI Summary", pt: "Síntese IA"     },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === t.id ? "bg-slate-700 text-white" : "text-slate-500 hover:text-slate-300"
              }`}>
              {pt ? t.pt : t.en}
            </button>
          ))}
        </div>

        {loading ? <LoadingSpinner /> :
          tab === "behavioral"
            ? <BehavioralReport trades={trades} setups={setups} lang={lang} />
            : <AIReport token={token} lang={lang} totalTrades={trades.length} />
        }
      </main>
    </div>
  );
}
