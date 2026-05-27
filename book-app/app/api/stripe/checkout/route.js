import Stripe from "stripe";
import { createServerSupabaseClient } from "@/lib/supabase";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { priceId, mode, successUrl, cancelUrl } = await request.json();

    const session = await stripe.checkout.sessions.create({
      mode: mode || "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        user_id: user.id,
        email: user.email,
        product: "book",
      },
      customer_email: user.email,
    });

    return Response.json({ url: session.url });
  } catch (err) {
    console.error("Stripe checkout error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
