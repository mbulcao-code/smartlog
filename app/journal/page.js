"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getLang, setLang } from "@/lib/i18n";
import { supabaseBrowser } from "@/lib/supabase-browser";

// ── Pain definitions ──────────────────────────────────────────────────────────

const PAINS = [
  { id: "fomo",     en: "FOMO / Early entry",      pt: "FOMO / Entrada antecipada" },
  { id: "late",     en: "Hesitation / Late entry",  pt: "Hesitação / Entrada tardia" },
  { id: "exit",     en: "Early exit",               pt: "Saída prematura" },
  { id: "revenge",  en: "Revenge / Overtrade",      pt: "Vingança / Excessos" },
  { id: "stoploss", en: "Stop tampering",           pt: "Mexendo no stop" },
  { id: "boredom",  en: "Boredom / No setup",       pt: "Tédio / Sem setup" },
  { id: "clean",    en: "✓ Clean trade",            pt: "✓ Operação limpa" },
];

// ── Behavioral question tree ──────────────────────────────────────────────────
// Returns the next question to show given painType + answers so far,
// or null if we're ready for the outcome step.

function getNextQuestion(painType, behavior) {
  switch (painType) {
    case "fomo":
      if (!("entry_type" in behavior)) {
        return {
          key: "entry_type",
          question: {
            en: "Did you enter early or wait for your level?",
            pt: "Você entrou antes ou esperou seu nível?",
          },
          options: [
            { value: "early",  en: "Entered early",      pt: "Entrei antes" },
            { value: "waited", en: "Waited for my level", pt: "Esperei o nível" },
          ],
        };
      }
      if (behavior.entry_type === "early" && !("level_reached" in behavior)) {
        return {
          key: "level_reached",
          question: {
            en: "Did your level also get hit afterward?",
            pt: "O seu nível também foi atingido depois?",
          },
          options: [
            { value: true,  en: "Yes — level was hit",        pt: "Sim — nível foi atingido" },
            { value: false, en: "No — price didn't reach it", pt: "Não — preço não chegou" },
          ],
        };
      }
      return null;

    case "stoploss":
      if (!("tampered" in behavior)) {
        return {
          key: "tampered",
          question: {
            en: "Did you move or remove your stop?",
            pt: "Você moveu ou removeu seu stop?",
          },
          options: [
            { value: true,  en: "Yes, I moved it", pt: "Sim, mexi nele" },
            { value: false, en: "No, I kept it",   pt: "Não, mantive" },
          ],
        };
      }
      if (behavior.tampered === true && !("tamper_outcome" in behavior)) {
        return {
          key: "tamper_outcome",
          question: {
            en: "What happened after you moved it?",
            pt: "O que aconteceu depois que você mexeu?",
          },
          options: [
            { value: "reversal",   en: "Stop hit → price reversed (painful)", pt: "Stop ativado → preço reverteu (doloroso)" },
            { value: "protection", en: "Stop protected my profit",             pt: "Stop protegeu meu lucro" },
          ],
        };
      }
      return null;

    case "revenge":
      if (!("used_best_setup" in behavior)) {
        return {
          key: "used_best_setup",
          question: {
            en: "Did you use your most tested setup?",
            pt: "Você usou seu setup mais testado?",
          },
          options: [
            { value: true,  en: "Yes — my best setup", pt: "Sim — meu melhor setup" },
            { value: false, en: "No — different setup", pt: "Não — setup diferente" },
          ],
        };
      }
      return null;

    case "exit":
      if (!("target_hit_after" in behavior)) {
        return {
          key: "target_hit_after",
          question: {
            en: "Did price hit your original target after you exited?",
            pt: "O preço atingiu seu alvo original depois que você saiu?",
          },
          options: [
            { value: true,  en: "Yes — it went there", pt: "Sim — foi lá" },
            { value: false, en: "No — it didn't",       pt: "Não — não foi" },
          ],
        };
      }
      return null;

    case "late":
      if (!("outcome_type" in behavior)) {
        return {
          key: "outcome_type",
          question: {
            en: "What happened?",
            pt: "O que aconteceu?",
          },
          options: [
            { value: "missed",      en: "Missed the move entirely",             pt: "Perdi o movimento inteiro" },
            { value: "caught_late", en: "Caught it but entry hurt R:R",         pt: "Peguei, mas entrada tardia prejudicou R:R" },
          ],
        };
      }
      return null;

    case "boredom":
      if (!("had_plan" in behavior)) {
        return {
          key: "had_plan",
          question: {
            en: "Was this trade in your plan?",
            pt: "Essa operação estava no seu plano?",
          },
          options: [
            { value: false, en: "No — I manufactured a reason", pt: "Não — criei um motivo" },
            { value: true,  en: "Yes — it was valid",            pt: "Sim — era válida" },
          ],
        };
      }
      return null;

    case "clean":
    default:
      return null;
  }
}

