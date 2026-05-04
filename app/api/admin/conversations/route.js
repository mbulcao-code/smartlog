import { supabase } from "@/lib/supabase";

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("conversations")
      .select("*")
      .order("updated_at", { ascending: false });

    if (error) throw error;

    return Response.json(data);
  } catch (error) {
    console.error("Admin API error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
