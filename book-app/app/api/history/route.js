import { createServerSupabaseClient } from "@/lib/supabase-server";

const CHAPTER_LABELS = {
  fomo: "FOMO",
  hesitation: "Hesitation",
  early_exit: "Early exit",
  revenge: "Revenge trading",
  stop_tampering: "Stop tampering",
  overtrading: "Overtrading",
  greed: "Greed",
  loss_aversion: "Loss aversion",
  confirmation_bias: "Confirmation bias",
  hindsight_bias: "Hindsight bias",
  anchoring: "Anchoring / recency",
  herd: "Herd mentality",
  redemption: "Redemption trap",
  overconfidence: "Overconfidence",
  limiting_beliefs: "Limiting beliefs",
  f1: "Emotions as Goal Protectors",
  f2: "All Habits Are Successful",
  f3: "The Mental Congress",
  f4: "The Pirates' Dilemma",
  f5: "Keys to Sustainable Discipline",
  f6: "The Mind as a Problem-Solver",
  f7: "The Probabilistic Trader",
};

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("book_conversations")
    .select("id, chapter_id, entry_point, last_message_at, message_count")
    .eq("user_id", user.id)
    .order("last_message_at", { ascending: false })
    .limit(20);

  if (error) {
    // Table might not exist yet
    return Response.json({ conversations: [] });
  }

  const conversations = (data || []).map((c) => ({
    id: c.id,
    label: CHAPTER_LABELS[c.chapter_id] || "General",
    type: c.entry_point || "browse",
    chapterId: c.chapter_id,
    lastMessageAt: c.last_message_at,
    messageCount: c.message_count || 0,
  }));

  return Response.json({ conversations });
}
