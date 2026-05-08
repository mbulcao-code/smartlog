"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { getLang } from "@/lib/i18n";

function SubscribeInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const next = searchParams.get("next") || "/";
  const lang = getLang();

  const [loading, setLoading] = useState(null); // "monthly" | "yearly" | "lifetime" | null
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    supabaseBrowser.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push(`/auth?next=${encodeURIComponent(next)}`);
      } else {
        setUserEmail(session.user.email);
      }
    });

    // Reset loading when user navigates back from Stripe (bfcache restore)
    function handlePageShow(e) {
      if (e.persisted) setLoading(null);
    }
    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, []);

  async function handleSubscribe(plan) {
    setLoading(plan);
    try {
      const { data: { session } } = await supabaseBrowser.auth.getSession();
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ plan, next }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setLoading(null);
      }
    } catch (e) {
      setLoading(null);
    }
  }

  const pt = lang === "pt";

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      <header className="px-8 py-6 border-b border-slate-800">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => router.push("/")}
            className="text-xl font-semibold tracking-tight hover:opacity-80 transition-opacity"
          >
            Smart<span className="text-blue-400">Log</span>
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16">
        <div className="max-w-4xl w-full">
          <div className="text-center mb-12">
            <h1 className="text-3xl font-semibold mb-3">
              {pt ? "Acesse o registro completo" : "Unlock your experiment log"}
            </h1>
            <p className="text-slate-400 text-base">
              {pt
                ? "A conversa é gratuita. O registro transforma a conversa em dados."
                : "The conversation is free. The log turns the conversation into data."}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {/* Monthly */}
            <div className="p-6 rounded-2xl border border-slate-700 bg-slate-900 flex flex-col relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-slate-700 text-slate-300 text-xs font-medium px-3 py-1 rounded-full whitespace-nowrap">
                  {pt ? "Preço de lançamento" : "Launch price"}
                </span>
              </div>
              <p className="text-slate-400 text-sm mb-1 mt-1">
                {pt ? "Mensal" : "Monthly"}
              </p>
              <div className="flex items-baseline gap-1 mb-1">
                <p className="text-4xl font-bold text-white">$19</p>
                <p className="text-slate-500 text-sm">{pt ? "/mês" : "/mo"}</p>
              </div>
              <p className="text-slate-600 text-xs mb-5">
                {pt ? "preço sobe após o lançamento" : "price increases after launch"}
              </p>
              <ul className="flex-1 space-y-2 mb-6">
                {[
                  pt ? "Registro ilimitado" : "Unlimited logging",
                  pt ? "Todos os setups" : "All setups",
                  pt ? "Dados históricos" : "Historical data",
                  pt ? "Cancele quando quiser" : "Cancel anytime",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-slate-300">
                    <span className="text-blue-400">✓</span> {item}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handleSubscribe("monthly")}
                disabled={!!loading}
                className="w-full py-3 rounded-full border border-blue-500 text-blue-400 hover:bg-blue-500 hover:text-white disabled:opacity-50 font-medium transition-all"
              >
                {loading === "monthly"
                  ? (pt ? "Redirecionando..." : "Redirecting...")
                  : (pt ? "Assinar mensal" : "Subscribe monthly")}
              </button>
            </div>

            {/* Yearly */}
            <div className="p-6 rounded-2xl border border-blue-500 bg-blue-950/20 flex flex-col relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-blue-500 text-white text-xs font-medium px-3 py-1 rounded-full whitespace-nowrap">
                  {pt ? "Melhor valor — 30% off" : "Best value — 30% off"}
                </span>
              </div>
              <p className="text-slate-400 text-sm mb-1 mt-1">
                {pt ? "Anual" : "Yearly"}
              </p>
              <div className="flex items-baseline gap-1 mb-1">
                <p className="text-4xl font-bold text-white">$159</p>
                <p className="text-slate-500 text-sm">{pt ? "/ano" : "/yr"}</p>
              </div>
              <p className="text-slate-500 text-xs mb-5">
                {pt ? "~$13/mês · 30% de desconto" : "~$13/mo · 30% off"}
              </p>
              <ul className="flex-1 space-y-2 mb-6">
                {[
                  pt ? "Registro ilimitado" : "Unlimited logging",
                  pt ? "Todos os setups" : "All setups",
                  pt ? "Dados históricos" : "Historical data",
                  pt ? "30% de desconto" : "30% discount",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-slate-300">
                    <span className="text-blue-400">✓</span> {item}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handleSubscribe("yearly")}
                disabled={!!loading}
                className="w-full py-3 rounded-full bg-blue-500 hover:bg-blue-400 disabled:opacity-50 text-white font-medium transition-colors"
              >
                {loading === "yearly"
                  ? (pt ? "Redirecionando..." : "Redirecting...")
                  : (pt ? "Assinar anual" : "Subscribe yearly")}
              </button>
            </div>

            {/* Lifetime */}
            <div className="p-6 rounded-2xl border border-amber-500/60 bg-amber-950/10 flex flex-col relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-amber-500 text-white text-xs font-medium px-3 py-1 rounded-full whitespace-nowrap">
                  {pt ? "Preço de fundadores" : "Founders price"}
                </span>
              </div>
              <p className="text-slate-400 text-sm mb-1 mt-1">
                {pt ? "Vitalício" : "Lifetime"}
              </p>
              <div className="flex items-baseline gap-1 mb-1">
                <p className="text-4xl font-bold text-white">$299</p>
              </div>
              <p className="text-slate-500 text-xs mb-5">
                {pt ? "pagamento único · acesso para sempre" : "one-time · access forever"}
              </p>
              <ul className="flex-1 space-y-2 mb-6">
                {[
                  pt ? "Registro ilimitado" : "Unlimited logging",
                  pt ? "Todos os setups" : "All setups",
                  pt ? "Dados históricos" : "Historical data",
                  pt ? "Todas as atualizações futuras" : "All future updates",
                  pt ? "Sem assinatura" : "No subscription",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-slate-300">
                    <span className="text-amber-400">✓</span> {item}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handleSubscribe("lifetime")}
                disabled={!!loading}
                className="w-full py-3 rounded-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-white font-medium transition-colors"
              >
                {loading === "lifetime"
                  ? (pt ? "Redirecionando..." : "Redirecting...")
                  : (pt ? "Obter acesso vitalício" : "Get lifetime access")}
              </button>
              <p className="text-center text-slate-600 text-xs mt-3">
                {pt ? "30 dias de garantia" : "30-day money-back guarantee"}
              </p>
            </div>
          </div>

          <p className="text-center text-slate-600 text-xs mt-8 max-w-2xl mx-auto">
            {pt
              ? "Disclaimer: Em caso de problemas permanentes no acesso, lifetime users recebem reembolso proporcional ao tempo de utilização (referência: plano anual)."
              : "Disclaimer: In case of permanent access issues, lifetime users receive a prorated refund based on time of use (reference: annual plan)."}
          </p>

          {userEmail && (
            <p className="text-center text-slate-600 text-xs mt-3">
              {pt ? `Logado como ${userEmail}` : `Signed in as ${userEmail}`}
            </p>
          )}
        </div>
      </main>
    </div>
  );
}

export default function SubscribePage() {
  return (
    <Suspense>
      <SubscribeInner />
    </Suspense>
  );
}
