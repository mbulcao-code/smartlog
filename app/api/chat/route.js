import Anthropic from "@anthropic-ai/sdk";
import { SYSTEM_PROMPT } from "@/lib/systemPrompt";
import { supabase } from "@/lib/supabase";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request) {
  const { messages, sessionId, traderName, painType, lang } = await request.json();

  const languageInstruction =
    lang === "pt"
      ? "\n\nCRITICAL: Conduct this entire conversation in Brazilian Portuguese. Every response, every reframe, every question — in Portuguese. Do not switch to English at any point."
      : "\n\nConduct this entire conversation in English.";

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        let fullText = "";

        const anthropicStream = client.messages.stream({
          model: "claude-sonnet-4-5",
          max_tokens: 1024,
          system: SYSTEM_PROMPT + languageInstruction,
          messages: messages,
        });

        // Stream chunks to client as they arrive
        for await (const chunk of anthropicStream) {
          if (
            chunk.type === "content_block_delta" &&
            chunk.delta.type === "text_delta"
          ) {
            const text = chunk.delta.text;
            fullText += text;
            controller.enqueue(encoder.encode(text));
          }
        }

        // Stream complete — parse JSON block if present
        let setupData = null;
        const jsonMatch = fullText.match(/```json\n([\s\S]*?)\n```/);
        if (jsonMatch) {
          try {
            setupData = JSON.parse(jsonMatch[1]);
          } catch (e) {
            // JSON parse failed
          }
        }

        const cleanMessage = fullText
          .replace(/```json\n[\s\S]*?\n```/, "")
          .trim();

        // Save to Supabase
        if (sessionId) {
          const allMessages = [
            ...messages,
            { role: "assistant", content: cleanMessage },
          ];
          await supabase.from("conversations").upsert(
            {
              session_id: sessionId,
              trader_name: traderName || "Anonymous",
              pain_type: painType || "unknown",
              messages: allMessages,
              setup_data: setupData,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "session_id" }
          );
        }

        // Send final marker with setupData so client can detect completion
        const finalMarker = `\n\n[SMARTLOG_DONE]${JSON.stringify({ setupData })}`;
        controller.enqueue(encoder.encode(finalMarker));
        controller.close();
      } catch (error) {
        console.error("Stream error:", error);
        controller.enqueue(encoder.encode("\n\n[SMARTLOG_ERROR]"));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
      "X-Accel-Buffering": "no",
    },
  });
}
