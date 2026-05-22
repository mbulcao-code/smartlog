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

export async function GET(request, { params }) {
  try {
    const { user, error: authError } = await authenticate(request);
    if (authError) return Response.json({ error: authError }, { status: 401 });

    const { data, error } = await supabase
      .from("trade_journal")
      .select("*")
      .eq("id", params.id)
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

// ── PATCH — edit notes, outcome, exit_price ───────────────────────────────────

export async function PATCH(request, { params }) {
  try {
    const { user, error: authError } = await authenticate(request);
    if (authError) return Response.json({ error: authError }, { status: 401 });

    const body = await request.json();
    const { notes, outcome, exit_price } = body;

    const updates = {};
    if (notes      !== undefined) updates.notes      = notes?.trim() || null;
    if (outcome    !== undefined) updates.outcome    = outcome;
    if (exit_price !== undefined) updates.exit_price = exit_price ? parseFloat(exit_price) : null;

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
      .eq("id", params.id)
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

export async function DELETE(request, { params }) {
  try {
    const { user, error: authError } = await authenticate(request);
    if (authError) return Response.json({ error: authError }, { status: 401 });

    const { error } = await supabase
      .from("trade_journal")
      .delete()
      .eq("id", params.id)
      .eq("user_id", user.id);

    if (error) throw error;
    return Response.json({ success: true });
  } catch (err) {
    console.error("Journal entry DELETE error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
