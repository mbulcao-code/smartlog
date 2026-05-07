"use client";
import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { getLang, t } from "@/lib/i18n";

function AuthInner() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/";
  const lang = getLang();

  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email.trim() || loading) return;
    setLoading(true);
    setError("");

    // Store next URL in localStorage so the callback page can retrieve it
    // (hash fragments are never sent to the server, so we can't pass next via URL)
    localStorage.setItem("smartlog_auth_next", next);

    const redirectTo = `${window.location.origin}/auth/confirm`;

    const { error: authError } = await supabaseBrowser.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: redirectTo },
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
    } else {
      setSent(true);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="mb-10 text-center">
          <span className="text-2xl font-semibold tracking-tight">
            Smart<span className="text-blue-400">Log</span>
          </span>
          {!sent && (
            <p className="text-slate-400 mt-3 text-sm">
              {lang === "pt"
                ? "Entre com seu email para continuar."
                : "Enter your email to continue."}
            </p>
          )}
        </div>

        {sent ? (
          <div className="text-center">
            <p className="text-white text-lg font-medium mb-2">
              {lang === "pt" ? "Verifique seu email" : "Check your email"}
            </p>
            <p className="text-slate-400 text-sm">
              {lang === "pt"
                ? `Enviamos um link de acesso para ${email}. Clique nele para continuar.`
                : `We sent a link to ${email}. Click it to continue.`}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={lang === "pt" ? "Seu email" : "Your email"}
              autoFocus
              className="w-full bg-slate-800 text-white placeholder-slate-500 rounded-2xl px-5 py-4 text-base focus:outline-none focus:ring-1 focus:ring-blue-500 mb-4"
            />
            {error && (
              <p className="text-red-400 text-sm mb-3 text-center">{error}</p>
            )}
            <button
              type="submit"
              disabled={!email.trim() || loading}
              className="w-full py-4 rounded-full bg-blue-500 hover:bg-blue-400 disabled:bg-slate-700 disabled:text-slate-500 text-white font-medium transition-colors"
            >
              {loading
                ? (lang === "pt" ? "Enviando..." : "Sending...")
                : (lang === "pt" ? "Enviar link →" : "Send link →")}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense>
      <AuthInner />
    </Suspense>
  );
}
