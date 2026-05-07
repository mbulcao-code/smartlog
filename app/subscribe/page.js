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

  const [loading, setLoading] = useState(null); // "monthly" | "yearly" | null
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    supabaseBrowser.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push(`/auth?next=${encodeURIComponent(next)}`);
      } else {
        setUserEmail(session.user.email);
      }
    });
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
      }
    } catch (e) {
      setLoading(null);
    }
  }

  const pt = lang === "pt";

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      <header className="px-8 py-6 border-b border-slate-800">
        <div className="max-w-3xl mx-auto">
          <span className="text-xl font-semibold tracking-tight">
            Smart<span className="text-blue-400">Log</span>
          </span>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16">
        <div className="max-w-2xl w-full">
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Monthly */}
            <div className="p-6 rounded-2xl border border-slate-700 bg-slate-900 flex flex-col">
              <p className="text-slate-400 text-sm mb-1">
                {pt ? "Mensal" : "Monthly"}
              </p>
              <p className="text-4xl font-bold text-white mb-1">$19</p>
              <p className="text-slate-500 text-sm mb-6">
                {pt ? "por mês" : "per month"}
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
                <span className="bg-blue-500 text-white text-xs font-medium px-3 py-1 rounded-full">
                  {pt ? "Melhor valor — 30% off" : "Best value — 30% off"}
                </span>
              </div>
              <p className="text-slate-400 text-sm mb-1">
                {pt ? "Anual" : "Yearly"}
              </p>
              <p className="text-4xl font-bold text-white mb-1">$159</p>
              <p className="text-slate-500 text-sm mb-6">
                {pt ? "por ano (~$13/mês)" : "per year (~$13/mo)"}
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
          </div>

          {userEmail && (
            <p className="text-center text-slate-600 text-xs mt-6">
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
