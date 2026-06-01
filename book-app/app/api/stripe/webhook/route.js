import Stripe from "stripe";
import { createServerClient } from "@supabase/ssr";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Use service-role key for webhook writes (bypasses RLS)
function createAdminSupabase() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );
}

export async function POST(request) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_BOOK_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook signature error:", err.message);
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = createAdminSupabase();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        if (session.metadata?.product !== "book") break;

        const userId = session.metadata.user_id;
        const email = session.metadata.email;

        if (session.mode === "payment") {
          // Lifetime purchase
          await supabase.from("book_lifetime_users").upsert({
            user_id: userId,
            email,
            stripe_customer_id: session.customer,
            stripe_payment_intent_id: session.payment_intent,
          });
        } else {
          // Subscription — handled by customer.subscription.updated
        }
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.created": {
        const sub = event.data.object;
        // Only handle book subscriptions (identified by metadata set at checkout)
        // We match by looking for our book price IDs
        const bookPriceIds = [
          process.env.NEXT_PUBLIC_BOOK_MONTHLY_PRICE_ID,
          process.env.NEXT_PUBLIC_BOOK_YEARLY_PRICE_ID,
        ].filter(Boolean);

        const priceId = sub.items?.data?.[0]?.price?.id;
        if (!bookPriceIds.includes(priceId)) break;

        // Get user_id from customer metadata
        const customer = await stripe.customers.retrieve(sub.customer);
        const userId = customer.metadata?.user_id;
        if (!userId) break;

        const periodEnd = sub.current_period_end
          ? new Date(sub.current_period_end * 1000).toISOString()
          : null;

        await supabase.from("book_subscriptions").upsert({
          user_id: userId,
          stripe_subscription_id: sub.id,
          stripe_customer_id: sub.customer,
          status: sub.status,
          plan: priceId === process.env.NEXT_PUBLIC_BOOK_YEARLY_PRICE_ID ? "yearly" : "monthly",
          period_end: periodEnd,
        });
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object;
        await supabase
          .from("book_subscriptions")
          .update({ status: "canceled" })
          .eq("stripe_subscription_id", sub.id);
        break;
      }
    }

    return Response.json({ received: true });
  } catch (err) {
    console.error("Webhook handler error:", err);
    return Response.json({ error: "Handler error" }, { status: 500 });
  }
}
