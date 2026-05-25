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
    const [tradesRes, setupsRes, leadsRes] = await Promise.all([
      supabase
        .from("trade_journal")
        .select("id, user_id, setup_id, outcome, pnl, direction, instrument, trade_date, after_trade, notes, logged_at")
        .order("logged_at", { ascending: false }),
      supabase
        .from("journal_setups")
        .select("id, user_id, name, conditions, created_at")
        .eq("is_active", true)
        .order("created_at", { ascending: false }),
      supabase
        .from("leads")
        .select("user_id, email, created_at"),
    ]);

    const trades = tradesRes.data || [];
    const setups = setupsRes.data || [];
    const leads  = leadsRes.data  || [];

    // Build user map keyed by user_id
    const userMap = {};

    leads.forEach(l => {
      userMap[l.user_id] = {
        user_id:    l.user_id,
        email:      l.email,
        joined_at:  l.created_at,
        trades:     [],
        setups:     [],
      };
    });

    trades.forEach(t => {
      if (!userMap[t.user_id]) {
        userMap[t.user_id] = { user_id: t.user_id, email: null, joined_at: null, trades: [], setups: [] };
      }
      userMap[t.user_id].trades.push(t);
    });

    setups.forEach(s => {
      if (!userMap[s.user_id]) {
        userMap[s.user_id] = { user_id: s.user_id, email: null, joined_at: null, trades: [], setups: [] };
      }
      userMap[s.user_id].setups.push(s);
    });

    // Only return users who have at least one trade or setup
    const users = Object.values(userMap).filter(u => u.trades.length > 0 || u.setups.length > 0);

    // Sort by most recent activity
    users.sort((a, b) => {
      const aLast = a.trades[0]?.logged_at || a.setups[0]?.created_at || "";
      const bLast = b.trades[0]?.logged_at || b.setups[0]?.created_at || "";
      return bLast.localeCompare(aLast);
    });

    return Response.json(users);
  } catch (err) {
    console.error("Admin journal error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
