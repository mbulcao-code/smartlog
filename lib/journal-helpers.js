// ── New data-shape constants (v2 form) ────────────────────────────────────────

export const ENTRY_TYPE_LABELS = {
  full_setup:          { en: "Full setup",                    pt: "Setup completo"               },
  early:               { en: "Early entry (FOMO)",            pt: "Entrada antecipada (FOMO)"    },
  hesitation_better:   { en: "Hesitation — better price",     pt: "Hesitação — preço melhor"     },
  hesitation_worse:    { en: "Hesitation — worse price",      pt: "Hesitação — preço pior"       },
  chase_profit:        { en: "Chased — profit",               pt: "Perseguiu — lucro"            },
  chase_loss:          { en: "Chased — loss",                 pt: "Perseguiu — perda"            },
  random:              { en: "Random trade",                  pt: "Operação aleatória"           },
};

export const STOP_OUTCOME_LABELS = {
  not_hit:             { en: "Not hit",                                     pt: "Não ativado"                          },
  changed_worse:       { en: "Changed → worse loss",                        pt: "Alterado → perda maior"               },
  changed_smaller:     { en: "Changed → smaller loss",                      pt: "Alterado → perda menor"               },
  changed_profit:      { en: "Changed → turned to profit",                  pt: "Alterado → virou lucro"               },
  respected_protected: { en: "Respected — protected from worse",            pt: "Respeitado — protegeu de pior perda"  },
  respected_reversal:  { en: "Respected — price reversed (painful)",        pt: "Respeitado — preço reverteu (doloroso)" },
  panic:               { en: "Panic exit — closed manually",                pt: "Saída por pânico — fechei manualmente" },
};

export const TARGET_OUTCOME_LABELS = {
  not_hit:        { en: "Target not hit — price never reached it", pt: "Alvo não atingido — preço não chegou lá"    },
  early_not_hit:  { en: "Early exit — target not hit after",       pt: "Saída prematura — alvo não atingido depois" },
  early_hit:      { en: "Early exit — target was hit after",       pt: "Saída prematura — alvo atingido depois"     },
  last_optimal:   { en: "Last target hit — optimal exit",          pt: "Último alvo atingido — saída ótima"         },
  last_kept_going:{ en: "Last target hit — price kept going",      pt: "Último alvo atingido — preço continuou"     },
};

export const OTHER_ISSUE_LABELS = {
  revenge:      { en: "Revenge trade",          pt: "Vingança"              },
  overtrading:  { en: "Overtrading",            pt: "Excesso de operações"  },
  oversizing:   { en: "Oversizing",             pt: "Tamanho excessivo"     },
};

// ── Legacy constants (kept for backward-compat display of old trades) ──────────

export const PAINS = [
  { id: "fomo_early",     en: "FOMO / Early entry",         pt: "FOMO / Entrada antecipada"   },
  { id: "hesitation",     en: "Hesitation",                  pt: "Hesitação"                   },
  { id: "stop_tampering", en: "Stop tampering",              pt: "Mexendo no stop"             },
  { id: "early_exit",     en: "Early exit",                  pt: "Saída prematura"             },
  { id: "other",          en: "Other (revenge / overtrade)", pt: "Outro (vingança / excessos)" },
  { id: "clean",          en: "✓ Clean trade",               pt: "✓ Operação limpa"            },
];

// Legacy behavioral question trees — kept for backward compat display of old trades.
// New trades use the structured after_trade fields above.

export function getNextQuestion(painType, behavior) {
  switch (painType) {
    case "fomo_early":
      if (!("entry_type" in behavior)) {
        return { key: "entry_type", question: { en: "Did you wait for your level or enter early?", pt: "Você esperou seu nível ou entrou antes?" },
          options: [{ value: "waited", en: "Waited for my level", pt: "Esperei o nível" }, { value: "early", en: "Entered early", pt: "Entrei antes" }] };
      }
      if (behavior.entry_type === "early" && !("level_reached" in behavior)) {
        return { key: "level_reached", question: { en: "Did your level also get hit afterward?", pt: "O seu nível também foi atingido depois?" },
          options: [{ value: true, en: "Yes", pt: "Sim" }, { value: false, en: "No", pt: "Não" }] };
      }
      return null;
    case "stop_tampering":
      if (!("tamper_result" in behavior)) {
        return { key: "tamper_result", question: { en: "What was the result of moving your stop?", pt: "Qual foi o resultado de mover seu stop?" },
          options: [{ value: "bigger_loss", en: "Bigger loss", pt: "Perda maior" }, { value: "lesser_loss", en: "Smaller loss", pt: "Perda menor" }, { value: "profit", en: "Profit", pt: "Lucro" }] };
      }
      return null;
    case "early_exit":
      if (!("target_hit_after" in behavior)) {
        return { key: "target_hit_after", question: { en: "Did price reach your target after you exited?", pt: "O preço atingiu seu alvo depois que você saiu?" },
          options: [{ value: true, en: "Yes", pt: "Sim" }, { value: false, en: "No", pt: "Não" }] };
      }
      return null;
    default:
      return null;
  }
}

export function getNextAfterTradeQuestion() { return null; } // deprecated — new wizard handles this internally
