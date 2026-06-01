"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";

function AuthContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") || "/";

  const supabase = createClient();
  const [mode, setMode] = useState("signin"); // "signin" | "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) router.push(redirectTo);
      else setCheckingSession(false);
    });
  }, []);

  async function handleGoogleSignIn() {
    setLoading(true);
    setError("");
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/confirm?redirectTo=${encodeURIComponent(redirectTo)}`,
      },
    });
  }

  async function handleEmailAuth(e) {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name.trim() },
          emailRedirectTo: `${window.location.origin}/auth/confirm?redirectTo=${encodeURIComponent(redirectTo)}`,
        },
      });
      if (error) {
        setError(error.message);
        setLoading(false);
      } else {
        setError("Check your email to confirm your account.");
        setLoading(false);
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message);
        setLoading(false);
      } else {
        router.push(redirectTo);
      }
    }
  }

  if (checkingSession) return null;

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logo}>Trading Without Ego</div>
        <h1 style={styles.title}>
          {mode === "signin" ? "Sign in" : "Create account"}
        </h1>

        <button onClick={handleGoogleSignIn} style={styles.googleBtn} disabled={loading}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ marginRight: 8 }}>
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/>
            <path d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>

        <div style={styles.divider}><span>or</span></div>

        <form onSubmit={handleEmailAuth} style={styles.form}>
          {mode === "signup" && (
            <input
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={styles.input}
              required
            />
          )}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={styles.input}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={styles.input}
            required
          />
          {error && <p style={styles.error}>{error}</p>}
          <button type="submit" style={styles.submitBtn} disabled={loading}>
            {loading ? "..." : mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>

        <div style={styles.toggle}>
          {mode === "signin" ? (
            <>
              No account?{" "}
              <button onClick={() => setMode("signup")} style={styles.toggleBtn}>
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have one?{" "}
              <button onClick={() => setMode("signin")} style={styles.toggleBtn}>
                Sign in
              </button>
            </>
          )}
        </div>

        <div style={styles.backRow}>
          <a href="/" style={styles.backLink}>← Back to book</a>
        </div>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense>
      <AuthContent />
    </Suspense>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px",
  },
  card: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: "14px",
    padding: "40px",
    width: "100%",
    maxWidth: "380px",
  },
  logo: {
    fontSize: "13px",
    color: "var(--accent)",
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    marginBottom: "20px",
    textAlign: "center",
  },
  title: {
    fontSize: "22px",
    fontWeight: 700,
    marginBottom: "24px",
    textAlign: "center",
  },
  googleBtn: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "12px",
    background: "#fff",
    color: "#333",
    border: "none",
    borderRadius: "10px",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
    marginBottom: "16px",
  },
  divider: {
    textAlign: "center",
    color: "var(--muted)",
    fontSize: "12px",
    marginBottom: "16px",
    position: "relative",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  input: {
    background: "var(--bg)",
    border: "1px solid var(--border)",
    borderRadius: "8px",
    padding: "11px 14px",
    color: "var(--text)",
    fontSize: "14px",
    outline: "none",
    width: "100%",
  },
  error: {
    color: "var(--danger)",
    fontSize: "13px",
  },
  submitBtn: {
    background: "var(--accent)",
    color: "#000",
    border: "none",
    borderRadius: "8px",
    padding: "12px",
    fontWeight: 700,
    fontSize: "14px",
    cursor: "pointer",
    marginTop: "4px",
  },
  toggle: {
    textAlign: "center",
    color: "var(--muted)",
    fontSize: "13px",
    marginTop: "20px",
  },
  toggleBtn: {
    background: "none",
    border: "none",
    color: "var(--accent)",
    cursor: "pointer",
    fontSize: "13px",
    padding: 0,
  },
  backRow: {
    textAlign: "center",
    marginTop: "16px",
  },
  backLink: {
    color: "var(--muted)",
    fontSize: "13px",
  },
};
