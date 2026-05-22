"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useParams } from "next/navigation";
import { getLang } from "@/lib/i18n";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { PAINS } from "@/lib/journal-helpers";

// ── Helpers ───────────────────────────────────────────────────────────────────

function LoadingSpinner() {
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

function Section({ label, children }) {
  return (
    <div className="mb-5">
      <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">{label}</p>
      {children}
    </div>
  );
}

function Field({ label, value, color }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex items-baseline justify-between py-2 border-b border-slate-800 last:border-0">
      <span className="text-xs text-slate-500">{label}</span>
      <span className={`text-sm font-medium ${color || "text-slate-200"}`}>{value}</span>
    </div>
  );
}

const VARIANT_COLORS = {
  A: "text-blue-400",
  B: "text-purple-400",
  C: "text-green-400",
  D: "text-amber-400",
  E: "text-cyan-400",
};

// Human-readable labels for after-trade keys
const AFTER_TRADE_LABELS = {
  stop_outcome: {
    en: "Stop",        pt: "Stop",
    values: {
      no:        { en: "Not hit",                           pt: "Não ativado"                         },
      protected: { en: "Hit — protected from bigger loss",  pt: "Ativado — protegeu de perda maior"   },
      reversal:  { en: "Hit — price reversed (painful)",    pt: "Ativado — preço reverteu (doloroso)" },
      panic:     { en: "Panic exit",                        pt: "Saída por pânico"                    },
    },
  },
  target_outcome: {
    en: "Target",      pt: "Alvo",
    values: {
      not_hit_offside_stop: { en: "Never onside — stopped out",       pt: "Nunca favorável — stopou"              },
      not_hit_onside_be:    { en: "Onside → back to breakeven",       pt: "Favorável → voltou ao ponto de entrada" },
      not_hit_onside_stop:  { en: "Onside → reversed and stopped",    pt: "Favorável → reverteu e stopou"         },
      hit_optimal:          { en: "Hit — optimal exit",               pt: "Atingido — saída ótima"                },
      hit_left_money:       { en: "Hit — price kept going after",     pt: "Atingido — preço continuou depois"     },
    },
  },
  setup_type: {
    en: "Trade type",  pt: "Tipo de operação",
    values: {
      repeatable:          { en: "Repeatable tested setup",    pt: "Setup testado e repetível" },
      planned_not_repeat:  { en: "Planned but not repeatable", pt: "Planejado mas não repetível" },
      random:              { en: "Random — no clear setup",    pt: "Aleatório — sem setup claro" },
    },
  },
  plan_deviation: {
    en: "Plan deviation", pt: "Desvio do plano",
    values: {
      no_followed: { en: "Followed the plan",        pt: "Seguiu o plano"             },
      yes_better:  { en: "Deviated — better result", pt: "Desviou — resultado melhor" },
      yes_worse:   { en: "Deviated — worse result",  pt: "Desviou — resultado pior"   },
      no_plan:     { en: "No plan",                  pt: "Sem plano"                  },
    },
  },
};

