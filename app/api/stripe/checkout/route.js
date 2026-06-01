import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const PRICES = {
  monthly: "price_1TUQvkRM3M9yYyOAAlh8H3wm",
  yearly: "price_1TUQxaRM3M9yYyOAiVjBzDSh",
  lifetime: "price_1TUk8dRM3M9yYyOAaNENfSJc",
  test_monthly: "price_1TWDm8RM3M9yYyOAImmmQY2T",
  test_yearly: "price_1TWDnjRM3M9yYyOAouPQnzXU",
};

export async function POST(request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const token = authHeader.replace("Bearer ", "");

    // Verify user
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { plan, next } = await request.json();
    const priceId = PRICES[plan];
    if (!priceId) return Response.json({ error: "Invalid plan" }, { status: 400 });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.smartlogtrading.com";
    const successUrl = next
      ? `${appUrl}${next}?payment=success`
      : `${appUrl}/?payment=success`;

    const isLifetime = plan === "lifetime";
    const session = await stripe.checkout.sessions.create({
      mode: isLifetime ? "payment" : "subscription",
      payment_method_types: ["card"],
      customer_email: user.email,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: `${appUrl}/subscribe?next=${encodeURIComponent(next || "/")}`,
      metadata: {
        user_id: user.id,
        supabase_email: user.email,
      },
    });

    return Response.json({ url: session.url });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return Response.json({ error: "Checkout failed" }, { status: 500 });
  }
}
