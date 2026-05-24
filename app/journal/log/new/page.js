"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getLang } from "@/lib/i18n";
import { supabaseBrowser } from "@/lib/supabase-browser";

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

const VARIANT_COLORS = {
  A: { text: "text-blue-300",   border: "border-blue-500",   bg: "bg-blue-950/30"   },
  B: { text: "text-purple-300", border: "border-purple-500", bg: "bg-purple-950/30" },
  C: { text: "text-green-300",  border: "border-green-500",  bg: "bg-green-950/30"  },
  D: { text: "text-amber-300",  border: "border-amber-500",  bg: "bg-amber-950/30"  },
  E: { text: "text-cyan-300",   border: "border-cyan-500",   bg: "bg-cyan-950/30"   },
};

function OptionBtn({ label, sublabel, selected, onClick, selectedClass }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3 rounded-xl border transition-colors ${
        selected
          ? (selectedClass || "border-blue-500 bg-blue-950/30 text-white")
          : "border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500 hover:text-white"
      }`}
    >
      <p className="text-sm font-medium">{label}</p>
      {sublabel && <p className="text-xs text-slate-500 mt-0.5">{sublabel}</p>}
    </button>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function NewTradePage() {
  const router = useRouter();
  const [lang] = useState(() => getLang());
  const [token, setToken] = useState(null);
  const [setups, setSetups] = useState([]);
  const [authReady, setAuthReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const pt = lang === "pt";

  // Steps: 1=setup, 2=details (incl. outcome+P&L), 3=entry-type (with inline sub-options), "3b"=conditions, 4=stop, 5=target, 6=other+notes+save
  const [step, setStep] = useState(1);

  // Step 1
  const [selectedSetup, setSelectedSetup] = useState(undefined); // undefined = not chosen yet

  // Step 2
  const [instrument, setInstrument] = useState("");
  const [direction, setDirection] = useState(null);
  const [tradeDate, setTradeDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [entryPrice, setEntryPrice] = useState("");
  const [exitPrice, setExitPrice] = useState("");
  const [pnl, setPnl] = useState("");

  // Step 3 — top-level category + granular type
  // entryCategory: "full_setup" | "early" | "late" | "random"
  // entryType (saved to DB): "full_setup" | "early" | "hesitation_better" | "hesitation_worse" | "chase_profit" | "chase_loss" | "random"
  const [entryCategory, setEntryCategory] = useState(null);
  const [entryType, setEntryType] = useState(null);
  const [levelMetAfter, setLevelMetAfter] = useState(null); // true | false — inline for "early"

  // Step 3b
  const [conditionsMet, setConditionsMet] = useState({});

  // Step 4
  const [stopOutcome, setStopOutcome] = useState(null);

  // Step 5
  const [targetOutcome, setTargetOutcome] = useState(null);

  // Step 6
  // otherIssues: { [id]: "trusted" | "random" | null }  for revenge/overtrading/oversizing
  //              { other: "text..." }                    for free-text
  const [otherIssues, setOtherIssues] = useState({});
  const [notes, setNotes] = useState("");

  // Step 2 (outcome captured early alongside trade facts)
  const [outcome, setOutcome] = useState(null);

  // ── Auth + setups ─────────────────────────────────────────────────────────

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabaseBrowser.auth.getSession();
      if (!session) { router.push("/auth"); return; }
      setToken(session.access_token);
      try {
        const res = await fetch("/api/journal/setups", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const data = await res.json();
        setSetups(Array.isArray(data) ? data : []);
      } catch (_) {}
      setAuthReady(true);
    }
    load();
  }, []);

  // ── Navigation helpers ────────────────────────────────────────────────────

  function goTo(s) { setStep(s); window.scrollTo(0, 0); }

  function backFrom(s) {
    if (s === 1)    return router.push("/journal");
    if (s === 2)    return goTo(1);
    if (s === 3)    return goTo(2);
    if (s === "3b") return goTo(3);
    if (s === 4) {
      if ((entryType === "full_setup" || entryType === "early") && selectedSetup?.conditions?.length > 0) return goTo("3b");
      return goTo(3);
    }
    if (s === 5)   return goTo(4);
    if (s === 6)   return goTo(5);
  }

  function nextFromEntry() {
    const hasConditions = selectedSetup?.conditions?.length > 0;
    if ((entryType === "full_setup" || entryType === "early") && hasConditions) return goTo("3b");
    return goTo(4);
  }

  function nextFromConditions() {
    return goTo(4);
  }

  function canAdvanceFromEntry() {
    if (entryCategory === "early")  return levelMetAfter !== null;
    if (entryCategory === "late")   return entryType !== null;
    return entryCategory !== null; // full_setup or random
  }

  function selectCategory(cat) {
    setEntryCategory(cat);
    setLevelMetAfter(null);
    if (cat === "full_setup") setEntryType("full_setup");
    else if (cat === "random") setEntryType("random");
    else setEntryType(null); // early and late need sub-selection
  }

  // ── Conditions helpers ────────────────────────────────────────────────────

  function setConditionVariant(condId, variant) {
    setConditionsMet(prev => ({ ...prev, [condId]: variant }));
  }

  function allConditionsFilled() {
    if (!selectedSetup?.conditions?.length) return true;
    return selectedSetup.conditions.every(c => conditionsMet[c.id] !== undefined);
  }

  function buildConditionsMetArray() {
    if (!selectedSetup?.conditions) return [];
    return selectedSetup.conditions.map(c => ({
      id: c.id,
      text: c.text,
      selected_variant: conditionsMet[c.id] || null,
      selected_description: conditionsMet[c.id] && conditionsMet[c.id] !== "na"
        ? c.variants?.find(v => v.label === conditionsMet[c.id])?.description || null
        : null,
    }));
  }

  function toggleIssue(id) {
    setOtherIssues(prev => {
      const next = { ...prev };
      if (id in next) { delete next[id]; } else { next[id] = id === "other" ? "" : null; }
      return next;
    });
  }

  function setIssueAnswer(id, val) {
    setOtherIssues(prev => ({ ...prev, [id]: val }));
  }

  function allIssuesFilled() {
    return Object.entries(otherIssues).every(([id, val]) => id === "other" || val !== null);
  }

  function buildOtherIssues() {
    return Object.entries(otherIssues).map(([id, val]) =>
      id === "other" ? { id: "other", text: val } : { id, setup_type: val }
    );
  }

  // ── Save ──────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!outcome || saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/journal", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          setup_id:    selectedSetup?.id || null,
          instrument:  instrument.trim() || null,
          direction,
          trade_date:  tradeDate,
          entry_price: entryPrice ? parseFloat(entryPrice) : null,
          exit_price:  exitPrice  ? parseFloat(exitPrice)  : null,
          pnl:         pnl        ? pnl                    : null,
          conditions_met: buildConditionsMetArray(),
          after_trade: {
            entry_type:      entryType,
            level_met_after: levelMetAfter,
            stop_outcome:    stopOutcome,
            target_outcome:  targetOutcome,
            other_issues:    buildOtherIssues(),
          },
          outcome,
          notes: notes.trim() || null,
          pain_type: null, pain_types: [], behaviors: {},
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Save failed");
      router.push(`/journal/log/${data.entry.id}?receipt=1`);
    } catch {
      alert(pt ? "Erro ao salvar. Tente novamente." : "Failed to save. Try again.");
    } finally {
      setSaving(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (!authReady) return <LoadingSpinner />;

  const stepNum = typeof step === "number" ? step : 3;

  return (
    <div className="min-h-screen bg-slate-950 text-white">

      {/* Header */}
      <header className="px-6 py-5 border-b border-slate-800">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <button onClick={() => backFrom(step)} className="text-slate-400 hover:text-white text-sm transition-colors">←</button>
          <div className="flex items-center gap-1">
            {[1,2,3,4,5,6].map(s => (
              <div key={s} className={`h-1 rounded-full transition-all ${
                s < stepNum ? "w-4 bg-blue-500" : s === stepNum ? "w-5 bg-blue-400" : "w-4 bg-slate-700"
              }`} />
            ))}
          </div>
          <span className="text-xs text-slate-500">{stepNum}/6</span>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-6 py-8">

        {/* ── STEP 1: Setup ── */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <p className="text-base font-semibold text-white mb-1">
                {pt ? "Qual setup você operou?" : "Which setup did you trade?"}
              </p>
              <p className="text-sm text-slate-500">
                {pt ? "Selecione um setup ou registre como aleatória." : "Select a setup or log as a random trade."}
              </p>
            </div>

            <div className="space-y-2">
              {setups.map(s => (
                <OptionBtn
                  key={s.id}
                  label={s.name}
                  sublabel={s.conditions?.length > 0 ? `${s.conditions.length} ${pt ? "condições" : "conditions"}` : undefined}
                  selected={selectedSetup?.id === s.id}
                  onClick={() => setSelectedSetup(s)}
                />
              ))}
              <OptionBtn
                label={pt ? "Sem setup — operação aleatória" : "No setup — random trade"}
                sublabel={pt ? "Você não pode aprender com operações aleatórias." : "You can't learn from random trades."}
                selected={selectedSetup === null}
                onClick={() => { setSelectedSetup(null); setEntryType("random"); }}
                selectedClass="border-amber-500/50 bg-amber-950/20 text-amber-200"
              />
            </div>

            <button
              onClick={() => router.push("/journal/setups/new")}
              className="w-full py-2.5 rounded-xl border border-dashed border-slate-700 text-slate-500 hover:border-blue-500 hover:text-blue-400 text-sm transition-colors"
            >
              + {pt ? "Criar novo setup" : "Create new setup"}
            </button>

            <button
              onClick={() => goTo(2)}
              disabled={selectedSetup === undefined}
              className="w-full py-3.5 rounded-xl bg-blue-500 hover:bg-blue-400 disabled:opacity-30 text-white text-sm font-medium transition-colors"
            >
              {pt ? "Continuar" : "Continue"} →
            </button>
          </div>
        )}

        {/* ── STEP 2: Trade details ── */}
        {step === 2 && (
          <div className="space-y-5">
            <p className="text-base font-semibold text-white">
              {pt ? "Detalhes da operação" : "Trade details"}
            </p>

            {/* Direction */}
            <div>
              <p className="text-xs text-slate-500 mb-2">{pt ? "Direção *" : "Direction *"}</p>
              <div className="flex gap-2">
                {[{v:"long",l:"↑ Long"},{v:"short",l:"↓ Short"}].map(d => (
                  <button key={d.v} onClick={() => setDirection(d.v)}
                    className={`flex-1 py-3 rounded-xl border text-sm font-medium transition-colors ${
                      direction === d.v
                        ? d.v === "long" ? "border-green-500 bg-green-950/30 text-green-300" : "border-red-500 bg-red-950/30 text-red-300"
                        : "border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-500"
                    }`}>{d.l}</button>
                ))}
              </div>
            </div>

            {/* Date */}
            <div>
              <p className="text-xs text-slate-500 mb-2">{pt ? "Data *" : "Date *"}</p>
              <input type="date" value={tradeDate} onChange={e => setTradeDate(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-700 bg-slate-900 text-slate-200 text-sm focus:outline-none focus:border-slate-500" />
            </div>

            {/* Instrument */}
            <div>
              <p className="text-xs text-slate-500 mb-2">{pt ? "Instrumento (opcional)" : "Instrument (optional)"}</p>
              <input type="text" placeholder={pt ? "ex: EURUSD, NQ, AAPL…" : "e.g. EURUSD, NQ, AAPL…"}
                value={instrument} onChange={e => setInstrument(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-700 bg-slate-900 text-slate-200 text-sm placeholder-slate-600 focus:outline-none focus:border-slate-500" />
            </div>

            {/* Prices */}
            <div>
              <p className="text-xs text-slate-500 mb-2">{pt ? "Preços (opcional)" : "Prices (optional)"}</p>
              <div className="flex gap-2">
                <input type="number" placeholder={pt ? "Entrada" : "Entry"} value={entryPrice} onChange={e => setEntryPrice(e.target.value)}
                  className="flex-1 px-3 py-3 rounded-xl border border-slate-700 bg-slate-900 text-slate-200 text-sm placeholder-slate-600 focus:outline-none focus:border-slate-500" />
                <input type="number" placeholder={pt ? "Saída" : "Exit"} value={exitPrice} onChange={e => setExitPrice(e.target.value)}
                  className="flex-1 px-3 py-3 rounded-xl border border-slate-700 bg-slate-900 text-slate-200 text-sm placeholder-slate-600 focus:outline-none focus:border-slate-500" />
              </div>
            </div>

            {/* Result */}
            <div>
              <p className="text-xs text-slate-500 mb-2">{pt ? "Resultado *" : "Result *"}</p>
              <div className="flex gap-2">
                {[
                  { v: "win",       l: pt ? "Ganhou" : "Win",       c: "border-green-500 bg-green-950/30 text-green-300" },
                  { v: "loss",      l: pt ? "Perdeu" : "Loss",      c: "border-red-500 bg-red-950/30 text-red-300" },
                  { v: "breakeven", l: pt ? "Empate" : "BE",        c: "border-slate-500 bg-slate-800 text-slate-300" },
                ].map(o => (
                  <button key={o.v} onClick={() => setOutcome(o.v)}
                    className={`flex-1 py-3 rounded-xl border text-sm font-medium transition-colors ${
                      outcome === o.v ? o.c : "border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-500"
                    }`}>{o.l}</button>
                ))}
              </div>
            </div>

            {/* P&L */}
            <div>
              <p className="text-xs text-slate-500 mb-2">{pt ? "Resultado em $ (opcional)" : "Result in $ (optional)"}</p>
              <input type="number" step="any" placeholder={pt ? "ex: 250 ou -120" : "e.g. 250 or -120"}
                value={pnl} onChange={e => setPnl(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-700 bg-slate-900 text-slate-200 text-sm placeholder-slate-600 focus:outline-none focus:border-slate-500" />
            </div>

            <div className="flex gap-3 mt-2">
              <button onClick={() => backFrom(2)} className="flex-1 py-3 rounded-xl border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 text-sm transition-colors">←</button>
              <button onClick={() => goTo(3)} disabled={!direction || !tradeDate || !outcome}
                className="flex-1 py-3 rounded-xl bg-blue-500 hover:bg-blue-400 disabled:opacity-30 text-white text-sm font-medium transition-colors">
                {pt ? "Continuar" : "Continue"} →
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Entry type ── */}
        {step === 3 && (
          <div className="space-y-4">
            <p className="text-base font-semibold text-white">{pt ? "Como foi sua entrada?" : "How was your entry?"}</p>

            <div className="space-y-3">

              {/* A — Full setup (only when a setup is selected) */}
              {selectedSetup && (
                <div>
                  <button onClick={() => selectCategory("full_setup")}
                    className={`w-full text-left px-4 py-3 rounded-xl border text-sm font-medium transition-colors ${
                      entryCategory === "full_setup"
                        ? "border-blue-500 bg-blue-950/30 text-white"
                        : "border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500 hover:text-white"
                    }`}>
                    <p className="font-medium">{pt ? "A. Setup respeitado — aguardei todas as condições" : "A. Respected full setup — waited for all conditions"}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{pt ? "Você selecionará as variantes usadas a seguir." : "You'll select the variant used for each condition."}</p>
                  </button>
                </div>
              )}

              {/* B — Early entry */}
              <div>
                <button onClick={() => selectCategory("early")}
                  className={`w-full text-left px-4 py-3 rounded-xl border text-sm font-medium transition-colors ${
                    entryCategory === "early"
                      ? "border-amber-500/70 bg-amber-950/20 text-white"
                      : "border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500 hover:text-white"
                  }`}>
                  {pt ? "B. Entrada antecipada — FOMO / setup incompleto" : "B. Early entry — FOMO / incomplete setup"}
                </button>
                {entryCategory === "early" && (
                  <div className="mt-2 ml-3 flex flex-col gap-2">
                    <button onClick={() => setLevelMetAfter(false)}
                      className={`w-full text-left px-3 py-2.5 rounded-lg border text-xs font-medium transition-colors ${
                        levelMetAfter === false
                          ? "border-green-500/60 bg-green-950/20 text-green-300"
                          : "border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-600 hover:text-slate-300"
                      }`}>
                      {pt ? "Nível / condições NÃO foram atingidos depois" : "Level / conditions NOT met after — only way to catch it"}
                    </button>
                    <button onClick={() => setLevelMetAfter(true)}
                      className={`w-full text-left px-3 py-2.5 rounded-lg border text-xs font-medium transition-colors ${
                        levelMetAfter === true
                          ? "border-amber-500/60 bg-amber-950/20 text-amber-300"
                          : "border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-600 hover:text-slate-300"
                      }`}>
                      {pt ? "Nível / condições foram atingidos depois — entrada cedo foi pior" : "Level / conditions met after — early entry was worse"}
                    </button>
                  </div>
                )}
              </div>

              {/* C — Late / Hesitation / Chasing */}
              <div>
                <button onClick={() => selectCategory("late")}
                  className={`w-full text-left px-4 py-3 rounded-xl border text-sm font-medium transition-colors ${
                    entryCategory === "late"
                      ? "border-purple-500/70 bg-purple-950/20 text-white"
                      : "border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500 hover:text-white"
                  }`}>
                  {pt ? "C. Entrada tardia — Hesitação / Perseguição" : "C. Late entry — Hesitation / Chasing"}
                </button>
                {entryCategory === "late" && (
                  <div className="mt-2 ml-3 grid grid-cols-2 gap-2">
                    {[
                      { v: "hesitation_better", l: pt ? "Hesitação — preço melhor" : "Hesitation — better price" },
                      { v: "hesitation_worse",  l: pt ? "Hesitação — preço pior"  : "Hesitation — worse price"  },
                      { v: "chase_profit",      l: pt ? "Perseguiu — lucro"       : "Chased — profit"           },
                      { v: "chase_loss",        l: pt ? "Perseguiu — perda"       : "Chased — loss"             },
                    ].map(o => (
                      <button key={o.v} onClick={() => setEntryType(o.v)}
                        className={`text-left px-3 py-2.5 rounded-lg border text-xs font-medium transition-colors ${
                          entryType === o.v
                            ? "border-purple-500/60 bg-purple-950/20 text-purple-300"
                            : "border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-600 hover:text-slate-300"
                        }`}>
                        {o.l}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* D — Random trade */}
              <div>
                <button onClick={() => selectCategory("random")}
                  className={`w-full text-left px-4 py-3 rounded-xl border text-sm font-medium transition-colors ${
                    entryCategory === "random"
                      ? "border-red-500/50 bg-red-950/20 text-white"
                      : "border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500 hover:text-white"
                  }`}>
                  {pt ? "D. Operação aleatória — sem setup predefinido" : "D. Random trade — no predefined setup"}
                </button>
                {entryCategory === "random" && (
                  <p className="mt-2 ml-3 text-xs text-amber-600">
                    {pt ? "Você não pode aprender com operações aleatórias." : "You can't learn from random trades."}
                  </p>
                )}
              </div>

            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => backFrom(3)} className="flex-1 py-3 rounded-xl border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 text-sm transition-colors">←</button>
              <button onClick={nextFromEntry} disabled={!canAdvanceFromEntry()}
                className="flex-1 py-3 rounded-xl bg-blue-500 hover:bg-blue-400 disabled:opacity-30 text-white text-sm font-medium transition-colors">
                {pt ? "Continuar" : "Continue"} →
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3b: Conditions + variants ── */}
        {step === "3b" && selectedSetup?.conditions?.length > 0 && (
          <div className="space-y-5">
            <div>
              <p className="text-base font-semibold text-white mb-1">
                {entryType === "full_setup"
                  ? (pt ? "Quais variantes você operou?" : "Which variants did you trade?")
                  : (pt ? "Quais condições foram atingidas?" : "Which conditions were met?")}
              </p>
              <p className="text-sm text-slate-500">
                {entryType === "full_setup"
                  ? (pt ? "Selecione a variante para cada condição." : "Select the variant for each condition.")
                  : (pt ? "Selecione a variante ou marque N/A se a condição não foi atingida." : "Select the variant or mark N/A if not met.")}
              </p>
            </div>

            <div className="space-y-3">
              {selectedSetup.conditions.map(cond => (
                <div key={cond.id} className="p-4 rounded-xl border border-slate-800 bg-slate-900">
                  <p className="text-sm text-slate-300 mb-3">{cond.text}</p>
                  <div className="flex flex-wrap gap-2">
                    {(cond.variants || []).map(v => {
                      const c = VARIANT_COLORS[v.label] || {};
                      const sel = conditionsMet[cond.id] === v.label;
                      return (
                        <button key={v.id} onClick={() => setConditionVariant(cond.id, v.label)}
                          className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                            sel ? `${c.border} ${c.bg} ${c.text}` : "border-slate-700 text-slate-500 hover:border-slate-500 hover:text-slate-300"
                          }`}>
                          {v.label}{v.description ? ` · ${v.description}` : ""}
                        </button>
                      );
                    })}
                    {entryType === "early" && (
                      <button onClick={() => setConditionVariant(cond.id, "na")}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                          conditionsMet[cond.id] === "na"
                            ? "border-slate-500 bg-slate-800 text-slate-400"
                            : "border-slate-700 text-slate-600 hover:border-slate-600 hover:text-slate-400"
                        }`}>
                        N/A
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button onClick={() => backFrom("3b")} className="flex-1 py-3 rounded-xl border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 text-sm transition-colors">←</button>
              <button onClick={nextFromConditions} disabled={!allConditionsFilled()}
                className="flex-1 py-3 rounded-xl bg-blue-500 hover:bg-blue-400 disabled:opacity-30 text-white text-sm font-medium transition-colors">
                {pt ? "Continuar" : "Continue"} →
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3c: Level met after ── */}
        {step === "3c" && (
          <div className="space-y-5">
            <div>
              <p className="text-base font-semibold text-white mb-1">
                {pt ? "O nível / condições completas foram atingidos depois da sua entrada?" : "Did the level / full conditions get met after your entry?"}
              </p>
              <p className="text-sm text-slate-500">
                {pt ? "Isso define se foi uma oportunidade realmente perdida ao não esperar." : "This defines whether waiting would have truly missed the move."}
              </p>
            </div>
            <div className="space-y-2">
              <OptionBtn label={pt ? "Sim — o nível foi atingido" : "Yes — level was reached"} selected={levelMetAfter === true} onClick={() => setLevelMetAfter(true)} />
              <OptionBtn label={pt ? "Não — o preço não chegou lá" : "No — price didn't get there"} selected={levelMetAfter === false} onClick={() => setLevelMetAfter(false)} />
            </div>
            <div className="flex gap-3">
              <button onClick={() => backFrom("3c")} className="flex-1 py-3 rounded-xl border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 text-sm transition-colors">←</button>
              <button onClick={() => goTo(4)} disabled={levelMetAfter === null}
                className="flex-1 py-3 rounded-xl bg-blue-500 hover:bg-blue-400 disabled:opacity-30 text-white text-sm font-medium transition-colors">
                {pt ? "Continuar" : "Continue"} →
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 4: Stop outcome ── */}
        {step === 4 && (
          <div className="space-y-5">
            <p className="text-base font-semibold text-white">{pt ? "Como foi o seu stop?" : "How was your stop?"}</p>
            <div className="space-y-2">
              {[
                { v: "not_hit",             l: pt ? "Não ativado" : "Not hit" },
                { v: "changed_worse",        l: pt ? "Alterado → perda maior" : "Changed → worse loss" },
                { v: "changed_smaller",      l: pt ? "Alterado → perda menor" : "Changed → smaller loss" },
                { v: "changed_profit",       l: pt ? "Alterado → virou lucro" : "Changed → turned to profit" },
                { v: "respected_protected",  l: pt ? "Respeitado — protegeu de perda pior" : "Respected — protected from worse loss" },
                { v: "respected_reversal",   l: pt ? "Respeitado — preço reverteu (doloroso)" : "Respected — price reversed (painful)" },
                { v: "panic",                l: pt ? "Saída por pânico — fechei manualmente" : "Panic exit — closed manually" },
              ].map(o => (
                <OptionBtn key={o.v} label={o.l} selected={stopOutcome === o.v} onClick={() => setStopOutcome(o.v)} />
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => backFrom(4)} className="flex-1 py-3 rounded-xl border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 text-sm transition-colors">←</button>
              <button onClick={() => goTo(5)} disabled={!stopOutcome}
                className="flex-1 py-3 rounded-xl bg-blue-500 hover:bg-blue-400 disabled:opacity-30 text-white text-sm font-medium transition-colors">
                {pt ? "Continuar" : "Continue"} →
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 5: Target outcome ── */}
        {step === 5 && (
          <div className="space-y-5">
            <p className="text-base font-semibold text-white">{pt ? "Como foi o seu alvo?" : "How was your target?"}</p>
            <div className="space-y-2">
              {[
                { v: "not_hit",         l: pt ? "Alvo não atingido — preço nunca chegou lá" : "Target not hit — price never reached it" },
                { v: "early_not_hit",   l: pt ? "Saída prematura — alvo não foi atingido depois" : "Early exit — target not hit after" },
                { v: "early_hit",       l: pt ? "Saída prematura — alvo foi atingido depois" : "Early exit — target was hit after" },
                { v: "last_optimal",    l: pt ? "Último alvo atingido — saída ótima" : "Last target hit — optimal exit" },
                { v: "last_kept_going", l: pt ? "Último alvo atingido — preço continuou depois" : "Last target hit — price kept going after" },
              ].map(o => (
                <OptionBtn key={o.v} label={o.l} selected={targetOutcome === o.v} onClick={() => setTargetOutcome(o.v)} />
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => backFrom(5)} className="flex-1 py-3 rounded-xl border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 text-sm transition-colors">←</button>
              <button onClick={() => goTo(6)} disabled={!targetOutcome}
                className="flex-1 py-3 rounded-xl bg-blue-500 hover:bg-blue-400 disabled:opacity-30 text-white text-sm font-medium transition-colors">
                {pt ? "Continuar" : "Continue"} →
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 6: Other issues + notes + save ── */}
        {step === 6 && (
          <div className="space-y-5">
            <div>
              <p className="text-base font-semibold text-white mb-1">{pt ? "Algum outro problema?" : "Any other issue?"}</p>
              <p className="text-sm text-slate-500">{pt ? "Selecione todos que se aplicam, ou pule." : "Select all that apply, or skip."}</p>
            </div>

            <div className="space-y-3">
              {[
                { id: "revenge",     en: "Revenge trade",                      pt: "Vingança" },
                { id: "overtrading", en: "Overtrading",                         pt: "Excesso de operações" },
                { id: "oversizing",  en: "Oversizing — position too big",       pt: "Tamanho excessivo de posição" },
                { id: "other",       en: "Other — help improve the app",        pt: "Outro — ajude a melhorar o app" },
              ].map(issue => {
                const selected = issue.id in otherIssues;
                const val = otherIssues[issue.id];
                return (
                  <div key={issue.id}>
                    <button onClick={() => toggleIssue(issue.id)}
                      className={`w-full text-left px-4 py-3 rounded-xl border text-sm font-medium transition-colors ${
                        selected
                          ? "border-amber-500/50 bg-amber-950/20 text-amber-200"
                          : "border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-600 hover:text-slate-300"
                      }`}>
                      {pt ? issue.pt : issue.en}
                    </button>

                    {/* Sub-question: trusted vs random (Revenge / Overtrading / Oversizing) */}
                    {selected && issue.id !== "other" && (
                      <div className="mt-2 ml-3 flex flex-col gap-2">
                        <button onClick={() => setIssueAnswer(issue.id, "trusted")}
                          className={`w-full text-left px-3 py-2.5 rounded-lg border text-xs font-medium transition-colors ${
                            val === "trusted"
                              ? "border-blue-500/50 bg-blue-950/20 text-blue-200"
                              : "border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-600 hover:text-slate-300"
                          }`}>
                          {pt ? "Usei um setup testado" : "Used a trusted setup"}
                        </button>
                        <button onClick={() => setIssueAnswer(issue.id, "random")}
                          className={`w-full text-left px-3 py-2.5 rounded-lg border text-xs font-medium transition-colors ${
                            val === "random"
                              ? "border-amber-600/50 bg-amber-950/20 text-amber-300"
                              : "border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-600 hover:text-slate-300"
                          }`}>
                          {pt ? "Operação aleatória — não se aprende com isso" : "Random trade — you can't learn from random trades"}
                        </button>
                      </div>
                    )}

                    {/* Sub-question: free text (Other) */}
                    {selected && issue.id === "other" && (
                      <input
                        type="text"
                        value={val}
                        onChange={e => setIssueAnswer("other", e.target.value)}
                        placeholder={pt ? "Descreva o problema…" : "Describe the issue…"}
                        className="mt-2 ml-3 w-[calc(100%-0.75rem)] px-3 py-2.5 rounded-lg border border-slate-700 bg-slate-900 text-slate-200 text-xs placeholder-slate-600 focus:outline-none focus:border-slate-500"
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Notes */}
            <div>
              <p className="text-xs text-slate-500 mb-2">{pt ? "Notas (opcional)" : "Notes (optional)"}</p>
              <textarea value={notes} onChange={e => setNotes(e.target.value)}
                placeholder={pt ? "Observações, contexto de mercado…" : "Observations, market context…"}
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-slate-700 bg-slate-900 text-slate-200 text-sm placeholder-slate-600 focus:outline-none focus:border-slate-500 resize-none" />
            </div>

            <div className="flex gap-3">
              <button onClick={() => backFrom(6)} className="flex-1 py-3 rounded-xl border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 text-sm transition-colors">←</button>
              <button onClick={handleSave} disabled={saving || !allIssuesFilled()}
                className="flex-1 py-3.5 rounded-xl bg-blue-500 hover:bg-blue-400 disabled:opacity-30 text-white text-sm font-medium transition-colors">
                {saving ? "…" : (pt ? "Salvar operação" : "Save trade")}
              </button>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
