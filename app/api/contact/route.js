import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request) {
  try {
    const { name, email, message } = await request.json();

    if (!name?.trim() || !email?.trim() || !message?.trim()) {
      return Response.json({ error: "All fields required" }, { status: 400 });
    }

    await resend.emails.send({
      from: "SmartLog <onboarding@resend.dev>",
      to: "mbulcao@gmail.com",
      replyTo: email.trim(),
      subject: `SmartLog — mensagem de ${name.trim()}`,
      text: `Nome: ${name.trim()}\nEmail: ${email.trim()}\n\n${message.trim()}`,
    });

    return Response.json({ ok: true });
  } catch (err) {
    console.error("Contact error:", err);
    return Response.json({ error: "Failed to send" }, { status: 500 });
  }
}
