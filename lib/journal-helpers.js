// ── Pain definitions ──────────────────────────────────────────────────────────

export const PAINS = [
  { id: "fomo_early",     en: "FOMO / Early entry",         pt: "FOMO / Entrada antecipada"   },
  { id: "hesitation",     en: "Hesitation",                  pt: "Hesitação"                   },
  { id: "stop_tampering", en: "Stop tampering",              pt: "Mexendo no stop"             },
  { id: "early_exit",     en: "Early exit",                  pt: "Saída prematura"             },
  { id: "other",          en: "Other (revenge / overtrade)", pt: "Outro (vingança / excessos)" },
  { id: "clean",          en: "✓ Clean trade",               pt: "✓ Operação limpa"            },
];

// ── Behavioral question tree ──────────────────────────────────────────────────
// Returns the next question given painType + answers so far, or null when done.

export function getNextQuestion(painType, behavior) {
  switch (painType) {

    case "fomo_early":
      if (!("entry_type" in behavior)) {
        return {
          key: "entry_type",
          question: {
            en: "Did you wait for your level or enter early?",
            pt: "Você esperou seu nível ou entrou antes?",
          },
          options: [
            { value: "waited", en: "Waited for my level / conditions", pt: "Esperei o nível / condições" },
            { value: "early",  en: "Entered early",                    pt: "Entrei antes"                },
          ],
        };
      }
      if (behavior.entry_type === "early" && !("level_reached" in behavior)) {
        return {
          key: "level_reached",
          question: {
            en: "Did your level also get hit afterward?",
            pt: "O seu nível também foi atingido depois?",
          },
          options: [
            { value: true,  en: "Yes — level was hit",        pt: "Sim — nível foi atingido" },
            { value: false, en: "No — price didn't reach it", pt: "Não — preço não chegou"   },
          ],
        };
      }
      return null;

    case "hesitation":
      if (!("setup_type" in behavior)) {
        return {
          key: "setup_type",
          question: {
            en: "Was this a predefined setup or a random trade?",
            pt: "Era um setup predefinido ou uma operação aleatória?",
          },
          options: [
            { value: "predefined", en: "Predefined setup", pt: "Setup predefinido"  },
            { value: "random",     en: "Random trade",     pt: "Operação aleatória" },
          ],
        };
      }
      if (!("entry" in behavior)) {
        return {
          key: "entry",
          question: {
            en: "Did you end up entering the trade?",
            pt: "Você acabou entrando na operação?",
          },
          options: [
            { value: "didnt_enter", en: "No — I didn't enter",    pt: "Não — não entrei"         },
            { value: "entered",     en: "Yes — I entered anyway",  pt: "Sim — entrei mesmo assim" },
          ],
        };
      }
      if (behavior.entry === "didnt_enter" && !("no_entry_outcome" in behavior)) {
        return {
          key: "no_entry_outcome",
          question: {
            en: "What happened after you didn't enter?",
            pt: "O que aconteceu depois que você não entrou?",
          },
          options: [
            { value: "missed",  en: "Missed opportunity — price went my way", pt: "Perdi a oportunidade — preço foi a meu favor" },
            { value: "averted", en: "Loss averted — price went against",      pt: "Perda evitada — preço foi contra"             },
          ],
        };
      }
      if (behavior.entry === "entered" && !("entry_price_quality" in behavior)) {
        return {
          key: "entry_price_quality",
          question: {
            en: "How was your entry price vs. your original level?",
            pt: "Como foi o seu preço de entrada em relação ao nível original?",
          },
          options: [
            { value: "worse",  en: "Worse price — hurt R:R", pt: "Preço pior — prejudicou R:R" },
            { value: "better", en: "Better price",           pt: "Preço melhor"                },
          ],
        };
      }
      return null;

    case "stop_tampering":
      // "Didn't change" path covered by after-trade questions.
      // Selecting this pain implies the trader already knows they changed the stop.
      if (!("tamper_result" in behavior)) {
        return {
          key: "tamper_result",
          question: {
            en: "What was the result of moving your stop?",
            pt: "Qual foi o resultado de mover seu stop?",
          },
          options: [
            { value: "bigger_loss", en: "Bigger loss than planned",       pt: "Perda maior do que o planejado" },
            { value: "lesser_loss", en: "Smaller loss than it would have", pt: "Perda menor do que seria"      },
            { value: "profit",      en: "Turned into a profit",           pt: "Virou lucro"                   },
          ],
        };
      }
      return null;

    case "early_exit":
      if (!("target_hit_after" in behavior)) {
        return {
          key: "target_hit_after",
          question: {
            en: "Did price reach your original target after you exited?",
            pt: "O preço atingiu seu alvo original depois que você saiu?",
          },
          options: [
            { value: true,  en: "Yes — target was hit", pt: "Sim — alvo foi atingido" },
            { value: false, en: "No — it didn't",       pt: "Não — não foi"           },
          ],
        };
      }
      return null;

    case "other":
      if (!("sub_type" in behavior)) {
        return {
          key: "sub_type",
          question: {
            en: "What best describes it?",
            pt: "O que melhor descreve?",
          },
          options: [
            { value: "revenge",     en: "Revenge — trying to make money back", pt: "Vingança — tentando recuperar"  },
            { value: "overtrading", en: "Overtrading — too many trades",        pt: "Excesso de operações"           },
            { value: "oversizing",  en: "Oversizing — too large a position",    pt: "Tamanho excessivo de posição"   },
          ],
        };
      }
      return null;

    case "clean":
    default:
      return null;
  }
}

