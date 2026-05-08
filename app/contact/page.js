"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { getLang } from "@/lib/i18n";

export default function ContactPage() {
  const router = useRouter();
  const lang = getLang();
  const pt = lang === "pt";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message }),
      });
      const data = await res.json();
      if (data.ok) {
        setSent(true);
      } else {
        setError(pt ? "Erro ao enviar. Tente novamente." : "Failed to send. Please try again.");
      }
    } catch {
      setError(pt ? "Erro ao enviar. Tente novamente." : "Failed to send. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      <header className="px-8 py-5 border-b border-slate-800">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={() => router.push("/")}
            className="text-xl font-semibold tracking-tight hover:opacity-80 transition-opacity"
          >
            Smart<span className="text-blue-400">Log</span>
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16">
        <div className="w-full max-w-md">

          {sent ? (
            <div className="text-center">
              <div className="text-4xl mb-4">✓</div>
              <h1 className="text-2xl font-semibold mb-2">
                {pt ? "Mensagem enviada!" : "Message sent!"}
              </h1>
              <p className="text-slate-400 text-sm mb-8">
                {pt
                  ? "Recebemos a sua mensagem e responderemos em breve."
                  : "We received your message and will get back to you shortly."}
              </p>
              <button
                onClick={() => router.push("/")}
                className="px-6 py-2.5 rounded-full bg-blue-500 hover:bg-blue-400 text-white text-sm font-medium transition-colors"
              >
                {pt ? "Voltar ao início" : "Back to home"}
              </button>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <h1 className="text-2xl font-semibold mb-2">
                  {pt ? "Fale conosco" : "Contact us"}
                </h1>
                <p className="text-slate-400 text-sm">
                  {pt
                    ? "Tem uma dúvida ou sugestão? Estamos aqui."
                    : "Have a question or suggestion? We're here."}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={pt ? "Seu nome" : "Your name"}
                  required
                  className="w-full bg-slate-800 text-white placeholder-slate-500 rounded-2xl px-5 py-3.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={pt ? "Seu email" : "Your email"}
                  required
                  className="w-full bg-slate-800 text-white placeholder-slate-500 rounded-2xl px-5 py-3.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={pt ? "Sua mensagem" : "Your message"}
                  required
                  rows={5}
                  className="w-full bg-slate-800 text-white placeholder-slate-500 rounded-2xl px-5 py-3.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                />

                {error && <p className="text-red-400 text-xs text-center">{error}</p>}

                <button
                  type="submit"
                  disabled={loading || !name.trim() || !email.trim() || !message.trim()}
                  className="w-full py-3.5 rounded-full bg-blue-500 hover:bg-blue-400 disabled:bg-slate-700 disabled:text-slate-500 text-white font-medium text-sm transition-colors"
                >
                  {loading
                    ? (pt ? "Enviando..." : "Sending...")
                    : (pt ? "Enviar mensagem" : "Send message")}
                </button>
              </form>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
