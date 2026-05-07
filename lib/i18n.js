export const translations = {
  en: {
    // Home
    homeTitle: "What's been bothering you lately?",
    homeSubtitle: "Pick the pattern that feels most familiar right now.",
    homeCta: "Let's look at this together →",

    // Pain options
    pains: [
      {
        id: "fomo",
        title: "FOMO / Early Entry",
        description:
          "I jump in before my setup is complete — afraid to miss the move.",
      },
      {
        id: "late",
        title: "Hesitation / Late Entry",
        description:
          "I wait too long and enter after the move has already happened.",
      },
      {
        id: "exit",
        title: "Early Exit",
        description:
          "I close trades too soon and watch them go where I expected.",
      },
      {
        id: "revenge",
        title: "Revenge / Overtrading",
        description:
          "After a loss I trade more, bigger, or differently than planned.",
      },
      {
        id: "stoploss",
        title: "Stop Loss Tampering",
        description: "I move or remove my stop loss when price gets close.",
      },
      {
        id: "boredom",
        title: "Boredom / Forcing Trades",
        description:
          "When nothing happens I manufacture reasons to trade.",
      },
    ],

    // Pain labels (short, for header)
    painLabels: {
      fomo: "FOMO / Early Entry",
      late: "Hesitation / Late Entry",
      exit: "Early Exit",
      revenge: "Revenge / Overtrading",
      stoploss: "Stop Loss Tampering",
      boredom: "Boredom / Forcing Trades",
    },

    // Conversation page
    namePrompt: "Before we start — what's your name?",
    namePlaceholder: "Your first name",
    nameStart: "Start →",
    inputPlaceholder: "Write your answer here...",
    inputHint: "Enter to send · Shift+Enter for new line",
    backButton: "← Back",
    setupDefinedLabel: "Setup defined",
    startLogging: "Start logging →",
    variantA: "Variant A",
    variantB: "Variant B",
    openingMessage: (painLabel) =>
      `I hear you — ${painLabel.toLowerCase()} is one of the patterns that shows up most often, and one of the most misunderstood.\n\nBefore we try to fix anything, I want to understand what's actually happening for you.\n\nTell me: when this happens, what does it look like? Walk me through a recent example.`,

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
    hit: "✓ Hit",
    miss: "✗ Miss",
    noTradesYet:
      "No trades logged yet. Come back after your next session.",
    loadingExperiment: "Loading your experiment...",
    experimentNotFound: "Experiment not found.",
    checkLink: "Check your link or start a new session.",

    // Language toggle
    langLabel: "PT",
  },

  pt: {
    // Home
    homeTitle: "O que tem te incomodado ultimamente?",
    homeSubtitle: "Escolha o padrão que mais se encaixa para você agora.",
    homeCta: "Vamos entender isso juntos →",

    // Pain options
    pains: [
      {
        id: "fomo",
        title: "FOMO / Entrada Antecipada",
        description:
          "Entro antes do setup estar completo — com medo de perder o movimento.",
      },
      {
        id: "late",
        title: "Hesitação / Entrada Tardia",
        description:
          "Espero demais e entro depois que o movimento já aconteceu.",
      },
      {
        id: "exit",
        title: "Saída Prematura",
        description:
          "Fecho operações cedo demais e vejo o mercado ir onde eu esperava.",
      },
      {
        id: "revenge",
        title: "Vingança / Excesso de Operações",
        description:
          "Após um prejuízo, opero mais, maior ou diferente do que o planejado.",
      },
      {
        id: "stoploss",
        title: "Mexendo no Stop Loss",
        description:
          "Movo ou removo meu stop quando o preço se aproxima.",
      },
      {
        id: "boredom",
        title: "Tédio / Forçando Operações",
        description:
          "Quando nada acontece, crio razões para entrar no mercado.",
      },
    ],

    // Pain labels (short, for header)
    painLabels: {
      fomo: "FOMO / Entrada Antecipada",
      late: "Hesitação / Entrada Tardia",
      exit: "Saída Prematura",
      revenge: "Vingança / Excesso de Operações",
      stoploss: "Mexendo no Stop Loss",
      boredom: "Tédio / Forçando Operações",
    },

    // Conversation page
    namePrompt: "Antes de começar — qual é o seu nome?",
    namePlaceholder: "Seu primeiro nome",
    nameStart: "Começar →",
    inputPlaceholder: "Escreva sua resposta aqui...",
    inputHint: "Enter para enviar · Shift+Enter para nova linha",
    backButton: "← Voltar",
    setupDefinedLabel: "Setup definido",
    startLogging: "Começar a registrar →",
    variantA: "Variante A",
    variantB: "Variante B",
    openingMessage: (painLabel) =>
      `Entendo — ${painLabel.toLowerCase()} é um dos padrões que aparecem com mais frequência, e um dos mais mal compreendidos.\n\nAntes de tentar resolver qualquer coisa, quero entender o que está realmente acontecendo com você.\n\nMe conte: quando isso acontece, como é? Me dê um exemplo recente.`,

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
    hit: "✓ Atingiu",
    miss: "✗ Errou",
    noTradesYet:
      "Nenhuma operação registrada ainda. Volte após a próxima sessão.",
    loadingExperiment: "Carregando seu experimento...",
    experimentNotFound: "Experimento não encontrado.",
    checkLink: "Verifique seu link ou inicie uma nova sessão.",

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
