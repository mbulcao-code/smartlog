"use client";
import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { getLang } from "@/lib/i18n";

function ConfirmInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const lang = getLang();

  useEffect(() => {
    let redirected = false;

    function doRedirect() {
      if (redirected) return;
      redirected = true;
      const next =
        (typeof localStorage !== "undefined"
          ? localStorage.getItem("smartlog_auth_next")
          : null) ||
        searchParams.get("next") ||
        "/";
      if (typeof localStorage !== "undefined") {
        localStorage.removeItem("smartlog_auth_next");
      }
      router.push(next);
    }

    // Listen for auth state change — handles implicit flow (hash) and PKCE (code)
    const { data: { subscription } } = supabaseBrowser.auth.onAuthStateChange(
      (event, session) => {
        if ((event === "SIGNED_IN" || event === "TOKEN_REFRESHED") && session) {
          doRedirect();
        }
      }
    );

    // Also handle PKCE code exchange if code param present
    const code = searchParams.get("code");
    if (code) {
      supabaseBrowser.auth.exchangeCodeForSession(code).then(({ data, error }) => {
        if (data?.session) doRedirect();
      });
    }

    // Check for existing session
    supabaseBrowser.auth.getSession().then(({ data: { session } }) => {
      if (session) doRedirect();
    });

    // Fallback: if nothing fires in 5s, go home anyway
    const timeout = setTimeout(doRedirect, 5000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
      <p className="text-slate-400">
        {lang === "pt" ? "Autenticando..." : "Signing you in..."}
      </p>
    </div>
  );
}

export default function AuthConfirmPage() {
  return (
    <Suspense>
      <ConfirmInner />
    </Suspense>
  );
}
