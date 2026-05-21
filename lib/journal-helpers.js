// ── Pain definitions ──────────────────────────────────────────────────────────

export const PAINS = [
  { id: "fomo",     en: "FOMO / Early entry",      pt: "FOMO / Entrada antecipada" },
  { id: "late",     en: "Hesitation / Late entry",  pt: "Hesitação / Entrada tardia" },
  { id: "exit",     en: "Early exit",               pt: "Saída prematura" },
  { id: "revenge",  en: "Revenge / Overtrade",      pt: "Vingança / Excessos" },
  { id: "stoploss", en: "Stop tampering",           pt: "Mexendo no stop" },
  { id: "boredom",  en: "Boredom / No setup",       pt: "Tédio / Sem setup" },
  { id: "clean",    en: "✓ Clean trade",            pt: "✓ Operação limpa" },
];

// ── Behavioral question tree ──────────────────────────────────────────────────
// Returns the next question to ask given painType + answers collected so far,
// or null when we have everything we need.

export function getNextQuestion(painType, behavior) {
  switch (painType) {
    case "fomo":
      if (!("entry_type" in behavior)) {
        return {
          key: "entry_type",
          question: {
            en: "Did you enter early or wait for your level?",
            pt: "Você entrou antes ou esperou seu nível?",
          },
          options: [
            { value: "early",  en: "Entered early",       pt: "Entrei antes" },
            { value: "waited", en: "Waited for my level", pt: "Esperei o nível" },
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
            { value: false, en: "No — price didn't reach it", pt: "Não — preço não chegou" },
          ],
        };
      }
      return null;

    case "stoploss":
      if (!("tampered" in behavior)) {
        return {
          key: "tampered",
          question: {
            en: "Did you move or remove your stop?",
            pt: "Você moveu ou removeu seu stop?",
          },
          options: [
            { value: true,  en: "Yes, I moved it", pt: "Sim, mexi nele" },
            { value: false, en: "No, I kept it",   pt: "Não, mantive" },
          ],
        };
      }
      if (behavior.tampered === true && !("tamper_outcome" in behavior)) {
        return {
          key: "tamper_outcome",
          question: {
            en: "What happened after you moved it?",
            pt: "O que aconteceu depois que você mexeu?",
          },
          options: [
            { value: "reversal",   en: "Stop hit → price reversed afterward (painful)",       pt: "Stop ativado → preço reverteu depois (doloroso)" },
            { value: "protection", en: "Stop hit → protected me from a bigger loss",           pt: "Stop ativado → me protegeu de uma perda maior" },
            { value: "still_open", en: "Stop not hit — trade still running",                   pt: "Stop não ativado — operação ainda aberta" },
          ],
        };
      }
      return null;

    case "revenge":
      if (!("used_best_setup" in behavior)) {
        return {
          key: "used_best_setup",
          question: {
            en: "Did you use your most tested setup?",
            pt: "Você usou seu setup mais testado?",
          },
          options: [
            { value: true,  en: "Yes — my best setup",  pt: "Sim — meu melhor setup" },
            { value: false, en: "No — different setup", pt: "Não — setup diferente" },
          ],
        };
      }
      return null;

    case "exit":
      if (!("target_hit_after" in behavior)) {
        return {
          key: "target_hit_after",
          question: {
            en: "Did price hit your original target after you exited?",
            pt: "O preço atingiu seu alvo original depois que você saiu?",
          },
          options: [
            { value: true,  en: "Yes — it went there", pt: "Sim — foi lá" },
            { value: false, en: "No — it didn't",      pt: "Não — não foi" },
          ],
        };
      }
      return null;

    case "late":
      if (!("outcome_type" in behavior)) {
        return {
          key: "outcome_type",
          question: {
            en: "What happened?",
            pt: "O que aconteceu?",
          },
          options: [
            { value: "missed",      en: "Missed the move entirely",     pt: "Perdi o movimento inteiro" },
            { value: "caught_late", en: "Caught it but entry hurt R:R", pt: "Peguei, mas entrada tardia prejudicou R:R" },
          ],
        };
      }
      return null;

    case "boredom":
      if (!("had_plan" in behavior)) {
        return {
          key: "had_plan",
          question: {
            en: "Was this trade in your plan?",
            pt: "Essa operação estava no seu plano?",
          },
          options: [
            { value: false, en: "No — I manufactured a reason", pt: "Não — criei um motivo" },
            { value: true,  en: "Yes — it was valid",            pt: "Sim — era válida" },
          ],
        };
      }
      return null;

    case "clean":
    default:
      return null;
  }
}
