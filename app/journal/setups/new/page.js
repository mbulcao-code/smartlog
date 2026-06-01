"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { getLang, setLang } from "@/lib/i18n";
import { supabaseBrowser } from "@/lib/supabase-browser";

// ── Helpers ───────────────────────────────────────────────────────────────────

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

const VARIANT_LABELS = ["A", "B", "C", "D", "E"];

const VARIANT_COLORS = {
  A: { text: "text-blue-400",   ring: "ring-blue-500",   bg: "bg-blue-500/10",   border: "border-blue-500/30"   },
  B: { text: "text-purple-400", ring: "ring-purple-500", bg: "bg-purple-500/10", border: "border-purple-500/30" },
  C: { text: "text-green-400",  ring: "ring-green-500",  bg: "bg-green-500/10",  border: "border-green-500/30"  },
  D: { text: "text-amber-400",  ring: "ring-amber-500",  bg: "bg-amber-500/10",  border: "border-amber-500/30"  },
  E: { text: "text-cyan-400",   ring: "ring-cyan-500",   bg: "bg-cyan-500/10",   border: "border-cyan-500/30"   },
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function NewSetupPage() {
  const router = useRouter();
  const [lang, setLangState] = useState(() => getLang());
  const [token, setToken] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [setupCount, setSetupCount] = useState(0);

  // Wizard state
  const [step, setStep] = useState(1); // 1=name, 2=conditions, 3=strategies, 4=review

  // Step 1
  const [name, setName] = useState("");

  // Step 2 — conditions: [{id, text, variants: [{id, label, description}]}]
  const [conditions, setConditions] = useState([]);
  const [expandedCond, setExpandedCond] = useState(null);
  const [newCondText, setNewCondText] = useState("");
  const condInputRef = useRef(null);

  // Step 3 — stop strategy
  const [stopInitial, setStopInitial] = useState("");
  const [stopRules, setStopRules] = useState([]);  // up to 2 move-stop rules

  // Step 3 — profit targets: [{id, size, description, isRunner}]
  const [profitTargets, setProfitTargets] = useState([
    { id: uid(), size: "", description: "", isRunner: false },
  ]);

  const [saving, setSaving] = useState(false);
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
      // Check existing setup count
      try {
        const res = await fetch("/api/journal/setups", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const data = await res.json();
        setSetupCount(Array.isArray(data) ? data.length : 0);
      } catch (_) { /* non-critical */ }
      setAuthReady(true);
    }
    checkAuth();
  }, []);

  // ── Condition helpers ─────────────────────────────────────────────────────

  function addCondition() {
    const text = newCondText.trim();
    if (!text || conditions.length >= 5) return;
    const id = uid();
    setConditions([...conditions, {
      id,
      text,
      variants: [
        { id: uid(), label: "A", description: "" },
        { id: uid(), label: "B", description: "" },
      ],
    }]);
    setNewCondText("");
    setExpandedCond(id);
    setTimeout(() => condInputRef.current?.focus(), 100);
  }

  function removeCondition(id) {
    setConditions(conditions.filter((c) => c.id !== id));
    if (expandedCond === id) setExpandedCond(null);
  }

  function updateConditionVariant(condId, varId, description) {
    setConditions((prev) => prev.map((c) => {
      if (c.id !== condId) return c;
      return { ...c, variants: c.variants.map((v) => v.id === varId ? { ...v, description } : v) };
    }));
  }

  function addVariant(condId) {
    setConditions((prev) => prev.map((c) => {
      if (c.id !== condId || c.variants.length >= 5) return c;
      const label = VARIANT_LABELS[c.variants.length];
      return { ...c, variants: [...c.variants, { id: uid(), label, description: "" }] };
    }));
  }

  function removeVariant(condId, varId) {
    setConditions((prev) => prev.map((c) => {
      if (c.id !== condId) return c;
      const filtered = c.variants.filter((v) => v.id !== varId);
      // Re-label A→E in order
      return { ...c, variants: filtered.map((v, i) => ({ ...v, label: VARIANT_LABELS[i] })) };
    }));
  }

  // ── Stop rule helpers ─────────────────────────────────────────────────────

  function addStopRule() {
    if (stopRules.length >= 2) return;
    setStopRules([...stopRules, ""]);
  }

  function updateStopRule(i, val) {
    setStopRules(stopRules.map((r, idx) => (idx === i ? val : r)));
  }

  function removeStopRule(i) {
    setStopRules(stopRules.filter((_, idx) => idx !== i));
  }

  // ── Profit target helpers ─────────────────────────────────────────────────

  function addTarget() {
    if (profitTargets.length >= 3) return;
    setProfitTargets([...profitTargets, { id: uid(), size: "", description: "", isRunner: false }]);
  }

  function updateTarget(id, field, val) {
    setProfitTargets((prev) => prev.map((t) => (t.id === id ? { ...t, [field]: val } : t)));
  }

  function removeTarget(id) {
    setProfitTargets((prev) => prev.filter((t) => t.id !== id));
  }

  // ── Save ──────────────────────────────────────────────────────────────────

  async function saveSetup() {
    setSaving(true);
    try {
      const body = {
        name,
        conditions: conditions.map(({ id, text, variants }) => ({
          id,
          text,
          variants: variants.map((v) => ({
            id: v.id,
            label: v.label,
            description: v.description.trim(),
          })),
        })),
        stop_config: {
          initial: stopInitial.trim(),
          rules: stopRules.map((r) => r.trim()).filter(Boolean),
        },
        profit_config: {
          targets: profitTargets
            .map((t, i) => ({
              label: `T${i + 1}`,
              size: t.size.trim(),
              description: t.description.trim(),
              isRunner: t.isRunner,
            }))
            .filter((t) => t.size || t.description),
        },
        // Keep text fields null for compat
        stop_strategy: null,
        profit_strategy: null,
      };

      const res = await fetch("/api/journal/setups", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
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

  if (setupCount >= 10) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center gap-6 px-6 text-center">
        <p className="text-3xl">🔒</p>
        <div>
          <h1 className="text-xl font-bold text-white mb-2">
            {pt ? "Limite de setups atingido" : "Setup limit reached"}
          </h1>
          <p className="text-sm text-slate-400 max-w-xs">
            {pt
              ? "Você já tem 10 setups ativos. Esse é o limite — mais setups significam mais ruído, não mais clareza. Exclua um setup existente para criar um novo."
              : "You already have 10 active setups. That's the limit — more setups mean more noise, not more clarity. Delete an existing setup to create a new one."}
          </p>
        </div>
        <button
          onClick={() => router.push("/journal")}
          className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
        >
          ← {pt ? "Voltar ao diário" : "Back to journal"}
        </button>
      </div>
    );
  }

  const steps = [
    pt ? "Nome" : "Name",
    pt ? "Condições" : "Conditions",
    pt ? "Saídas" : "Exits",
    pt ? "Revisão" : "Review",
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white">

      {/* Header */}
      <header className="px-8 py-5 border-b border-slate-800">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/journal")} className="text-xl font-semibold tracking-tight hover:opacity-80 transition-opacity">
              Smart<span className="text-blue-400">Log</span>
            </button>
            <span className="text-slate-600 text-sm">·</span>
            <span className="text-slate-400 text-sm">{pt ? "Definir setup" : "Define setup"}</span>
          </div>
          <button onClick={toggleLang} className="text-xs px-2.5 py-1 rounded-full border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 transition-colors">
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
                    done ? "bg-blue-500 text-white"
                    : active ? "bg-blue-500/20 border border-blue-400 text-blue-400"
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
            <h2 className="text-xl font-semibold mb-2">{pt ? "Como você chama esse setup?" : "What do you call this setup?"}</h2>
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
              placeholder={pt ? "ex: Reversão em nível-chave..." : "e.g. Reversal at key level..."}
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
            <h2 className="text-xl font-semibold mb-2">
              {pt ? "Quais condições precisam ser verdadeiras?" : "What conditions need to be true?"}
            </h2>
            <p className="text-slate-400 text-sm mb-1 leading-relaxed">
              {pt
                ? "Cada condição pode ter até 5 variantes (A–E) — formas diferentes de satisfazê-la."
                : "Each condition can have up to 5 variants (A–E) — different ways to satisfy it."}
            </p>
            <p className="text-slate-600 text-xs mb-8">{pt ? "Máximo 5 condições." : "Up to 5 conditions."}</p>

            {/* Existing conditions */}
            {conditions.length > 0 && (
              <div className="flex flex-col gap-3 mb-5">
                {conditions.map((cond, i) => {
                  const isExpanded = expandedCond === cond.id;
                  return (
                    <div key={cond.id} className="rounded-2xl border border-slate-700 bg-slate-900 overflow-hidden">
                      {/* Header row */}
                      <div className="flex items-center gap-3 px-4 py-3">
                        <span className="w-5 h-5 rounded-full bg-slate-800 border border-slate-600 text-slate-500 text-xs flex items-center justify-center flex-shrink-0">
                          {i + 1}
                        </span>
                        <span className="flex-1 text-sm text-slate-200">{cond.text}</span>
                        {/* Variant count badge */}
                        <button
                          onClick={() => setExpandedCond(isExpanded ? null : cond.id)}
                          className={`text-xs px-2.5 py-1 rounded-full border flex-shrink-0 transition-colors ${
                            isExpanded
                              ? "border-blue-500/40 text-blue-400 bg-blue-950/20"
                              : "border-slate-700 text-slate-500 hover:border-slate-500 hover:text-slate-300"
                          }`}
                        >
                          {cond.variants.filter(v => v.description).length > 0
                            ? `${cond.variants.length} ${pt ? "var." : "var."} ${isExpanded ? "▲" : "▾"}`
                            : (pt ? "+ Variantes ▾" : "+ Variants ▾")}
                        </button>
                        <button onClick={() => removeCondition(cond.id)} className="text-slate-600 hover:text-slate-400 transition-colors text-sm flex-shrink-0">✕</button>
                      </div>

                      {/* Variants (expanded) */}
                      {isExpanded && (
                        <div className="px-4 pb-4 border-t border-slate-800 pt-3 space-y-2">
                          {cond.variants.map((v) => {
                            const col = VARIANT_COLORS[v.label] || VARIANT_COLORS.A;
                            return (
                              <div key={v.id} className="flex items-center gap-2">
                                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${col.bg} ${col.text} border ${col.border}`}>
                                  {v.label}
                                </span>
                                <input
                                  type="text"
                                  value={v.description}
                                  onChange={(e) => updateConditionVariant(cond.id, v.id, e.target.value)}
                                  placeholder={pt ? `Descreva variante ${v.label}...` : `Describe variant ${v.label}...`}
                                  className="flex-1 bg-slate-800 text-white placeholder-slate-600 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                                {cond.variants.length > 2 && (
                                  <button onClick={() => removeVariant(cond.id, v.id)} className="text-slate-700 hover:text-slate-400 text-xs transition-colors flex-shrink-0">✕</button>
                                )}
                              </div>
                            );
                          })}
                          {cond.variants.length < 5 && (
                            <button
                              onClick={() => addVariant(cond.id)}
                              className="text-xs text-slate-500 hover:text-slate-300 transition-colors mt-1"
                            >
                              + {pt ? `Adicionar variante ${VARIANT_LABELS[cond.variants.length]}` : `Add variant ${VARIANT_LABELS[cond.variants.length]}`}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Add condition */}
            {conditions.length < 5 && (
              <div className="flex gap-2 mb-8">
                <input
                  ref={condInputRef}
                  type="text"
                  value={newCondText}
                  onChange={(e) => setNewCondText(e.target.value)}
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
                  disabled={!newCondText.trim()}
                  className="flex-shrink-0 px-4 py-3 rounded-2xl bg-blue-500 hover:bg-blue-400 disabled:bg-slate-800 disabled:text-slate-600 text-white text-sm font-medium transition-colors"
                >
                  {pt ? "Adicionar" : "Add"}
                </button>
              </div>
            )}

            {conditions.length === 5 && <div className="mb-8" />}

            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="px-6 py-3 rounded-full border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 text-sm font-medium transition-colors">
                ← {pt ? "Voltar" : "Back"}
              </button>
              <button onClick={() => setStep(3)} className="flex-1 py-3 rounded-full bg-blue-500 hover:bg-blue-400 text-white font-medium text-sm transition-colors">
                {conditions.length === 0 ? (pt ? "Pular →" : "Skip →") : (pt ? "Continuar →" : "Continue →")}
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Exit strategies ── */}
        {step === 3 && (
          <div>
            <h2 className="text-xl font-semibold mb-2">{pt ? "Estratégias de saída" : "Exit strategies"}</h2>
            <p className="text-slate-400 text-sm mb-8 leading-relaxed">
              {pt
                ? "Opcional. Definir suas regras de stop e alvos de lucro antes de entrar é o que separa a execução disciplinada da improvisação."
                : "Optional. Defining your stop rules and profit targets before entering is what separates disciplined execution from improvisation."}
            </p>

            {/* ── Stop strategy ── */}
            <div className="mb-8">
              <p className="text-sm font-medium text-slate-300 mb-3">
                {pt ? "Stop" : "Stop loss"}
              </p>

              <div className="space-y-2">
                <input
                  type="text"
                  value={stopInitial}
                  onChange={(e) => setStopInitial(e.target.value)}
                  placeholder={pt ? "Onde você coloca o stop inicial? ex: abaixo do swing low..." : "Where do you place the initial stop? e.g. below the last swing low..."}
                  className="w-full bg-slate-800 text-white placeholder-slate-600 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                />

                {stopRules.map((rule, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <span className="text-xs text-slate-500 flex-shrink-0 w-16">
                      {pt ? `Regra ${i + 1}:` : `Rule ${i + 1}:`}
                    </span>
                    <input
                      type="text"
                      value={rule}
                      onChange={(e) => updateStopRule(i, e.target.value)}
                      placeholder={pt ? "ex: Move para BE ao atingir 1R..." : "e.g. Move to BE when price reaches 1R..."}
                      className="flex-1 bg-slate-800 text-white placeholder-slate-600 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <button onClick={() => removeStopRule(i)} className="text-slate-600 hover:text-slate-400 text-sm transition-colors flex-shrink-0">✕</button>
                  </div>
                ))}

                {stopRules.length < 2 && (
                  <button onClick={addStopRule} className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
                    + {pt ? "Adicionar regra de mover stop" : "Add move-stop rule"}
                  </button>
                )}
              </div>
            </div>

            {/* ── Profit targets ── */}
            <div className="mb-8">
              <p className="text-sm font-medium text-slate-300 mb-1">
                {pt ? "Alvos de lucro" : "Profit targets"}
              </p>
              <p className="text-xs text-slate-500 mb-3">
                {pt
                  ? "Defina até 3 alvos — ex: 1/3 no primeiro nível, 1/3 no segundo, 1/3 em runner."
                  : "Define up to 3 targets — e.g. 1/3 at first level, 1/3 at second, 1/3 as runner."}
              </p>

              <div className="space-y-3">
                {profitTargets.map((target, i) => (
                  <div key={target.id} className="rounded-xl border border-slate-700 bg-slate-900 p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        target.isRunner
                          ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                          : "bg-slate-800 text-slate-400 border border-slate-700"
                      }`}>
                        {target.isRunner ? (pt ? "Runner" : "Runner") : `T${i + 1}`}
                      </span>
                      <span className="text-xs text-slate-500 flex-1">
                        {pt ? "Alvo de lucro" : "Profit target"} {i + 1}
                      </span>
                      {profitTargets.length > 1 && (
                        <button onClick={() => removeTarget(target.id)} className="text-slate-600 hover:text-slate-400 text-xs transition-colors">✕</button>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <p className="text-xs text-slate-500 mb-1">{pt ? "Tamanho" : "Size"}</p>
                        <input
                          type="text"
                          value={target.size}
                          onChange={(e) => updateTarget(target.id, "size", e.target.value)}
                          placeholder="1/3, 50%..."
                          className="w-full bg-slate-800 text-white placeholder-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      <div className="col-span-2">
                        <p className="text-xs text-slate-500 mb-1">{pt ? "Descrição" : "Description"}</p>
                        <input
                          type="text"
                          value={target.description}
                          onChange={(e) => updateTarget(target.id, "description", e.target.value)}
                          placeholder={pt ? "ex: Primeiro nível S/R..." : "e.g. First S/R level..."}
                          className="w-full bg-slate-800 text-white placeholder-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    <div className="mt-2">
                      <button
                        onClick={() => updateTarget(target.id, "isRunner", !target.isRunner)}
                        className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                          target.isRunner
                            ? "border-amber-500/40 text-amber-400 bg-amber-950/20"
                            : "border-slate-700 text-slate-500 hover:border-slate-500 hover:text-slate-300"
                        }`}
                      >
                        🏃 {pt ? "Runner (deixar correr)" : "Runner (let it run)"}
                      </button>
                    </div>
                  </div>
                ))}

                {profitTargets.length < 3 && (
                  <button
                    onClick={addTarget}
                    className="w-full py-2.5 rounded-xl border border-dashed border-slate-700 hover:border-slate-500 text-slate-500 hover:text-slate-300 text-sm transition-colors"
                  >
                    + {pt ? "Adicionar alvo" : "Add target"}
                  </button>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(2)} className="px-6 py-3 rounded-full border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 text-sm font-medium transition-colors">
                ← {pt ? "Voltar" : "Back"}
              </button>
              <button onClick={() => setStep(4)} className="flex-1 py-3 rounded-full bg-blue-500 hover:bg-blue-400 text-white font-medium text-sm transition-colors">
                {pt ? "Revisar →" : "Review →"}
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 4: Review ── */}
        {step === 4 && (
          <div>
            <h2 className="text-xl font-semibold mb-2">{pt ? "Tudo certo?" : "Does this look right?"}</h2>
            <p className="text-slate-400 text-sm mb-8">{pt ? "Revise antes de salvar." : "Review before saving."}</p>

            {/* Name */}
            <div className="mb-4 p-4 rounded-2xl border border-slate-700 bg-slate-900">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Setup</p>
              <p className="text-white font-semibold text-lg">{name}</p>
            </div>

            {/* Conditions */}
            {conditions.length > 0 && (
              <div className="mb-4">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">
                  {pt ? "Condições" : "Conditions"}
                </p>
                <div className="flex flex-col gap-2">
                  {conditions.map((cond, i) => (
                    <div key={cond.id} className="p-3 rounded-xl border border-slate-700 bg-slate-900">
                      <div className="flex items-start gap-2">
                        <span className="w-4 h-4 rounded-full bg-slate-800 text-slate-500 text-xs flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                        <div className="flex-1">
                          <p className="text-sm text-slate-200 mb-1">{cond.text}</p>
                          <div className="flex flex-wrap gap-1.5">
                            {cond.variants.map((v) => {
                              const col = VARIANT_COLORS[v.label] || VARIANT_COLORS.A;
                              return (
                                <span key={v.id} className={`text-xs px-2 py-0.5 rounded-full border ${col.bg} ${col.text} ${col.border}`}>
                                  {v.label}{v.description ? `: ${v.description}` : ""}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Stop */}
            {(stopInitial || stopRules.some(r => r.trim())) && (
              <div className="mb-4">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Stop</p>
                <div className="p-3 rounded-xl border border-slate-700 bg-slate-900 space-y-1">
                  {stopInitial && <p className="text-sm text-slate-200">{stopInitial}</p>}
                  {stopRules.filter(r => r.trim()).map((r, i) => (
                    <p key={i} className="text-xs text-slate-500">→ {r}</p>
                  ))}
                </div>
              </div>
            )}

            {/* Profit targets */}
            {profitTargets.some(t => t.size || t.description) && (
              <div className="mb-8">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">
                  {pt ? "Alvos" : "Targets"}
                </p>
                <div className="flex flex-col gap-2">
                  {profitTargets.filter(t => t.size || t.description).map((t, i) => (
                    <div key={t.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-700 bg-slate-900">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        t.isRunner
                          ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                          : "bg-slate-800 text-slate-400 border border-slate-700"
                      }`}>
                        {t.isRunner ? "🏃" : `T${i + 1}`}
                      </span>
                      {t.size && <span className="text-sm font-medium text-slate-200">{t.size}</span>}
                      {t.description && <span className="text-sm text-slate-400">{t.description}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!profitTargets.some(t => t.size || t.description) && <div className="mb-8" />}

            <div className="flex gap-3">
              <button onClick={() => setStep(3)} className="px-6 py-3 rounded-full border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 text-sm font-medium transition-colors">
                ← {pt ? "Voltar" : "Back"}
              </button>
              <button
                onClick={saveSetup}
                disabled={saving}
                className="flex-1 py-3 rounded-full bg-blue-500 hover:bg-blue-400 disabled:opacity-50 text-white font-medium text-sm transition-colors"
              >
                {saving ? (pt ? "Salvando..." : "Saving...") : (pt ? "Salvar setup →" : "Save setup →")}
              </button>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
