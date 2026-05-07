"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getLang, setLang, t } from "@/lib/i18n";
import { supabaseBrowser } from "@/lib/supabase-browser";

export default function Home() {
  const [selected, setSelected] = useState(null);
  const [lang, setLangState] = useState("en");
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [experiments, setExperiments] = useState([]);
  const [canLog, setCanLog] = useState(false); // beta or paid
  const router = useRouter();

  useEffect(() => {
    setLangState(getLang());
  }, []);

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabaseBrowser.auth.getSession();
      if (session) {
        setUser(session.user);
        // Parallel: check access tier + load dashboard
        const [accessRes, dashRes] = await Promise.all([
          fetch("/api/check-access", {
            headers: { Authorization: `Bearer ${session.access_token}` },
          }),
          fetch("/api/dashboard", {
            headers: { Authorization: `Bearer ${session.access_token}` },
          }),
        ]);
        const accessData = await accessRes.json();
        const dashData = await dashRes.json();
        setCanLog(!!accessData.hasAccess);
        setExperiments(dashData.experiments || []);
      }
      setAuthLoading(false);
    }
    init();
  }, []);

  function toggleLang() {
    const next = lang === "en" ? "pt" : "en";
    setLang(next);
    setLangState(next);
    setSelected(null);
  }

  async function handleSignOut() {
    await supabaseBrowser.auth.signOut();
    setUser(null);
    setExperiments([]);
    setCanLog(false);
  }

  function handleStart() {
    if (!selected) return;
    if (!user) {
      // Not logged in: store destination and go to auth
      localStorage.setItem("smartlog_auth_next", `/conversation?pain=${selected}`);
      router.push("/auth");
      return;
    }
    // Free tier: already used 1 conversation
    const isFreeLocked = !canLog && experiments.length >= 1;
    if (isFreeLocked) {
      router.push("/subscribe");
      return;
    }
    router.push(`/conversation?pain=${selected}`);
  }

  const pains = t(lang, "pains");
  const isFreeLocked = user && !canLog && experiments.length >= 1;

  if (authLoading) {
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

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      {/* Header */}
      <header className="px-8 py-6 border-b border-slate-800">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <span className="text-xl font-semibold tracking-tight text-white">
            Smart<span className="text-blue-400">Log</span>
          </span>
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <span className="text-slate-500 text-xs hidden sm:block truncate max-w-[180px]">
                  {user.email}
                </span>
                <button
                  onClick={handleSignOut}
                  className="text-xs text-slate-400 hover:text-white transition-colors"
                >
                  {lang === "pt" ? "Sair" : "Sign out"}
                </button>
              </>
            ) : (
              <button
                onClick={() => router.push("/auth")}
                className="text-xs font-medium px-3 py-1.5 rounded-full bg-blue-500 hover:bg-blue-400 text-white transition-colors"
              >
                {lang === "pt" ? "Entrar" : "Sign in"}
              </button>
            )}
            <button
              onClick={toggleLang}
              className="text-xs font-medium px-3 py-1.5 rounded-full border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 transition-colors"
            >
              {t(lang, "langLabel")}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-10">

        {/* Dashboard: existing experiments */}
        {user && experiments.length > 0 && (
          <section className="mb-10">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-4">
              {t(lang, "yourExperiments")}
            </p>
            <div className="flex flex-col gap-3">
              {experiments.map((exp) => {
                const painLabel =
                  t(lang, "painLabels")[exp.pain_type] || exp.pain_type;
                return (
                  <div
                    key={exp.session_id}
                    className="p-4 rounded-xl border border-slate-700 bg-slate-900 flex items-center justify-between gap-4"
                  >
                    <div className="min-w-0">
                      <p className="text-white font-medium text-sm truncate">
                        {exp.setup_data?.setup_name}
                      </p>
                      <p className="text-slate-500 text-xs mt-0.5">
                        {painLabel} · {exp.tradeCount} {t(lang, "trades")}
                      </p>
                    </div>
                    <button
                      onClick={() => router.push(`/log/${exp.session_id}`)}
                      className="flex-shrink-0 text-xs px-4 py-2 rounded-full bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors whitespace-nowrap"
                    >
                      {t(lang, "openLog")}
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* New session section */}
        <div>
          {experiments.length > 0 && (
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-6">
              {t(lang, "newSession")}
            </p>
          )}

          <div className="mb-8 text-center">
            <h1 className="text-3xl font-semibold text-white mb-3">
              {t(lang, "homeTitle")}
            </h1>
            <p className="text-slate-400 text-base">
              {t(lang, "homeSubtitle")}
            </p>
          </div>

          {/* Pain cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {pains.map((pain) => (
              <button
                key={pain.id}
                onClick={() => setSelected(pain.id)}
                className={`text-left p-5 rounded-xl border transition-all duration-150 ${
                  selected === pain.id
                    ? "border-blue-400 bg-blue-950/50 shadow-lg shadow-blue-900/20"
                    : "border-slate-700 bg-slate-900 hover:border-slate-500 hover:bg-slate-800"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-0.5 w-4 h-4 rounded-full border-2 flex-shrink-0 transition-all ${
                      selected === pain.id
                        ? "border-blue-400 bg-blue-400"
                        : "border-slate-600"
                    }`}
                  />
                  <div>
                    <p className="font-medium text-white text-sm mb-1">
                      {pain.title}
                    </p>
                    <p className="text-slate-400 text-sm leading-relaxed">
                      {pain.description}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* CTA */}
          <div className="mt-8 flex flex-col items-center gap-3">
            {isFreeLocked ? (
              <>
                <button
                  onClick={() => router.push("/subscribe")}
                  className="px-8 py-3 rounded-full text-sm font-medium bg-blue-500 text-white hover:bg-blue-400 transition-all"
                >
                  {t(lang, "upgradeToContinue")}
                </button>
                <p className="text-slate-500 text-xs text-center max-w-sm">
                  {t(lang, "freeLocked")}
                </p>
              </>
            ) : (
              <button
                disabled={!selected}
                onClick={handleStart}
                className={`px-8 py-3 rounded-full text-sm font-medium transition-all ${
                  selected
                    ? "bg-blue-500 text-white hover:bg-blue-400 cursor-pointer"
                    : "bg-slate-800 text-slate-600 cursor-not-allowed"
                }`}
              >
                {!user
                  ? lang === "pt"
                    ? "Entrar para começar →"
                    : "Sign in to start →"
                  : t(lang, "homeCta")}
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
