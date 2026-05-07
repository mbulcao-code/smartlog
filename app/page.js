"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { getLang, setLang, t } from "@/lib/i18n";
import { supabaseBrowser } from "@/lib/supabase-browser";

export default function Home() {
  const [selected, setSelected] = useState(null);
  const [lang, setLangState] = useState("en");
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [experiments, setExperiments] = useState([]);
  const [canLog, setCanLog] = useState(false);
  const cardsRef = useRef(null);
  const router = useRouter();

  useEffect(() => {
    setLangState(getLang());
  }, []);

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabaseBrowser.auth.getSession();
      if (session) {
        setUser(session.user);
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

  function scrollToCards() {
    cardsRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  function handlePricingCta(plan) {
    if (!user) {
      localStorage.setItem("smartlog_auth_next", `/subscribe?plan=${plan}`);
      router.push("/auth");
    } else {
      router.push(`/subscribe?plan=${plan}`);
    }
  }

  function handleStart() {
    if (!selected) return;
    if (!user) {
      localStorage.setItem("smartlog_auth_next", `/conversation?pain=${selected}`);
      router.push("/auth");
      return;
    }
    const isFreeLocked = !canLog && experiments.length >= 1;
    if (isFreeLocked) {
      router.push("/subscribe");
      return;
    }
    router.push(`/conversation?pain=${selected}`);
  }

  const pains = t(lang, "pains");
  const isFreeLocked = user && !canLog && experiments.length >= 1;
  // Show hero+pricing for non-logged-in users and free users (not paid/beta)
  const showHero = !user || (user && !canLog);
  // Show dashboard for paid/beta users who have experiments
  const showDashboard = user && canLog && experiments.length > 0;

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
      <header className="px-8 py-5 border-b border-slate-800">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <span className="text-xl font-semibold tracking-tight text-white">
              Smart<span className="text-blue-400">Log</span>
            </span>
            {showHero && (
              <span className="hidden sm:inline text-slate-600 text-sm ml-3">
                {t(lang, "heroTagline")}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <span className="text-slate-500 text-xs hidden sm:block truncate max-w-[160px]">
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

      <main className="flex-1">

        {/* ── HERO + PRICING (non-logged-in and free users) ── */}
        {showHero && (
          <>
            {/* Hero */}
            <section className="max-w-3xl mx-auto px-6 pt-16 pb-12 text-center">
              <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4 leading-tight">
                Smart<span className="text-blue-400">Log</span>
              </h1>
              <p className="text-xl text-blue-400 font-medium mb-8">
                {t(lang, "heroTagline")}
              </p>
              <div className="text-left max-w-2xl mx-auto space-y-4 mb-10">
                <p className="text-slate-300 text-base leading-relaxed">
                  {t(lang, "heroP1")}
                </p>
                <p className="text-slate-300 text-base leading-relaxed">
                  {t(lang, "heroP2")}
                </p>
              </div>
              <p className="text-slate-400 text-sm mb-4">{t(lang, "heroCta")}</p>
              <button
                onClick={scrollToCards}
                className="px-8 py-3 rounded-full bg-blue-500 hover:bg-blue-400 text-white font-medium transition-colors"
              >
                {t(lang, "heroCtaButton")}
              </button>
            </section>

            {/* Pricing */}
            <section className="max-w-4xl mx-auto px-6 pb-16">
              <p className="text-xs text-slate-500 uppercase tracking-wider text-center mb-8">
                {t(lang, "pricingTitle")}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">

                {/* Free */}
                <div className="p-6 rounded-2xl border border-slate-700 bg-slate-900 flex flex-col">
                  <div className="mb-5">
                    <p className="text-sm font-medium text-slate-400 mb-2">{t(lang, "planFreeTitle")}</p>
                    <p className="text-4xl font-bold text-white">{t(lang, "planFreePrice")}</p>
                    <p className="text-slate-500 text-xs mt-1">{t(lang, "planFreePer")}</p>
                  </div>
                  <ul className="space-y-2.5 mb-6 flex-1">
                    <li className="flex items-start gap-2 text-sm text-slate-300">
                      <span className="text-green-400 mt-0.5 flex-shrink-0">✓</span>{t(lang, "planFreeF1")}
                    </li>
                    <li className="flex items-start gap-2 text-sm text-slate-300">
                      <span className="text-green-400 mt-0.5 flex-shrink-0">✓</span>{t(lang, "planFreeF2")}
                    </li>
                    <li className="flex items-start gap-2 text-sm text-slate-500">
                      <span className="mt-0.5 flex-shrink-0">✗</span>{t(lang, "planFreeF3")}
                    </li>
                  </ul>
                  <button
                    onClick={scrollToCards}
                    className="w-full py-2.5 rounded-full border border-slate-600 text-slate-300 hover:border-slate-400 hover:text-white text-sm font-medium transition-colors"
                  >
                    {t(lang, "planFreeCta")}
                  </button>
                </div>

                {/* Monthly */}
                <div className="p-6 rounded-2xl border border-slate-700 bg-slate-900 flex flex-col">
                  <div className="mb-5">
                    <p className="text-sm font-medium text-slate-400 mb-2">{t(lang, "planMonthlyTitle")}</p>
                    <p className="text-4xl font-bold text-white">{t(lang, "planMonthlyPrice")}</p>
                    <p className="text-slate-500 text-xs mt-1">{t(lang, "planMonthlyPer")}</p>
                  </div>
                  <ul className="space-y-2.5 mb-6 flex-1">
                    <li className="flex items-start gap-2 text-sm text-slate-300">
                      <span className="text-green-400 mt-0.5 flex-shrink-0">✓</span>{t(lang, "planF1")}
                    </li>
                    <li className="flex items-start gap-2 text-sm text-slate-300">
                      <span className="text-green-400 mt-0.5 flex-shrink-0">✓</span>{t(lang, "planF2")}
                    </li>
                    <li className="flex items-start gap-2 text-sm text-slate-300">
                      <span className="text-green-400 mt-0.5 flex-shrink-0">✓</span>{t(lang, "planF3")}
                    </li>
                  </ul>
                  <button
                    onClick={() => handlePricingCta("monthly")}
                    className="w-full py-2.5 rounded-full bg-blue-500 hover:bg-blue-400 text-white text-sm font-medium transition-colors"
                  >
                    {t(lang, "planCta")}
                  </button>
                </div>

                {/* Yearly */}
                <div className="p-6 rounded-2xl border border-blue-500/40 bg-blue-950/10 flex flex-col relative">
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs px-3 py-1 rounded-full bg-blue-500 text-white font-medium">
                    {t(lang, "planYearlyBadge")}
                  </span>
                  <div className="mb-5">
                    <p className="text-sm font-medium text-blue-400 mb-2">{t(lang, "planYearlyTitle")}</p>
                    <p className="text-4xl font-bold text-white">{t(lang, "planYearlyPrice")}</p>
                    <p className="text-slate-500 text-xs mt-1">{t(lang, "planYearlyPer")}</p>
                  </div>
                  <ul className="space-y-2.5 mb-6 flex-1">
                    <li className="flex items-start gap-2 text-sm text-slate-300">
                      <span className="text-green-400 mt-0.5 flex-shrink-0">✓</span>{t(lang, "planF1")}
                    </li>
                    <li className="flex items-start gap-2 text-sm text-slate-300">
                      <span className="text-green-400 mt-0.5 flex-shrink-0">✓</span>{t(lang, "planF2")}
                    </li>
                    <li className="flex items-start gap-2 text-sm text-slate-300">
                      <span className="text-green-400 mt-0.5 flex-shrink-0">✓</span>{t(lang, "planF3")}
                    </li>
                  </ul>
                  <button
                    onClick={() => handlePricingCta("yearly")}
                    className="w-full py-2.5 rounded-full bg-blue-500 hover:bg-blue-400 text-white text-sm font-medium transition-colors"
                  >
                    {t(lang, "planCta")}
                  </button>
                </div>

              </div>
            </section>

            <div className="border-t border-slate-800" />
          </>
        )}

        {/* ── DASHBOARD (paid/beta users with experiments) ── */}
        {showDashboard && (
          <section className="max-w-3xl mx-auto px-6 pt-10 pb-6">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-4">
              {t(lang, "yourExperiments")}
            </p>
            <div className="flex flex-col gap-3">
              {experiments.map((exp) => {
                const painLabel = t(lang, "painLabels")[exp.pain_type] || exp.pain_type;
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

        {/* ── PAIN CARDS ── */}
        <section ref={cardsRef} className="max-w-3xl mx-auto px-6 py-10">
          {(showDashboard || (user && canLog)) && (
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-6">
              {t(lang, "newSession")}
            </p>
          )}

          <div className="mb-8 text-center">
            <h2 className="text-2xl font-semibold text-white mb-2">
              {t(lang, "homeTitle")}
            </h2>
            <p className="text-slate-400 text-sm">
              {t(lang, "homeSubtitle")}
            </p>
          </div>

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
                    <p className="font-medium text-white text-sm mb-1">{pain.title}</p>
                    <p className="text-slate-400 text-sm leading-relaxed">{pain.description}</p>
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
                  ? lang === "pt" ? "Entrar para começar →" : "Sign in to start →"
                  : t(lang, "homeCta")}
              </button>
            )}
          </div>
        </section>

      </main>
    </div>
  );
}
