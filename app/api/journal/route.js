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

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "100"), 500);

    const { data, error } = await supabase
      .from("trade_journal")
      .select("*")
      .eq("user_id", user.id)
      .order("logged_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return Response.json(data || []);
  } catch (err) {
    console.error("Journal GET error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const {
      // Behavioral fields (always present)
      pain_type, behavior, outcome, notes, lang,
      // Full trade fields (from /journal/log/new)
      setup_id, instrument, direction, trade_date,
      entry_price, stop_price, exit_price,
      conditions_met, variant_used,
    } = body;

    if (!outcome) {
      return Response.json({ error: "outcome is required" }, { status: 400 });
    }

    const validOutcomes = ["win", "loss", "breakeven"];
    if (!validOutcomes.includes(outcome)) {
      return Response.json({ error: "outcome must be win, loss, or breakeven" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("trade_journal")
      .insert({
        user_id:        user.id,
        pain_type:      pain_type || null,
        behavior:       behavior || {},
        outcome,
        notes:          notes || null,
        lang:           lang || "en",
        // Full trade fields
        setup_id:       setup_id || null,
        instrument:     instrument || null,
        direction:      direction || null,
        trade_date:     trade_date || null,
        entry_price:    entry_price ?? null,
        stop_price:     stop_price ?? null,
        exit_price:     exit_price ?? null,
        conditions_met: conditions_met || [],
        variant_used:   variant_used || null,
      })
      .select()
      .single();

    if (error) throw error;
    return Response.json({ success: true, entry: data });
  } catch (err) {
    console.error("Journal POST error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
