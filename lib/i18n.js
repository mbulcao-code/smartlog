export const translations = {
  en: {
    // Hero
    heroTagline: "Stop Guessing. Start Measuring.",
    heroP1: "Emotion is not the enemy. It's uncertainty — and the urgency it creates. When your brain doesn't have enough information to act with confidence, it defaults to impulse: FOMO, hesitation, revenge trades, early exits. Different names, same root. Rules don't fix this. Discipline doesn't fix this.",
    heroP2: "What fixes it is structured decisions — precise enough to repeat, compare, and learn from. SmartLog guides you to find exactly what varies in your trading and turns that variation into a testable experiment. Not feel. Data.",
    heroCta: "Your first structured decision is free. No credit card required.",
    heroCtaButton: "Choose your pattern →",

    // Pricing
    pricingTitle: "Simple, transparent pricing.",
    planFreeTitle: "Free",
    planFreePrice: "$0",
    planFreePer: "forever",
    planFreeF1: "1 complete session",
    planFreeF2: "Full experiment setup",
    planFreeF3: "Trade logging",
    planFreeCta: "Choose your pattern →",
    planMonthlyTitle: "Monthly",
    planMonthlyPrice: "$19",
    planMonthlyPer: "per month",
    planYearlyTitle: "Yearly",
    planYearlyPrice: "$159",
    planYearlyPer: "per year · $13.25/mo",
    planYearlyBadge: "Best value — 30% off",
    planF1: "Unlimited sessions",
    planF2: "Unlimited trade logging",
    planF3: "Conversation history",
    planCta: "Get started →",

    // Home pain selection
    homeTitle: "What's been bothering you lately?",
    homeSubtitle: "Pick the pattern that feels most familiar right now.",
    homeCta: "Let's look at this together →",

    // Pain options
    pains: [
      { id: "fomo", title: "FOMO / Early Entry", description: "I jump in before my setup is complete — afraid to miss the move." },
      { id: "late", title: "Hesitation / Late Entry", description: "I wait too long and enter after the move has already happened." },
      { id: "exit", title: "Early Exit", description: "I close trades too soon and watch them go where I expected." },
      { id: "revenge", title: "Revenge / Overtrading", description: "After a loss I trade more, bigger, or differently than planned." },
      { id: "stoploss", title: "Stop Loss Tampering", description: "I move or remove my stop loss when price gets close." },
      { id: "boredom", title: "Boredom / Forcing Trades", description: "When nothing happens I manufacture reasons to trade." },
      { id: "other", title: "Something else", description: "I have a different pattern I want to work on." },
    ],

    // Pain labels (short, for header)
    painLabels: {
      fomo: "FOMO / Early Entry",
      late: "Hesitation / Late Entry",
      exit: "Early Exit",
      revenge: "Revenge / Overtrading",
      stoploss: "Stop Loss Tampering",
      boredom: "Boredom / Forcing Trades",
      other: "Other pattern",
    },

    // Conversation page
    inputPlaceholder: "Write your answer here...",
    inputHint: "Enter to send · Shift+Enter for new line",
    backButton: "← Back",
    setupDefinedLabel: "Setup defined",
    startLogging: "Start logging →",
    variantA: "Variant A",
    variantB: "Variant B",
    openingMessage: (painLabel) =>
      `I hear you — ${painLabel.toLowerCase()} is one of the patterns that shows up most often, and one of the most misunderstood.\n\nBefore we try to fix anything, I want to understand what's actually happening for you.\n\nTell me: when this happens, what does it look like? Walk me through a recent example.`,
    openingMessageOther:
      "Something in your trading has been bothering you — and you know it well enough to want to look at it.\n\nBefore we try to fix anything, I want to understand what's actually happening.\n\nTell me: what's going on? Walk me through what happens.",

    // Log page
    yourExperiment: "Your experiment",
    targetsHit: "targets hit",
    logATrade: "+ Log a trade",
    whichVariant: "Which variant did you take?",
    hitTarget: "Did it hit target?",
    yes: "✓ Yes",
    no: "✗ No",
    cancel: "Cancel",
    tradeHistory: "Trade history",
    hit: "Alvo? Sim",
    miss: "Alvo? Não",
    noTradesYet: "No trades logged yet. Come back after your next session.",
    loadingExperiment: "Loading your experiment...",
    experimentNotFound: "Experiment not found.",
    checkLink: "Check your link or start a new session.",
    upgradeToLog: "Upgrade to start logging your trades.",
    upgradeCta: "View plans →",

    // Dashboard
    yourExperiments: "Your experiments",
    openLog: "Open log →",
    trades: "trades",
    freeLocked: "You've used your free session. Upgrade for unlimited conversations and logs.",
    upgradeToContinue: "Upgrade to continue →",
    newSession: "Start a new session",

    // Language toggle
    langLabel: "PT",
  },

  pt: {
    // Hero
    heroTagline: "Pare de adivinhar. Comece a medir.",
    heroP1: "Emoção não é o problema. É a incerteza — e a urgência que ela cria. Quando seu cérebro não tem informação suficiente para agir com confiança, ele recorre ao impulso: FOMO, hesitação, vingança, saída prematura. Nomes diferentes, mesma raiz. Regras não resolvem isso. Disciplina não resolve isso.",
    heroP2: "O que resolve são decisões estruturadas — precisas o suficiente para repetir, comparar e aprender. O SmartLog te guia para encontrar exatamente o que varia nas suas decisões e transforma essa variação em um experimento testável. Não sensação. Dados.",
    heroCta: "Sua primeira decisão estruturada é gratuita. Sem cartão de crédito.",
    heroCtaButton: "Escolha seu padrão →",

    // Pricing
    pricingTitle: "Preços simples e transparentes.",
    planFreeTitle: "Gratuito",
    planFreePrice: "$0",
    planFreePer: "para sempre",
    planFreeF1: "1 sessão completa",
    planFreeF2: "Definição completa do experimento",
    planFreeF3: "Registro de operações",
    planFreeCta: "Escolha seu padrão →",
    planMonthlyTitle: "Mensal",
    planMonthlyPrice: "$19",
    planMonthlyPer: "por mês",
    planYearlyTitle: "Anual",
    planYearlyPrice: "$159",
    planYearlyPer: "por ano · $13,25/mês",
    planYearlyBadge: "Melhor valor — 30% off",
    planF1: "Sessões ilimitadas",
    planF2: "Registro ilimitado de operações",
    planF3: "Histórico de conversas",
    planCta: "Começar →",

    // Home pain selection
    homeTitle: "O que tem te incomodado ultimamente?",
    homeSubtitle: "Escolha o padrão que mais se encaixa para você agora.",
    homeCta: "Vamos entender isso juntos →",

    // Pain options
    pains: [
      { id: "fomo", title: "FOMO / Entrada Antecipada", description: "Entro antes do setup estar completo — com medo de perder o movimento." },
      { id: "late", title: "Hesitação / Entrada Tardia", description: "Espero demais e entro depois que o movimento já aconteceu." },
      { id: "exit", title: "Saída Prematura", description: "Fecho operações cedo demais e vejo o mercado ir onde eu esperava." },
      { id: "revenge", title: "Vingança / Excesso de Operações", description: "Após um prejuízo, opero mais, maior ou diferente do que o planejado." },
      { id: "stoploss", title: "Mexendo no Stop Loss", description: "Movo ou removo meu stop quando o preço se aproxima." },
      { id: "boredom", title: "Tédio / Forçando Operações", description: "Quando nada acontece, crio razões para entrar no mercado." },
      { id: "other", title: "Outro padrão", description: "Tenho um padrão diferente que quero trabalhar." },
    ],

    // Pain labels (short, for header)
    painLabels: {
      fomo: "FOMO / Entrada Antecipada",
      late: "Hesitação / Entrada Tardia",
      exit: "Saída Prematura",
      revenge: "Vingança / Excesso de Operações",
      stoploss: "Mexendo no Stop Loss",
      boredom: "Tédio / Forçando Operações",
      other: "Outro padrão",
    },

    // Conversation page
    inputPlaceholder: "Escreva sua resposta aqui...",
    inputHint: "Enter para enviar · Shift+Enter para nova linha",
    backButton: "← Voltar",
    setupDefinedLabel: "Setup definido",
    startLogging: "Começar a registrar →",
    variantA: "Variante A",
    variantB: "Variante B",
    openingMessage: (painLabel) =>
      `Entendo — ${painLabel.toLowerCase()} é um dos padrões que aparecem com mais frequência, e um dos mais mal compreendidos.\n\nAntes de tentar resolver qualquer coisa, quero entender o que está realmente acontecendo com você.\n\nMe conte: quando isso acontece, como é? Me dê um exemplo recente.`,
    openingMessageOther:
      "Alguma coisa no seu trading está te incomodando — e você conhece bem o suficiente para querer olhar de perto.\n\nAntes de tentar resolver qualquer coisa, quero entender o que está realmente acontecendo.\n\nMe conta: o que está acontecendo? Me descreve o que acontece.",

    // Log page
    yourExperiment: "Seu experimento",
    targetsHit: "alvos atingidos",
    logATrade: "+ Registrar operação",
    whichVariant: "Qual variante você usou?",
    hitTarget: "Atingiu o alvo?",
    yes: "✓ Sim",
    no: "✗ Não",
    cancel: "Cancelar",
    tradeHistory: "Histórico de operações",
    hit: "Alvo? Sim",
    miss: "Alvo? Não",
    noTradesYet: "Nenhuma operação registrada ainda. Volte após a próxima sessão.",
    loadingExperiment: "Carregando seu experimento...",
    experimentNotFound: "Experimento não encontrado.",
    checkLink: "Verifique seu link ou inicie uma nova sessão.",
    upgradeToLog: "Faça upgrade para começar a registrar suas operações.",
    upgradeCta: "Ver planos →",

    // Dashboard
    yourExperiments: "Seus experimentos",
    openLog: "Abrir log →",
    trades: "registros",
    freeLocked: "Você usou sua sessão gratuita. Faça upgrade para conversas e logs ilimitados.",
    upgradeToContinue: "Fazer upgrade para continuar →",
    newSession: "Iniciar nova sessão",

    // Language toggle
    langLabel: "EN",
  },
};

export function t(lang, key) {
  return translations[lang]?.[key] ?? translations["en"][key];
}

export function getLang() {
  if (typeof window === "undefined") return "en";
  return localStorage.getItem("smartlog_lang") || "en";
}

export function setLang(lang) {
  if (typeof window !== "undefined") {
    localStorage.setItem("smartlog_lang", lang);
  }
}
