"use client";
import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { getLang } from "@/lib/i18n";

function AuthInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const next = searchParams.get("next") || "/";
  const lang = getLang();

  const [mode, setMode] = useState("signin"); // "signin" | "signup" | "forgot"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  function storeNext() {
    localStorage.setItem("smartlog_auth_next", next);
  }

  async function handleGoogle() {
    storeNext();
    await supabaseBrowser.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/confirm`,
      },
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email.trim() || loading) return;
    setLoading(true);
    setError("");
    setMessage("");

    if (mode === "forgot") {
      const { error: err } = await supabaseBrowser.auth.resetPasswordForEmail(
        email.trim(),
        { redirectTo: `${window.location.origin}/auth/update-password` }
      );
      if (err) setError(err.message);
      else
        setMessage(
          lang === "pt"
            ? "Verifique seu email para redefinir a senha."
            : "Check your email to reset your password."
        );
      setLoading(false);
      return;
    }

    if (!password.trim()) {
      setError(lang === "pt" ? "Senha obrigatória." : "Password required.");
      setLoading(false);
      return;
    }

    if (mode === "signup") {
      const { error: err } = await supabaseBrowser.auth.signUp({
        email: email.trim(),
        password,
      });
      if (err) {
        setError(err.message);
        setLoading(false);
        return;
      }
      router.push(next);
    } else {
      const { error: err } = await supabaseBrowser.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (err) {
        setError(
          lang === "pt"
            ? "Email ou senha incorretos."
            : "Incorrect email or password."
        );
        setLoading(false);
        return;
      }
      router.push(next);
    }
  }

  const isSignIn = mode === "signin";
  const isForgot = mode === "forgot";

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="mb-8 text-center">
          <button
            onClick={() => router.push("/")}
            className="text-2xl font-semibold tracking-tight hover:opacity-80 transition-opacity"
          >
            Smart<span className="text-blue-400">Log</span>
          </button>
          <p className="text-slate-400 mt-2 text-sm">
            {isForgot
              ? lang === "pt" ? "Redefinir senha" : "Reset your password"
              : isSignIn
              ? lang === "pt" ? "Entre na sua conta" : "Sign in to your account"
              : lang === "pt" ? "Crie sua conta" : "Create your account"}
          </p>
        </div>

        {/* Google button */}
        {!isForgot && (
          <>
            <button
              onClick={handleGoogle}
              className="w-full flex items-center justify-center gap-3 py-3.5 rounded-2xl border border-slate-700 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium transition-colors mb-4"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
                <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
                <path fill="#FBBC05" d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z"/>
                <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z"/>
              </svg>
              {lang === "pt" ? "Continuar com Google" : "Continue with Google"}
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-px bg-slate-800" />
              <span className="text-slate-600 text-xs">{lang === "pt" ? "ou" : "or"}</span>
              <div className="flex-1 h-px bg-slate-800" />
            </div>
          </>
        )}

        {/* Email + password form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={lang === "pt" ? "Seu email" : "Your email"}
            autoFocus
            className="w-full bg-slate-800 text-white placeholder-slate-500 rounded-2xl px-5 py-3.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          {!isForgot && (
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={lang === "pt" ? "Senha" : "Password"}
              className="w-full bg-slate-800 text-white placeholder-slate-500 rounded-2xl px-5 py-3.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          )}

          {error && <p className="text-red-400 text-xs text-center">{error}</p>}
          {message && <p className="text-green-400 text-xs text-center">{message}</p>}

          <button
            type="submit"
            disabled={!email.trim() || loading}
            className="w-full py-3.5 rounded-full bg-blue-500 hover:bg-blue-400 disabled:bg-slate-700 disabled:text-slate-500 text-white font-medium text-sm transition-colors"
          >
            {loading
              ? "..."
              : isForgot
              ? lang === "pt" ? "Enviar link de redefinição" : "Send reset link"
              : isSignIn
              ? lang === "pt" ? "Entrar" : "Sign in"
              : lang === "pt" ? "Criar conta" : "Create account"}
          </button>
        </form>

        {/* Footer links */}
        <div className="mt-5 text-center space-y-2.5">
          {!isForgot && (
            <button
              onClick={() => { setMode(isSignIn ? "signup" : "signin"); setError(""); setMessage(""); }}
              className="block w-full text-slate-400 hover:text-white text-sm transition-colors"
            >
              {isSignIn
                ? lang === "pt" ? "Não tem conta? Criar conta →" : "No account? Sign up →"
                : lang === "pt" ? "Já tem conta? Entrar →" : "Have an account? Sign in →"}
            </button>
          )}
          <button
            onClick={() => { setMode(isForgot ? "signin" : "forgot"); setError(""); setMessage(""); }}
            className="block w-full text-slate-500 hover:text-slate-300 text-xs transition-colors"
          >
            {isForgot
              ? lang === "pt" ? "← Voltar" : "← Back"
              : lang === "pt" ? "Esqueceu a senha?" : "Forgot password?"}
          </button>
        </div>

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