// Build human-readable behavior lines for a single pain entry (new tree)
function behaviorLinesNew(painType, behavior, pt) {
  const b = behavior || {};
  const lines = [];
  switch (painType) {
    case "fomo_early":
      if (b.entry_type === "waited") lines.push(pt ? "Esperou o nível / condições" : "Waited for level / conditions");
      if (b.entry_type === "early")  lines.push(pt ? "Entrou antes do nível" : "Entered before level");
      if (b.level_reached === true)  lines.push(pt ? "Nível foi atingido depois" : "Level was hit afterward");
      if (b.level_reached === false) lines.push(pt ? "Nível não foi atingido" : "Level was not hit");
      break;
    case "hesitation":
      if (b.setup_type === "predefined") lines.push(pt ? "Setup predefinido" : "Predefined setup");
      if (b.setup_type === "random")     lines.push(pt ? "Operação aleatória" : "Random trade");
      if (b.entry === "didnt_enter")     lines.push(pt ? "Não entrou" : "Didn't enter");
      if (b.entry === "entered")         lines.push(pt ? "Entrou mesmo assim" : "Entered anyway");
      if (b.no_entry_outcome === "missed")  lines.push(pt ? "Perdeu a oportunidade" : "Missed the opportunity");
      if (b.no_entry_outcome === "averted") lines.push(pt ? "Perda evitada" : "Loss averted");
      if (b.entry_price_quality === "worse")  lines.push(pt ? "Preço de entrada pior" : "Got a worse price");
      if (b.entry_price_quality === "better") lines.push(pt ? "Preço de entrada melhor" : "Got a better price");
      break;
    case "stop_tampering":
      if (b.tamper_result === "bigger_loss") lines.push(pt ? "Perda maior do que o planejado" : "Bigger loss than planned");
      if (b.tamper_result === "lesser_loss") lines.push(pt ? "Perda menor do que seria" : "Smaller loss than it would have been");
      if (b.tamper_result === "profit")      lines.push(pt ? "Virou lucro" : "Turned into a profit");
      break;
    case "early_exit":
      if (b.target_hit_after === true)  lines.push(pt ? "Alvo atingido depois da saída" : "Target hit after exit");
      if (b.target_hit_after === false) lines.push(pt ? "Alvo não foi atingido" : "Target not hit");
      break;
    case "other":
      if (b.sub_type === "revenge")     lines.push(pt ? "Vingança — tentando recuperar" : "Revenge — trying to make money back");
      if (b.sub_type === "overtrading") lines.push(pt ? "Excesso de operações" : "Overtrading");
      if (b.sub_type === "oversizing")  lines.push(pt ? "Tamanho excessivo de posição" : "Oversizing");
      if (b.has_tested_setup === "no")           lines.push(pt ? "Sem setup testado — trabalhar nisso urgente" : "No tested setup — needs immediate work");
      if (b.has_tested_setup === "yes_used")     lines.push(pt ? "Setup testado disponível e foi usado" : "Had a tested setup and used it");
      if (b.has_tested_setup === "yes_not_used") lines.push(pt ? "Setup testado disponível mas não foi usado" : "Had a tested setup but didn't use it");
      break;
  }
  return lines;
}

// Legacy behavior lines (old pain_type IDs)
function behaviorLinesLegacy(painType, behavior, pt) {
  const b = behavior || {};
  const lines = [];
  switch (painType) {
    case "fomo":
      if (b.entry_type === "early")  lines.push(pt ? "Entrou antes do nível" : "Entered before level");
      if (b.entry_type === "waited") lines.push(pt ? "Esperou o nível" : "Waited for level");
      if (b.level_reached === true)  lines.push(pt ? "Nível foi atingido depois" : "Level was hit afterward");
      if (b.level_reached === false) lines.push(pt ? "Nível não foi atingido" : "Level was not hit");
      break;
    case "stoploss":
      if (b.tampered === false) lines.push(pt ? "Stop mantido no lugar" : "Stop kept in place");
      if (b.tampered === true)  lines.push(pt ? "Stop foi movido" : "Stop was moved");
      if (b.tamper_outcome === "reversal")   lines.push(pt ? "Stop ativado → preço reverteu" : "Stop hit → price reversed");
      if (b.tamper_outcome === "protection") lines.push(pt ? "Stop ativado → protegeu de perda maior" : "Stop hit → protected from bigger loss");
      if (b.tamper_outcome === "still_open") lines.push(pt ? "Stop não ativado — ainda aberta" : "Stop not hit — still running");
      break;
    case "revenge":
      if (b.used_best_setup === true)  lines.push(pt ? "Usou o melhor setup" : "Used best setup");
      if (b.used_best_setup === false) lines.push(pt ? "Usou setup aleatório" : "Used random setup");
      break;
    case "exit":
      if (b.target_hit_after === true)  lines.push(pt ? "Alvo atingido depois da saída" : "Target hit after early exit");
      if (b.target_hit_after === false) lines.push(pt ? "Alvo não atingido após saída" : "Target not hit after exit");
      break;
    case "late":
      if (b.outcome_type === "missed")      lines.push(pt ? "Perdeu o movimento" : "Missed the move");
      if (b.outcome_type === "caught_late") lines.push(pt ? "Entrada tardia prejudicou R:R" : "Late entry hurt R:R");
      break;
    case "boredom":
      if (b.had_plan === false) lines.push(pt ? "Sem plano — criou um motivo" : "No plan — manufactured a reason");
      if (b.had_plan === true)  lines.push(pt ? "Tinha plano válido" : "Had a valid plan");
      break;
  }
  return lines;
}

// ── Page export ───────────────────────────────────────────────────────────────

