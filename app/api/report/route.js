import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { sessionId, lang } = await request.json();

    // Fetch experiment
    const { data: exp } = await supabase
      .from("conversations")
      .select("setup_data, pain_type")
      .eq("session_id", sessionId)
      .single();

    if (!exp?.setup_data) return Response.json({ error: "Experiment not found" }, { status: 404 });

    // Fetch logs
    const { data: logs } = await supabase
      .from("trade_logs")
      .select("variant, outcome")
      .eq("session_id", sessionId);

    if (!logs || logs.length < 10) return Response.json({ error: "Not enough trades" }, { status: 400 });

    const logsA = logs.filter((l) => l.variant === "a");
    const logsB = logs.filter((l) => l.variant === "b");
    const hitsA = logsA.filter((l) => l.outcome).length;
    const hitsB = logsB.filter((l) => l.outcome).length;
    const rateA = logsA.length > 0 ? Math.round((hitsA / logsA.length) * 100) : 0;
    const rateB = logsB.length > 0 ? Math.round((hitsB / logsB.length) * 100) : 0;

    const { setup_data } = exp;
    const isFomo = exp.pain_type === "fomo";
    const isPt = lang === "pt";

    // For FOMO: Variant A metric is "level also hit" (suboptimal) vs "level not hit" (justified)
    // High level-hit rate = early entry was costly most of the time
    // Low level-hit rate = early entry was often the only way to catch the move
    const fomoPromptPt = `Você é um psicólogo de trading analisando os resultados de um experimento sobre entrada antecipada (FOMO).

EXPERIMENTO: ${setup_data.setup_name}
Descrição: ${setup_data.setup_description}

VARIANTE A — "${setup_data.variant_a_name}" (entrada antes do nível): ${setup_data.variant_a_description}
Resultado: em ${logsA.length} entradas antecipadas, o nível foi atingido depois em ${hitsA} delas (${rateA}%)

Contexto crítico para a análise:
Quando o nível É atingido após uma entrada antecipada — independente de alvo ou stop — a entrada antecipada custou algo:
- Se alvo foi atingido: o trader ganhou, mas teria tido R:R melhor esperando pelo nível (entrada melhor, stop mais perto).
- Se stop foi atingido: o trader perdeu mais do que precisava — o stop estava mais longe do nível do que estaria em uma entrada no nível.
Quando o nível NÃO é atingido: a entrada antecipada foi justificada. O preço foi direto sem tocar o nível — era a única forma de pegar o movimento.

VARIANTE B — "${setup_data.variant_b_name}" (entrada no nível): ${setup_data.variant_b_description}
Resultado: ${hitsB}/${logsB.length} alvos atingidos (${rateB}%)

Total de operações: ${logs.length}

Escreva a análise em DOIS blocos exatos. Sem títulos, sem bullet points.

BLOCO 1 — Os dados (2-3 frases):
- Comece com: "Os dados são claros:" e apresente o que os números revelam — em ${rateA}% das entradas antecipadas, o nível foi atingido depois, o que significa que esperar teria sido mais eficiente em ambos os cenários (alvo ou stop).
- Use "Ou seja," para tornar isso concreto: nas operações onde o nível também foi atingido, o trader aceitou R:R inferior nos ganhos e perdas maiores nos stops — sem necessidade. Nas operações onde o nível não foi atingido, a entrada antecipada foi a única forma de participar do movimento.
- Termine com uma frase comportamental direta: com base nesses dados, o FOMO foi necessário ou custoso na maior parte das vezes?

BLOCO 2 — Sample size e fechamento (3-4 frases):
- Comece com: "Uma observação importante: uma amostragem de ${logs.length} trades oferece uma direção — não uma certeza."
- Reforce que a resposta para o FOMO não é disciplina — é saber, com seus próprios dados, quando entrar antes vale a pena e quando não vale.
- Diga que esses trades começam a revelar esse padrão, mas que é a continuidade dos registros que vai tornar a resposta definitiva.
- Termine com: "Bom trabalho. Continue crescendo sua amostragem."

Tom: direto, preciso, sem floreios. Como um coach que respeita a inteligência do trader.`;

    const fomoPromptEn = `You are a trading psychologist analyzing the results of a FOMO (early entry) behavioral experiment.

EXPERIMENT: ${setup_data.setup_name}
Description: ${setup_data.setup_description}

VARIANT A — "${setup_data.variant_a_name}" (early entry, before the level): ${setup_data.variant_a_description}
Result: out of ${logsA.length} early entries, the level was also hit afterward in ${hitsA} of them (${rateA}%)

Critical context for your analysis:
When the level IS hit after an early entry — regardless of whether the trade won or lost — the early entry cost something:
- If target was hit: the trader won, but would have gotten better R:R by waiting for the level (better entry price, tighter stop).
- If stop was hit: the trader lost more than necessary — the stop was further from the level than it would have been on a level entry.
When the level is NOT hit afterward: the early entry was justified. Price moved directly without touching the level — it was the only way to catch the move.

VARIANT B — "${setup_data.variant_b_name}" (entry at the level): ${setup_data.variant_b_description}
Result: ${hitsB}/${logsB.length} targets hit (${rateB}%)

Total trades logged: ${logs.length}

Write the analysis in exactly TWO blocks. No titles, no bullet points.

BLOCK 1 — The data (2-3 sentences):
- Start with: "The data is clear:" and present what the numbers reveal — in ${rateA}% of early entries, the level was also hit afterward, meaning waiting would have been more efficient in both scenarios (target or stop).
- Use "In other words," to make it concrete: in the trades where the level was also hit, the trader accepted inferior R:R on winners and larger losses on stopouts — unnecessarily. In the trades where the level was never hit, the early entry was the only way to participate in the move.
- End with a direct behavioral statement: based on this data, was the FOMO necessary or costly most of the time?

BLOCK 2 — Sample size and closing (3-4 sentences):
- Start with: "An important note: a sample of ${logs.length} trades gives a direction — not a certainty."
- Reinforce that the answer to FOMO is not discipline — it's knowing, from your own data, when entering early is worth it and when it isn't.
- Say that these trades are beginning to reveal that pattern, but that continued logging is what will make the answer definitive.
- End with: "Good work. Keep growing your sample."

Tone: direct, precise, no fluff. Like a coach who respects the trader's intelligence.`;

    const standardPromptPt = `Você é um psicólogo de trading analisando os resultados de um experimento comportamental.

EXPERIMENTO: ${setup_data.setup_name}
Descrição: ${setup_data.setup_description}

VARIANTE A — "${setup_data.variant_a_name}": ${setup_data.variant_a_description}
Resultado: ${hitsA}/${logsA.length} alvos atingidos (${rateA}%)

VARIANTE B — "${setup_data.variant_b_name}": ${setup_data.variant_b_description}
Resultado: ${hitsB}/${logsB.length} alvos atingidos (${rateB}%)

Total de operações: ${logs.length}

Escreva a análise em DOIS blocos exatos. Sem títulos, sem bullet points.

BLOCO 1 — Os dados (2-3 frases):
- Comece com: "Os dados são claros:" e apresente as taxas de acerto das duas variantes.
- Em seguida use "Ou seja," e descreva o resultado em termos concretos de operações (ex: "a variante A fechou X operações com sucesso enquanto a variante B conseguiu apenas Y").
- Termine com uma frase comportamental direta: o que isso significa em termos de comportamento operacional.

BLOCO 2 — Sample size e fechamento (3-4 frases):
- Comece com: "Uma observação importante: uma amostragem de ${logs.length} trades oferece uma direção — não uma certeza."
- Reforce que confiança numa estratégia não pode ser fruto de feeling: tem que ser proporcional ao tamanho da amostragem.
- Diga que esses trades apontam com clareza para a variante com melhor resultado, mas que é a sequência de resultados que vai ampliar — ou questionar — essa confiança.
- Termine com: "Bom trabalho. Continue crescendo sua amostragem."

Tom: direto, preciso, sem floreios. Como um coach que respeita a inteligência do trader.`;

    const standardPromptEn = `You are a trading psychologist analyzing the results of a behavioral experiment.

EXPERIMENT: ${setup_data.setup_name}
Description: ${setup_data.setup_description}

VARIANT A — "${setup_data.variant_a_name}": ${setup_data.variant_a_description}
Result: ${hitsA}/${logsA.length} targets hit (${rateA}%)

VARIANT B — "${setup_data.variant_b_name}": ${setup_data.variant_b_description}
Result: ${hitsB}/${logsB.length} targets hit (${rateB}%)

Total trades logged: ${logs.length}

Write the analysis in exactly TWO blocks. No titles, no bullet points.

BLOCK 1 — The data (2-3 sentences):
- Start with: "The data is clear:" and state the hit rates of both variants.
- Then use "In other words," and describe the result in concrete trade terms (e.g. "Variant A closed X successful trades while Variant B managed only Y").
- End with a direct behavioral statement: what this means in terms of trading behavior.

BLOCK 2 — Sample size and closing (3-4 sentences):
- Start with: "An important note: a sample of ${logs.length} trades gives a direction — not a certainty."
- Reinforce that confidence in a strategy cannot come from feeling: it must be proportional to sample size.
- Say that these trades point clearly toward the better-performing variant, but that it is the sequence of future results that will strengthen — or challenge — that confidence.
- End with: "Good work. Keep growing your sample."

Tone: direct, precise, no fluff. Like a coach who respects the trader's intelligence.`;

    const prompt = isFomo
      ? (isPt ? fomoPromptPt : fomoPromptEn)
      : (isPt ? standardPromptPt : standardPromptEn);

    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 500,
      messages: [{ role: "user", content: prompt }],
    });

    const text = message.content[0].text;
    return Response.json({ report: text, statsA: { hits: hitsA, total: logsA.length, rate: rateA }, statsB: { hits: hitsB, total: logsB.length, rate: rateB } });
  } catch (err) {
    console.error("Report error:", err);
    return Response.json({ error: "Failed to generate report" }, { status: 500 });
  }
}
