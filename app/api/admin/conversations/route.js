import { createClient } from "@supabase/supabase-js";
import { ADMIN_EMAILS } from "@/lib/admin-config";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkAdmin(request) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) return null;
  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  if (!ADMIN_EMAILS.includes(user.email)) return null;
  return user;
}

export async function GET(request) {
  const admin = await checkAdmin(request);
  if (!admin) return Response.json({ error: "Forbidden" }, { status: 403 });

  try {
    const { data, error } = await supabase
      .from("conversations")
      .select("*")
      .order("updated_at", { ascending: false });

    if (error) throw error;
    return Response.json(data);
  } catch (err) {
    console.error("Admin conversations error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
