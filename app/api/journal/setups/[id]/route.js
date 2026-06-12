import { createClient } from "@supabase/supabase-js";

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

// ── GET /api/journal/setups/[id] ──────────────────────────────────────────────

export async function GET(request, context) {
  try {
    const { id } = await context.params;
    const { user, error: authError } = await authenticate(request);
    if (authError) return Response.json({ error: authError }, { status: 401 });

    const [{ data, error }, { count }] = await Promise.all([
      supabase
        .from("journal_setups")
        .select("*")
        .eq("id", id)
        .eq("user_id", user.id)
        .single(),
      supabase
        .from("trade_journal")
        .select("id", { count: "exact", head: true })
        .eq("setup_id", id)
        .eq("user_id", user.id),
    ]);

    if (error) throw error;
    if (!data) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json({ ...data, tradeCount: count || 0, hasTradeHistory: (count || 0) > 0 });
  } catch (err) {
    console.error("Setup GET error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}

// ── PUT /api/journal/setups/[id] ──────────────────────────────────────────────
// Rules enforced server-side:
//   - name: freely editable
//   - conditions[].text: LOCKED once trades have been logged against this setup
//   - conditions[].variants: freely addable/editable
//   - stop_config, profit_config, stop_strategy, profit_strategy: freely editable

export async function PUT(request, context) {
  try {
    const { id } = await context.params;
    const { user, error: authError } = await authenticate(request);
    if (authError) return Response.json({ error: authError }, { status: 401 });

    // Fetch current setup to compare condition texts
    const { data: current, error: fetchError } = await supabase
      .from("journal_setups")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !current) return Response.json({ error: "Not found" }, { status: 404 });

    // Check if any trades have been logged against this setup
    const { count } = await supabase
      .from("trade_journal")
      .select("id", { count: "exact", head: true })
      .eq("setup_id", id)
      .eq("user_id", user.id);

    const hasTradeHistory = (count || 0) > 0;

    const body = await request.json();
    const { name, conditions, stop_strategy, profit_strategy, stop_config, profit_config } = body;

    // If trades exist, validate that condition texts haven't changed
    if (hasTradeHistory && conditions) {
      const currentTexts = Object.fromEntries(
        (current.conditions || []).map((c) => [c.id, c.text])
      );
      for (const cond of conditions) {
        if (currentTexts[cond.id] && currentTexts[cond.id] !== cond.text) {
          return Response.json(
            {
              error: "condition_text_locked",
              message: `Condition "${currentTexts[cond.id]}" cannot be changed because trades have been logged against this setup. You can add variants or create a new setup.`,
              lockedConditionId: cond.id,
            },
            { status: 422 }
          );
        }
      }
    }

    const { data, error } = await supabase
      .from("journal_setups")
      .update({
        name:            name?.trim() || current.name,
        conditions:      conditions   ?? current.conditions,
        stop_strategy:   stop_strategy  !== undefined ? stop_strategy?.trim() || null  : current.stop_strategy,
        profit_strategy: profit_strategy !== undefined ? profit_strategy?.trim() || null : current.profit_strategy,
        stop_config:     stop_config    !== undefined ? stop_config    : current.stop_config,
        profit_config:   profit_config  !== undefined ? profit_config  : current.profit_config,
      })
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) throw error;
    return Response.json({ success: true, setup: data });
  } catch (err) {
    console.error("Setup PUT error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}

// ── DELETE /api/journal/setups/[id] ──────────────────────────────────────────

export async function DELETE(request, context) {
  try {
    const { id } = await context.params;
    const { user, error: authError } = await authenticate(request);
    if (authError) return Response.json({ error: authError }, { status: 401 });

    // Count trades referencing this setup
    const { count } = await supabase
      .from("trade_journal")
      .select("id", { count: "exact", head: true })
      .eq("setup_id", id)
      .eq("user_id", user.id);

    // Soft delete — set is_active = false (preserves trade history integrity)
    const { error } = await supabase
      .from("journal_setups")
      .update({ is_active: false })
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) throw error;
    return Response.json({ success: true, tradesAffected: count || 0 });
  } catch (err) {
    console.error("Setup DELETE error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
