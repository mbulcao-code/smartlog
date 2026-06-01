import { supabase } from "@/lib/supabase";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return Response.json({ error: "sessionId required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("conversations")
      .select("session_id, trader_name, pain_type, setup_data, messages")
      .eq("session_id", sessionId)
      .single();

    if (error) throw error;

    return Response.json(data);
  } catch (error) {
    console.error("Experiment API error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

