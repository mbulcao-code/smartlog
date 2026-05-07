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
    async function handleConfirm() {
      // getSession() automatically processes the hash fragment (#access_token=...)
      await supabaseBrowser.auth.getSession();

      // Retrieve next URL: prefer query param, then localStorage fallback
      const next =
        searchParams.get("next") ||
        (typeof localStorage !== "undefined"
          ? localStorage.getItem("smartlog_auth_next")
          : null) ||
        "/";

      if (typeof localStorage !== "undefined") {
        localStorage.removeItem("smartlog_auth_next");
      }

      router.push(next);
    }
    handleConfirm();
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
