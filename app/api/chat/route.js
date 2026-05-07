import Anthropic from "@anthropic-ai/sdk";
import { SYSTEM_PROMPT } from "@/lib/systemPrompt";
import { supabase } from "@/lib/supabase";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request) {
  try {
    const { messages, sessionId, traderName, painType, lang } = await request.json();

    const languageInstruction =
      lang === "pt"
        ? "\n\nCRITICAL: Conduct this entire conversation in Brazilian Portuguese. Every response, every reframe, every question — in Portuguese. Do not switch to English at any point."
        : "\n\nConduct this entire conversation in English.";

    const response = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 1024,
      system: SYSTEM_PROMPT + languageInstruction,
      messages: messages,
    });

    const content = response.content[0].text;

    // Check if conversation is complete (JSON block present)
    let setupData = null;
    const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/);
    if (jsonMatch) {
      try {
        setupData = JSON.parse(jsonMatch[1]);
      } catch (e) {
        // JSON parse failed, continue without setup data
      }
    }

    const cleanMessage = content.replace(/```json\n[\s\S]*?\n```/, "").trim();

    // Save conversation to Supabase
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

    return Response.json({
      message: cleanMessage,
      setupData,
    });
  } catch (error) {
    console.error("API error:", error);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
