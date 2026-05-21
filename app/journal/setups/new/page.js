"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { getLang, setLang } from "@/lib/i18n";
import { supabaseBrowser } from "@/lib/supabase-browser";

// ── Helpers ───────────────────────────────────────────────────────────────────

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function NewSetupPage() {
  const router = useRouter();
  const [lang, setLangState] = useState(() => getLang());
  const [token, setToken] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  // Wizard state
  const [step, setStep] = useState(1); // 1=name, 2=conditions, 3=strategies, 4=review
  const [name, setName] = useState("");
  const [conditions, setConditions] = useState([]); // [{id, text, variantA, variantB}]
  const [expandedCondition, setExpandedCondition] = useState(null); // id of expanded condition
  const [newConditionText, setNewConditionText] = useState("");
  const [stopStrategy, setStopStrategy] = useState("");
  const [profitStrategy, setProfitStrategy] = useState("");
  const [saving, setSaving] = useState(false);

  const conditionInputRef = useRef(null);
  const pt = lang === "pt";

  function toggleLang() {
    const next = lang === "en" ? "pt" : "en";
    setLang(next);
    setLangState(next);
  }

  useEffect(() => {
    async function checkAuth() {
      const { data: { session } } = await supabaseBrowser.auth.getSession();
      if (!session) {
        localStorage.setItem("smartlog_auth_next", "/journal/setups/new");
        router.push("/auth");
        return;
      }
      setToken(session.access_token);
      setAuthReady(true);
    }
    checkAuth();
  }, []);

  // ── Condition helpers ─────────────────────────────────────────────────────

  function addCondition() {
    const text = newConditionText.trim();
    if (!text || conditions.length >= 5) return;
    const id = uid();
    setConditions([...conditions, { id, text, variantA: "", variantB: "" }]);
    setNewConditionText("");
    setExpandedCondition(id); // auto-expand to invite variant input
    setTimeout(() => conditionInputRef.current?.focus(), 100);
  }

  function removeCondition(id) {
    setConditions(conditions.filter((c) => c.id !== id));
    if (expandedCondition === id) setExpandedCondition(null);
  }

  function updateVariant(id, field, value) {
    setConditions(conditions.map((c) => (c.id === id ? { ...c, [field]: value } : c)));
  }

  function toggleExpand(id) {
    setExpandedCondition(expandedCondition === id ? null : id);
  }

  // ── Save ──────────────────────────────────────────────────────────────────

  async function saveSetup() {
    setSaving(true);
    try {
      const res = await fetch("/api/journal/setups", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          conditions: conditions.map(({ id, text, variantA, variantB }) => ({
            id,
            text,
            variantA: variantA.trim(),
            variantB: variantB.trim(),
          })),
          stop_strategy: stopStrategy,
          profit_strategy: profitStrategy,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      router.push("/journal?setup=created");
    } catch (e) {
      alert(pt ? "Erro ao salvar. Tente novamente." : "Failed to save. Try again.");
    } finally {
      setSaving(false);
    }
  }

  // ── Loading ───────────────────────────────────────────────────────────────

  if (!authReady) {
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

  // ── Progress bar ──────────────────────────────────────────────────────────

  const steps = [
    pt ? "Nome" : "Name",
    pt ? "Condições" : "Conditions",
    pt ? "Estratégias" : "Strategies",
    pt ? "Revisão" : "Review",
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white">

      {/* Header */}
      <header className="px-8 py-5 border-b border-slate-800">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/journal")}
              className="text-xl font-semibold tracking-tight hover:opacity-80 transition-opacity"
            >
              Smart<span className="text-blue-400">Log</span>
            </button>
            <span className="text-slate-600 text-sm">·</span>
            <span className="text-slate-400 text-sm">
              {pt ? "Definir setup" : "Define setup"}
            </span>
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

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-10">
          {steps.map((label, i) => {
            const n = i + 1;
            const done = step > n;
            const active = step === n;
            return (
              <div key={n} className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-all ${
                    done
                      ? "bg-blue-500 text-white"
                      : active
                      ? "bg-blue-500/20 border border-blue-400 text-blue-400"
                      : "bg-slate-800 border border-slate-700 text-slate-600"
                  }`}>
                    {done ? "✓" : n}
                  </div>
                  <span className={`text-xs hidden sm:block ${active ? "text-slate-300" : done ? "text-slate-400" : "text-slate-600"}`}>
                    {label}
                  </span>
                </div>
                {i < steps.length - 1 && (
                  <div className={`h-px w-6 sm:w-10 ${step > n ? "bg-blue-500" : "bg-slate-800"}`} />
                )}
              </div>
            );
          })}
        </div>

        {/* ── STEP 1: Name ── */}
        {step === 1 && (
          <div>
            <h2 className="text-xl font-semibold text-white mb-2">
              {pt ? "Como você chama esse setup?" : "What do you call this setup?"}
            </h2>
            <p className="text-slate-400 text-sm mb-8 leading-relaxed">
              {pt
                ? "Um nome claro que você reconheça imediatamente. Não precisa ser técnico — só precisa ser seu."
                : "A clear name you'll recognize instantly. It doesn't need to be technical — it just needs to be yours."}
            </p>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && name.trim()) setStep(2); }}
              placeholder={pt ? "ex: Breakout em nível-chave, Rejeição na abertura..." : "e.g. Breakout at key level, Opening range fade..."}
              autoFocus
              className="w-full bg-slate-800 text-white placeholder-slate-600 rounded-2xl px-5 py-4 text-base focus:outline-none focus:ring-1 focus:ring-blue-500 mb-8"
            />
            <button
              onClick={() => setStep(2)}
              disabled={!name.trim()}
              className="w-full py-3.5 rounded-full bg-blue-500 hover:bg-blue-400 disabled:bg-slate-800 disabled:text-slate-600 text-white font-medium transition-colors"
            >
              {pt ? "Continuar →" : "Continue →"}
            </button>
          </div>
        )}

        {/* ── STEP 2: Conditions ── */}
        {step === 2 && (
          <div>
            <h2 className="text-xl font-semibold text-white mb-2">
              {pt ? "Quais condições precisam ser verdadeiras?" : "What conditions need to be true?"}
            </h2>
            <p className="text-slate-400 text-sm mb-2 leading-relaxed">
              {pt
                ? "Condições são as regras que a sua operação precisa passar antes de você entrar. Cada uma deve ser respondida com sim ou não."
                : "Conditions are the rules your trade must pass before you enter. Each one should be answerable with yes or no."}
            </p>
            <p className="text-slate-600 text-xs mb-8">
              {pt ? "Máximo 5 condições." : "Up to 5 conditions."}
            </p>

            {/* Existing conditions */}
            {conditions.length > 0 && (
              <div className="flex flex-col gap-3 mb-5">
                {conditions.map((cond, i) => (
                  <div key={cond.id} className="rounded-2xl border border-slate-700 bg-slate-900 overflow-hidden">
                    {/* Condition header */}
                    <div className="flex items-center gap-3 px-4 py-3">
                      <span className="w-5 h-5 rounded-full bg-slate-800 border border-slate-600 text-slate-500 text-xs flex items-center justify-center flex-shrink-0">
                        {i + 1}
                      </span>
                      <span className="flex-1 text-sm text-slate-200">{cond.text}</span>
                      <button
                        onClick={() => toggleExpand(cond.id)}
                        className={`text-xs px-2.5 py-1 rounded-full border transition-colors flex-shrink-0 ${
                          cond.variantA || cond.variantB
                            ? "border-blue-500/40 text-blue-400 bg-blue-950/20"
                            : "border-slate-700 text-slate-500 hover:border-slate-500 hover:text-slate-300"
                        }`}
                      >
                        {cond.variantA || cond.variantB
                          ? (pt ? "Variantes ▾" : "Variants ▾")
                          : (pt ? "+ Variantes" : "+ Variants")}
                      </button>
                      <button
                        onClick={() => removeCondition(cond.id)}
                        className="text-slate-600 hover:text-slate-400 transition-colors text-sm flex-shrink-0"
                      >
                        ✕
                      </button>
                    </div>

                    {/* Variants (expandable) */}
                    {expandedCondition === cond.id && (
                      <div className="px-4 pb-4 border-t border-slate-800 pt-3">
                        <p className="text-xs text-slate-500 mb-3 leading-relaxed">
                          {pt
                            ? "Variantes são duas formas diferentes de satisfazer essa condição. Registrar qual você usou te permite comparar ao longo do tempo."
                            : "Variants are two different ways to satisfy this condition. Logging which one you used lets you compare them over time."}
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs text-blue-400 mb-1.5">
                              {pt ? "Variante A" : "Variant A"}
                            </p>
                            <input
                              type="text"
                              value={cond.variantA}
                              onChange={(e) => updateVariant(cond.id, "variantA", e.target.value)}
                              placeholder={pt ? "ex: Rejeição limpa" : "e.g. Clean rejection"}
                              className="w-full bg-slate-800 text-white placeholder-slate-600 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <p className="text-xs text-purple-400 mb-1.5">
                              {pt ? "Variante B" : "Variant B"}
                            </p>
                            <input
                              type="text"
                              value={cond.variantB}
                              onChange={(e) => updateVariant(cond.id, "variantB", e.target.value)}
                              placeholder={pt ? "ex: Qualquer toque" : "e.g. Any touch"}
                              className="w-full bg-slate-800 text-white placeholder-slate-600 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Add condition input */}
            {conditions.length < 5 && (
              <div className="flex gap-2 mb-8">
                <input
                  ref={conditionInputRef}
                  type="text"
                  value={newConditionText}
                  onChange={(e) => setNewConditionText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") addCondition(); }}
                  placeholder={
                    conditions.length === 0
                      ? (pt ? "Descreva a primeira condição..." : "Describe the first condition...")
                      : (pt ? "Adicionar outra condição..." : "Add another condition...")
                  }
                  autoFocus={conditions.length === 0}
                  className="flex-1 bg-slate-800 text-white placeholder-slate-600 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  onClick={addCondition}
                  disabled={!newConditionText.trim()}
                  className="flex-shrink-0 px-4 py-3 rounded-2xl bg-blue-500 hover:bg-blue-400 disabled:bg-slate-800 disabled:text-slate-600 text-white text-sm font-medium transition-colors"
                >
                  {pt ? "Adicionar" : "Add"}
                </button>
              </div>
            )}

            {conditions.length === 5 && <div className="mb-8" />}

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="px-6 py-3 rounded-full border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 text-sm font-medium transition-colors"
              >
                ← {pt ? "Voltar" : "Back"}
              </button>
              <button
                onClick={() => setStep(3)}
                className="flex-1 py-3 rounded-full bg-blue-500 hover:bg-blue-400 text-white font-medium text-sm transition-colors"
              >
                {conditions.length === 0
                  ? (pt ? "Pular por agora →" : "Skip for now →")
                  : (pt ? "Continuar →" : "Continue →")}
              </button>
            </div>

            {conditions.length === 0 && (
              <p className="text-center text-slate-600 text-xs mt-3">
                {pt
                  ? "Você pode adicionar condições depois."
                  : "You can add conditions later."}
              </p>
            )}
          </div>
        )}

        {/* ── STEP 3: Strategies (optional) ── */}
        {step === 3 && (
          <div>
            <h2 className="text-xl font-semibold text-white mb-2">
              {pt ? "Estratégias de saída" : "Exit strategies"}
            </h2>
            <p className="text-slate-400 text-sm mb-8 leading-relaxed">
              {pt
                ? "Opcional. Nomear suas estratégias de stop e alvo cria clareza na hora de avaliar cada operação."
                : "Optional. Naming your stop and target strategies creates clarity when evaluating each trade."}
            </p>

            <div className="space-y-5 mb-8">
              <div>
                <label className="block text-sm text-slate-300 mb-2 font-medium">
                  {pt ? "Estratégia de stop" : "Stop strategy"}
                </label>
                <input
                  type="text"
                  value={stopStrategy}
                  onChange={(e) => setStopStrategy(e.target.value)}
                  placeholder={pt ? "ex: Abaixo do nível-chave, ATR ×2..." : "e.g. Below key level, ATR ×2..."}
                  className="w-full bg-slate-800 text-white placeholder-slate-600 rounded-2xl px-5 py-4 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-300 mb-2 font-medium">
                  {pt ? "Estratégia de alvo / lucro" : "Target / profit strategy"}
                </label>
                <input
                  type="text"
                  value={profitStrategy}
                  onChange={(e) => setProfitStrategy(e.target.value)}
                  placeholder={pt ? "ex: R:R 1:2, topo/fundo anterior..." : "e.g. 1:2 R:R, previous swing high..."}
                  className="w-full bg-slate-800 text-white placeholder-slate-600 rounded-2xl px-5 py-4 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(2)}
                className="px-6 py-3 rounded-full border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 text-sm font-medium transition-colors"
              >
                ← {pt ? "Voltar" : "Back"}
              </button>
              <button
                onClick={() => setStep(4)}
                className="flex-1 py-3 rounded-full bg-blue-500 hover:bg-blue-400 text-white font-medium text-sm transition-colors"
              >
                {pt ? "Revisar →" : "Review →"}
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 4: Review ── */}
        {step === 4 && (
          <div>
            <h2 className="text-xl font-semibold text-white mb-2">
              {pt ? "Tudo certo?" : "Does this look right?"}
            </h2>
            <p className="text-slate-400 text-sm mb-8">
              {pt
                ? "Revise antes de salvar. Você pode editar depois."
                : "Review before saving. You can edit later."}
            </p>

            {/* Setup name */}
            <div className="mb-5 p-5 rounded-2xl border border-slate-700 bg-slate-900">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                {pt ? "Setup" : "Setup"}
              </p>
              <p className="text-white font-semibold text-lg">{name}</p>
            </div>

            {/* Conditions */}
            {conditions.length > 0 && (
              <div className="mb-5">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">
                  {pt ? "Condições de entrada" : "Entry conditions"}
                </p>
                <div className="flex flex-col gap-2">
                  {conditions.map((cond, i) => (
                    <div key={cond.id} className="p-4 rounded-xl border border-slate-700 bg-slate-900">
                      <div className="flex items-start gap-3">
                        <span className="w-5 h-5 rounded-full bg-slate-800 border border-slate-700 text-slate-500 text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        <div className="flex-1">
                          <p className="text-sm text-slate-200">{cond.text}</p>
                          {(cond.variantA || cond.variantB) && (
                            <div className="flex gap-3 mt-2">
                              {cond.variantA && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                  A: {cond.variantA}
                                </span>
                              )}
                              {cond.variantB && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                  B: {cond.variantB}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Strategies */}
            {(stopStrategy || profitStrategy) && (
              <div className="mb-8">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">
                  {pt ? "Estratégias de saída" : "Exit strategies"}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {stopStrategy && (
                    <div className="p-3 rounded-xl border border-slate-700 bg-slate-900">
                      <p className="text-xs text-slate-500 mb-1">{pt ? "Stop" : "Stop"}</p>
                      <p className="text-sm text-slate-200">{stopStrategy}</p>
                    </div>
                  )}
                  {profitStrategy && (
                    <div className="p-3 rounded-xl border border-slate-700 bg-slate-900">
                      <p className="text-xs text-slate-500 mb-1">{pt ? "Alvo" : "Target"}</p>
                      <p className="text-sm text-slate-200">{profitStrategy}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {!stopStrategy && !profitStrategy && <div className="mb-8" />}

            <div className="flex gap-3">
              <button
                onClick={() => setStep(3)}
                className="px-6 py-3 rounded-full border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 text-sm font-medium transition-colors"
              >
                ← {pt ? "Voltar" : "Back"}
              </button>
              <button
                onClick={saveSetup}
                disabled={saving}
                className="flex-1 py-3 rounded-full bg-blue-500 hover:bg-blue-400 disabled:opacity-50 text-white font-medium text-sm transition-colors"
              >
                {saving
                  ? (pt ? "Salvando..." : "Saving...")
                  : (pt ? "Salvar setup →" : "Save setup →")}
              </button>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