// ── Stats computation ─────────────────────────────────────────────────────────

function computeStats(entries) {
  const byPain = {};
  entries.forEach((e) => {
    const key = e.pain_type || "clean";
    if (!byPain[key]) byPain[key] = [];
    byPain[key].push(e);
  });

  const insights = [];

  // FOMO
  const fomo = byPain.fomo || [];
  if (fomo.length >= 5) {
    const early = fomo.filter((e) => e.behavior?.entry_type === "early");
    const levelHit = early.filter((e) => e.behavior?.level_reached === true);
    const waited = fomo.filter((e) => e.behavior?.entry_type === "waited");
    if (early.length >= 3) {
      const pct = Math.round((levelHit.length / early.length) * 100);
      insights.push({
        pain: "fomo",
        en: `${early.length} early entries — level was hit anyway ${levelHit.length}x (${pct}%).${waited.length > 0 ? ` You waited ${waited.length}x.` : ""}`,
        pt: `${early.length} entradas antecipadas — nível atingido assim mesmo ${levelHit.length}x (${pct}%).${waited.length > 0 ? ` Você esperou ${waited.length}x.` : ""}`,
      });
    }
  }

  // Stop tampering
  const stops = byPain.stoploss || [];
  if (stops.length >= 3) {
    const tampered = stops.filter((e) => e.behavior?.tampered === true);
    const reversals = tampered.filter((e) => e.behavior?.tamper_outcome === "reversal");
    const protections = tampered.filter((e) => e.behavior?.tamper_outcome === "protection");
    if (tampered.length >= 2) {
      insights.push({
        pain: "stoploss",
        en: `${tampered.length} stops moved — ${reversals.length} led to reversals, ${protections.length} protected profit.`,
        pt: `${tampered.length} stops mexidos — ${reversals.length} levaram a reversão, ${protections.length} protegeram lucro.`,
      });
    }
  }

  // Revenge
  const revenge = byPain.revenge || [];
  if (revenge.length >= 4) {
    const best = revenge.filter((e) => e.behavior?.used_best_setup === true);
    const other = revenge.filter((e) => e.behavior?.used_best_setup === false);
    if (best.length >= 2 && other.length >= 2) {
      const bestWR = Math.round((best.filter((e) => e.outcome === "win").length / best.length) * 100);
      const otherWR = Math.round((other.filter((e) => e.outcome === "win").length / other.length) * 100);
      insights.push({
        pain: "revenge",
        en: `Best setup: ${bestWR}% win rate (${best.length} trades). Random: ${otherWR}% win rate (${other.length} trades).`,
        pt: `Melhor setup: ${bestWR}% de acerto (${best.length} op.). Aleatório: ${otherWR}% (${other.length} op.).`,
      });
    }
  }

  // Early exit
  const exits = byPain.exit || [];
  if (exits.length >= 4) {
    const hitAfter = exits.filter((e) => e.behavior?.target_hit_after === true);
    const pct = Math.round((hitAfter.length / exits.length) * 100);
    insights.push({
      pain: "exit",
      en: `${exits.length} early exits — target was hit after you left ${hitAfter.length}x (${pct}%).`,
      pt: `${exits.length} saídas prematuras — alvo atingido depois ${hitAfter.length}x (${pct}%).`,
    });
  }

  return { byPain, insights };
}

// ── Behavior summary (one-liner for trade list row) ───────────────────────────

