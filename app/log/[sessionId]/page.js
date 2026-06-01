"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { getLang, setLang, t } from "@/lib/i18n";
import { supabaseBrowser } from "@/lib/supabase-browser";

export default function LogPage() {
  const { sessionId } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const paymentSuccess = searchParams.get("payment") === "success";

  const [lang, setLangState] = useState(() => getLang());

  function toggleLang() {
    const next = lang === "en" ? "pt" : "en";
    setLang(next);
    setLangState(next);
  }
  const [authChecked, setAuthChecked] = useState(false);
  const [canLog, setCanLog] = useState(false); // beta or paid
  const [experiment, setExperiment] = useState(null);
  const [logs, setLogs] = useState([]);
  const [showConversation, setShowConversation] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [logging, setLogging] = useState(false);
  const [showLogForm, setShowLogForm] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [report, setReport] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);

  const REPORT_THRESHOLD = 10;

  useEffect(() => {
    async function checkAuth() {
      const { data: { session } } = await supabaseBrowser.auth.getSession();

      if (!session) {
        router.push(`/auth?next=/log/${sessionId}`);
        return;
      }

      // If just returned from payment, retry a few times to allow webhook to fire
      const maxAttempts = paymentSuccess ? 5 : 1;
      for (let i = 0; i < maxAttempts; i++) {
        const res = await fetch("/api/check-access", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const data = await res.json();
        if (data.hasAccess) {
          setCanLog(true);
          break;
        }
        if (i < maxAttempts - 1) await new Promise((r) => setTimeout(r, 2000));
      }

      setAuthChecked(true);
      fetchData();
    }

    if (sessionId) checkAuth();
  }, [sessionId]);

  async function fetchData() {
    try {
      const [expRes, logsRes] = await Promise.all([
        fetch(`/api/experiment?sessionId=${sessionId}`),
        fetch(`/api/logs?sessionId=${sessionId}`),
      ]);
      const expData = await expRes.json();
      const logsData = await logsRes.json();
      if (expData.error) throw new Error(expData.error);
      setExperiment(expData);
      setLogs(Array.isArray(logsData) ? logsData : []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function logTrade(variant, outcome) {
    setLogging(true);
    try {
      const res = await fetch("/api/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, variant, outcome }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      await fetchData();
      setShowLogForm(false);
      setSelectedVariant(null);
    } catch (e) {
      alert("Failed to save. Try again.");
    } finally {
      setLogging(false);
    }
  }

  const statsA = logs.filter((l) => l.variant === "a");
  const statsB = logs.filter((l) => l.variant === "b");
  const hitsA = statsA.filter((l) => l.outcome).length;
  const hitsB = statsB.filter((l) => l.outcome).length;
  const reportUnlocked = logs.length >= REPORT_THRESHOLD;
  const isFomo = experiment?.pain_type === "fomo";

  async function generateReport() {
    setReportLoading(true);
    try {
      const { data: { session } } = await supabaseBrowser.auth.getSession();
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ sessionId, lang }),
      });
      const data = await res.json();
      if (data.report) setReport(data.report);
    } catch (e) {
      console.error("Report error:", e);
    } finally {
      setReportLoading(false);
    }
  }

  if (!authChecked || (authChecked && loading)) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <p className="text-slate-400">
          {paymentSuccess
            ? lang === "pt" ? "Ativando seu acesso..." : "Activating your access..."
            : t(lang, "loadingExperiment")}
        </p>
      </div>
    );
  }

  function downloadChat(messages, painLabel) {
    if (!messages?.length) return;
    const date = new Date().toLocaleDateString(lang === "pt" ? "pt-BR" : "en-US");
    let text = `SmartLog — ${painLabel}\n${date}\n${"─".repeat(40)}\n\n`;
    messages.forEach((msg) => {
      if (msg.role === "system") return;
      const sender = msg.role === "assistant" ? "SmartLog" : (lang === "pt" ? "Você" : "You");
      text += `${sender}:\n${msg.content}\n\n`;
    });
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const slug = painLabel.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    a.download = `smartlog-${slug}-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-2">{t(lang, "experimentNotFound")}</p>
          <p className="text-slate-500 text-sm">{t(lang, "checkLink")}</p>
        </div>
      </div>
    );
  }

  // Incomplete conversation — show read-only chat history
  if (!experiment?.setup_data) {
    const painLabel = t(lang, "painLabels")[experiment?.pain_type] || experiment?.pain_type || "—";
    const messages = experiment?.messages || [];
    return (
      <div className="min-h-screen bg-slate-950 text-white">
        <header className="px-8 py-5 border-b border-slate-800">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => router.push("/")} className="text-xl font-semibold tracking-tight hover:opacity-80 transition-opacity">
                Smart<span className="text-blue-400">Log</span>
              </button>
              <span className="text-slate-600 text-sm">·</span>
              <span className="text-slate-400 text-sm">{painLabel}</span>
            </div>
            <div className="flex items-center gap-3">
              {messages.length > 1 && (
                <button
                  onClick={() => downloadChat(messages, painLabel)}
                  className="text-xs px-3 py-1.5 rounded-full border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 transition-colors"
                >
                  {lang === "pt" ? "Baixar .txt" : "Download .txt"}
                </button>
              )}
              <button onClick={toggleLang} className="text-xs px-2.5 py-1 rounded-full border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 transition-colors">
                {lang === "pt" ? "EN" : "PT"}
              </button>
            </div>
          </div>
        </header>
        <main className="max-w-2xl mx-auto px-6 py-8">
          <div className="mb-6 p-4 rounded-xl border border-slate-700 bg-slate-900 text-sm text-slate-400">
            {lang === "pt"
              ? "Esta conversa não foi concluída — nenhum experimento foi definido."
              : "This conversation was not completed — no experiment was defined."}
          </div>
          <div className="flex flex-col gap-3 mb-8">
            {messages.map((msg, i) =>
              msg.role !== "system" && (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-blue-500/20 text-blue-100 rounded-br-sm"
                      : "bg-slate-800 text-slate-300 rounded-bl-sm"
                  }`}>
                    {msg.content}
                  </div>
                </div>
              )
            )}
          </div>
          <button
            onClick={() => router.push("/")}
            className="w-full py-3 rounded-full border border-slate-700 text-slate-300 hover:border-slate-500 hover:text-white text-sm font-medium transition-colors"
          >
            {lang === "pt" ? "Iniciar nova sessão →" : "Start a new session →"}
          </button>
        </main>
      </div>
    );
  }

  const { setup_data } = experiment;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="px-8 py-5 border-b border-slate-800">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <button
            onClick={() => router.push("/")}
            className="text-xl font-semibold tracking-tight hover:opacity-80 transition-opacity"
          >
            Smart<span className="text-blue-400">Log</span>
          </button>
          <div className="flex items-center gap-3">
            <span className="text-slate-500 text-sm">{experiment.trader_name}</span>
            <button
              onClick={toggleLang}
              className="text-xs px-2.5 py-1 rounded-full border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 transition-colors"
            >
              {lang === "pt" ? "EN" : "PT"}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8">
        {/* Setup card */}
        <div className="mb-8 p-5 rounded-2xl border border-slate-700 bg-slate-900">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs px-2.5 py-1 rounded-full bg-blue-500/15 text-blue-400 font-medium border border-blue-500/20">
              {t(lang, "painLabels")[experiment.pain_type] || experiment.pain_type}
            </span>
            <span className="text-xs text-slate-600 uppercase tracking-wider">
              {t(lang, "yourExperiment")}
            </span>
          </div>
          <p className="text-white font-semibold text-lg mb-1">{setup_data.setup_name}</p>
          <p className="text-slate-400 text-sm mb-4">{setup_data.setup_description}</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-800 rounded-xl p-3">
              <p className="text-xs text-blue-400 mb-1">{t(lang, "variantA")}</p>
              <p className="text-sm text-white font-medium">{setup_data.variant_a_name}</p>
              <p className="text-xs text-slate-400 mt-1">{setup_data.variant_a_description}</p>
            </div>
            <div className="bg-slate-800 rounded-xl p-3">
              <p className="text-xs text-purple-400 mb-1">{t(lang, "variantB")}</p>
              <p className="text-sm text-white font-medium">{setup_data.variant_b_name}</p>
              <p className="text-xs text-slate-400 mt-1">{setup_data.variant_b_description}</p>
            </div>
          </div>
        </div>

        {/* Conversation history */}
        {experiment.messages?.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <button
                onClick={() => setShowConversation(!showConversation)}
                className="flex-1 flex items-center justify-between px-4 py-3 rounded-xl border border-slate-700 bg-slate-900 hover:border-slate-500 hover:bg-slate-800 transition-all"
              >
                <span className="text-sm text-slate-300 font-medium">
                  {lang === "pt" ? "Ver conversa" : "View conversation"}
                </span>
                <span className="text-slate-500 text-xs">{showConversation ? "▲" : "▼"}</span>
              </button>
              <button
                onClick={() => downloadChat(experiment.messages, t(lang, "painLabels")[experiment.pain_type] || experiment.pain_type)}
                className="px-3 py-3 rounded-xl border border-slate-700 bg-slate-900 hover:border-slate-500 hover:bg-slate-800 text-slate-400 hover:text-white text-xs transition-all whitespace-nowrap"
                title={lang === "pt" ? "Baixar conversa (.txt)" : "Download chat (.txt)"}
              >
                {lang === "pt" ? "↓ .txt" : "↓ .txt"}
              </button>
            </div>
            {showConversation && (
              <div className="flex flex-col gap-3">
                {experiment.messages.map((msg, i) => (
                  msg.role !== "system" && (
                    <div
                      key={i}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                          msg.role === "user"
                            ? "bg-blue-500/20 text-blue-100 rounded-br-sm"
                            : "bg-slate-800 text-slate-300 rounded-bl-sm"
                        }`}
                      >
                        {msg.content}
                      </div>
                    </div>
                  )
                ))}
              </div>
            )}
          </div>
        )}

        {/* Stats */}
        {logs.length > 0 && (
          <div className="mb-8 grid grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl border border-blue-500/20 bg-blue-950/20">
              <p className="text-xs text-blue-400 mb-1">A — {setup_data.variant_a_name}</p>
              <p className="text-2xl font-bold text-white">{hitsA}/{statsA.length}</p>
              <p className="text-xs text-slate-500 mt-1">{isFomo ? t(lang, "levelsHit") : t(lang, "targetsHit")}</p>
              {statsA.length > 0 && (
                <div className="mt-2 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-400 rounded-full transition-all"
                    style={{ width: `${(hitsA / statsA.length) * 100}%` }}
                  />
                </div>
              )}
            </div>
            <div className="p-4 rounded-2xl border border-purple-500/20 bg-purple-950/20">
              <p className="text-xs text-purple-400 mb-1">B — {setup_data.variant_b_name}</p>
              <p className="text-2xl font-bold text-white">{hitsB}/{statsB.length}</p>
              <p className="text-xs text-slate-500 mt-1">{t(lang, "targetsHit")}</p>
              {statsB.length > 0 && (
                <div className="mt-2 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-400 rounded-full transition-all"
                    style={{ width: `${(hitsB / statsB.length) * 100}%` }}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Progress bar / Report */}
        {canLog && (
          <div className="mb-8">
            {!reportUnlocked ? (
              <div className="p-4 rounded-2xl border border-slate-700 bg-slate-900">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-slate-400">
                    {lang === "pt"
                      ? `Relatório disponível após 10 operações`
                      : `Report available after 10 trades`}
                  </p>
                  <p className="text-xs text-slate-500 tabular-nums">{logs.length}/10</p>
                </div>
                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all"
                    style={{ width: `${Math.min((logs.length / REPORT_THRESHOLD) * 100, 100)}%` }}
                  />
                </div>
                {logs.length === 0 && (
                  <p className="text-xs text-slate-600 mt-2">
                    {lang === "pt"
                      ? "Confiança não é um estado de espírito. É o que seus dados dizem sobre seu comportamento repetido."
                      : "Confidence is not a mood. It's what your data says about your repeated behavior."}
                  </p>
                )}
              </div>
            ) : (
              <div className="p-5 rounded-2xl border border-amber-500/20 bg-amber-950/10">
                <p className="text-xs text-amber-400 uppercase tracking-wider mb-1">
                  {lang === "pt" ? "Relatório" : "Report"}
                </p>
                <p className="text-sm text-slate-300 mb-4">
                  {lang === "pt"
                    ? `${logs.length} operações registradas. Os dados têm peso suficiente para uma análise.`
                    : `${logs.length} trades logged. Enough data for a meaningful analysis.`}
                </p>
                {!report ? (
                  <button
                    onClick={generateReport}
                    disabled={reportLoading}
                    className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 text-sm font-medium transition-colors"
                  >
                    {reportLoading
                      ? (lang === "pt" ? "Gerando..." : "Generating...")
                      : (lang === "pt" ? "Ver relatório →" : "View report →")}
                  </button>
                ) : (
                  <div>
                    <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-line mb-4">
                      {report}
                    </div>
                    <button
                      onClick={generateReport}
                      disabled={reportLoading}
                      className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      {reportLoading ? "..." : (lang === "pt" ? "↺ Atualizar" : "↺ Refresh")}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Log a trade — or upgrade CTA for free users */}
        {canLog ? (
          !showLogForm ? (
            <button
              onClick={() => setShowLogForm(true)}
              className="w-full py-4 rounded-full bg-blue-500 hover:bg-blue-400 text-white font-medium transition-colors mb-6"
            >
              {t(lang, "logATrade")}
            </button>
          ) : (
            <div className="mb-6 p-5 rounded-2xl border border-slate-700 bg-slate-900">
              <p className="text-sm text-slate-400 mb-4">{t(lang, "whichVariant")}</p>
              <div className="grid grid-cols-2 gap-3 mb-5">
                <button
                  onClick={() => setSelectedVariant("a")}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    selectedVariant === "a"
                      ? "border-blue-400 bg-blue-950/50"
                      : "border-slate-700 hover:border-slate-500"
                  }`}
                >
                  <p className="text-xs text-blue-400 mb-1">{t(lang, "variantA")}</p>
                  <p className="text-sm text-white font-medium">{setup_data.variant_a_name}</p>
                </button>
                <button
                  onClick={() => setSelectedVariant("b")}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    selectedVariant === "b"
                      ? "border-purple-400 bg-purple-950/50"
                      : "border-slate-700 hover:border-slate-500"
                  }`}
                >
                  <p className="text-xs text-purple-400 mb-1">{t(lang, "variantB")}</p>
                  <p className="text-sm text-white font-medium">{setup_data.variant_b_name}</p>
                </button>
              </div>
              {selectedVariant && (
                <>
                  <p className="text-sm text-slate-400 mb-3">
                    {isFomo && selectedVariant === "a"
                      ? t(lang, "levelAlsoHit")
                      : t(lang, "hitTarget")}
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => logTrade(selectedVariant, true)}
                      disabled={logging}
                      className="py-3 rounded-xl bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-medium transition-colors"
                    >
                      {t(lang, "yes")}
                    </button>
                    <button
                      onClick={() => logTrade(selectedVariant, false)}
                      disabled={logging}
                      className="py-3 rounded-xl bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white font-medium transition-colors"
                    >
                      {t(lang, "no")}
                    </button>
                  </div>
                </>
              )}
              <button
                onClick={() => { setShowLogForm(false); setSelectedVariant(null); }}
                className="mt-3 w-full text-slate-500 hover:text-slate-300 text-sm transition-colors"
              >
                {t(lang, "cancel")}
              </button>
            </div>
          )
        ) : (
          /* Free user — upgrade CTA */
          <div className="mb-6 p-5 rounded-2xl border border-slate-700 bg-slate-900 text-center">
            <p className="text-slate-300 text-sm mb-3">{t(lang, "upgradeToLog")}</p>
            <button
              onClick={() => router.push(`/subscribe?next=/log/${sessionId}`)}
              className="px-6 py-2.5 rounded-full bg-blue-500 hover:bg-blue-400 text-white text-sm font-medium transition-colors"
            >
              {t(lang, "upgradeCta")}
            </button>
          </div>
        )}

        {/* Trade history */}
        {logs.length > 0 ? (
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">
              {t(lang, "tradeHistory")}
            </p>
            <div className="flex flex-col gap-2">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between px-4 py-3 rounded-xl bg-slate-900 border border-slate-800"
                >
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      log.variant === "a"
                        ? "bg-blue-400/10 text-blue-400"
                        : "bg-purple-400/10 text-purple-400"
                    }`}
                  >
                    {log.variant === "a" ? setup_data.variant_a_name : setup_data.variant_b_name}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className={`text-sm font-medium ${log.outcome ? "text-green-400" : "text-slate-500"}`}>
                      {isFomo && log.variant === "a"
                        ? (log.outcome ? t(lang, "levelHit") : t(lang, "levelNotHit"))
                        : (log.outcome ? t(lang, "hit") : t(lang, "miss"))}
                    </span>
                    <span className="text-slate-600 text-xs">
                      {new Date(log.logged_at).toLocaleDateString(
                        lang === "pt" ? "pt-BR" : "en-GB",
                        { day: "2-digit", month: "short" }
                      )}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          canLog && (
            <p className="text-center text-slate-600 text-sm mt-4">
              {t(lang, "noTradesYet")}
            </p>
          )
        )}
      </main>
    </div>
  );
}
