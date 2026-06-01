import Anthropic from "@anthropic-ai/sdk";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { BOOK_SYSTEM_PROMPT } from "@/lib/system-prompt";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { messages, conversationId, entryPoint, entryType } = await request.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return Response.json({ error: "No messages provided" }, { status: 400 });
    }

    // Access check — pro users can chat freely; free tier gets 1 conversation
    const hasAccess = await checkAccess(supabase, user.id, conversationId);
    if (!hasAccess) {
      return Response.json(
        { error: "access_required", upgrade_url: "/subscribe" },
        { status: 403 }
      );
    }

    // Track conversation (upsert)
    if (conversationId) {
      await supabase
        .from("book_conversations")
        .upsert({
          id: conversationId,
          user_id: user.id,
          last_message_at: new Date().toISOString(),
          message_count: messages.length,
          chapter_id: entryPoint || null,
          entry_point: entryType || null,
        })
        .eq("id", conversationId);
    }

    // Stream response from Claude Sonnet
    const stream = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: BOOK_SYSTEM_PROMPT,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      stream: true,
    });

    // Return a streaming response
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              const chunk = JSON.stringify({ text: event.delta.text }) + "\n";
              controller.enqueue(encoder.encode(chunk));
            }
            if (event.type === "message_stop") {
              controller.enqueue(encoder.encode(JSON.stringify({ done: true }) + "\n"));
              controller.close();
            }
          }
        } catch (err) {
          controller.error(err);
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
        "Cache-Control": "no-cache",
      },
    });
  } catch (err) {
    console.error("Chat API error:", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function checkAccess(supabase, userId, conversationId) {
  // Check lifetime
  const { data: lifetime } = await supabase
    .from("lifetime_users")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (lifetime) return true;

  // Check SmartLog active subscription
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("status")
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();
  if (sub) return true;

  // Check book-specific subscription
  const { data: bookSub } = await supabase
    .from("book_subscriptions")
    .select("status")
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();
  if (bookSub) return true;

  // Free tier: allow if this conversationId already exists for the user
  // (continuing an existing free conversation), or if they have 0 conversations
  if (conversationId) {
    const { data: existing } = await supabase
      .from("book_conversations")
      .select("id")
      .eq("id", conversationId)
      .eq("user_id", userId)
      .maybeSingle();
    if (existing) return true; // continuing existing free conversation
  }

  const { count, error: countError } = await supabase
    .from("book_conversations")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  // If table missing (pending migration) → allow as free
  if (countError || count === null) return true;

  return count === 0; // free tier: first conversation allowed
}