export default function TradeDetailPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <TradeDetailContent />
    </Suspense>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

function TradeDetailContent() {
  const router = useRouter();
  const params = useParams();
  const [lang] = useState(() => getLang());
  const [entry, setEntry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const pt = lang === "pt";

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabaseBrowser.auth.getSession();
      if (!session) { router.push("/auth"); return; }
      try {
        const res = await fetch(`/api/journal/${params.id}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (res.status === 404) { setNotFound(true); return; }
        const data = await res.json();
        if (data.error) { setNotFound(true); return; }
        setEntry(data);
      } catch (e) {
        console.error("Trade detail load error:", e);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [params.id]);

  if (loading) return <LoadingSpinner />;

  if (notFound) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center gap-4">
        <p className="text-slate-400 text-sm">{pt ? "Operação não encontrada." : "Trade not found."}</p>
        <button onClick={() => router.push("/journal")} className="text-blue-400 text-sm hover:text-blue-300 transition-colors">
          ← {pt ? "Voltar ao diário" : "Back to journal"}
        </button>
      </div>
    );
  }

  // ── Derived values ──────────────────────────────────────────────────────────

  const outcomeColor =
    entry.outcome === "win"  ? "text-green-400"
    : entry.outcome === "loss" ? "text-red-400"
    : "text-slate-400";

  const outcomeLabel =
    entry.outcome === "win"  ? (pt ? "Ganhou" : "Win")
    : entry.outcome === "loss" ? (pt ? "Perdeu" : "Loss")
    : "BE";

  const directionLabel =
    entry.direction === "long"  ? "↑ Long"
    : entry.direction === "short" ? "↓ Short"
    : null;

  const directionColor =
    entry.direction === "long"  ? "text-green-400"
    : entry.direction === "short" ? "text-red-400"
    : "text-slate-400";

  const tradeDate = entry.trade_date
    ? new Date(entry.trade_date + "T12:00:00").toLocaleDateString(
        pt ? "pt-BR" : "en-GB",
        { day: "numeric", month: "long", year: "numeric" }
      )
    : new Date(entry.logged_at).toLocaleDateString(
        pt ? "pt-BR" : "en-GB",
        { day: "numeric", month: "long", year: "numeric" }
      );

  // Determine if this is a new-format (pain_types array) or legacy record
  const isNewFormat = Array.isArray(entry.pain_types) && entry.pain_types.length > 0;
  const isClean = isNewFormat
    ? entry.pain_types.includes("clean")
    : !entry.pain_type;

  // ── Render ──────────────────────────────────────────────────────────────────

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
          <span className="text-sm font-medium text-slate-400">{tradeDate}</span>
          <div className="w-16" />
        </div>
      </header>

      <main className="max-w-xl mx-auto px-6 py-8">

        {/* Trade title */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            {directionLabel && (
              <span className={`text-2xl font-bold ${directionColor}`}>{directionLabel}</span>
            )}
            {entry.instrument && (
              <span className="text-2xl font-bold text-white">{entry.instrument}</span>
            )}
            {!entry.instrument && !directionLabel && (
              <span className="text-lg font-semibold text-slate-400">
                {pt ? "Operação" : "Trade"}
              </span>
            )}
          </div>
          <span className={`text-lg font-semibold ${outcomeColor}`}>{outcomeLabel}</span>
        </div>

        {/* Prices */}
        {(entry.entry_price || entry.stop_price || entry.exit_price) && (
          <Section label={pt ? "Preços" : "Prices"}>
            <div className="p-3 rounded-xl border border-slate-800 bg-slate-900">
              <Field label={pt ? "Entrada" : "Entry"} value={entry.entry_price} />
              <Field label="Stop" value={entry.stop_price} />
              <Field label={pt ? "Saída" : "Exit"} value={entry.exit_price} />
              {entry.entry_price && entry.stop_price && entry.exit_price && (
                <div className="flex items-baseline justify-between py-2">
                  <span className="text-xs text-slate-500">R:R</span>
                  <span className={`text-sm font-medium ${
                    (Math.abs(entry.exit_price - entry.entry_price) / Math.abs(entry.stop_price - entry.entry_price)) >= 1
                      ? "text-green-400" : "text-red-400"
                  }`}>
                    {(Math.abs(entry.exit_price - entry.entry_price) / Math.abs(entry.stop_price - entry.entry_price)).toFixed(2)}R
                  </span>
                </div>
              )}
            </div>
          </Section>
        )}

        {/* Setup execution */}
        {entry.conditions_met?.length > 0 && (
          <Section label={pt ? "Execução do setup" : "Setup execution"}>
            <div className="flex flex-col gap-2">
              {entry.conditions_met.map((c, i) => (
                <div key={i} className="flex items-start justify-between gap-3 p-3 rounded-xl border border-slate-800 bg-slate-900">
                  <p className="text-sm text-slate-300 flex-1">{c.text}</p>
                  <span className={`text-xs font-bold flex-shrink-0 ${
                    c.selected_variant ? (VARIANT_COLORS[c.selected_variant] || "text-slate-400") : "text-slate-600"
                  }`}>
                    {c.selected_variant
                      ? `${c.selected_variant}${c.selected_description ? ` · ${c.selected_description}` : ""}`
                      : "N/A"}
                  </span>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Behavioral data — new format (multiple pains) */}
        {isNewFormat && !isClean && (
          <Section label={pt ? "Ocorrências" : "Pains"}>
            <div className="flex flex-col gap-2">
              {entry.pain_types.map((painId, i) => {
                const info = PAINS.find((p) => p.id === painId);
                const beh = entry.behaviors?.[painId] || {};
                const lines = behaviorLinesNew(painId, beh, pt);
                return (
                  <div key={i} className="p-3 rounded-xl border border-slate-800 bg-slate-900">
                    <p className="text-sm font-medium text-slate-200 mb-1">
                      {info ? (pt ? info.pt : info.en) : painId}
                    </p>
                    {lines.map((line, j) => (
                      <p key={j} className="text-xs text-slate-500 leading-relaxed">→ {line}</p>
                    ))}
                  </div>
                );
              })}
            </div>
          </Section>
        )}

        {/* Behavioral data — legacy format (single pain) */}
        {!isNewFormat && entry.pain_type && (
          <Section label={pt ? "Comportamento" : "Behavior"}>
            <div className="p-3 rounded-xl border border-slate-800 bg-slate-900">
              <p className="text-sm font-medium text-slate-200 mb-2">
                {PAINS.find((p) => p.id === entry.pain_type)?.[pt ? "pt" : "en"] || entry.pain_type}
              </p>
              {behaviorLinesLegacy(entry.pain_type, entry.behavior, pt).map((line, i) => (
                <p key={i} className="text-xs text-slate-500 leading-relaxed">→ {line}</p>
              ))}
            </div>
          </Section>
        )}

        {/* Clean trade */}
        {isClean && (
          <Section label={pt ? "Comportamento" : "Behavior"}>
            <p className="text-sm text-green-500">{pt ? "✓ Operação limpa" : "✓ Clean trade"}</p>
          </Section>
        )}

        {/* After-trade data */}
        {entry.after_trade && Object.keys(entry.after_trade).length > 0 && (
          <Section label={pt ? "Pós-operação" : "After trade"}>
            <div className="p-3 rounded-xl border border-slate-800 bg-slate-900">
              {Object.entries(AFTER_TRADE_LABELS).map(([key, meta]) => {
                const val = entry.after_trade[key];
                if (!val) return null;
                const label = meta.values[val];
                return (
                  <div key={key} className="flex items-baseline justify-between py-2 border-b border-slate-800 last:border-0">
                    <span className="text-xs text-slate-500">{pt ? meta.pt : meta.en}</span>
                    <span className="text-sm text-slate-200">{label ? (pt ? label.pt : label.en) : val}</span>
                  </div>
                );
              })}
            </div>
          </Section>
        )}

        {/* Notes */}
        {entry.notes && (
          <Section label={pt ? "Notas" : "Notes"}>
            <p className="text-sm text-slate-300 leading-relaxed p-3 rounded-xl border border-slate-800 bg-slate-900">
              {entry.notes}
            </p>
          </Section>
        )}

        {/* Meta */}
        <div className="mt-8 pt-4 border-t border-slate-800">
          <p className="text-xs text-slate-700 text-center">
            {pt ? "Registrado em" : "Logged"}{" "}
            {new Date(entry.logged_at).toLocaleString(pt ? "pt-BR" : "en-GB", {
              day: "2-digit", month: "short", year: "numeric",
              hour: "2-digit", minute: "2-digit",
            })}
          </p>
        </div>

      </main>
    </div>
  );
}