// ── After-trade question flow ─────────────────────────────────────────────────
// Universal questions logged for EVERY trade regardless of pain type.
// Returns the next question given answers so far, or null when done.

export function getNextAfterTradeQuestion(afterTrade) {

  if (!("stop_outcome" in afterTrade)) {
    return {
      key: "stop_outcome",
      question: {
        en: "What happened with your stop?",
        pt: "O que aconteceu com seu stop?",
      },
      options: [
        { value: "no",        en: "Stop not hit",                           pt: "Stop não ativado"                         },
        { value: "protected", en: "Stop hit — protected from bigger loss",  pt: "Stop ativado — protegeu de perda maior"   },
        { value: "reversal",  en: "Stop hit — price reversed (painful)",    pt: "Stop ativado — preço reverteu (doloroso)" },
        { value: "panic",     en: "Panic exit — closed manually",           pt: "Saída por pânico — fechei manualmente"    },
      ],
    };
  }

  if (!("target_outcome" in afterTrade)) {
    return {
      key: "target_outcome",
      question: {
        en: "What happened with your target?",
        pt: "O que aconteceu com seu alvo?",
      },
      options: [
        { value: "not_hit_offside_stop", en: "Never onside — went against and stopped",  pt: "Nunca favorável — foi contra e stopou"          },
        { value: "not_hit_onside_be",    en: "Onside, then came back to breakeven",      pt: "Favorável, depois voltou ao ponto de entrada"   },
        { value: "not_hit_onside_stop",  en: "Onside, then reversed and stopped",        pt: "Favorável, depois reverteu e stopou"            },
        { value: "hit_optimal",          en: "Target hit — optimal exit",                pt: "Alvo atingido — saída ótima"                    },
        { value: "hit_left_money",       en: "Target hit — price kept going after",      pt: "Alvo atingido — preço continuou depois"         },
      ],
    };
  }

  if (!("setup_type" in afterTrade)) {
    return {
      key: "setup_type",
      question: {
        en: "How would you classify this setup?",
        pt: "Como você classificaria esse setup?",
      },
      options: [
        { value: "repeatable",         en: "Repeatable tested setup",    pt: "Setup testado e repetível" },
        { value: "planned_not_repeat", en: "Planned but not repeatable", pt: "Planejado mas não repetível" },
        { value: "random",             en: "Random — no clear setup",    pt: "Aleatório — sem setup claro" },
      ],
    };
  }

  if (!("plan_deviation" in afterTrade)) {
    return {
      key: "plan_deviation",
      question: {
        en: "Did you deviate from your plan?",
        pt: "Você desviou do seu plano?",
      },
      options: [
        { value: "no_followed",  en: "No — followed the plan",        pt: "Não — segui o plano"             },
        { value: "yes_better",   en: "Yes — and got a better result", pt: "Sim — e obtive resultado melhor" },
        { value: "yes_worse",    en: "Yes — and got a worse result",  pt: "Sim — e obtive resultado pior"   },
        { value: "no_plan",      en: "No plan — random trade",        pt: "Sem plano — operação aleatória"  },
      ],
    };
  }

  return null;
}
