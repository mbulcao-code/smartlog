"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { t } from "@/lib/i18n";

export default function Sidebar({ user, canLog, periodEnd, experiments, lang, onSignOut, onNewSession, onToggleLang }) {
  const router = useRouter();
  const [openPains, setOpenPains] = useState(new Set());
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [billingLoading, setBillingLoading] = useState(false);

  const pt = lang === "pt";
  const painOrder = t(lang, "pains").map((p) => p.id);
  const painLabels = t(lang, "painLabels");

  // Group experiments by pain_type
  const byPain = {};
  experiments.forEach((exp) => {
    if (!byPain[exp.pain_type]) byPain[exp.pain_type] = [];
    byPain[exp.pain_type].push(exp);
  });

  function togglePain(painId) {
    setOpenPains((prev) => {
      const next = new Set(prev);
      if (next.has(painId)) next.delete(painId);
      else next.add(painId);
      return next;
    });
  }

  async function handleBilling() {
    setBillingLoading(true);
    try {
      const { data: { session } } = await supabaseBrowser.auth.getSession();
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch (e) {
      console.error("Billing portal error:", e);
    } finally {
      setBillingLoading(false);
    }
  }

  const inner = (
    <div className="flex flex-col h-full bg-slate-950">

      {/* Logo + Lang toggle */}
      <div className="px-5 py-5 border-b border-slate-800 flex items-center justify-between">
        <button
          onClick={() => { router.push("/"); setSidebarOpen(false); }}
          className="text-lg font-semibold tracking-tight hover:opacity-80 transition-opacity"
        >
          Smart<span className="text-blue-400">Log</span>
        </button>
        <button
          onClick={onToggleLang}
          className="text-xs px-2.5 py-1 rounded-full border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 transition-colors"
        >
          {pt ? "EN" : "PT"}
        </button>
      </div>

      {/* Account info + nav links */}
      <div className="px-4 py-4 border-b border-slate-800 space-y-3">
        <div className="flex items-center gap-2">
          <p className="text-sm text-slate-300 truncate">{user.email}</p>
          <span className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-medium border ${
            canLog
              ? "bg-blue-500/15 text-blue-400 border-blue-500/20"
              : "bg-slate-800 text-slate-400 border-slate-700"
          }`}>
            {canLog ? "Pro" : "Free"}
          </span>
        </div>

        <a
          href="https://smartlogtrading.com"
          target="_blank"
          rel="noopener noreferrer"
          className="block text-sm text-slate-300 hover:text-white transition-colors font-medium"
        >
          {pt ? "SOBRE NÓS" : "ABOUT US"} ↗
        </a>

        <a
          href="https://smartlogtrading.com/contact"
          target="_blank"
          rel="noopener noreferrer"
          className="block text-sm text-slate-300 hover:text-white transition-colors font-medium"
        >
          {pt ? "FALE CONOSCO" : "CONTACT US"} ↗
        </a>
      </div>

      {/* Settings — always visible */}
      <div className="border-b border-slate-800">
        <p className="px-4 pt-4 pb-2 text-xs text-slate-300 uppercase tracking-widest font-semibold">
          {pt ? "Configurações" : "Settings"}
        </p>
        <div className="px-4 pb-4 space-y-2">
          <p className="text-xs text-slate-300">{pt ? "Plano atual" : "Current plan"}</p>
          <span className={`inline-block text-sm px-3 py-1 rounded-full font-medium border ${
            canLog
              ? "bg-blue-500/15 text-blue-400 border-blue-500/20"
              : "bg-slate-800 text-slate-300 border-slate-700"
          }`}>
            {canLog ? "Pro" : "Free"}
          </span>
          {canLog && periodEnd && (
            <p className="text-xs text-slate-300">
              {pt ? "Válido até" : "Valid until"}{" "}
              {new Date(periodEnd).toLocaleDateString(pt ? "pt-BR" : "en-US", { day: "numeric", month: "short", year: "numeric" })}
            </p>
          )}
          {!canLog && (
            <div className="pt-1">
              <button
                onClick={() => { router.push("/subscribe"); setSidebarOpen(false); }}
                className="block text-sm text-blue-400 hover:text-blue-300 font-medium transition-colors"
              >
                Upgrade →
              </button>
            </div>
          )}
          {canLog && (
            <div className="space-y-1 pt-1">
              <button
                onClick={() => { router.push("/subscribe"); setSidebarOpen(false); }}
                className="block text-sm text-slate-200 hover:text-white transition-colors"
              >
                {pt ? "Mudar plano →" : "Change plan →"}
              </button>
              <button
                onClick={handleBilling}
                disabled={billingLoading}
                className="block text-sm text-slate-200 hover:text-white transition-colors disabled:opacity-40"
              >
                {billingLoading ? "..." : (pt ? "Cancelar assinatura →" : "Cancel subscription →")}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* New session button */}
      <div className="px-4 py-4 border-b border-slate-800">
        <button
          onClick={() => { onNewSession(); setSidebarOpen(false); }}
          className="w-full py-2.5 rounded-xl bg-blue-500 hover:bg-blue-400 text-white text-sm font-medium transition-colors"
        >
          {pt ? "+ Nova sessão" : "+ New session"}
        </button>
      </div>

      {/* Experiments tree */}
      <div className="flex-1 overflow-y-auto py-4 px-3">
        <p className="px-2 mb-3 text-xs text-slate-300 uppercase tracking-widest font-semibold">
          {pt ? "Seus Experimentos" : "Your Experiments"}
        </p>

        {painOrder.map((painId) => {
          const label = painLabels[painId] || painId;
          const exps = byPain[painId] || [];
          const hasExps = exps.length > 0;
          const isOpen = openPains.has(painId);

          return (
            <div key={painId}>
              <button
                onClick={() => hasExps && togglePain(painId)}
                className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg text-sm transition-colors text-left ${
                  hasExps
                    ? "text-slate-200 hover:bg-slate-800 cursor-pointer"
                    : "text-slate-400 cursor-default"
                }`}
              >
                <span className="text-[10px] text-slate-400 w-3 flex-shrink-0">
                  {hasExps ? (isOpen ? "▼" : "▶") : "▶"}
                </span>
                <span className="flex-1 truncate">{label}</span>
                {hasExps && (
                  <span className="text-xs text-slate-400 tabular-nums">{exps.length}</span>
                )}
              </button>

              {isOpen && hasExps && (
                <div className="ml-5 mb-1">
                  {exps.map((exp) => (
                    <button
                      key={exp.session_id}
                      onClick={() => { router.push(`/log/${exp.session_id}`); setSidebarOpen(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors text-left"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-600 flex-shrink-0" />
                      <span className="truncate">{exp.setup_data?.setup_name || "—"}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {experiments.length === 0 && (
          <p className="px-2 mt-1 text-sm text-slate-400 italic">
            {pt ? "Nenhum experimento ainda." : "No experiments yet."}
          </p>
        )}
      </div>

      {/* Sign out */}
      <div className="px-4 py-4 border-t border-slate-800">
        <button
          onClick={() => { onSignOut(); setSidebarOpen(false); }}
          className="text-sm text-slate-200 hover:text-white transition-colors"
        >
          {pt ? "Sair" : "Sign out"}
        </button>
      </div>

    </div>
  );

  return (
    <>
      {/* Mobile: hamburger button */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="sm:hidden fixed top-4 left-4 z-50 p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-white transition-colors"
        aria-label="Open menu"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M2 4h14M2 9h14M2 14h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </button>

      {/* Mobile: slide-in overlay */}
      {sidebarOpen && (
        <div className="sm:hidden fixed inset-0 z-40 flex">
          <div className="w-72 h-full overflow-hidden shadow-2xl border-r border-slate-800">
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute top-4 right-4 z-50 p-1.5 rounded-lg text-slate-500 hover:text-white transition-colors"
            >
              ✕
            </button>
            {inner}
          </div>
          <div
            className="flex-1 bg-black/60 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
        </div>
      )}

      {/* Desktop: fixed sidebar */}
      <div className="hidden sm:block fixed top-0 left-0 h-screen w-64 border-r border-slate-800 overflow-hidden">
        {inner}
      </div>
    </>
  );
}
