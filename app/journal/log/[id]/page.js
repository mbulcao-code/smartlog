"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { getLang } from "@/lib/i18n";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { PAINS, ENTRY_TYPE_LABELS, STOP_OUTCOME_LABELS, TARGET_OUTCOME_LABELS, OTHER_ISSUE_LABELS } from "@/lib/journal-helpers";

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

// Legacy after-trade labels (for trades saved with old keys before v2 wizard)
const LEGACY_AFTER_TRADE_LABELS = {
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
  const searchParams = useSearchParams();
  const isReceipt = searchParams.get("receipt") === "1";
  const [lang] = useState(() => getLang());
  const [entry, setEntry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [token, setToken] = useState(null);
  const [isPro, setIsPro] = useState(null); // null = unknown, true/false once loaded
  const [setupName, setSetupName] = useState(null);

  // Edit state
  const [editing, setEditing] = useState(false);
  const [editOutcome, setEditOutcome] = useState(null);
  const [editExitPrice, setEditExitPrice] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // Delete state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const pt = lang === "pt";

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabaseBrowser.auth.getSession();
      if (!session) { router.push("/auth"); return; }
      setToken(session.access_token);
      try {
        const [tradeRes, accessRes] = await Promise.all([
          fetch(`/api/journal/${params.id}`, {
            headers: { Authorization: `Bearer ${session.access_token}` },
          }),
          fetch("/api/check-access", {
            headers: { Authorization: `Bearer ${session.access_token}` },
          }),
        ]);
        if (tradeRes.status === 404) { setNotFound(true); setIsPro(false); return; }
        const data = await tradeRes.json();
        if (data.error) { setNotFound(true); setIsPro(false); return; }
        setEntry(data);
        const accessData = await accessRes.json();
        setIsPro(accessData.hasAccess === true);
        // Fetch setup name if trade has a setup
        if (data.setup_id) {
          try {
            const setupRes = await fetch(`/api/journal/setups/${data.setup_id}`, {
              headers: { Authorization: `Bearer ${session.access_token}` },
            });
            if (setupRes.ok) {
              const setupData = await setupRes.json();
              setSetupName(setupData.name || null);
            }
          } catch (_) { /* non-critical — setup name just stays null */ }
        }
      } catch (e) {
        console.error("Trade detail load error:", e);
        setNotFound(true);
        setIsPro(false);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [params.id]);

  function enterEditMode() {
    setEditOutcome(entry.outcome);
    setEditExitPrice(entry.exit_price ?? "");
    setEditNotes(entry.notes ?? "");
    setEditing(true);
  }

  async function handleSaveEdit() {
    if (saving) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/journal/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          outcome:    editOutcome,
          exit_price: editExitPrice,
          notes:      editNotes,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setEntry(data.entry);
      setEditing(false);
    } catch (e) {
      alert(pt ? "Erro ao salvar." : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (deleting) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/journal/${params.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      router.push("/journal");
    } catch (e) {
      alert(pt ? "Erro ao excluir." : "Failed to delete.");
      setDeleting(false);
    }
  }

  if (loading || isPro === null) return <LoadingSpinner />;

  // Free user revisiting an old trade (not a fresh receipt) → paywall gate
  if (!isPro && !isReceipt) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center gap-6 px-6 text-center">
        <div className="text-4xl">🔒</div>
        <div>
          <h2 className="text-lg font-semibold text-white mb-2">
            {pt ? "Acesse suas operações com o plano Pro" : "Access your trades with Pro"}
          </h2>
          <p className="text-sm text-slate-400 leading-relaxed max-w-xs">
            {pt
              ? "Você pode registrar operações gratuitamente. Para visualizar seu histórico e relatórios completos, desbloqueie o Pro."
              : "You can log trades for free. To view your full history and reports, unlock Pro."}
          </p>
        </div>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button
            onClick={() => router.push("/subscribe")}
            className="w-full py-3 rounded-xl bg-blue-500 hover:bg-blue-400 text-white text-sm font-medium transition-colors"
          >
            {pt ? "Ver planos →" : "See plans →"}
          </button>
          <button
            onClick={() => router.push("/subscribe?demo=1")}
            className="w-full py-3 rounded-xl border border-slate-700 hover:border-slate-500 text-slate-400 hover:text-white text-sm transition-colors"
          >
            {pt ? "Ver exemplo de relatório" : "See a sample report"}
          </button>
          <button
            onClick={() => router.push("/journal/log/new")}
            className="text-xs text-slate-600 hover:text-slate-400 transition-colors"
          >
            ← {pt ? "Registrar outra operação" : "Log another trade"}
          </button>
        </div>
      </div>
    );
  }

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

  // v2: structured after_trade from the new 7-step wizard
  const isV2 = !!(entry.after_trade?.entry_type);
  // mid-format: pain_types array (used before v2 wizard)
  const isNewFormat = !isV2 && Array.isArray(entry.pain_types) && entry.pain_types.length > 0;
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
          <button
            onClick={enterEditMode}
            className="text-xs px-3 py-1.5 rounded-full border border-slate-700 hover:border-slate-500 text-slate-400 hover:text-white transition-colors"
          >
            {pt ? "Editar" : "Edit"}
          </button>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-6 py-8">

        {/* Free plan receipt banner */}
        {!isPro && isReceipt && (
          <div className="mb-6 p-4 rounded-xl border border-blue-500/20 bg-blue-950/20">
            <p className="text-sm text-blue-300 font-medium mb-1">
              {pt ? "Operação registrada ✓" : "Trade logged ✓"}
            </p>
            <p className="text-xs text-slate-400 mb-3">
              {pt
                ? "Esta é sua visualização única. Para acessar todas as suas operações e relatórios completos, desbloqueie o Pro."
                : "This is your one-time view. To access all your trades and full reports, unlock Pro."}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => router.push("/subscribe")}
                className="text-xs px-3 py-1.5 rounded-full bg-blue-500 hover:bg-blue-400 text-white font-medium transition-colors"
              >
                {pt ? "Ver planos →" : "See plans →"}
              </button>
              <button
                onClick={() => router.push("/subscribe?demo=1")}
                className="text-xs px-3 py-1.5 rounded-full border border-slate-700 hover:border-slate-500 text-slate-400 hover:text-white transition-colors"
              >
                {pt ? "Ver relatório exemplo" : "Sample report"}
              </button>
            </div>
          </div>
        )}

        {/* Trade title */}
        <div className="mb-8">
          {/* Setup name — primary identifier */}
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">
            {pt ? "Setup" : "Setup"}
          </p>
          <h1 className="text-xl font-bold text-white mb-3">
            {setupName || <span className="italic text-slate-500">{pt ? "Sem setup" : "No setup"}</span>}
          </h1>
          {/* Direction + instrument + outcome as secondary info */}
          <div className="flex items-center gap-2 flex-wrap">
            {directionLabel && (
              <span className={`text-base font-semibold ${directionColor}`}>{directionLabel}</span>
            )}
            {entry.instrument && (
              <span className="text-base font-semibold text-slate-300">{entry.instrument}</span>
            )}
            {(directionLabel || entry.instrument) && (
              <span className="text-slate-700">·</span>
            )}
            <span className={`text-base font-semibold ${outcomeColor}`}>{outcomeLabel}</span>
          </div>
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

        {/* ── V2 behavioral section (new 7-step wizard) ── */}
        {isV2 && (() => {
          const at = entry.after_trade;
          const entryTypeMeta = ENTRY_TYPE_LABELS[at.entry_type];
          const stopMeta      = STOP_OUTCOME_LABELS[at.stop_outcome];
          const targetMeta    = TARGET_OUTCOME_LABELS[at.target_outcome];
          const otherIssues   = Array.isArray(at.other_issues) ? at.other_issues : [];

          return (
            <Section label={pt ? "Comportamento" : "Behavior"}>
              <div className="p-3 rounded-xl border border-slate-800 bg-slate-900">

                {/* Entry type */}
                {entryTypeMeta && (
                  <div className="flex items-baseline justify-between py-2 border-b border-slate-800">
                    <span className="text-xs text-slate-500">{pt ? "Tipo de entrada" : "Entry type"}</span>
                    <span className="text-sm text-slate-200">{pt ? entryTypeMeta.pt : entryTypeMeta.en}</span>
                  </div>
                )}

                {/* Level met after (only for early entry) */}
                {at.entry_type === "early" && at.level_met_after !== undefined && (
                  <div className="flex items-baseline justify-between py-2 border-b border-slate-800">
                    <span className="text-xs text-slate-500">{pt ? "Nível também atingido?" : "Level also hit?"}</span>
                    <span className={`text-sm font-medium ${at.level_met_after ? "text-amber-400" : "text-green-400"}`}>
                      {at.level_met_after
                        ? (pt ? "Sim — entrada cedo foi pior" : "Yes — early entry was worse")
                        : (pt ? "Não — única forma de entrar" : "No — only way to catch it")}
                    </span>
                  </div>
                )}

                {/* Stop outcome */}
                {stopMeta && (
                  <div className="flex items-baseline justify-between py-2 border-b border-slate-800">
                    <span className="text-xs text-slate-500">Stop</span>
                    <span className="text-sm text-slate-200">{pt ? stopMeta.pt : stopMeta.en}</span>
                  </div>
                )}

                {/* Target outcome */}
                {targetMeta && (
                  <div className="flex items-baseline justify-between py-2 border-b border-slate-800">
                    <span className="text-xs text-slate-500">{pt ? "Alvo" : "Target"}</span>
                    <span className="text-sm text-slate-200">{pt ? targetMeta.pt : targetMeta.en}</span>
                  </div>
                )}

                {/* Other issues */}
                {otherIssues.length > 0 && (
                  <div className="flex items-baseline justify-between py-2">
                    <span className="text-xs text-slate-500">{pt ? "Outros problemas" : "Other issues"}</span>
                    <span className="text-sm text-slate-200">
                      {otherIssues.map((id) => {
                        const m = OTHER_ISSUE_LABELS[id];
                        return m ? (pt ? m.pt : m.en) : id;
                      }).join(", ")}
                    </span>
                  </div>
                )}
              </div>
            </Section>
          );
        })()}

        {/* ── Mid-format behavioral data (pain_types array, pre-v2) ── */}
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

        {/* ── Legacy behavioral data (single pain_type) ── */}
        {!isV2 && !isNewFormat && entry.pain_type && (
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

        {/* Clean trade (mid-format only — v2 has no explicit clean label) */}
        {!isV2 && isClean && (
          <Section label={pt ? "Comportamento" : "Behavior"}>
            <p className="text-sm text-green-500">{pt ? "✓ Operação limpa" : "✓ Clean trade"}</p>
          </Section>
        )}

        {/* Legacy after-trade data (old keys, pre-v2) */}
        {!isV2 && entry.after_trade && Object.keys(entry.after_trade).length > 0 && (
          <Section label={pt ? "Pós-operação" : "After trade"}>
            <div className="p-3 rounded-xl border border-slate-800 bg-slate-900">
              {Object.entries(LEGACY_AFTER_TRADE_LABELS).map(([key, meta]) => {
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

        {/* P&L */}
        {entry.pnl !== null && entry.pnl !== undefined && (
          <Section label="P&L">
            <div className="p-3 rounded-xl border border-slate-800 bg-slate-900">
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-slate-500">{pt ? "Resultado ($)" : "Result ($)"}</span>
                <span className={`text-sm font-semibold ${entry.pnl > 0 ? "text-green-400" : entry.pnl < 0 ? "text-red-400" : "text-slate-400"}`}>
                  {entry.pnl > 0 ? "+" : ""}{entry.pnl.toFixed(2)}
                </span>
              </div>
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

        {/* Meta + delete */}
        <div className="mt-8 pt-4 border-t border-slate-800 flex items-center justify-between">
          <p className="text-xs text-slate-700">
            {pt ? "Registrado em" : "Logged"}{" "}
            {new Date(entry.logged_at).toLocaleString(pt ? "pt-BR" : "en-GB", {
              day: "2-digit", month: "short", year: "numeric",
              hour: "2-digit", minute: "2-digit",
            })}
          </p>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="text-xs text-slate-700 hover:text-red-400 transition-colors"
          >
            {pt ? "Excluir" : "Delete"}
          </button>
        </div>

      </main>

      {/* ── Edit modal ── */}
      {editing && (
        <div className="fixed inset-0 bg-black/70 flex items-end justify-center p-0 z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-t-2xl w-full max-w-xl p-6 pb-8">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-semibold">{pt ? "Editar operação" : "Edit trade"}</h3>
              <button onClick={() => setEditing(false)} className="text-slate-500 hover:text-white text-sm">✕</button>
            </div>

            {/* Outcome */}
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">{pt ? "Resultado" : "Outcome"}</p>
            <div className="grid grid-cols-3 gap-2 mb-5">
              {[
                { val: "win",       label: pt ? "Ganhou" : "Win",  active: "border-green-400 bg-green-950/30 text-green-300", inactive: "border-green-500/30 text-green-700" },
                { val: "loss",      label: pt ? "Perdeu" : "Loss", active: "border-red-400 bg-red-950/30 text-red-300",       inactive: "border-red-500/30 text-red-800"     },
                { val: "breakeven", label: "BE",                    active: "border-slate-400 bg-slate-800 text-slate-300",    inactive: "border-slate-700 text-slate-600"    },
              ].map((o) => (
                <button
                  key={o.val}
                  onClick={() => setEditOutcome(o.val)}
                  className={`py-3 rounded-xl border text-sm font-medium transition-all ${editOutcome === o.val ? o.active : o.inactive}`}
                >
                  {o.label}
                </button>
              ))}
            </div>

            {/* Exit price */}
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">{pt ? "Preço de saída" : "Exit price"}</p>
            <input
              type="number"
              step="any"
              value={editExitPrice}
              onChange={(e) => setEditExitPrice(e.target.value)}
              placeholder={pt ? "Opcional" : "Optional"}
              className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-600 focus:border-blue-500 focus:outline-none text-sm mb-5"
            />

            {/* Notes */}
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">{pt ? "Notas" : "Notes"}</p>
            <textarea
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              rows={3}
              placeholder={pt ? "Observações..." : "Observations..."}
              className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-600 focus:border-blue-500 focus:outline-none text-sm resize-none mb-5"
            />

            <button
              onClick={handleSaveEdit}
              disabled={saving || !editOutcome}
              className="w-full py-3 rounded-xl bg-blue-500 hover:bg-blue-400 disabled:opacity-40 text-white text-sm font-medium transition-colors"
            >
              {saving ? "..." : pt ? "Salvar →" : "Save →"}
            </button>
          </div>
        </div>
      )}

      {/* ── Delete confirm ── */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-6 z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-sm w-full">
            <h3 className="text-white font-semibold mb-2">{pt ? "Excluir operação?" : "Delete trade?"}</h3>
            <p className="text-sm text-slate-400 mb-6">
              {pt ? "Essa ação não pode ser desfeita." : "This action cannot be undone."}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-400 hover:text-white text-sm transition-colors"
              >
                {pt ? "Cancelar" : "Cancel"}
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-sm font-medium transition-colors"
              >
                {deleting ? "..." : pt ? "Excluir" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
