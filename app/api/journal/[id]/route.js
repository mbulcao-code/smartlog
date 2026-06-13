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

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET(request, context) {
  try {
    const { id } = await context.params;
    const { user, error: authError } = await authenticate(request);
    if (authError) return Response.json({ error: authError }, { status: 401 });

    const { data, error } = await supabase
      .from("trade_journal")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (error) throw error;
    if (!data) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json(data);
  } catch (err) {
    console.error("Journal entry GET error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}

// ── PATCH — edit any trade field ─────────────────────────────────────────────

export async function PATCH(request, context) {
  try {
    const { id } = await context.params;
    const { user, error: authError } = await authenticate(request);
    if (authError) return Response.json({ error: authError }, { status: 401 });

    const body = await request.json();
    const {
      notes, outcome, pnl,
      setup_id, direction, trade_date, instrument,
      after_trade,
      live_paper, instrument_type,
    } = body;

    const updates = {};
    if (notes            !== undefined) updates.notes            = notes?.trim() || null;
    if (outcome          !== undefined) updates.outcome          = outcome;
    if (pnl              !== undefined) updates.pnl              = (pnl !== null && pnl !== "") ? parseFloat(pnl) : null;
    if (setup_id         !== undefined) updates.setup_id         = setup_id || null;
    if (direction        !== undefined) updates.direction        = direction || null;
    if (trade_date       !== undefined) updates.trade_date       = trade_date || null;
    if (instrument       !== undefined) updates.instrument       = instrument?.trim() || null;
    if (after_trade      !== undefined) updates.after_trade      = after_trade;
    if (live_paper       !== undefined) updates.live_paper       = live_paper || null;
    if (instrument_type  !== undefined) updates.instrument_type  = instrument_type || null;

    if (Object.keys(updates).length === 0) {
      return Response.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const validOutcomes = ["win", "loss", "breakeven"];
    if (updates.outcome && !validOutcomes.includes(updates.outcome)) {
      return Response.json({ error: "Invalid outcome value" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("trade_journal")
      .update(updates)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) throw error;
    if (!data) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json({ success: true, entry: data });
  } catch (err) {
    console.error("Journal entry PATCH error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}

// ── DELETE ────────────────────────────────────────────────────────────────────

export async function DELETE(request, context) {
  try {
    const { id } = await context.params;
    const { user, error: authError } = await authenticate(request);
    if (authError) return Response.json({ error: authError }, { status: 401 });

    const { error } = await supabase
      .from("trade_journal")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) throw error;
    return Response.json({ success: true });
  } catch (err) {
    console.error("Journal entry DELETE error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
