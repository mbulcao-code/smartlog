"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import BookSidebar from "@/app/components/BookSidebar";
import { useLang } from "@/lib/use-lang";

const ENTRY_POINTS = [
  {
    id: "fomo",
    label: "FOMO",
    labelPt: "FOMO",
    description: "You enter before your level is reached — and you know it.",
    descriptionPt: "Você entra antes do seu nível ser atingido — e sabe disso.",
    type: "pain",
  },
  {
    id: "hesitation",
    label: "Hesitation",
    labelPt: "Hesitação",
    description: "The setup is there. You don't take it. Then you watch it move.",
    descriptionPt: "O setup está lá. Você não entra. E aí vê o preço andar.",
    type: "pain",
  },
  {
    id: "early_exit",
    label: "Early exit",
    labelPt: "Saída antecipada",
    description: "You get out before target. Usually it keeps going.",
    descriptionPt: "Você sai antes do alvo. Geralmente ele continua andando.",
    type: "pain",
  },
  {
    id: "revenge",
    label: "Revenge trading",
    labelPt: "Revenge trading",
    description: "After a loss, you take a trade you shouldn't.",
    descriptionPt: "Depois de um prejuízo, você opera quando não deveria.",
    type: "pain",
  },
  {
    id: "stop_tampering",
    label: "Stop tampering",
    labelPt: "Mexer no stop",
    description: "You move your stop — and it almost always makes things worse.",
    descriptionPt: "Você mexe no stop — e quase sempre piora as coisas.",
    type: "pain",
  },
  {
    id: "overtrading",
    label: "Overtrading",
    labelPt: "Overtrading",
    description: "You take trades outside your plan. More trades, worse results.",
    descriptionPt: "Você opera fora do plano. Mais trades, piores resultados.",
    type: "pain",
  },
  {
    id: "f1",
    label: "Why emotions feel like the enemy",
    labelPt: "Por que as emoções parecem o inimigo",
    description: "The foundation: emotions as goal protectors.",
    descriptionPt: "A base: emoções como protetoras de objetivos.",
    type: "concept",
  },
  {
    id: "f3",
    label: "The Mental Congress",
    labelPt: "O Congresso Mental",
    description: "Why your mind has multiple competing voices — and what to do with them.",
    descriptionPt: "Por que sua mente tem vozes concorrentes — e o que fazer com elas.",
    type: "concept",
  },
  {
    id: "f6",
    label: "The Mind as a Problem-Solver",
    labelPt: "A Mente como Solucionadora",
    description: "Why vague plans create emotional turbulence.",
    descriptionPt: "Por que planos vagos criam turbulência emocional.",
    type: "concept",
  },
  {
    id: "f7",
    label: "Confidence as a statistic",
    labelPt: "Confiança como estatística",
    description: "Why conviction is built through logging, not through winning.",
    descriptionPt: "Por que convicção se constrói com registros, não com vitórias.",
    type: "concept",
  },
];

const PLANS = [
  {
    id: "free",
    label: "Free",
    labelPt: "Grátis",
    price: "$0",
    period: "",
    description: "One free conversation to see how the method works. No card required.",
    descriptionPt: "Uma conversa gratuita para ver como o método funciona. Sem cartão.",
    cta: "Start free",
    ctaPt: "Começar grátis",
    href: "/auth",
    hrefLoggedIn: "/chat",
  },
  {
    id: "monthly",
    label: "Monthly",
    labelPt: "Mensal",
    price: "$29",
    period: "/month",
    periodPt: "/mês",
    description: "Full access to every conversation, every depth layer, every pattern.",
    descriptionPt: "Acesso completo a todas as conversas, camadas e padrões.",
    cta: "Get Monthly",
    ctaPt: "Assinar Mensal",
    priceId: process.env.NEXT_PUBLIC_BOOK_MONTHLY_PRICE_ID,
  },
  {
    id: "yearly",
    label: "Yearly",
    labelPt: "Anual",
    price: "$79",
    period: "/year",
    periodPt: "/ano",
    badge: "Best value",
    badgePt: "Melhor custo",
    description: "Full access + included in SmartLog yearly plan. Two tools, one subscription.",
    descriptionPt: "Acesso completo + incluso no plano anual do SmartLog.",
    cta: "Get Yearly",
    ctaPt: "Assinar Anual",
    priceId: process.env.NEXT_PUBLIC_BOOK_YEARLY_PRICE_ID,
    featured: true,
  },
  {
    id: "lifetime",
    label: "Lifetime",
    labelPt: "Vitalício",
    price: "$199",
    period: "one-time",
    periodPt: "pagamento único",
    badge: "Founders price",
    badgePt: "Preço fundador",
    badgeColor: "#c8a96e",
    description: "Pay once. Access forever. Includes all future updates and SmartLog lifetime.",
    descriptionPt: "Pague uma vez. Acesso eterno. Inclui atualizações e SmartLog vitalício.",
    cta: "Get Lifetime",
    ctaPt: "Comprar Vitalício",
    priceId: process.env.NEXT_PUBLIC_BOOK_LIFETIME_PRICE_ID,
  },
];

