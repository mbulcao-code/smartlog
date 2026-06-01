import { createServerSupabaseClient } from "@/lib/supabase-server";

// Access levels:
// - "none"     → not logged in
// - "free"     → logged in, no subscription, no lifetime, < 1 conversation used
// - "locked"   → logged in, free tier used up (≥ 1 conversation, no paid plan)
// - "pro"      → active subscription or lifetime (SmartLog or Book)

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ access: "none" });
  }

  // 1. Check book_lifetime_users (book-specific lifetime)
  const { data: bookLifetime } = await supabase
    .from("book_lifetime_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (bookLifetime) {
    return Response.json({ access: "pro", plan: "lifetime" });
  }

  // 2. Check lifetime_users (SmartLog lifetime = book included)
  const { data: lifetime } = await supabase
    .from("lifetime_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (lifetime) {
    return Response.json({ access: "pro", plan: "lifetime" });
  }

  // 2. Check active subscription (SmartLog yearly/monthly = book included)
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("status, plan, period_end")
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (subscription) {
    // Yearly and lifetime SmartLog plans include book access
    return Response.json({
      access: "pro",
      plan: subscription.plan,
      periodEnd: subscription.period_end,
    });
  }

  // 3. Check book-specific subscriptions
  const { data: bookSub } = await supabase
    .from("book_subscriptions")
    .select("status, plan, period_end")
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (bookSub) {
    return Response.json({
      access: "pro",
      plan: bookSub.plan,
      periodEnd: bookSub.period_end,
    });
  }

  // 4. Free tier — check conversation count
  const { count, error: countError } = await supabase
    .from("book_conversations")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  // If table doesn't exist yet (pending migration) or any DB error → treat as free
  if (countError || count === null) {
    return Response.json({ access: "free", conversationsUsed: 0 });
  }

  if (count === 0) {
    return Response.json({ access: "free", conversationsUsed: 0 });
  }

  return Response.json({ access: "locked", conversationsUsed: count });
}
