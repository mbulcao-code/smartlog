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

Escreva uma análise direta em 3-4 parágrafos curtos:
1. O que os dados mostram objetivamente (compare as taxas)
2. Comente sobre o tamanho da amostra de cada variante — se uma tem muito menos trades que a outra, isso afeta a confiabilidade da comparação
3. Uma conclusão acionável: o que o trader deve fazer agora? (continuar testando, adotar uma variante, rebalancear os trades entre variantes)
4. Uma frase final reforçando que confiança não é um estado de espírito — é o que os dados dizem sobre comportamento repetido.

Tom: direto, sem floreios, baseado em dados. Sem bullet points. Parágrafos curtos.`
      : `You are a trading psychologist analyzing the results of a behavioral experiment.

EXPERIMENT: ${setup_data.setup_name}
Description: ${setup_data.setup_description}

VARIANT A — "${setup_data.variant_a_name}": ${setup_data.variant_a_description}
Result: ${hitsA}/${logsA.length} targets hit (${rateA}%)

VARIANT B — "${setup_data.variant_b_name}": ${setup_data.variant_b_description}
Result: ${hitsB}/${logsB.length} targets hit (${rateB}%)

Total trades logged: ${logs.length}

Write a direct analysis in 3-4 short paragraphs:
1. What the data shows objectively (compare the rates)
2. Comment on sample size for each variant — if one has significantly fewer trades, note how that affects the reliability of the comparison
3. An actionable conclusion: what should the trader do now? (keep testing, adopt one variant, rebalance trades between variants)
4. A closing sentence reinforcing that confidence is not a mood — it is what your data says about your repeated behavior.

Tone: direct, no fluff, data-driven. No bullet points. Short paragraphs.`;

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
