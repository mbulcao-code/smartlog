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

    const { data, error } = await supabase
      .from("journal_setups")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return Response.json(data || []);
  } catch (err) {
    console.error("Setups GET error:", err);
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

    // Enforce 10-setup limit
    const { count: existingCount } = await supabase
      .from("journal_setups")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);

    if ((existingCount || 0) >= 10) {
      return Response.json(
        { error: "setup_limit_reached", message: "You have reached the maximum of 10 setups. Delete an existing setup to create a new one." },
        { status: 422 }
      );
    }

    const body = await request.json();
    const { name, conditions, stop_strategy, profit_strategy, stop_config, profit_config } = body;

    if (!name?.trim()) {
      return Response.json({ error: "Setup name is required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("journal_setups")
      .insert({
        user_id: user.id,
        name: name.trim(),
        conditions: conditions || [],
        stop_strategy: stop_strategy?.trim() || null,
        profit_strategy: profit_strategy?.trim() || null,
        stop_config: stop_config || null,
        profit_config: profit_config || null,
      })
      .select()
      .single();

    if (error) throw error;
    return Response.json({ success: true, setup: data });
  } catch (err) {
    console.error("Setups POST error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
