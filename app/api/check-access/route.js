import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) return Response.json({ hasAccess: false });

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return Response.json({ hasAccess: false });

    // Check beta_users first
    const { data: beta } = await supabase
      .from("beta_users")
      .select("email")
      .eq("email", user.email)
      .single();

    if (beta) return Response.json({ hasAccess: true, reason: "beta" });

    // Check lifetime access
    const { data: lifetime } = await supabase
      .from("lifetime_users")
      .select("user_id")
      .eq("user_id", user.id)
      .single();

    if (lifetime) return Response.json({ hasAccess: true, reason: "lifetime" });

    // Check active subscription
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("status, current_period_end")
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();

    if (sub) return Response.json({ hasAccess: true, reason: "subscribed" });

    return Response.json({ hasAccess: false });
  } catch (err) {
    console.error("check-access error:", err);
    return Response.json({ hasAccess: false });
  }
}
