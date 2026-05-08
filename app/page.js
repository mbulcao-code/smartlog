"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { getLang, setLang, t } from "@/lib/i18n";
import { supabaseBrowser } from "@/lib/supabase-browser";
import Sidebar from "@/app/components/Sidebar";

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
    async function loadUser(session) {
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
      setAuthLoading(false);
    }

    // Listen for auth state changes — catches Google OAuth redirect with hash token
    const { data: { subscription } } = supabaseBrowser.auth.onAuthStateChange(
      (event, session) => {
        if (session) {
          loadUser(session);
        } else if (event === "SIGNED_OUT") {
          setUser(null);
          setExperiments([]);
          setCanLog(false);
          setAuthLoading(false);
        }
      }
    );

    // Also check for existing session on mount
    supabaseBrowser.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        loadUser(session);
      } else {
        setAuthLoading(false);
      }
    });

    return () => subscription.unsubscribe();
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
  // Show dashboard for all logged-in users who have experiments
  const showDashboard = user && experiments.length > 0;

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

  // ── LOGGED-IN LAYOUT (sidebar + pain cards) ──
  if (user) {
    return (
      <div className="min-h-screen bg-slate-950 text-white">
        <Sidebar
          user={user}
          canLog={canLog}
          experiments={experiments}
          lang={lang}
          onSignOut={handleSignOut}
          onNewSession={scrollToCards}
          onToggleLang={toggleLang}
        />

        {/* Main content — offset for sidebar on desktop */}
        <div className="sm:ml-64 min-h-screen flex flex-col">
          {/* Mobile spacer for hamburger button */}
          <div className="h-16 sm:hidden" />

          <main className="flex-1 max-w-2xl mx-auto w-full px-6 py-10">

            {/* Free locked banner */}
            {isFreeLocked && (
              <div className="mb-8 p-5 rounded-2xl border border-slate-700 bg-slate-900 text-center">
                <p className="text-slate-300 text-sm mb-3">
                  {lang === "pt"
                    ? "Você usou sua sessão gratuita. Faça upgrade para conversas e logs ilimitados."
                    : "You've used your free session. Upgrade for unlimited conversations and logs."}
                </p>
                <button
                  onClick={() => router.push("/subscribe")}
                  className="px-6 py-2 rounded-full bg-blue-500 text-white text-sm font-medium hover:bg-blue-400 transition-colors"
                >
                  {lang === "pt" ? "Ver planos" : "See plans"}
                </button>
              </div>
            )}

            {/* Pain cards */}
            <div ref={cardsRef} className="mb-8 text-center">
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
                    <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex-shrink-0 transition-all ${
                      selected === pain.id ? "border-blue-400 bg-blue-400" : "border-slate-600"
                    }`} />
                    <div>
                      <p className="font-medium text-white text-sm mb-1">{pain.title}</p>
                      <p className="text-slate-400 text-sm leading-relaxed">{pain.description}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-8 flex justify-center">
              {isFreeLocked ? (
                <button
                  onClick={() => router.push("/subscribe")}
                  className="px-8 py-3 rounded-full text-sm font-medium bg-blue-500 text-white hover:bg-blue-400 transition-all"
                >
                  {t(lang, "upgradeToContinue")}
                </button>
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
                  {t(lang, "homeCta")}
                </button>
              )}
            </div>
          </main>
        </div>
      </div>
    );
  }

  // ── NOT LOGGED-IN LAYOUT (landing page) ──
  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">

      {/* Header */}
      <header className="px-8 py-5 border-b border-slate-800">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <span className="text-xl font-semibold tracking-tight text-white">
              Smart<span className="text-blue-400">Log</span>
            </span>
            <span className="hidden sm:inline text-slate-600 text-sm ml-3">
              {t(lang, "heroTagline")}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/auth")}
              className="text-xs font-medium px-3 py-1.5 rounded-full bg-blue-500 hover:bg-blue-400 text-white transition-colors"
            >
              {lang === "pt" ? "Entrar" : "Sign in"}
            </button>
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

        {/* Hero */}
        <section className="max-w-3xl mx-auto px-6 pt-16 pb-12 text-center">
              <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4 leading-tight">
                Smart<span className="text-blue-400">Log</span>
              </h1>
              <p className="text-xl text-blue-400 font-medium mb-8">
                {t(lang, "heroTagline")}
              </p>
              <div className="text-left max-w-2xl mx-auto space-y-4 mb-10">
                {lang === "pt" ? (
                  <>
                    <p className="text-slate-300 text-base leading-relaxed">
                      Emoção não é seu maior inimigo.{" "}
                      <strong className="text-white">É a incerteza — e a urgência que ela cria.</strong>
                    </p>
                    <p className="text-slate-300 text-base leading-relaxed">
                      Quando seu cérebro não tem informação suficiente para agir com confiança, ele recorre ao impulso: FOMO, hesitação, vingança, saída prematura. Nomes diferentes, mesma raiz.
                    </p>
                    <p className="text-slate-300 text-base leading-relaxed">
                      Regras não resolvem isso. <strong className="text-white">Disciplina não resolve isso.</strong>
                    </p>
                    <p className="text-slate-300 text-base leading-relaxed">
                      <strong className="text-white">O que resolve são decisões estruturadas</strong> — precisas o suficiente para repetir, comparar e aprender.
                    </p>
                    <p className="text-slate-300 text-base leading-relaxed">
                      <strong className="text-blue-400">SmartLog</strong> te guia para encontrar exatamente o que varia nas suas decisões e transforma essa variação em um experimento testável. Não sensação. Dados.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-slate-300 text-base leading-relaxed">
                      Emotion is not your biggest enemy.{" "}
                      <strong className="text-white">It&apos;s uncertainty — and the urgency it creates.</strong>
                    </p>
                    <p className="text-slate-300 text-base leading-relaxed">
                      When your brain doesn&apos;t have enough information to act with confidence, it defaults to impulse: FOMO, hesitation, revenge trades, early exits. Different names, same root.
                    </p>
                    <p className="text-slate-300 text-base leading-relaxed">
                      Rules don&apos;t fix this. <strong className="text-white">Discipline doesn&apos;t fix this.</strong>
                    </p>
                    <p className="text-slate-300 text-base leading-relaxed">
                      <strong className="text-white">What fixes it is structured decisions</strong> — precise enough to repeat, compare, and learn from.
                    </p>
                    <p className="text-slate-300 text-base leading-relaxed">
                      <strong className="text-blue-400">SmartLog</strong> guides you to find exactly what varies in your trading and turns that variation into a testable experiment. Not feel. Data.
                    </p>
                  </>
                )}
              </div>
              <p className="text-slate-400 text-sm mb-4">{t(lang, "heroCta")}</p>
              <button
                onClick={scrollToCards}
                className="px-8 py-3 rounded-full bg-blue-500 hover:bg-blue-400 text-white font-medium transition-colors"
              >
                {t(lang, "heroCtaButton")}
              </button>
            </section>

          </>
        </section>

        {/* Pain cards */}
        <section ref={cardsRef} className="max-w-3xl mx-auto px-6 py-10">
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
                  <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex-shrink-0 transition-all ${
                    selected === pain.id ? "border-blue-400 bg-blue-400" : "border-slate-600"
                  }`} />
                  <div>
                    <p className="font-medium text-white text-sm mb-1">{pain.title}</p>
                    <p className="text-slate-400 text-sm leading-relaxed">{pain.description}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="mt-8 flex justify-center">
            <button
              disabled={!selected}
              onClick={handleStart}
              className={`px-8 py-3 rounded-full text-sm font-medium transition-all ${
                selected
                  ? "bg-blue-500 text-white hover:bg-blue-400 cursor-pointer"
                  : "bg-slate-800 text-slate-600 cursor-not-allowed"
              }`}
            >
              {lang === "pt" ? "Entrar para começar →" : "Sign in to start →"}
            </button>
          </div>
        </section>

        {/* Pricing */}
        <section className="max-w-4xl mx-auto px-6 pb-16">
            <div className="border-t border-slate-800 mb-12" />
            <p className="text-xs text-slate-300 uppercase tracking-widest font-semibold text-center mb-8">
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

      </main>
    </div>
  );
}