export default function Home() {
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [lang, setLang] = useLang();
  const [planLoading, setPlanLoading] = useState(null);

  const pt = lang === "pt";

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setLoading(false);
    });
  }, []);

  function startConversation(entry) {
    const params = new URLSearchParams({ entry: entry.id, type: entry.type });
    router.push(`/chat?${params.toString()}`);
  }

  async function handlePlan(plan) {
    if (plan.id === "free") {
      router.push(user ? "/chat" : "/auth");
      return;
    }
    if (!user) {
      router.push("/auth?redirectTo=/");
      return;
    }
    setPlanLoading(plan.id);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priceId: plan.priceId,
          mode: plan.id === "lifetime" ? "payment" : "subscription",
          successUrl: `${window.location.origin}/chat?subscribed=1`,
          cancelUrl: `${window.location.origin}/`,
        }),
      });
      const { url } = await res.json();
      if (url) window.location.href = url;
    } catch {
      setPlanLoading(null);
    }
  }

  const filtered =
    filter === "all"
      ? ENTRY_POINTS
      : ENTRY_POINTS.filter((e) => e.type === filter);

  return (
    <main style={styles.main}>
      <BookSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        lang={lang}
        setLang={setLang}
      />

      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <button onClick={() => setSidebarOpen(true)} style={styles.menuBtn} title="Menu">
            ☰
          </button>
          <div style={styles.logo}>Trading Without Ego</div>
        </div>
        <div style={styles.headerRight}>
          {/* PT/EN toggle */}
          <div style={styles.langRow}>
            {["en", "pt"].map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                style={{ ...styles.langBtn, ...(lang === l ? styles.langBtnActive : {}) }}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Auth */}
          {!loading && (
            user ? (
              <a href="/chat" style={styles.continueBtn}>
                {pt ? "Continuar" : "Continue"} →
              </a>
            ) : (
              <a href="/auth" style={styles.signInBtn}>
                {pt ? "Entrar" : "Sign in"}
              </a>
            )
          )}
        </div>
      </header>

      {/* Hero */}
      <section style={styles.hero}>
        <p style={styles.eyebrow}>{pt ? "Livro Interativo" : "Interactive Book"}</p>
        <h1 style={styles.headline}>
          {pt
            ? <>Você não pode remover a incerteza do trading.<br /><span style={styles.accentText}>Mas pode remover o arrependimento das suas decisões.</span></>
            : <>You can&apos;t remove uncertainty from trading.<br /><span style={styles.accentText}>But you can remove regret from your decisions.</span></>
          }
        </h1>
        <p style={styles.subhead}>
          {pt
            ? "Comece por um padrão que você está enfrentando ou um conceito que quer entender. A IA conduz a conversa — você escolhe até onde ir."
            : "Start from a pattern you're struggling with, or a concept you want to understand. The AI conducts the conversation — you choose how deep to go."
          }
        </p>
      </section>

      {/* Entry cards */}
      <section style={styles.entries}>
        <div style={styles.filterRow}>
          {[
            { id: "all", en: "Everything", pt: "Tudo" },
            { id: "pain", en: "I struggle with...", pt: "Tenho dificuldade com..." },
            { id: "concept", en: "I want to understand...", pt: "Quero entender..." },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              style={{ ...styles.filterBtn, ...(filter === f.id ? styles.filterBtnActive : {}) }}
            >
              {pt ? f.pt : f.en}
            </button>
          ))}
        </div>

        <div style={styles.grid}>
          {filtered.map((entry) => (
            <button
              key={entry.id}
              onClick={() => startConversation(entry)}
              style={styles.card}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
            >
              <div style={styles.cardLabel}>{pt ? entry.labelPt : entry.label}</div>
              <div style={styles.cardDesc}>{pt ? entry.descriptionPt : entry.description}</div>
            </button>
          ))}
        </div>

        <div style={styles.browseHint}>
          {pt ? "Não sabe por onde começar?" : "Not sure where to start?"}{" "}
          <button onClick={() => router.push("/chat?type=browse")} style={styles.browseLink}>
            {pt ? "Ver o mapa completo →" : "Browse the full map →"}
          </button>
        </div>
      </section>

      {/* Pricing */}
      <section style={styles.pricingSection}>
        <h2 style={styles.pricingTitle}>
          {pt ? "Planos" : "Plans"}
        </h2>
        <p style={styles.pricingSubtitle}>
          {pt
            ? "Uma conversa gratuita para ver como funciona. Assine para ir mais fundo."
            : "One free conversation to see how it works. Upgrade to go as deep as you need."
          }
        </p>

        <div style={styles.pricingGrid}>
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              style={{
                ...styles.pricingCard,
                ...(plan.featured ? styles.pricingCardFeatured : {}),
              }}
            >
              <div style={styles.pricingCardTop}>
                <div style={styles.planName}>{pt ? plan.labelPt : plan.label}</div>
                {plan.badge && (
                  <div
                    style={{
                      ...styles.badge,
                      background: plan.badgeColor || "var(--surface)",
                      color: plan.badgeColor ? "#000" : "var(--accent)",
                      border: plan.badgeColor ? "none" : "1px solid var(--accent)",
                    }}
                  >
                    {pt ? plan.badgePt : plan.badge}
                  </div>
                )}
              </div>
              <div style={styles.priceRow}>
                <span style={styles.price}>{plan.price}</span>
                {plan.period && (
                  <span style={styles.period}>{pt && plan.periodPt ? plan.periodPt : plan.period}</span>
                )}
              </div>
              <p style={styles.planDesc}>{pt ? plan.descriptionPt : plan.description}</p>
              <button
                onClick={() => handlePlan(plan)}
                disabled={planLoading === plan.id}
                style={{
                  ...styles.planCta,
                  ...(plan.featured ? styles.planCtaFeatured : {}),
                }}
              >
                {planLoading === plan.id ? "..." : (pt ? plan.ctaPt : plan.cta)}
              </button>
            </div>
          ))}
        </div>

        <p style={styles.pricingNote}>
          {pt
            ? "Já assina o SmartLog anual ou vitalício? Você já tem acesso — entre com a mesma conta."
            : "Already on SmartLog yearly or lifetime? You already have access — sign in with the same account."
          }
        </p>
      </section>

      <footer style={styles.footer}>
        <div>
          {pt ? "Por" : "By"}{" "}
          <a href="https://smartlogtrading.com/about" target="_blank">Marcos Bulcao</a>
          {" · "}{pt ? "Parte do" : "Part of"}{" "}
          <a href="https://app.smartlogtrading.com" target="_blank">SmartLog</a>
        </div>
        <div>
          <a href="https://smartlogtrading.com/privacy" target="_blank">
            {pt ? "Privacidade" : "Privacy"}
          </a>
          {" · "}
          <a href="https://smartlogtrading.com/terms" target="_blank">
            {pt ? "Termos" : "Terms"}
          </a>
        </div>
      </footer>
    </main>
  );
}

