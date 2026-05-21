import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    // Get all conversations for this user (complete + incomplete)
    const { data: convs, error: convError } = await supabase
      .from("conversations")
      .select("session_id, pain_type, setup_data, updated_at, trader_name")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (convError) throw convError;
    if (!convs || convs.length === 0) return Response.json({ experiments: [] });

    // Get trade counts for these sessions
    const sessionIds = convs.map((c) => c.session_id);
    const { data: tradeLogs } = await supabase
      .from("trade_logs")
      .select("session_id")
      .in("session_id", sessionIds);

    // Count per session
    const tradeCountBySession = {};
    (tradeLogs || []).forEach((log) => {
      tradeCountBySession[log.session_id] =
        (tradeCountBySession[log.session_id] || 0) + 1;
    });

    const experiments = convs.map((c) => ({
      session_id: c.session_id,
      pain_type: c.pain_type,
      setup_data: c.setup_data,
      updated_at: c.updated_at,
      trader_name: c.trader_name,
      tradeCount: tradeCountBySession[c.session_id] || 0,
      completed: !!c.setup_data,
    }));

    return Response.json({ experiments });
  } catch (err) {
    console.error("Dashboard API error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
