import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function authenticate(request) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) return { error: "Unauthorized" };
  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return { error: "Unauthorized" };
  return { user };
}

export async function POST(request) {
  try {
    const { user, error: authError } = await authenticate(request);
    if (authError) return Response.json({ error: authError }, { status: 401 });

    const body = await request.json();
    const { stats } = body;

    if (!stats) {
      return Response.json({ error: "Missing stats payload" }, { status: 400 });
    }

    const lang = request.headers.get("x-lang") || "en";
    const pt = lang === "pt";

    const systemPrompt = pt
      ? `Você é o SmartLog, assistente de análise de trading focado em dados comportamentais e refinamento de setups.

Princípios do SmartLog que você deve aplicar:
1. Confiança não é um sentimento — é uma função de desempenho comprovado. Setups testados e lucrativos são o único caminho para confiança real.
2. Urges (FOMO, revenge, oversizing) não devem ser suprimidos — devem ser gerenciados com o protocolo "taxa pirata": entre com size reduzido para satisfazer o impulso sem comprometer o R:R.
3. Operações aleatórias não ensinam nada. Apenas setups estruturados e registrados produzem aprendizado real.
4. O ciclo é: registrar → testar → refinar → aumentar o size com a amostragem.
5. Setups claros e repetíveis = fundação de uma edge real.

Regras de escrita:
- Fale diretamente ao trader usando "você"
- Seja específico com os números fornecidos
- Sem elogios vazios ou punições — apenas observação e implicação dos dados
- Linguagem direta, profissional, concisa
- Máximo 350 palavras no total`
      : `You are SmartLog, a trading analysis engine focused on behavioral data and setup refinement.

SmartLog principles to apply:
1. Confidence is NOT a feeling — it's a function of proven performance. Tested, profitable setups are the only path to real confidence.
2. Urges (FOMO, revenge, oversizing) should NOT be suppressed — manage them with the "pirate fee" protocol: enter with reduced size to satisfy the urge without compromising R:R.
3. Random trades teach nothing. Only structured, logged setups produce real learning.
4. The cycle is: log → test → refine → grow size with sample size.
5. Clear and repeatable setups = the foundation of a real edge.

Writing rules:
- Speak directly to the trader using "you"
- Be specific with the numbers provided
- No empty praise or punishment — only observation and implication from data
- Direct, professional, concise language
- Maximum 350 words total`;

    const statsJson = JSON.stringify(stats, null, 2);

    const userPrompt = pt
      ? `Aqui estão os dados do trader:\n\n${statsJson}\n\nEscreva um relatório narrativo organizado em duas seções claras:

## ANÁLISE COMPORTAMENTAL
Analise os padrões comportamentais do trader. Cubra os pontos mais relevantes: entrada antecipada/FOMO (as oportunidades verdadeiramente perdidas justificam o risco? A "taxa pirata" é relevante?), gestão de stop (os dados mostram o quê?), outros problemas registrados. Seja direto e conclusivo.

## ANÁLISE DE SETUPS
Cubra: quantos setups são lucrativos, qual é o melhor e por quê o trader deve priorizá-lo. Para cada setup com dados suficientes, mencione qual variante está se destacando e a implicação prática (mais size? menos operações com variantes inferiores? "taxa pirata" para variantes piores que ainda geram urgência?). Encerre com uma linha de direção clara.

Seja completo mas conciso. Use os números fornecidos diretamente no texto.`
      : `Here is the trader's data:\n\n${statsJson}\n\nWrite a narrative report organized in two clear sections:

## BEHAVIOURAL ANALYSIS
Analyze the trader's behavioral patterns. Cover the most relevant points: early entry/FOMO (do the truly missed opportunities justify the risk? Is the pirate fee relevant?), stop management (what does the data show?), other logged issues. Be direct and conclusive.

## SETUP ANALYSIS
Cover: how many setups are profitable, which is best and why the trader should prioritize it. For each setup with enough data, mention which variant is outperforming and the practical implication (more size? fewer trades on underperforming variants? "pirate fee" for worse variants that still create urges?). Close with one clear line of direction.

Be complete but concise. Use the numbers provided directly in the text.`;

    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 600,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const report = message.content[0]?.text || "";

    return Response.json({ report });
  } catch (err) {
    console.error("Full narrative report error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