function getBehaviorSummary(painType, behavior, lang) {
  const pt = lang === "pt";
  if (!behavior) return null;
  switch (painType) {
    case "fomo":
      if (behavior.entry_type === "early") {
        if (behavior.level_reached === true)  return pt ? "Antecipado · nível atingido"     : "Early · level hit";
        if (behavior.level_reached === false) return pt ? "Antecipado · nível não atingido" : "Early · level not hit";
        return pt ? "Entrada antecipada" : "Early entry";
      }
      if (behavior.entry_type === "waited") return pt ? "Esperou o nível" : "Waited for level";
      return null;
    case "stoploss":
      if (behavior.tampered === false)                      return pt ? "Stop mantido"       : "Stop kept";
      if (behavior.tamper_outcome === "reversal")           return pt ? "Reversão dolorosa"  : "Painful reversal";
      if (behavior.tamper_outcome === "protection")         return pt ? "Lucro protegido"    : "Profit protected";
      if (behavior.tampered === true)                       return pt ? "Stop mexido"        : "Stop moved";
      return null;
    case "revenge":
      if (behavior.used_best_setup === true)  return pt ? "Melhor setup"   : "Best setup";
      if (behavior.used_best_setup === false) return pt ? "Setup aleatório" : "Random setup";
      return null;
    case "exit":
      if (behavior.target_hit_after === true)  return pt ? "Alvo atingido depois" : "Target hit after";
      if (behavior.target_hit_after === false) return pt ? "Alvo não atingido"    : "Target not hit";
      return null;
    case "late":
      if (behavior.outcome_type === "missed")      return pt ? "Movimento perdido"  : "Missed move";
      if (behavior.outcome_type === "caught_late") return pt ? "Entrada tardia"     : "Late entry";
      return null;
    case "boredom":
      if (behavior.had_plan === false) return pt ? "Sem plano"   : "No plan";
      if (behavior.had_plan === true)  return pt ? "Tinha plano" : "Had a plan";
      return null;
    default:
      return null;
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function JournalPage() {
  const router = useRouter();
  const [lang, setLangState] = useState(() => getLang());
  const [authReady, setAuthReady] = useState(false);
  const [token, setToken] = useState(null);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [formPhase, setFormPhase] = useState("pain"); // "pain" | "questions" | "outcome"
  const [selectedPain, setSelectedPain] = useState(null);
  const [behavior, setBehavior] = useState({});
  const [saving, setSaving] = useState(false);

  const pt = lang === "pt";

  function toggleLang() {
    const next = lang === "en" ? "pt" : "en";
    setLang(next);
    setLangState(next);
  }

  // ── Auth + data load ──────────────────────────────────────────────────────

  useEffect(() => {
    async function checkAuth() {
      const { data: { session } } = await supabaseBrowser.auth.getSession();
      if (!session) {
        localStorage.setItem("smartlog_auth_next", "/journal");
        router.push("/auth");
        return;
      }
      setToken(session.access_token);
      setAuthReady(true);
      await loadEntries(session.access_token);
    }
    checkAuth();
  }, []);

  async function loadEntries(tok) {
    try {
      const res = await fetch("/api/journal", {
        headers: { Authorization: `Bearer ${tok || token}` },
      });
      const data = await res.json();
      setEntries(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Journal load error:", e);
    } finally {
      setLoading(false);
    }
  }

  // ── Form helpers ──────────────────────────────────────────────────────────

  function resetForm() {
    setShowForm(false);
    setFormPhase("pain");
    setSelectedPain(null);
    setBehavior({});
  }

  function selectPain(painId) {
    setSelectedPain(painId);
    if (painId === "clean") {
      setFormPhase("outcome");
    } else {
      // Check if this pain has any questions
      const firstQ = getNextQuestion(painId, {});
      setFormPhase(firstQ ? "questions" : "outcome");
    }
  }

  function answerQuestion(key, value) {
    const newBehavior = { ...behavior, [key]: value };
    setBehavior(newBehavior);
    const next = getNextQuestion(selectedPain, newBehavior);
    if (!next) setFormPhase("outcome");
    // else stay in "questions" — getNextQuestion will return the new question
  }

  async function submitOutcome(outcome) {
    setSaving(true);
    try {
      const res = await fetch("/api/journal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          pain_type: selectedPain === "clean" ? null : selectedPain,
          behavior,
          outcome,
          lang,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      resetForm();
      await loadEntries();
    } catch (e) {
      alert(pt ? "Erro ao salvar. Tente novamente." : "Failed to save. Try again.");
    } finally {
      setSaving(false);
    }
  }

  // ── Computed ──────────────────────────────────────────────────────────────

  const stats = computeStats(entries);
  const currentQuestion =
    formPhase === "questions" && selectedPain
      ? getNextQuestion(selectedPain, behavior)
      : null;

  // ── Loading state ─────────────────────────────────────────────────────────

  if (!authReady || loading) {
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

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-950 text-white">

      {/* Header */}
      <header className="px-8 py-5 border-b border-slate-800">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/")}
              className="text-xl font-semibold tracking-tight hover:opacity-80 transition-opacity"
            >
              Smart<span className="text-blue-400">Log</span>
            </button>
            <span className="text-slate-600 text-sm">·</span>
            <span className="text-slate-400 text-sm">{pt ? "Diário" : "Journal"}</span>
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

        {/* Log button */}
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="w-full py-4 rounded-full bg-blue-500 hover:bg-blue-400 text-white font-medium transition-colors mb-8"
          >
            {pt ? "+ Registrar operação" : "+ Log a trade"}
          </button>
        )}

        {/* ── Form ── */}
        {showForm && (
          <div className="mb-8 p-5 rounded-2xl border border-slate-700 bg-slate-900">

            {/* Step 1: Pain selector */}
            {formPhase === "pain" && (
              <div>
                <p className="text-sm text-slate-400 mb-4">
                  {pt ? "O que apareceu nessa operação?" : "What showed up in this trade?"}
                </p>
                <div className="flex flex-col gap-2">
                  {PAINS.map((pain) => (
                    <button
                      key={pain.id}
                      onClick={() => selectPain(pain.id)}
                      className="text-left px-4 py-3 rounded-xl border border-slate-700 hover:border-slate-500 hover:bg-slate-800 text-sm text-slate-200 transition-all"
                    >
                      {pt ? pain.pt : pain.en}
                    </button>
                  ))}
                </div>
                <button
                  onClick={resetForm}
                  className="mt-4 w-full text-slate-500 hover:text-slate-300 text-sm transition-colors"
                >
                  {pt ? "Cancelar" : "Cancel"}
                </button>
              </div>
            )}

            {/* Step 2: Behavioral question(s) */}
            {formPhase === "questions" && currentQuestion && (
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                  {PAINS.find((p) => p.id === selectedPain)?.[pt ? "pt" : "en"]}
                </p>
                <p className="text-white font-medium mb-5 leading-snug">
                  {pt ? currentQuestion.question.pt : currentQuestion.question.en}
                </p>
                <div className="flex flex-col gap-2">
                  {currentQuestion.options.map((opt) => (
                    <button
                      key={String(opt.value)}
                      onClick={() => answerQuestion(currentQuestion.key, opt.value)}
                      className="text-left px-4 py-3 rounded-xl border border-slate-700 hover:border-blue-400 hover:bg-blue-950/30 text-sm text-slate-200 transition-all"
                    >
                      {pt ? opt.pt : opt.en}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => { setFormPhase("pain"); setSelectedPain(null); setBehavior({}); }}
                  className="mt-4 w-full text-slate-500 hover:text-slate-300 text-sm transition-colors"
                >
                  ← {pt ? "Voltar" : "Back"}
                </button>
              </div>
            )}

            {/* Step 3: Outcome */}
            {formPhase === "outcome" && (
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                  {selectedPain && PAINS.find((p) => p.id === selectedPain)?.[pt ? "pt" : "en"]}
                </p>
                <p className="text-white font-medium mb-5">
                  {pt ? "Como essa operação terminou?" : "How did this trade end?"}
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => submitOutcome("win")}
                    disabled={saving}
                    className="py-3 rounded-xl border border-green-500/40 hover:border-green-400 hover:bg-green-950/30 text-green-400 text-sm font-medium transition-all disabled:opacity-50"
                  >
                    {pt ? "Ganhou" : "Win"}
                  </button>
                  <button
                    onClick={() => submitOutcome("loss")}
                    disabled={saving}
                    className="py-3 rounded-xl border border-red-500/40 hover:border-red-400 hover:bg-red-950/30 text-red-400 text-sm font-medium transition-all disabled:opacity-50"
                  >
                    {pt ? "Perdeu" : "Loss"}
                  </button>
                  <button
                    onClick={() => submitOutcome("breakeven")}
                    disabled={saving}
                    className="py-3 rounded-xl border border-slate-600 hover:border-slate-400 text-slate-400 text-sm font-medium transition-all disabled:opacity-50"
                  >
                    BE
                  </button>
                </div>
                <button
                  onClick={() => {
                    if (selectedPain === "clean") {
                      setFormPhase("pain");
                      setSelectedPain(null);
                    } else {
                      const firstQ = getNextQuestion(selectedPain, {});
                      if (firstQ) {
                        setFormPhase("questions");
                        setBehavior({});
                      } else {
                        setFormPhase("pain");
                        setSelectedPain(null);
                      }
                    }
                  }}
                  className="mt-4 w-full text-slate-500 hover:text-slate-300 text-sm transition-colors"
                >
                  ← {pt ? "Voltar" : "Back"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Behavioral insights ── */}
        {stats.insights.length > 0 && (
          <div className="mb-8">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">
              {pt ? "Padrões comportamentais" : "Behavioral patterns"}
            </p>
            <div className="flex flex-col gap-3">
              {stats.insights.map((insight, i) => (
                <div key={i} className="p-4 rounded-xl border border-slate-700 bg-slate-900">
                  <p className="text-xs text-blue-400 mb-1 uppercase tracking-wider">
                    {PAINS.find((p) => p.id === insight.pain)?.[pt ? "pt" : "en"]}
                  </p>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    {pt ? insight.pt : insight.en}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Summary counts ── */}
        {entries.length > 0 && (
          <div className="mb-6 flex items-center gap-3 flex-wrap">
            <span className="text-sm text-slate-400">
              {entries.length} {pt ? "operações" : "trades"}
            </span>
            {Object.entries(stats.byPain)
              .sort((a, b) => b[1].length - a[1].length)
              .slice(0, 4)
              .map(([painId, painEntries]) => (
                <span
                  key={painId}
                  className="text-xs px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-400"
                >
                  {PAINS.find((p) => p.id === painId)?.[pt ? "pt" : "en"] ||
                    (painId === "clean" ? (pt ? "Limpa" : "Clean") : painId)}
                  {" · "}
                  {painEntries.length}
                </span>
              ))}
          </div>
        )}

        {/* ── Trade list ── */}
        {entries.length > 0 ? (
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">
              {pt ? "Operações recentes" : "Recent trades"}
            </p>
            <div className="flex flex-col gap-2">
              {entries.slice(0, 50).map((entry) => {
                const painInfo = PAINS.find((p) => p.id === entry.pain_type) || null;
                const summary = getBehaviorSummary(entry.pain_type, entry.behavior, lang);
                return (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between px-4 py-3 rounded-xl bg-slate-900 border border-slate-800"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`text-xs flex-shrink-0 ${entry.pain_type ? "text-slate-400" : "text-green-500"}`}>
                        {painInfo
                          ? (pt ? painInfo.pt : painInfo.en)
                          : (pt ? "Limpa" : "Clean")}
                      </span>
                      {summary && (
                        <>
                          <span className="text-slate-700 text-xs flex-shrink-0">·</span>
                          <span className="text-xs text-slate-500 truncate">{summary}</span>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                      <span
                        className={`text-sm font-medium ${
                          entry.outcome === "win"
                            ? "text-green-400"
                            : entry.outcome === "loss"
                            ? "text-red-400"
                            : "text-slate-500"
                        }`}
                      >
                        {entry.outcome === "win"
                          ? (pt ? "Ganhou" : "Win")
                          : entry.outcome === "loss"
                          ? (pt ? "Perdeu" : "Loss")
                          : "BE"}
                      </span>
                      <span className="text-slate-600 text-xs">
                        {new Date(entry.logged_at).toLocaleDateString(
                          pt ? "pt-BR" : "en-GB",
                          { day: "2-digit", month: "short" }
                        )}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {entries.length > 50 && (
              <p className="text-center text-slate-600 text-xs mt-4">
                {pt ? `Mostrando 50 de ${entries.length}` : `Showing 50 of ${entries.length}`}
              </p>
            )}
          </div>
        ) : (
          !showForm && (
            <div className="text-center py-16">
              <p className="text-slate-600 text-sm">
                {pt ? "Nenhuma operação registrada ainda." : "No trades logged yet."}
              </p>
              <p className="text-slate-700 text-xs mt-2">
                {pt
                  ? "Registre cada operação, independente do resultado. Os padrões aparecem com tempo."
                  : "Log every trade, regardless of result. Patterns emerge over time."}
              </p>
            </div>
          )
        )}
      </main>
    </div>
  );
}
