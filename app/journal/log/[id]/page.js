"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { getLang } from "@/lib/i18n";
import { supabaseBrowser } from "@/lib/supabase-browser";
import {
  PAINS,
  ENTRY_TYPE_LABELS,
  STOP_OUTCOME_LABELS,
  TARGET_OUTCOME_LABELS,
  TRADE_OUTCOME_LABELS,
  OTHER_ISSUE_LABELS,
} from "@/lib/journal-helpers";

// ── Small helpers ─────────────────────────────────────────────────────────────

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

// Section with optional inline edit button
function Section({ label, children, onEdit, pt }) {
  return (
    <div className="mb-5">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-slate-500 uppercase tracking-wider">{label}</p>
        {onEdit && (
          <button
            onClick={onEdit}
            className="text-xs text-slate-600 hover:text-blue-400 transition-colors px-1"
          >
            {pt ? "editar" : "edit"}
          </button>
        )}
      </div>
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

// Bottom-sheet modal wrapper
function BottomSheet({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/70 flex items-end justify-center z-50">
      <div className="bg-slate-900 border border-slate-700 rounded-t-2xl w-full max-w-xl p-6 pb-10">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-white font-semibold">{title}</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white text-sm">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function SaveBtn({ onSave, saving, disabled, pt }) {
  return (
    <button
      onClick={onSave}
      disabled={saving || disabled}
      className="w-full py-3 rounded-xl bg-blue-500 hover:bg-blue-400 disabled:opacity-40 text-white text-sm font-medium transition-colors mt-5"
    >
      {saving ? "..." : (pt ? "Salvar →" : "Save →")}
    </button>
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
    en: "Stop", pt: "Stop",
    values: {
      no:        { en: "Not hit",                           pt: "Não ativado"                         },
      protected: { en: "Hit — protected from bigger loss",  pt: "Ativado — protegeu de perda maior"   },
      reversal:  { en: "Hit — price reversed (painful)",    pt: "Ativado — preço reverteu (doloroso)" },
      panic:     { en: "Panic exit",                        pt: "Saída por pânico"                    },
    },
  },
  target_outcome: {
    en: "Target", pt: "Alvo",
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

// Derive entry category from entry_type value
function entryTypeToCategory(et) {
  if (et === "full_setup") return "full_setup";
  if (et === "early")      return "early";
  if (["hesitation_better","hesitation_worse","chase_profit","chase_loss"].includes(et)) return "late";
  if (et === "random")     return "random";
  return null;
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
  const router      = useRouter();
  const params      = useParams();
  const searchParams = useSearchParams();
  const isReceipt   = searchParams.get("receipt") === "1";
  const [lang]      = useState(() => getLang());
  const [entry, setEntry]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [token, setToken]     = useState(null);
  const [isPro, setIsPro]     = useState(null);
  const [setupName, setSetupName] = useState(null);
  const [allSetups, setAllSetups] = useState([]);

  // Which edit modal is open
  const [activeModal, setActiveModal] = useState(null); // "trade_info" | "outcome_pnl" | "behavior" | "notes"
  const [saving, setSaving] = useState(false);

  // ── Trade info edit state ─────────────────────────────────────────────────
  const [editSetupId,        setEditSetupId]        = useState(null);
  const [editDirection,      setEditDirection]      = useState(null);
  const [editTradeDate,      setEditTradeDate]      = useState("");
  const [editInstrument,     setEditInstrument]     = useState("");
  const [editLivePaper,      setEditLivePaper]      = useState(null);
  const [editInstrumentType, setEditInstrumentType] = useState(null);

  // ── Outcome + P&L edit state ──────────────────────────────────────────────
  const [editOutcome, setEditOutcome] = useState(null);
  const [editPnl,     setEditPnl]     = useState("");

  // ── Behavior edit state ───────────────────────────────────────────────────
  const [editEntryCategory,     setEditEntryCategory]     = useState(null);
  const [editEntryType,         setEditEntryType]         = useState(null);
  const [editLevelMetAfter,     setEditLevelMetAfter]     = useState(null);
  // v3 combined outcome (multi-select): { type → detail | null }
  const [editOutcomeSelections, setEditOutcomeSelections] = useState({});
  // v2 legacy (kept for backward compat edit of old trades)
  const [editStopOutcome,    setEditStopOutcome]    = useState(null);
  const [editTargetOutcome,  setEditTargetOutcome]  = useState(null);

  // ── Notes edit state ──────────────────────────────────────────────────────
  const [editNotes, setEditNotes] = useState("");

  // Delete
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const pt = lang === "pt";

  // ── Load data ─────────────────────────────────────────────────────────────

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabaseBrowser.auth.getSession();
      if (!session) { router.push("/auth"); return; }
      setToken(session.access_token);
      try {
        const [tradeRes, accessRes, setupsRes] = await Promise.all([
          fetch(`/api/journal/${params.id}`, {
            headers: { Authorization: `Bearer ${session.access_token}` },
          }),
          fetch("/api/check-access", {
            headers: { Authorization: `Bearer ${session.access_token}` },
          }),
          fetch("/api/journal/setups", {
            headers: { Authorization: `Bearer ${session.access_token}` },
          }),
        ]);

        if (tradeRes.status === 404) { setNotFound(true); setIsPro(false); return; }
        const data = await tradeRes.json();
        if (data.error) { setNotFound(true); setIsPro(false); return; }
        setEntry(data);

        const accessData = await accessRes.json();
        setIsPro(accessData.hasAccess === true);

        if (setupsRes.ok) {
          const setupsData = await setupsRes.json();
          // GET /api/journal/setups returns a plain array
          const list = Array.isArray(setupsData) ? setupsData : (setupsData.setups || []);
          setAllSetups(list);
          if (data.setup_id) {
            const found = list.find(s => s.id === data.setup_id);
            setSetupName(found?.name || null);
          }
        } else if (data.setup_id) {
          // Fallback: fetch individual setup
          try {
            const sr = await fetch(`/api/journal/setups/${data.setup_id}`, {
              headers: { Authorization: `Bearer ${session.access_token}` },
            });
            if (sr.ok) { const sd = await sr.json(); setSetupName(sd.name || null); }
          } catch (_) {}
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

  // ── Save helper ───────────────────────────────────────────────────────────

  async function saveField(updates) {
    if (saving) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/journal/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setEntry(data.entry);
      // Sync setup name if changed
      if ("setup_id" in updates) {
        if (updates.setup_id) {
          const found = allSetups.find(s => s.id === updates.setup_id);
          setSetupName(found?.name || null);
        } else {
          setSetupName(null);
        }
      }
      setActiveModal(null);
    } catch (e) {
      alert(pt ? "Erro ao salvar." : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  // ── Modal openers ─────────────────────────────────────────────────────────

  function openTradeInfo() {
    setEditSetupId(entry.setup_id || null);
    setEditDirection(entry.direction || null);
    setEditTradeDate(entry.trade_date || "");
    setEditInstrument(entry.instrument || "");
    setEditLivePaper(entry.live_paper || null);
    setEditInstrumentType(entry.instrument_type || null);
    setActiveModal("trade_info");
  }

  function openOutcomePnl() {
    setEditOutcome(entry.outcome);
    setEditPnl(entry.pnl !== null && entry.pnl !== undefined ? String(entry.pnl) : "");
    setActiveModal("outcome_pnl");
  }

  function openBehavior() {
    const at = entry.after_trade || {};
    const cat = entryTypeToCategory(at.entry_type);
    setEditEntryCategory(cat);
    setEditEntryType(at.entry_type || null);
    setEditLevelMetAfter(at.level_met_after ?? null);
    // load multi-outcome selections (handle both new array and old single formats)
    if (at.trade_outcomes?.length > 0) {
      const sel = {};
      at.trade_outcomes.forEach(o => { sel[o.type] = o.detail || null; });
      setEditOutcomeSelections(sel);
    } else if (at.trade_outcome_type) {
      setEditOutcomeSelections({ [at.trade_outcome_type]: at.trade_outcome_detail || null });
    } else {
      setEditOutcomeSelections({});
    }
    // v2 legacy fields
    setEditStopOutcome(at.stop_outcome || null);
    setEditTargetOutcome(at.target_outcome || null);
    setActiveModal("behavior");
  }

  function toggleEditOutcomeType(type) {
    setEditOutcomeSelections(prev => {
      const next = { ...prev };
      if (type in next) delete next[type];
      else next[type] = null;
      return next;
    });
  }

  function setEditOutcomeDetail(type, detail) {
    setEditOutcomeSelections(prev => ({ ...prev, [type]: detail }));
  }

  function openNotes() {
    setEditNotes(entry.notes || "");
    setActiveModal("notes");
  }

  // ── Save handlers ─────────────────────────────────────────────────────────

  function saveTradeInfo() {
    saveField({
      setup_id:        editSetupId,
      direction:       editDirection,
      trade_date:      editTradeDate || null,
      instrument:      editInstrument,
      live_paper:      editLivePaper      || null,
      instrument_type: editInstrumentType || null,
    });
  }

  function saveOutcomePnl() {
    saveField({
      outcome: editOutcome,
      pnl: editPnl !== "" ? editPnl : null,
    });
  }

  function saveBehavior() {
    const newAfterTrade = {
      ...(entry.after_trade || {}),
      entry_type:      editEntryType,
      level_met_after: editEntryCategory === "early" ? editLevelMetAfter : undefined,
      // multi-select outcomes
      trade_outcomes:       Object.entries(editOutcomeSelections).map(([type, detail]) => ({ type, detail: detail || null })),
      trade_outcome_type:   Object.keys(editOutcomeSelections)[0] || null,
      trade_outcome_detail: Object.values(editOutcomeSelections)[0] || null,
      // Clear v2 stop/target fields
      stop_outcome:   undefined,
      target_outcome: undefined,
    };
    Object.keys(newAfterTrade).forEach(k => newAfterTrade[k] === undefined && delete newAfterTrade[k]);
    saveField({ after_trade: newAfterTrade });
  }

  function canSaveBehavior() {
    if (!editEntryCategory) return false;
    if (editEntryCategory === "early" && editLevelMetAfter === null) return false;
    if (editEntryCategory === "late" && !editEntryType) return false;
    if (Object.keys(editOutcomeSelections).length === 0) return false;
    return Object.entries(editOutcomeSelections).every(([type, detail]) =>
      type === "panic_exit" || type === "no_stop" || detail !== null
    );
  }

  function saveNotes() {
    saveField({ notes: editNotes });
  }

  // ── Delete ────────────────────────────────────────────────────────────────

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

  // ── Entry category helper used in behavior edit modal ─────────────────────

  function selectEditCategory(cat) {
    setEditEntryCategory(cat);
    setEditLevelMetAfter(null);
    if (cat === "full_setup") setEditEntryType("full_setup");
    else if (cat === "random") setEditEntryType("random");
    else setEditEntryType(null);
  }

  // ── Guards ────────────────────────────────────────────────────────────────

  if (loading || isPro === null) return <LoadingSpinner />;

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
          <button onClick={() => router.push("/subscribe")}
            className="w-full py-3 rounded-xl bg-blue-500 hover:bg-blue-400 text-white text-sm font-medium transition-colors">
            {pt ? "Ver planos →" : "See plans →"}
          </button>
          <button onClick={() => router.push("/subscribe?demo=1")}
            className="w-full py-3 rounded-xl border border-slate-700 hover:border-slate-500 text-slate-400 hover:text-white text-sm transition-colors">
            {pt ? "Ver exemplo de relatório" : "See a sample report"}
          </button>
          <button onClick={() => router.push("/journal/log/new")}
            className="text-xs text-slate-600 hover:text-slate-400 transition-colors">
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

  // ── Derived display values ────────────────────────────────────────────────

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

  const isV3        = !!(entry.after_trade?.trade_outcome_type);
  const isV2        = !isV3 && !!(entry.after_trade?.entry_type);
  const isNewFormat = !isV3 && !isV2 && Array.isArray(entry.pain_types) && entry.pain_types.length > 0;
  const isClean     = isNewFormat
    ? entry.pain_types.includes("clean")
    : !entry.pain_type;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-950 text-white">

      {/* Header */}
      <header className="px-6 py-5 border-b border-slate-800">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <button onClick={() => router.push("/journal")}
            className="text-slate-400 hover:text-white text-sm transition-colors">
            ← {pt ? "Diário" : "Journal"}
          </button>
          <span className="text-sm font-medium text-slate-400">{tradeDate}</span>
          {/* Spacer to balance the back button */}
          <div className="w-16" />
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
              <button onClick={() => router.push("/subscribe")}
                className="text-xs px-3 py-1.5 rounded-full bg-blue-500 hover:bg-blue-400 text-white font-medium transition-colors">
                {pt ? "Ver planos →" : "See plans →"}
              </button>
              <button onClick={() => router.push("/subscribe?demo=1")}
                className="text-xs px-3 py-1.5 rounded-full border border-slate-700 hover:border-slate-500 text-slate-400 hover:text-white transition-colors">
                {pt ? "Ver relatório exemplo" : "Sample report"}
              </button>
            </div>
          </div>
        )}

        {/* Trade title + setup + direction ─────────────────────────────── */}
        <Section label={pt ? "Operação" : "Trade"} onEdit={openTradeInfo} pt={pt}>
          <div className="p-3 rounded-xl border border-slate-800 bg-slate-900">
            {/* Setup */}
            <div className="flex items-baseline justify-between py-2 border-b border-slate-800">
              <span className="text-xs text-slate-500">Setup</span>
              <span className="text-sm text-slate-200">
                {setupName || <span className="italic text-slate-600">{pt ? "Sem setup" : "No setup"}</span>}
              </span>
            </div>
            {/* Direction */}
            {entry.direction && (
              <div className="flex items-baseline justify-between py-2 border-b border-slate-800">
                <span className="text-xs text-slate-500">{pt ? "Direção" : "Direction"}</span>
                <span className={`text-sm font-semibold ${directionColor}`}>{directionLabel}</span>
              </div>
            )}
            {/* Instrument */}
            {entry.instrument && (
              <div className="flex items-baseline justify-between py-2 border-b border-slate-800">
                <span className="text-xs text-slate-500">{pt ? "Ativo" : "Instrument"}</span>
                <span className="text-sm text-slate-200">{entry.instrument}</span>
              </div>
            )}
            {/* Instrument type */}
            {entry.instrument_type && (
              <div className="flex items-baseline justify-between py-2 border-b border-slate-800">
                <span className="text-xs text-slate-500">{pt ? "Tipo" : "Type"}</span>
                <span className="text-sm text-slate-300 capitalize">
                  {entry.instrument_type === "options" ? (pt ? "Opções" : "Options")
                    : entry.instrument_type === "futures" ? (pt ? "Futuros" : "Futures")
                    : entry.instrument_type === "other" ? (pt ? "Outro" : "Other")
                    : "Spot"}
                </span>
              </div>
            )}
            {/* Live / Paper */}
            {entry.live_paper && (
              <div className="flex items-baseline justify-between py-2 border-b border-slate-800">
                <span className="text-xs text-slate-500">Live / Paper</span>
                <span className={`text-sm font-medium ${entry.live_paper === "live" ? "text-green-400" : "text-slate-400"}`}>
                  {entry.live_paper === "live" ? "🟢 Live" : "📄 Paper"}
                </span>
              </div>
            )}
            {/* Date */}
            <div className="flex items-baseline justify-between py-2">
              <span className="text-xs text-slate-500">{pt ? "Data" : "Date"}</span>
              <span className="text-sm text-slate-300">{tradeDate}</span>
            </div>
          </div>
        </Section>

        {/* Outcome + P&L ──────────────────────────────────────────────────── */}
        <Section label={pt ? "Resultado" : "Outcome"} onEdit={openOutcomePnl} pt={pt}>
          <div className="p-3 rounded-xl border border-slate-800 bg-slate-900">
            <div className="flex items-baseline justify-between py-2 border-b border-slate-800">
              <span className="text-xs text-slate-500">{pt ? "Resultado" : "Outcome"}</span>
              <span className={`text-sm font-semibold ${outcomeColor}`}>{outcomeLabel}</span>
            </div>
            {entry.pnl !== null && entry.pnl !== undefined && (
              <div className="flex items-baseline justify-between py-2">
                <span className="text-xs text-slate-500">P&amp;L ($)</span>
                <span className={`text-sm font-semibold ${entry.pnl > 0 ? "text-green-400" : entry.pnl < 0 ? "text-red-400" : "text-slate-400"}`}>
                  {entry.pnl > 0 ? "+" : ""}{Number(entry.pnl).toFixed(2)}
                </span>
              </div>
            )}
          </div>
        </Section>

        {/* Prices ──────────────────────────────────────────────────────────── */}
        {(entry.entry_price || entry.stop_price || entry.exit_price) && (
          <Section label={pt ? "Preços" : "Prices"} pt={pt}>
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

        {/* Setup execution (conditions) ────────────────────────────────────── */}
        {entry.conditions_met?.length > 0 && (
          <Section label={pt ? "Execução do setup" : "Setup execution"} pt={pt}>
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

        {/* ── V3 Behavior section (combined stop+target) ───────────────────── */}
        {isV3 && (() => {
          const at = entry.after_trade;
          const entryTypeMeta = ENTRY_TYPE_LABELS[at.entry_type];
          // handle both new multi-array and old single-value formats
          const outcomes = at.trade_outcomes?.length > 0
            ? at.trade_outcomes
            : (at.trade_outcome_type ? [{ type: at.trade_outcome_type, detail: at.trade_outcome_detail }] : []);
          const otherIssues = Array.isArray(at.other_issues) ? at.other_issues : [];
          return (
            <Section label={pt ? "Comportamento" : "Behavior"} onEdit={openBehavior} pt={pt}>
              <div className="p-3 rounded-xl border border-slate-800 bg-slate-900">
                {entryTypeMeta && (
                  <div className="flex items-baseline justify-between py-2 border-b border-slate-800">
                    <span className="text-xs text-slate-500">{pt ? "Tipo de entrada" : "Entry type"}</span>
                    <span className="text-sm text-slate-200">{pt ? entryTypeMeta.pt : entryTypeMeta.en}</span>
                  </div>
                )}
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
                {outcomes.map((o, i) => {
                  const oMeta = TRADE_OUTCOME_LABELS[o.type];
                  const dMeta = oMeta?.details?.[o.detail];
                  if (!oMeta) return null;
                  return (
                    <div key={i}>
                      <div className="flex items-baseline justify-between py-2 border-b border-slate-800">
                        <span className="text-xs text-slate-500">{i === 0 ? (pt ? "Operação" : "Trade") : ""}</span>
                        <span className="text-sm text-slate-200">{pt ? oMeta.pt : oMeta.en}</span>
                      </div>
                      {dMeta && (
                        <div className="flex items-baseline justify-between py-2 border-b border-slate-800">
                          <span className="text-xs text-slate-500">{pt ? "Detalhe" : "Detail"}</span>
                          <span className="text-sm text-slate-300">{pt ? dMeta.pt : dMeta.en}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
                {otherIssues.length > 0 && (
                  <div className="py-2">
                    <p className="text-xs text-slate-500 mb-2">{pt ? "Outros problemas" : "Other issues"}</p>
                    <div className="space-y-1.5">
                      {otherIssues.map((item, i) => {
                        const id = typeof item === "string" ? item : item.id;
                        const setupType = typeof item === "object" ? item.setup_type : null;
                        const customText = typeof item === "object" && item.id === "other" ? item.text : null;
                        const m = OTHER_ISSUE_LABELS[id];
                        const label = m ? (pt ? m.pt : m.en) : id;
                        return (
                          <div key={i} className="flex items-baseline justify-between">
                            <span className="text-sm text-slate-300">{customText || label}</span>
                            {setupType && (
                              <span className={`text-xs font-medium ${setupType === "trusted" ? "text-blue-400" : "text-amber-500"}`}>
                                {setupType === "trusted" ? (pt ? "Setup testado" : "Trusted setup") : (pt ? "Aleatória" : "Random")}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </Section>
          );
        })()}

        {/* ── V2 Behavior section (stop_outcome + target_outcome) ──────────── */}
        {isV2 && (() => {
          const at = entry.after_trade;
          const entryTypeMeta = ENTRY_TYPE_LABELS[at.entry_type];
          const stopMeta      = STOP_OUTCOME_LABELS[at.stop_outcome];
          const targetMeta    = TARGET_OUTCOME_LABELS[at.target_outcome];
          const otherIssues   = Array.isArray(at.other_issues) ? at.other_issues : [];
          return (
            <Section label={pt ? "Comportamento" : "Behavior"} onEdit={openBehavior} pt={pt}>
              <div className="p-3 rounded-xl border border-slate-800 bg-slate-900">
                {entryTypeMeta && (
                  <div className="flex items-baseline justify-between py-2 border-b border-slate-800">
                    <span className="text-xs text-slate-500">{pt ? "Tipo de entrada" : "Entry type"}</span>
                    <span className="text-sm text-slate-200">{pt ? entryTypeMeta.pt : entryTypeMeta.en}</span>
                  </div>
                )}
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
                {stopMeta && (
                  <div className="flex items-baseline justify-between py-2 border-b border-slate-800">
                    <span className="text-xs text-slate-500">Stop</span>
                    <span className="text-sm text-slate-200">{pt ? stopMeta.pt : stopMeta.en}</span>
                  </div>
                )}
                {targetMeta && (
                  <div className="flex items-baseline justify-between py-2 border-b border-slate-800">
                    <span className="text-xs text-slate-500">{pt ? "Alvo" : "Target"}</span>
                    <span className="text-sm text-slate-200">{pt ? targetMeta.pt : targetMeta.en}</span>
                  </div>
                )}
                {otherIssues.length > 0 && (
                  <div className="py-2">
                    <p className="text-xs text-slate-500 mb-2">{pt ? "Outros problemas" : "Other issues"}</p>
                    <div className="space-y-1.5">
                      {otherIssues.map((item, i) => {
                        const id = typeof item === "string" ? item : item.id;
                        const setupType = typeof item === "object" ? item.setup_type : null;
                        const customText = typeof item === "object" && item.id === "other" ? item.text : null;
                        const m = OTHER_ISSUE_LABELS[id];
                        const label = m ? (pt ? m.pt : m.en) : id;
                        return (
                          <div key={i} className="flex items-baseline justify-between">
                            <span className="text-sm text-slate-300">{customText || label}</span>
                            {setupType && (
                              <span className={`text-xs font-medium ${setupType === "trusted" ? "text-blue-400" : "text-amber-500"}`}>
                                {setupType === "trusted"
                                  ? (pt ? "Setup testado" : "Trusted setup")
                                  : (pt ? "Aleatória" : "Random")}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </Section>
          );
        })()}

        {/* ── Mid-format behavior (pain_types array, pre-v2) ───────────────── */}
        {isNewFormat && !isClean && (
          <Section label={pt ? "Ocorrências" : "Pains"} pt={pt}>
            <div className="flex flex-col gap-2">
              {entry.pain_types.map((painId, i) => {
                const info = PAINS.find((p) => p.id === painId);
                const beh  = entry.behaviors?.[painId] || {};
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

        {/* ── Legacy behavior (single pain_type) ───────────────────────────── */}
        {!isV2 && !isNewFormat && entry.pain_type && (
          <Section label={pt ? "Comportamento" : "Behavior"} pt={pt}>
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
        {!isV3 && !isV2 && isClean && (
          <Section label={pt ? "Comportamento" : "Behavior"} pt={pt}>
            <p className="text-sm text-green-500">{pt ? "✓ Operação limpa" : "✓ Clean trade"}</p>
          </Section>
        )}

        {/* Legacy after-trade data */}
        {!isV3 && !isV2 && entry.after_trade && Object.keys(entry.after_trade).length > 0 && (
          <Section label={pt ? "Pós-operação" : "After trade"} pt={pt}>
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

        {/* Notes ───────────────────────────────────────────────────────────── */}
        <Section label={pt ? "Notas" : "Notes"} onEdit={openNotes} pt={pt}>
          {entry.notes ? (
            <p className="text-sm text-slate-300 leading-relaxed p-3 rounded-xl border border-slate-800 bg-slate-900">
              {entry.notes}
            </p>
          ) : (
            <button onClick={openNotes}
              className="w-full py-2.5 rounded-xl border border-dashed border-slate-800 text-slate-600 hover:border-slate-600 hover:text-slate-400 text-xs transition-colors">
              + {pt ? "Adicionar nota" : "Add a note"}
            </button>
          )}
        </Section>

        {/* Reports link */}
        <div className="mt-6 pt-4 border-t border-slate-800">
          <button onClick={() => router.push("/journal/reports")}
            className="w-full py-2.5 rounded-xl bg-blue-500 hover:bg-blue-400 text-white text-sm font-medium transition-colors">
            {pt ? "Ver relatório comportamental →" : "View behavioral report →"}
          </button>
        </div>

        {/* Meta + delete ───────────────────────────────────────────────────── */}
        <div className="mt-4 pt-4 border-t border-slate-800 flex items-center justify-between">
          <p className="text-xs text-slate-700">
            {pt ? "Registrado em" : "Logged"}{" "}
            {new Date(entry.logged_at).toLocaleString(pt ? "pt-BR" : "en-GB", {
              day: "2-digit", month: "short", year: "numeric",
              hour: "2-digit", minute: "2-digit",
            })}
          </p>
          <button onClick={() => setShowDeleteConfirm(true)}
            className="text-xs text-slate-700 hover:text-red-400 transition-colors">
            {pt ? "Excluir" : "Delete"}
          </button>
        </div>

      </main>

      {/* ══════════════════════════════════════════════════════════════════════
          EDIT MODALS
      ══════════════════════════════════════════════════════════════════════ */}

      {/* ── Trade info modal ─────────────────────────────────────────────── */}
      <BottomSheet
        open={activeModal === "trade_info"}
        onClose={() => setActiveModal(null)}
        title={pt ? "Editar operação" : "Edit trade info"}
      >
        {/* Setup selector */}
        <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Setup</p>
        <div className="space-y-1.5 mb-4 max-h-40 overflow-y-auto">
          <button
            onClick={() => setEditSetupId(null)}
            className={`w-full text-left px-3 py-2 rounded-xl border text-sm transition-all ${
              editSetupId === null
                ? "border-blue-500 bg-blue-950/30 text-blue-200"
                : "border-slate-700 text-slate-400 hover:border-slate-500"
            }`}
          >
            {pt ? "Sem setup" : "No setup"}
          </button>
          {allSetups.map(s => (
            <button key={s.id}
              onClick={() => setEditSetupId(s.id)}
              className={`w-full text-left px-3 py-2 rounded-xl border text-sm transition-all ${
                editSetupId === s.id
                  ? "border-blue-500 bg-blue-950/30 text-blue-200"
                  : "border-slate-700 text-slate-400 hover:border-slate-500"
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>

        {/* Direction */}
        <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">{pt ? "Direção" : "Direction"}</p>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {[
            { val: "long",  label: "↑ Long",  active: "border-green-400 bg-green-950/30 text-green-300", inactive: "border-green-500/30 text-green-700" },
            { val: "short", label: "↓ Short", active: "border-red-400 bg-red-950/30 text-red-300",       inactive: "border-red-500/30 text-red-800"     },
          ].map(d => (
            <button key={d.val} onClick={() => setEditDirection(d.val)}
              className={`py-2.5 rounded-xl border text-sm font-medium transition-all ${editDirection === d.val ? d.active : d.inactive}`}>
              {d.label}
            </button>
          ))}
        </div>

        {/* Date */}
        <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">{pt ? "Data" : "Date"}</p>
        <input type="date" value={editTradeDate} onChange={e => setEditTradeDate(e.target.value)}
          className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white focus:border-blue-500 focus:outline-none text-sm mb-4" />

        {/* Instrument */}
        <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">{pt ? "Ativo (opcional)" : "Instrument (optional)"}</p>
        <input type="text" value={editInstrument} onChange={e => setEditInstrument(e.target.value)}
          placeholder={pt ? "ex: NQ, ES, PETR4" : "e.g. NQ, ES, AAPL"}
          className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-600 focus:border-blue-500 focus:outline-none text-sm mb-4" />

        {/* Live / Paper */}
        <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Live / Paper — {pt ? "opcional" : "optional"}</p>
        <div className="flex gap-2 mb-4">
          {[{ v: "live", l: "🟢 Live" }, { v: "paper", l: "📄 Paper" }].map(o => (
            <button key={o.v} onClick={() => setEditLivePaper(editLivePaper === o.v ? null : o.v)}
              className={`flex-1 py-2.5 rounded-xl border text-sm transition-colors ${
                editLivePaper === o.v
                  ? "border-blue-500 bg-blue-950/30 text-blue-200"
                  : "border-slate-700 text-slate-400 hover:border-slate-500"
              }`}>{o.l}</button>
          ))}
        </div>

        {/* Instrument type */}
        <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">{pt ? "Tipo (opcional)" : "Type (optional)"}</p>
        <div className="grid grid-cols-4 gap-1.5">
          {[
            { v: "spot",    l: "Spot" },
            { v: "options", l: pt ? "Opções" : "Options" },
            { v: "futures", l: pt ? "Futuros" : "Futures" },
            { v: "other",   l: pt ? "Outro" : "Other" },
          ].map(o => (
            <button key={o.v} onClick={() => setEditInstrumentType(editInstrumentType === o.v ? null : o.v)}
              className={`py-2 rounded-xl border text-xs transition-colors ${
                editInstrumentType === o.v
                  ? "border-blue-500 bg-blue-950/30 text-blue-200"
                  : "border-slate-700 text-slate-400 hover:border-slate-500"
              }`}>{o.l}</button>
          ))}
        </div>

        <SaveBtn onSave={saveTradeInfo} saving={saving} disabled={!editDirection} pt={pt} />
      </BottomSheet>

      {/* ── Outcome + P&L modal ────────────────────────────────────────────── */}
      <BottomSheet
        open={activeModal === "outcome_pnl"}
        onClose={() => setActiveModal(null)}
        title={pt ? "Editar resultado" : "Edit outcome"}
      >
        <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">{pt ? "Resultado" : "Outcome"}</p>
        <div className="grid grid-cols-3 gap-2 mb-5">
          {[
            { val: "win",       label: pt ? "Ganhou" : "Win",  active: "border-green-400 bg-green-950/30 text-green-300", inactive: "border-green-500/30 text-green-700" },
            { val: "loss",      label: pt ? "Perdeu" : "Loss", active: "border-red-400 bg-red-950/30 text-red-300",       inactive: "border-red-500/30 text-red-800"     },
            { val: "breakeven", label: "BE",                    active: "border-slate-400 bg-slate-800 text-slate-300",    inactive: "border-slate-700 text-slate-600"    },
          ].map(o => (
            <button key={o.val} onClick={() => setEditOutcome(o.val)}
              className={`py-3 rounded-xl border text-sm font-medium transition-all ${editOutcome === o.val ? o.active : o.inactive}`}>
              {o.label}
            </button>
          ))}
        </div>

        <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">P&amp;L ($) — {pt ? "opcional" : "optional"}</p>
        <input type="number" step="any" value={editPnl} onChange={e => setEditPnl(e.target.value)}
          placeholder={pt ? "ex: 250 ou -120" : "e.g. 250 or -120"}
          className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-600 focus:border-blue-500 focus:outline-none text-sm" />

        <SaveBtn onSave={saveOutcomePnl} saving={saving} disabled={!editOutcome} pt={pt} />
      </BottomSheet>

      {/* ── Behavior modal (v2 only) ──────────────────────────────────────── */}
      <BottomSheet
        open={activeModal === "behavior"}
        onClose={() => setActiveModal(null)}
        title={pt ? "Editar comportamento" : "Edit behavior"}
      >
        <div className="overflow-y-auto max-h-[70vh] space-y-5 pb-2">

          {/* Entry type — 4 categories */}
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">{pt ? "Tipo de entrada" : "Entry type"}</p>
            <div className="space-y-2">

              {/* A — Full setup (only if trade has a setup) */}
              {(entry.setup_id || editSetupId) && (
                <button onClick={() => selectEditCategory("full_setup")}
                  className={`w-full text-left px-3 py-2.5 rounded-xl border text-sm transition-all ${
                    editEntryCategory === "full_setup"
                      ? "border-blue-500 bg-blue-950/30 text-blue-200"
                      : "border-slate-700 text-slate-400 hover:border-slate-500"
                  }`}>
                  <span className="font-medium">A · </span>
                  {pt ? "Respeitou o setup completo" : "Respected the full setup"}
                </button>
              )}

              {/* B — Early entry */}
              <div>
                <button onClick={() => selectEditCategory("early")}
                  className={`w-full text-left px-3 py-2.5 rounded-xl border text-sm transition-all ${
                    editEntryCategory === "early"
                      ? "border-amber-500 bg-amber-950/20 text-amber-200"
                      : "border-slate-700 text-slate-400 hover:border-slate-500"
                  }`}>
                  <span className="font-medium">B · </span>
                  {pt ? "Entrada antecipada (FOMO)" : "Early entry (FOMO)"}
                </button>
                {editEntryCategory === "early" && (
                  <div className="mt-1.5 ml-3 space-y-1.5">
                    {[
                      { val: true,  l: pt ? "Sim — nível foi atingido depois" : "Yes — level was also hit" },
                      { val: false, l: pt ? "Não — só entrou cedo" : "No — only way to catch it" },
                    ].map(opt => (
                      <button key={String(opt.val)} onClick={() => { setEditEntryType("early"); setEditLevelMetAfter(opt.val); }}
                        className={`w-full text-left px-3 py-2 rounded-xl border text-xs transition-all ${
                          editLevelMetAfter === opt.val
                            ? "border-amber-400 bg-amber-950/20 text-amber-300"
                            : "border-slate-700 text-slate-500 hover:border-slate-600"
                        }`}>
                        {opt.l}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* C — Late entry */}
              <div>
                <button onClick={() => selectEditCategory("late")}
                  className={`w-full text-left px-3 py-2.5 rounded-xl border text-sm transition-all ${
                    editEntryCategory === "late"
                      ? "border-purple-500 bg-purple-950/20 text-purple-200"
                      : "border-slate-700 text-slate-400 hover:border-slate-500"
                  }`}>
                  <span className="font-medium">C · </span>
                  {pt ? "Hesitação / entrada tardia" : "Hesitation / late entry"}
                </button>
                {editEntryCategory === "late" && (
                  <div className="mt-1.5 ml-3 grid grid-cols-2 gap-1.5">
                    {[
                      { val: "hesitation_better", l: pt ? "Hesitou — preço melhor"  : "Hesitated — better price"  },
                      { val: "hesitation_worse",  l: pt ? "Hesitou — preço pior"    : "Hesitated — worse price"   },
                      { val: "chase_profit",      l: pt ? "Perseguiu — lucro"       : "Chased — profit"           },
                      { val: "chase_loss",        l: pt ? "Perseguiu — perda"       : "Chased — loss"             },
                    ].map(opt => (
                      <button key={opt.val} onClick={() => setEditEntryType(opt.val)}
                        className={`text-left px-2.5 py-2 rounded-xl border text-xs transition-all ${
                          editEntryType === opt.val
                            ? "border-purple-400 bg-purple-950/20 text-purple-200"
                            : "border-slate-700 text-slate-500 hover:border-slate-600"
                        }`}>
                        {opt.l}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* D — Random */}
              <button onClick={() => selectEditCategory("random")}
                className={`w-full text-left px-3 py-2.5 rounded-xl border text-sm transition-all ${
                  editEntryCategory === "random"
                    ? "border-red-500 bg-red-950/20 text-red-300"
                    : "border-slate-700 text-slate-400 hover:border-slate-500"
                }`}>
                <span className="font-medium">D · </span>
                {pt ? "Operação aleatória" : "Random trade"}
              </button>
            </div>
          </div>

          {/* Combined trade outcome — multi-select */}
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">
              {pt ? "O que melhor descreve a operação?" : "What best describes the trade?"}
            </p>
            <p className="text-[10px] text-slate-600 mb-2">{pt ? "Selecione tudo que se aplica." : "Select all that apply."}</p>
            <div className="space-y-1.5">
              {Object.entries(TRADE_OUTCOME_LABELS).map(([k, meta]) => {
                const hasDetails = Object.keys(meta.details || {}).length > 0;
                const isSelected = k in editOutcomeSelections;
                return (
                  <div key={k}>
                    <button onClick={() => toggleEditOutcomeType(k)}
                      className={`w-full text-left px-3 py-2.5 rounded-xl border text-sm transition-all ${
                        isSelected
                          ? "border-blue-500 bg-blue-950/30 text-blue-200"
                          : "border-slate-700 text-slate-400 hover:border-slate-500"
                      }`}>
                      {pt ? meta.pt : meta.en}
                    </button>
                    {isSelected && hasDetails && (
                      <div className="mt-1.5 ml-3 space-y-1.5">
                        {Object.entries(meta.details).map(([dk, dv]) => (
                          <button key={dk} onClick={() => setEditOutcomeDetail(k, dk)}
                            className={`w-full text-left px-3 py-2 rounded-lg border text-xs transition-all ${
                              editOutcomeSelections[k] === dk
                                ? "border-blue-400 bg-blue-950/20 text-blue-200"
                                : "border-slate-700 text-slate-500 hover:border-slate-600"
                            }`}>
                            {pt ? dv.pt : dv.en}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <SaveBtn onSave={saveBehavior} saving={saving} disabled={!canSaveBehavior()} pt={pt} />
      </BottomSheet>

      {/* ── Notes modal ───────────────────────────────────────────────────── */}
      <BottomSheet
        open={activeModal === "notes"}
        onClose={() => setActiveModal(null)}
        title={pt ? "Notas" : "Notes"}
      >
        <textarea
          value={editNotes}
          onChange={e => setEditNotes(e.target.value)}
          rows={5}
          placeholder={pt ? "Observações sobre esta operação..." : "Observations about this trade..."}
          className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-600 focus:border-blue-500 focus:outline-none text-sm resize-none"
        />
        <SaveBtn onSave={saveNotes} saving={saving} pt={pt} />
      </BottomSheet>

      {/* ── Delete confirm ────────────────────────────────────────────────── */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-6 z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-sm w-full">
            <h3 className="text-white font-semibold mb-2">{pt ? "Excluir operação?" : "Delete trade?"}</h3>
            <p className="text-sm text-slate-400 mb-6">
              {pt ? "Essa ação não pode ser desfeita." : "This action cannot be undone."}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-400 hover:text-white text-sm transition-colors">
                {pt ? "Cancelar" : "Cancel"}
              </button>
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-sm font-medium transition-colors">
                {deleting ? "..." : pt ? "Excluir" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
