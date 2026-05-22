import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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

export async function GET(request) {
  try {
    const { user, error: authError } = await authenticate(request);
    if (authError) return Response.json({ error: authError }, { status: 401 });

    // Fetch all trades for this user
    const { data: trades, error: tradesError } = await supabase
      .from("trade_journal")
      .select("*")
      .eq("user_id", user.id)
      .order("trade_date", { ascending: false });

    if (tradesError) throw tradesError;

    const total = trades.length;
    if (total < 10) {
      return Response.json({ error: "insufficient_data", minimum: 10, current: total }, { status: 422 });
    }

    // ── Build data packet ──────────────────────────────────────────────────────

    const wins   = trades.filter(t => t.outcome === "win").length;
    const losses = trades.filter(t => t.outcome === "loss").length;
    const bes    = trades.filter(t => t.outcome === "breakeven").length;
    const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;

    // Pain distribution (new format)
    const painCounts = {};
    trades.forEach(t => {
      const pts = Array.isArray(t.pain_types) && t.pain_types.length > 0
        ? t.pain_types
        : t.pain_type ? [t.pain_type] : ["clean"];
      pts.forEach(p => { painCounts[p] = (painCounts[p] || 0) + 1; });
    });

    // Win rate per pain (primary pain)
    const painStats = {};
    trades.forEach(t => {
      const primaryPain = (Array.isArray(t.pain_types) && t.pain_types.length > 0)
        ? t.pain_types.find(p => p !== "clean") || "clean"
        : (t.pain_type || "clean");
      if (!painStats[primaryPain]) painStats[primaryPain] = { wins: 0, total: 0 };
      painStats[primaryPain].total++;
      if (t.outcome === "win") painStats[primaryPain].wins++;
    });
    const painWinRates = Object.fromEntries(
      Object.entries(painStats).map(([p, s]) => [p, {
        count: s.total,
        winRate: Math.round((s.wins / s.total) * 100),
      }])
    );

    // Recent trend (last 10 vs previous 10)
    const recentTen  = trades.slice(0, 10);
    const prevTen    = trades.slice(10, 20);
    const recentWR   = prevTen.length > 0
      ? Math.round((recentTen.filter(t => t.outcome === "win").length / recentTen.length) * 100)
      : winRate;
    const prevWR     = prevTen.length >= 10
      ? Math.round((prevTen.filter(t => t.outcome === "win").length / prevTen.length) * 100)
      : null;

    // After-trade patterns
    const planDeviations = trades
      .filter(t => t.after_trade?.plan_deviation)
      .map(t => t.after_trade.plan_deviation);
    const deviationCounts = planDeviations.reduce((acc, v) => {
      acc[v] = (acc[v] || 0) + 1; return acc;
    }, {});

    const stopOutcomes = trades
      .filter(t => t.after_trade?.stop_outcome)
      .map(t => t.after_trade.stop_outcome);
    const stopCounts = stopOutcomes.reduce((acc, v) => {
      acc[v] = (acc[v] || 0) + 1; return acc;
    }, {});

    // Clean vs issue trades comparison
    const cleanTrades = trades.filter(t => {
      const pts = Array.isArray(t.pain_types) && t.pain_types.length > 0 ? t.pain_types : [t.pain_type || "clean"];
      return pts.every(p => p === "clean" || p === null);
    });
    const issueTrades = trades.filter(t => {
      const pts = Array.isArray(t.pain_types) && t.pain_types.length > 0 ? t.pain_types : [t.pain_type || "clean"];
      return pts.some(p => p && p !== "clean");
    });
    const cleanWR = cleanTrades.length > 0
      ? Math.round((cleanTrades.filter(t => t.outcome === "win").length / cleanTrades.length) * 100)
      : null;
    const issueWR = issueTrades.length > 0
      ? Math.round((issueTrades.filter(t => t.outcome === "win").length / issueTrades.length) * 100)
      : null;

    // ── Build prompt ───────────────────────────────────────────────────────────

    const lang = request.headers.get("x-lang") || "en";
    const pt = lang === "pt";

    const dataPacket = {
      total_trades: total,
      win_rate: winRate,
      wins, losses, breakevens: bes,
      recent_10_win_rate: recentWR,
      previous_10_win_rate: prevWR,
      clean_trades: { count: cleanTrades.length, win_rate: cleanWR },
      issue_trades: { count: issueTrades.length, win_rate: issueWR },
      pain_distribution: painCounts,
      pain_win_rates: painWinRates,
      plan_deviation_counts: deviationCounts,
      stop_outcome_counts: stopCounts,
    };

    const systemPrompt = pt
      ? `Você é o SmartLog, um assistente de diário de trading focado em padrões comportamentais.

Princípios do SmartLog:
- Trades limpos (sem violações comportamentais) são o padrão. Tudo que se desvia disso é dado a analisar.
- O objetivo não é eliminar emoções, mas reconhecê-las cedo e agir com disciplina apesar delas.
- Pequenas amostras são normais no começo. Padrões só emergem com 20+ trades por categoria.
- Não elogiar nem punir — apenas observar e contextualizar com dados.
- Linguagem direta, sem floreio. O trader é inteligente e não precisa de motivação vazia.
- Máximo 200 palavras. Dois parágrafos: (1) O que os dados dizem claramente. (2) O que vale observar daqui em diante.`
      : `You are SmartLog, a trading journal assistant focused on behavioral patterns.

SmartLog principles:
- Clean trades (no behavioral violations) are the standard. Everything that deviates is data to analyze.
- The goal is not to eliminate emotions but to recognize them early and act with discipline despite them.
- Small samples are normal at the start. Patterns only emerge with 20+ trades per category.
- No praise, no punishment — only observation and context through data.
- Direct language, no fluff. The trader is intelligent and doesn't need empty motivation.
- Maximum 200 words. Two paragraphs: (1) What the data clearly shows. (2) What is worth watching going forward.`;

    const userPrompt = pt
      ? `Aqui estão os dados do diário de trading deste trader:\n\n${JSON.stringify(dataPacket, null, 2)}\n\nEscreva uma análise comportamental concisa baseada nesses dados.`
      : `Here is this trader's journal data:\n\n${JSON.stringify(dataPacket, null, 2)}\n\nWrite a concise behavioral analysis based on this data.`;

    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 400,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const text = message.content[0]?.text || "";

    return Response.json({ report: text, data: dataPacket });
  } catch (err) {
    console.error("AI report error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