const styles = {
  main: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    maxWidth: "900px",
    margin: "0 auto",
    padding: "0 24px",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 0",
    borderBottom: "1px solid var(--border)",
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  menuBtn: {
    background: "none",
    border: "none",
    color: "var(--muted)",
    fontSize: "18px",
    cursor: "pointer",
    padding: "0 4px",
    lineHeight: 1,
  },
  logo: {
    fontSize: "15px",
    fontWeight: 600,
    color: "var(--text)",
    letterSpacing: "0.02em",
  },
  langRow: {
    display: "flex",
    gap: "4px",
  },
  langBtn: {
    background: "transparent",
    border: "1px solid var(--border)",
    borderRadius: "6px",
    padding: "4px 10px",
    color: "var(--muted)",
    fontSize: "11px",
    fontWeight: 700,
    cursor: "pointer",
    letterSpacing: "0.04em",
  },
  langBtnActive: {
    background: "var(--accent)",
    color: "#000",
    borderColor: "var(--accent)",
  },
  signInBtn: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: "8px",
    padding: "7px 16px",
    color: "var(--text)",
    fontSize: "13px",
    fontWeight: 600,
    textDecoration: "none",
    cursor: "pointer",
  },
  continueBtn: {
    background: "var(--accent)",
    border: "none",
    borderRadius: "8px",
    padding: "7px 16px",
    color: "#000",
    fontSize: "13px",
    fontWeight: 700,
    textDecoration: "none",
    cursor: "pointer",
  },
  hero: {
    padding: "56px 0 36px",
  },
  eyebrow: {
    fontSize: "12px",
    color: "var(--accent)",
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    marginBottom: "14px",
  },
  headline: {
    fontSize: "clamp(22px, 4vw, 38px)",
    fontWeight: 700,
    lineHeight: 1.2,
    marginBottom: "18px",
    color: "var(--text)",
  },
  accentText: {
    color: "var(--accent)",
  },
  subhead: {
    fontSize: "16px",
    color: "var(--muted)",
    maxWidth: "540px",
    lineHeight: 1.6,
  },
  entries: {
    paddingBottom: "48px",
  },
  filterRow: {
    display: "flex",
    gap: "8px",
    marginBottom: "24px",
    flexWrap: "wrap",
  },
  filterBtn: {
    padding: "6px 14px",
    borderRadius: "20px",
    border: "1px solid var(--border)",
    background: "transparent",
    color: "var(--muted)",
    fontSize: "13px",
    cursor: "pointer",
  },
  filterBtnActive: {
    background: "var(--accent)",
    color: "#000",
    borderColor: "var(--accent)",
    fontWeight: 600,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
    gap: "12px",
    marginBottom: "28px",
  },
  card: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: "10px",
    padding: "20px",
    textAlign: "left",
    transition: "border-color 0.15s",
    cursor: "pointer",
  },
  cardLabel: {
    fontSize: "15px",
    fontWeight: 600,
    color: "var(--text)",
    marginBottom: "8px",
  },
  cardDesc: {
    fontSize: "13px",
    color: "var(--muted)",
    lineHeight: 1.5,
  },
  browseHint: {
    color: "var(--muted)",
    fontSize: "14px",
    textAlign: "center",
  },
  browseLink: {
    background: "none",
    border: "none",
    color: "var(--accent)",
    fontSize: "14px",
    cursor: "pointer",
    padding: 0,
  },
  pricingSection: {
    paddingBottom: "60px",
    borderTop: "1px solid var(--border)",
    paddingTop: "48px",
  },
  pricingTitle: {
    fontSize: "24px",
    fontWeight: 700,
    marginBottom: "8px",
    textAlign: "center",
  },
  pricingSubtitle: {
    color: "var(--muted)",
    fontSize: "15px",
    textAlign: "center",
    marginBottom: "32px",
  },
  pricingGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "14px",
    marginBottom: "24px",
  },
  pricingCard: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: "14px",
    padding: "24px",
  },
  pricingCardFeatured: {
    border: "1px solid var(--accent)",
  },
  pricingCardTop: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "14px",
  },
  planName: {
    fontSize: "15px",
    fontWeight: 600,
  },
  badge: {
    fontSize: "10px",
    fontWeight: 700,
    padding: "2px 7px",
    borderRadius: "20px",
    letterSpacing: "0.04em",
  },
  priceRow: {
    display: "flex",
    alignItems: "baseline",
    gap: "4px",
    marginBottom: "10px",
  },
  price: {
    fontSize: "28px",
    fontWeight: 700,
    color: "var(--text)",
  },
  period: {
    fontSize: "13px",
    color: "var(--muted)",
  },
  planDesc: {
    fontSize: "12px",
    color: "var(--muted)",
    lineHeight: 1.6,
    marginBottom: "20px",
  },
  planCta: {
    width: "100%",
    padding: "10px",
    background: "transparent",
    border: "1px solid var(--accent)",
    color: "var(--accent)",
    borderRadius: "8px",
    fontWeight: 600,
    fontSize: "13px",
    cursor: "pointer",
  },
  planCtaFeatured: {
    background: "var(--accent)",
    color: "#000",
    border: "none",
  },
  pricingNote: {
    textAlign: "center",
    color: "var(--muted)",
    fontSize: "12px",
    lineHeight: 1.6,
  },
  footer: {
    display: "flex",
    justifyContent: "space-between",
    padding: "20px 0",
    borderTop: "1px solid var(--border)",
    color: "var(--muted)",
    fontSize: "13px",
    flexWrap: "wrap",
    gap: "8px",
  },
};
