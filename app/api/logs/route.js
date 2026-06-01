import { supabase } from "@/lib/supabase";

export async function POST(request) {
  try {
    const { sessionId, variant, outcome } = await request.json();

    if (!sessionId || !variant || outcome === undefined) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("trade_logs")
      .insert({ session_id: sessionId, variant, outcome })
      .select()
      .single();

    if (error) throw error;

    return Response.json({ success: true, log: data });
  } catch (error) {
    console.error("Log API error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return Response.json({ error: "sessionId required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("trade_logs")
      .select("*")
      .eq("session_id", sessionId)
      .order("logged_at", { ascending: false });

    if (error) throw error;

    return Response.json(data);
  } catch (error) {
    console.error("Logs fetch error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
