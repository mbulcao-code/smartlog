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
    const isPt = lang === "pt";

    const prompt = isPt
      ? `Você é um psicólogo de trading analisando os resultados de um experimento comportamental.

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
- Comece com: "Uma amostragem de ${logs.length} trades oferece uma direção — não uma certeza."
- Reforce que confiança numa estratégia não pode ser fruto de feeling: tem que ser proporcional ao tamanho da amostragem.
- Diga que esses trades apontam com clareza para a variante com melhor resultado, mas que é a sequência de resultados que vai ampliar — ou questionar — essa confiança.
- Termine com: "Bom trabalho. Continue crescendo sua amostragem."

Tom: direto, preciso, sem floreios. Como um coach que respeita a inteligência do trader.`
      : `You are a trading psychologist analyzing the results of a behavioral experiment.

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
- Start with: "A sample of ${logs.length} trades gives a direction — not a certainty."
- Reinforce that confidence in a strategy cannot come from feeling: it must be proportional to sample size.
- Say that these trades point clearly toward the better-performing variant, but that it is the sequence of future results that will strengthen — or challenge — that confidence.
- End with: "Good work. Keep growing your sample."

Tone: direct, precise, no fluff. Like a coach who respects the trader's intelligence.`;

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
