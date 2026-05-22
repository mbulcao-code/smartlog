"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { getLang, setLang } from "@/lib/i18n";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { PAINS, getNextQuestion, getNextAfterTradeQuestion } from "@/lib/journal-helpers";

// ── Loading spinner ───────────────────────────────────────────────────────────

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

// ── Page export ───────────────────────────────────────────────────────────────

export default function NewTradePage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <NewTradeContent />
    </Suspense>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

function NewTradeContent() {
  const router = useRouter();
  const [lang, setLangState] = useState(() => getLang());
  const [token, setToken] = useState(null);
  const [setups, setSetups] = useState([]);
  const [authReady, setAuthReady] = useState(false);
  const [saving, setSaving] = useState(false);

  // Steps: 1=setup, 2=trade, 3=execution (if setup), 4=pains, 5=after-trade, 6=outcome
  const [step, setStep] = useState(1);

  // ── Form state ──────────────────────────────────────────────────────────────
  const [selectedSetup, setSelectedSetup] = useState(null);
  const [instrument, setInstrument] = useState("");
  const [direction, setDirection] = useState(null);
  const [tradeDate, setTradeDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [entryPrice, setEntryPrice] = useState("");
  const [stopPrice, setStopPrice] = useState("");
  const [exitPrice, setExitPrice] = useState("");
  const [conditionsMet, setConditionsMet] = useState({});

  // Multi-pain state
  // pains: Array of { type: string, behavior: {} }
  const [pains, setPains] = useState([]);
  // Current pain being configured (in-progress)
  const [currentPainType, setCurrentPainType] = useState(null);
  const [currentBehavior, setCurrentBehavior] = useState({});
  // Phase within step 4: "picker" | "questions" | "summary"
  const [painPhase, setPainPhase] = useState("picker");

  // After-trade state
  const [afterTrade, setAfterTrade] = useState({});

  // Outcome
  const [outcome, setOutcome] = useState(null);
  const [notes, setNotes] = useState("");

  const pt = lang === "pt";

  // Variant colors
  const VARIANT_COLORS = {
    A: { text: "text-blue-300",   border: "border-blue-400",   bg: "bg-blue-950/20"   },
    B: { text: "text-purple-300", border: "border-purple-400", bg: "bg-purple-950/20" },
    C: { text: "text-green-300",  border: "border-green-400",  bg: "bg-green-950/20"  },
    D: { text: "text-amber-300",  border: "border-amber-400",  bg: "bg-amber-950/20"  },
    E: { text: "text-rose-300",   border: "border-rose-400",   bg: "bg-rose-950/20"   },
  };

  // Step sequence (skip step 3 when no setup selected)
  const stepSequence = [1, 2, ...(selectedSetup ? [3] : []), 4, 5, 6];
  const stepIdx = stepSequence.indexOf(step);

  const STEP_LABELS = {
    1: pt ? "Setup"         : "Setup",
    2: pt ? "Operação"      : "Trade",
    3: pt ? "Execução"      : "Execution",
    4: pt ? "Ocorrências"   : "Pains",
    5: pt ? "Pós-operação"  : "After trade",
    6: pt ? "Resultado"     : "Outcome",
  };

  // Current behavioral question (step 4, during question phase)
  const currentQuestion =
    step === 4 && painPhase === "questions" && currentPainType && currentPainType !== "clean"
      ? getNextQuestion(currentPainType, currentBehavior)
      : null;

  // Current after-trade question (step 5)
  const currentAfterTradeQuestion =
    step === 5 ? getNextAfterTradeQuestion(afterTrade) : null;

  // ── Auth + load setups ──────────────────────────────────────────────────────

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabaseBrowser.auth.getSession();
      if (!session) { router.push("/auth"); return; }
      setToken(session.access_token);
      setAuthReady(true);
      try {
        const res = await fetch("/api/journal/setups", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const data = await res.json();
        setSetups(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error("Setups load error:", e);
      }
    }
    init();
  }, []);

  // ── Navigation helpers ──────────────────────────────────────────────────────

  function goNext() {
    const nextIdx = stepIdx + 1;
    if (nextIdx < stepSequence.length) setStep(stepSequence[nextIdx]);
  }

  function goBack() {
    // Step 4 — pain flow back-navigation
    if (step === 4) {
      if (painPhase === "questions") {
        setCurrentPainType(null);
        setCurrentBehavior({});
        setPainPhase("picker");
        return;
      }
      if (painPhase === "summary") {
        setPainPhase("picker");
        return;
      }
    }
    const prevIdx = stepIdx - 1;
    if (prevIdx >= 0) {
      setStep(stepSequence[prevIdx]);
    } else {
      router.push("/journal");
    }
  }

  // ── Step 1 actions ──────────────────────────────────────────────────────────

  function selectSetup(setup) {
    setSelectedSetup(setup);
    setConditionsMet({});
    setStep(2);
  }

  function skipSetup() {
    setSelectedSetup(null);
    setStep(2);
  }

  // ── Step 4 (pain) actions ───────────────────────────────────────────────────

  function startPain(id) {
    setCurrentPainType(id);
    setCurrentBehavior({});
    if (id === "clean") {
      // Clean trade — commit immediately, go to summary
      setPains([{ type: "clean", behavior: {} }]);
      setPainPhase("summary");
    } else {
      const firstQ = getNextQuestion(id, {});
      if (firstQ) {
        setPainPhase("questions");
      } else {
        // Pain with no questions (shouldn't happen with current tree, but safe fallback)
        setPains((prev) => [...prev, { type: id, behavior: {} }]);
        setPainPhase("summary");
      }
    }
  }

  function answerBehaviorQuestion(key, value) {
    const newB = { ...currentBehavior, [key]: value };
    setCurrentBehavior(newB);
    const next = getNextQuestion(currentPainType, newB);
    if (!next) {
      // All questions answered — commit this pain
      setPains((prev) => [...prev, { type: currentPainType, behavior: newB }]);
      setCurrentPainType(null);
      setCurrentBehavior({});
      setPainPhase("summary");
    }
  }

  function removePain(index) {
    setPains((prev) => prev.filter((_, i) => i !== index));
  }

  function addAnotherPain() {
    setCurrentPainType(null);
    setCurrentBehavior({});
    setPainPhase("picker");
  }

  // ── Save ────────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!outcome || saving) return;
    setSaving(true);
    try {
      const body = {
        setup_id:      selectedSetup?.id || null,
        instrument:    instrument.trim() || null,
        direction:     direction || null,
        trade_date:    tradeDate || null,
        entry_price:   entryPrice ? parseFloat(entryPrice) : null,
        stop_price:    stopPrice  ? parseFloat(stopPrice)  : null,
        exit_price:    exitPrice  ? parseFloat(exitPrice)  : null,
        conditions_met: selectedSetup
          ? selectedSetup.conditions.map((c) => ({
              id:                   c.id,
              text:                 c.text,
              selected_variant:     conditionsMet[c.id]?.label ?? null,
              selected_description: conditionsMet[c.id]?.description ?? null,
            }))
          : [],
        variant_used: null,
        // Multi-pain fields (new)
        pain_types: pains.map((p) => p.type),
        behaviors:  Object.fromEntries(pains.map((p) => [p.type, p.behavior])),
        after_trade: afterTrade,
        // Legacy single-pain fields (kept for backward compat with old queries)
        pain_type:  pains.length === 1 ? (pains[0].type === "clean" ? null : pains[0].type) : null,
        behavior:   pains.length === 1 ? pains[0].behavior : {},
        outcome,
        notes: notes.trim() || null,
        lang,
      };

      const res = await fetch("/api/journal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      router.push("/journal?trade=logged");
    } catch (e) {
      alert(pt ? "Erro ao salvar. Tente novamente." : "Failed to save. Try again.");
    } finally {
      setSaving(false);
    }
  }

  // ── Loading ─────────────────────────────────────────────────────────────────

  if (!authReady) return <LoadingSpinner />;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-950 text-white">

      {/* Header */}
      <header className="px-6 py-5 border-b border-slate-800">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <button
            onClick={goBack}
            className="text-slate-400 hover:text-white text-sm transition-colors"
          >
            ← {pt ? "Voltar" : "Back"}
          </button>
          <span className="text-sm font-medium text-slate-300">
            {pt ? "Nova operação" : "New trade"}
          </span>
          <button
            onClick={() => { const n = lang === "en" ? "pt" : "en"; setLang(n); setLangState(n); }}
            className="text-xs px-2.5 py-1 rounded-full border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 transition-colors"
          >
            {pt ? "EN" : "PT"}
          </button>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-6 py-8">

        {/* Step indicator */}
        <div className="flex items-center gap-1.5 mb-8 overflow-x-auto pb-1">
          {stepSequence.map((s, i) => (
            <div key={s} className="flex items-center gap-1.5 flex-shrink-0">
              <div className="flex items-center gap-1.5">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium border flex-shrink-0 ${
                  i < stepIdx
                    ? "bg-blue-500 border-blue-500 text-white"
                    : i === stepIdx
                    ? "border-blue-400 text-blue-400"
                    : "border-slate-700 text-slate-600"
                }`}>
                  {i < stepIdx ? "✓" : i + 1}
                </span>
                <span className={`text-xs ${i === stepIdx ? "text-slate-300" : "text-slate-600"}`}>
                  {STEP_LABELS[s]}
                </span>
              </div>
              {i < stepSequence.length - 1 && (
                <span className="text-slate-700 text-xs mx-0.5">—</span>
              )}
            </div>
          ))}
        </div>

        {/* ── STEP 1: Setup selection ── */}
        {step === 1 && (
          <div>
            <h2 className="text-lg font-semibold mb-1">
              {pt ? "Qual setup você está operando?" : "Which setup are you trading?"}
            </h2>
            <p className="text-sm text-slate-400 mb-6">
              {pt ? "Selecione um setup definido ou continue sem um." : "Select a defined setup or continue without one."}
            </p>

            {setups.length > 0 ? (
              <div className="flex flex-col gap-2 mb-3">
                {setups.map((setup) => (
                  <button
                    key={setup.id}
                    onClick={() => selectSetup(setup)}
                    className="text-left px-4 py-4 rounded-xl border border-slate-700 hover:border-blue-400 hover:bg-blue-950/20 text-slate-200 transition-all"
                  >
                    <p className="text-sm font-medium">{setup.name}</p>
                    {setup.conditions?.length > 0 && (
                      <p className="text-xs text-slate-500 mt-0.5">
                        {setup.conditions.length}{" "}
                        {pt ? "condições" : "conditions"}
                        {(setup.stop_strategy || setup.profit_strategy)
                          ? ` · ${pt ? "saídas definidas" : "exits defined"}`
                          : ""}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <div className="mb-3 p-5 rounded-xl border border-dashed border-slate-700 text-center">
                <p className="text-sm text-slate-500">
                  {pt ? "Nenhum setup definido ainda." : "No setups defined yet."}
                </p>
                <button
                  onClick={() => router.push("/journal/setups/new")}
                  className="text-xs text-blue-400 hover:text-blue-300 mt-2 transition-colors"
                >
                  {pt ? "Criar um setup →" : "Create a setup →"}
                </button>
              </div>
            )}

            <button
              onClick={skipSetup}
              className="w-full py-3 rounded-xl border border-dashed border-slate-700 hover:border-slate-500 text-slate-500 hover:text-slate-300 text-sm transition-colors"
            >
              {pt ? "Continuar sem setup →" : "Continue without a setup →"}
            </button>
          </div>
        )}

        {/* ── STEP 2: Trade details ── */}
        {step === 2 && (
          <div>
            <h2 className="text-lg font-semibold mb-6">
              {pt ? "Detalhes da operação" : "Trade details"}
            </h2>

            <div className="mb-5">
              <label className="block text-xs text-slate-500 uppercase tracking-wider mb-2">
                {pt ? "Instrumento" : "Instrument"}
              </label>
              <input
                type="text"
                placeholder="NQ, ES, EURUSD, BTCUSD..."
                value={instrument}
                onChange={(e) => setInstrument(e.target.value)}
                autoFocus
                className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-600 focus:border-blue-500 focus:outline-none text-sm"
              />
            </div>

            <div className="mb-5">
              <label className="block text-xs text-slate-500 uppercase tracking-wider mb-2">
                {pt ? "Direção" : "Direction"}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setDirection("long")}
                  className={`py-3 rounded-xl border text-sm font-medium transition-all ${
                    direction === "long"
                      ? "border-green-400 bg-green-950/30 text-green-300"
                      : "border-slate-700 hover:border-green-500/50 text-slate-400"
                  }`}
                >
                  ↑ Long
                </button>
                <button
                  onClick={() => setDirection("short")}
                  className={`py-3 rounded-xl border text-sm font-medium transition-all ${
                    direction === "short"
                      ? "border-red-400 bg-red-950/30 text-red-300"
                      : "border-slate-700 hover:border-red-500/50 text-slate-400"
                  }`}
                >
                  ↓ Short
                </button>
              </div>
            </div>

            <div className="mb-5">
              <label className="block text-xs text-slate-500 uppercase tracking-wider mb-2">
                {pt ? "Data" : "Date"}
              </label>
              <input
                type="date"
                value={tradeDate}
                onChange={(e) => setTradeDate(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none text-sm"
              />
            </div>

            <div className="mb-6">
              <label className="block text-xs text-slate-500 uppercase tracking-wider mb-2">
                {pt ? "Preços (opcional)" : "Prices (optional)"}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  step="any"
                  placeholder={pt ? "Entrada" : "Entry"}
                  value={entryPrice}
                  onChange={(e) => setEntryPrice(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-600 focus:border-blue-500 focus:outline-none text-sm"
                />
                <input
                  type="number"
                  step="any"
                  placeholder="Stop"
                  value={stopPrice}
                  onChange={(e) => setStopPrice(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-600 focus:border-blue-500 focus:outline-none text-sm"
                />
              </div>
            </div>

            <button
              onClick={goNext}
              className="w-full py-3 rounded-xl bg-blue-500 hover:bg-blue-400 text-white text-sm font-medium transition-colors"
            >
              {pt ? "Continuar →" : "Continue →"}
            </button>
            <button onClick={goBack} className="mt-3 w-full text-slate-500 hover:text-slate-300 text-sm transition-colors">
              ← {pt ? "Voltar" : "Back"}
            </button>
          </div>
        )}

        {/* ── STEP 3: Execution ── */}
        {step === 3 && selectedSetup && (
          <div>
            <h2 className="text-lg font-semibold mb-1">
              {pt ? "Execução" : "Execution"}
            </h2>
            <p className="text-sm text-slate-400 mb-6">
              {pt
                ? "Para cada condição, selecione a variante que estava presente."
                : "For each condition, select the variant that was present."}
            </p>

            <div className="flex flex-col gap-5 mb-6">
              {selectedSetup.conditions.map((cond) => {
                const variants = cond.variants?.length > 0
                  ? cond.variants
                  : [
                      { label: "A", description: cond.variantA || (pt ? "Presente" : "Present") },
                      { label: "B", description: cond.variantB || (pt ? "Ausente" : "Absent") },
                    ];
                const selected = conditionsMet[cond.id]?.label ?? null;

                return (
                  <div key={cond.id}>
                    <p className="text-sm text-slate-200 mb-2 leading-snug">{cond.text}</p>
                    <div className="flex flex-wrap gap-2">
                      {variants.map((v) => {
                        const col = VARIANT_COLORS[v.label] || VARIANT_COLORS.A;
                        const isSelected = selected === v.label;
                        return (
                          <button
                            key={v.label}
                            onClick={() =>
                              setConditionsMet((prev) => ({
                                ...prev,
                                [cond.id]: isSelected ? null : { label: v.label, description: v.description },
                              }))
                            }
                            className={`py-2 px-3 rounded-xl border text-sm transition-all flex items-center gap-1.5 ${
                              isSelected
                                ? `${col.border} ${col.bg} ${col.text}`
                                : "border-slate-700 hover:border-slate-600 text-slate-400"
                            }`}
                          >
                            <span className={`font-bold text-xs ${isSelected ? col.text : "text-slate-500"}`}>
                              {v.label}
                            </span>
                            {v.description && <span>{v.description}</span>}
                          </button>
                        );
                      })}
                      <button
                        onClick={() => setConditionsMet((prev) => ({ ...prev, [cond.id]: null }))}
                        className={`py-2 px-3 rounded-xl border text-sm transition-all ${
                          conditionsMet[cond.id] === null || conditionsMet[cond.id] === undefined
                            ? "border-slate-600 bg-slate-800 text-slate-500"
                            : "border-slate-700 hover:border-slate-600 text-slate-600"
                        }`}
                      >
                        N/A
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              onClick={goNext}
              className="w-full py-3 rounded-xl bg-blue-500 hover:bg-blue-400 text-white text-sm font-medium transition-colors"
            >
              {pt ? "Continuar →" : "Continue →"}
            </button>
            <button onClick={goBack} className="mt-3 w-full text-slate-500 hover:text-slate-300 text-sm transition-colors">
              ← {pt ? "Voltar" : "Back"}
            </button>
          </div>
        )}

        {/* ── STEP 4: Pains (multi-select) ── */}
        {step === 4 && (
          <div>

            {/* Phase: picker */}
            {painPhase === "picker" && (
              <div>
                <h2 className="text-lg font-semibold mb-1">
                  {pt ? "O que apareceu nessa operação?" : "What showed up in this trade?"}
                </h2>
                <p className="text-sm text-slate-400 mb-1">
                  {pt
                    ? "Honestidade aqui é o que cria progresso."
                    : "Honesty here is what creates progress."}
                </p>
                {pains.length > 0 && (
                  <p className="text-xs text-blue-400 mb-4">
                    {pt ? "Você pode selecionar mais de um." : "You can select more than one."}
                  </p>
                )}
                {pains.length === 0 && <div className="mb-4" />}

                {/* Already-added pains summary (compact) */}
                {pains.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {pains.map((p, i) => {
                      const info = PAINS.find((x) => x.id === p.type);
                      return (
                        <span key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-950/40 border border-blue-500/30 text-blue-300 text-xs">
                          {info ? (pt ? info.pt : info.en) : p.type}
                          <button
                            onClick={() => removePain(i)}
                            className="text-blue-500 hover:text-red-400 transition-colors leading-none"
                          >
                            ×
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  {PAINS.filter((pain) => {
                    // Don't show "clean" if any real pain already added
                    if (pain.id === "clean" && pains.some((p) => p.type !== "clean")) return false;
                    // Don't show real pains if "clean" already added
                    if (pain.id !== "clean" && pains.some((p) => p.type === "clean")) return false;
                    // Don't show already-added pains
                    if (pains.some((p) => p.type === pain.id)) return false;
                    return true;
                  }).map((pain) => (
                    <button
                      key={pain.id}
                      onClick={() => startPain(pain.id)}
                      className="text-left px-4 py-3 rounded-xl border border-slate-700 hover:border-slate-500 hover:bg-slate-800 text-sm text-slate-200 transition-all"
                    >
                      {pt ? pain.pt : pain.en}
                    </button>
                  ))}
                </div>

                {pains.length > 0 && (
                  <button
                    onClick={() => setPainPhase("summary")}
                    className="mt-4 w-full py-3 rounded-xl bg-blue-500 hover:bg-blue-400 text-white text-sm font-medium transition-colors"
                  >
                    {pt ? "Continuar →" : "Continue →"}
                  </button>
                )}

                <button onClick={goBack} className="mt-3 w-full text-slate-500 hover:text-slate-300 text-sm transition-colors">
                  ← {pt ? "Voltar" : "Back"}
                </button>
              </div>
            )}

            {/* Phase: questions */}
            {painPhase === "questions" && currentPainType && currentQuestion && (
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                  {PAINS.find((p) => p.id === currentPainType)?.[pt ? "pt" : "en"]}
                </p>
                <p className="text-white text-lg font-medium mb-6 leading-snug">
                  {pt ? currentQuestion.question.pt : currentQuestion.question.en}
                </p>
                <div className="flex flex-col gap-2">
                  {currentQuestion.options.map((opt) => (
                    <button
                      key={String(opt.value)}
                      onClick={() => answerBehaviorQuestion(currentQuestion.key, opt.value)}
                      className="text-left px-4 py-3 rounded-xl border border-slate-700 hover:border-blue-400 hover:bg-blue-950/30 text-sm text-slate-200 transition-all"
                    >
                      {pt ? opt.pt : opt.en}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => { setCurrentPainType(null); setCurrentBehavior({}); setPainPhase("picker"); }}
                  className="mt-4 w-full text-slate-500 hover:text-slate-300 text-sm transition-colors"
                >
                  ← {pt ? "Voltar" : "Back"}
                </button>
              </div>
            )}

            {/* Phase: summary */}
            {painPhase === "summary" && (
              <div>
                <h2 className="text-lg font-semibold mb-6">
                  {pt ? "Ocorrências registradas" : "Pains captured"}
                </h2>

                <div className="flex flex-col gap-2 mb-6">
                  {pains.map((p, i) => {
                    const info = PAINS.find((x) => x.id === p.type);
                    return (
                      <div key={i} className="flex items-center justify-between px-4 py-3 rounded-xl border border-slate-700 bg-slate-900">
                        <p className="text-sm text-slate-200">
                          {info ? (pt ? info.pt : info.en) : p.type}
                        </p>
                        <button
                          onClick={() => removePain(i)}
                          className="text-xs text-slate-500 hover:text-red-400 transition-colors"
                        >
                          {pt ? "Remover" : "Remove"}
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Add another (only if not clean) */}
                {!pains.some((p) => p.type === "clean") && (
                  <button
                    onClick={addAnotherPain}
                    className="w-full py-3 rounded-xl border border-dashed border-slate-700 hover:border-slate-500 text-slate-500 hover:text-slate-300 text-sm transition-colors mb-3"
                  >
                    + {pt ? "Adicionar outra ocorrência" : "Add another pain"}
                  </button>
                )}

                <button
                  onClick={goNext}
                  className="w-full py-3 rounded-xl bg-blue-500 hover:bg-blue-400 text-white text-sm font-medium transition-colors"
                >
                  {pt ? "Continuar →" : "Continue →"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── STEP 5: After-trade questions ── */}
        {step === 5 && (
          <div>
            {currentAfterTradeQuestion ? (
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                  {pt ? "Pós-operação" : "After trade"}
                </p>
                <p className="text-white text-lg font-medium mb-6 leading-snug">
                  {pt ? currentAfterTradeQuestion.question.pt : currentAfterTradeQuestion.question.en}
                </p>
                <div className="flex flex-col gap-2">
                  {currentAfterTradeQuestion.options.map((opt) => (
                    <button
                      key={String(opt.value)}
                      onClick={() => {
                        const newAT = { ...afterTrade, [currentAfterTradeQuestion.key]: opt.value };
                        setAfterTrade(newAT);
                        // getNextAfterTradeQuestion called reactively via state
                      }}
                      className="text-left px-4 py-3 rounded-xl border border-slate-700 hover:border-blue-400 hover:bg-blue-950/30 text-sm text-slate-200 transition-all"
                    >
                      {pt ? opt.pt : opt.en}
                    </button>
                  ))}
                </div>
                <button onClick={goBack} className="mt-4 w-full text-slate-500 hover:text-slate-300 text-sm transition-colors">
                  ← {pt ? "Voltar" : "Back"}
                </button>
              </div>
            ) : (
              // All after-trade questions answered
              <div>
                <h2 className="text-lg font-semibold mb-6">
                  {pt ? "Pós-operação registrado" : "After-trade captured"}
                </h2>
                <button
                  onClick={goNext}
                  className="w-full py-3 rounded-xl bg-blue-500 hover:bg-blue-400 text-white text-sm font-medium transition-colors"
                >
                  {pt ? "Continuar →" : "Continue →"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── STEP 6: Outcome ── */}
        {step === 6 && (
          <div>
            <h2 className="text-lg font-semibold mb-6">
              {pt ? "Como essa operação terminou?" : "How did this trade end?"}
            </h2>

            <div className="mb-5">
              <label className="block text-xs text-slate-500 uppercase tracking-wider mb-2">
                {pt ? "Preço de saída (opcional)" : "Exit price (optional)"}
              </label>
              <input
                type="number"
                step="any"
                placeholder={pt ? "Saída" : "Exit"}
                value={exitPrice}
                onChange={(e) => setExitPrice(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-600 focus:border-blue-500 focus:outline-none text-sm"
              />
            </div>

            <div className="grid grid-cols-3 gap-3 mb-5">
              {[
                { val: "win",       label: pt ? "Ganhou" : "Win", active: "border-green-400 bg-green-950/30 text-green-300", inactive: "border-green-500/30 hover:border-green-400 text-green-600" },
                { val: "loss",      label: pt ? "Perdeu" : "Loss", active: "border-red-400 bg-red-950/30 text-red-300", inactive: "border-red-500/30 hover:border-red-400 text-red-600" },
                { val: "breakeven", label: "BE", active: "border-slate-400 bg-slate-800 text-slate-300", inactive: "border-slate-600 hover:border-slate-400 text-slate-600" },
              ].map((o) => (
                <button
                  key={o.val}
                  onClick={() => setOutcome(o.val)}
                  className={`py-4 rounded-xl border text-sm font-medium transition-all ${outcome === o.val ? o.active : o.inactive}`}
                >
                  {o.label}
                </button>
              ))}
            </div>

            <div className="mb-6">
              <label className="block text-xs text-slate-500 uppercase tracking-wider mb-2">
                {pt ? "Notas (opcional)" : "Notes (optional)"}
              </label>
              <textarea
                placeholder={pt ? "O que você observou? Qualquer insight..." : "What did you notice? Any insight..."}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-600 focus:border-blue-500 focus:outline-none text-sm resize-none"
              />
            </div>

            <button
              onClick={handleSave}
              disabled={!outcome || saving}
              className="w-full py-3.5 rounded-xl bg-blue-500 hover:bg-blue-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium text-sm transition-colors"
            >
              {saving ? "..." : pt ? "Salvar operação →" : "Save trade →"}
            </button>
            <button onClick={goBack} className="mt-3 w-full text-slate-500 hover:text-slate-300 text-sm transition-colors">
              ← {pt ? "Voltar" : "Back"}
            </button>
          </div>
        )}

      </main>
    </div>
  );
}
