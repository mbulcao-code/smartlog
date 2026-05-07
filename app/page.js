"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getLang, setLang, t } from "@/lib/i18n";

export default function Home() {
  const [selected, setSelected] = useState(null);
  const [lang, setLangState] = useState("en");
  const router = useRouter();

  useEffect(() => {
    setLangState(getLang());
  }, []);

  function toggleLang() {
    const next = lang === "en" ? "pt" : "en";
    setLang(next);
    setLangState(next);
    setSelected(null);
  }

  function handleStart() {
    if (selected) router.push(`/conversation?pain=${selected}`);
  }

  const pains = t(lang, "pains");

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      {/* Header */}
      <header className="px-8 py-6 border-b border-slate-800">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <span className="text-xl font-semibold tracking-tight text-white">
            Smart<span className="text-blue-400">Log</span>
          </span>
          <button
            onClick={toggleLang}
            className="text-xs font-medium px-3 py-1.5 rounded-full border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 transition-colors"
          >
            {t(lang, "langLabel")}
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16">
        <div className="max-w-3xl w-full">

          {/* Headline */}
          <div className="mb-12 text-center">
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
              {t(lang, "homeCta")}
            </button>
          </div>

        </div>
      </main>
    </div>
  );
}
