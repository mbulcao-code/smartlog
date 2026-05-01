import Anthropic from "@anthropic-ai/sdk";
import { SYSTEM_PROMPT } from "@/lib/systemPrompt";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request) {
  try {
    const { messages } = await request.json();

    const response = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
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

    return Response.json({
      message: content.replace(/```json\n[\s\S]*?\n```/, "").trim(),
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
