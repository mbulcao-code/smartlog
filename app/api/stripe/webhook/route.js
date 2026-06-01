import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Stripe basil API removed current_period_end — derive it from billing_cycle_anchor + interval
function resolvePeriodEnd(subscription) {
  const raw = subscription.current_period_end;
  if (raw && typeof raw === "number") return new Date(raw * 1000).toISOString();
  if (raw && typeof raw === "string") return new Date(raw).toISOString();

  // Fallback: billing_cycle_anchor + 1 interval
  const anchor = subscription.billing_cycle_anchor;
  const interval = subscription.items?.data?.[0]?.price?.recurring?.interval;
  if (anchor && typeof anchor === "number") {
    const d = new Date(anchor * 1000);
    if (interval === "year") d.setFullYear(d.getFullYear() + 1);
    else d.setMonth(d.getMonth() + 1);
    return d.toISOString();
  }

  // Last resort: 30 days from now
  return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
}

export async function POST(request) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook signature failed:", err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const userId = session.metadata?.user_id;
        const email = session.metadata?.supabase_email;
        if (!userId) break;

        if (session.mode === "payment") {
          // Lifetime purchase
          await supabase.from("lifetime_users").upsert(
            {
              user_id: userId,
              email: email,
              stripe_customer_id: session.customer,
              stripe_payment_intent_id: session.payment_intent,
            },
            { onConflict: "user_id" }
          );
          break;
        }

        if (session.mode !== "subscription") break;

        const subId = typeof session.subscription === "string"
          ? session.subscription
          : session.subscription?.id;
        const subscription = await stripe.subscriptions.retrieve(subId);

        const periodEndIso = resolvePeriodEnd(subscription);

        await supabase.from("subscriptions").upsert(
          {
            user_id: userId,
            stripe_customer_id: session.customer,
            stripe_subscription_id: session.subscription,
            status: subscription.status,
            plan: subscription.items.data[0]?.price?.recurring?.interval === "year"
              ? "yearly"
              : "monthly",
            current_period_end: periodEndIso,
          },
          { onConflict: "stripe_subscription_id" }
        );
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object;
        const updatedPeriodEndIso = resolvePeriodEnd(subscription);

        await supabase
          .from("subscriptions")
          .update({
            status: subscription.status,
            current_period_end: updatedPeriodEndIso,
          })
          .eq("stripe_subscription_id", subscription.id);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        await supabase
          .from("subscriptions")
          .update({ status: "canceled" })
          .eq("stripe_subscription_id", subscription.id);
        break;
      }

      default:
        break;
    }
  } catch (err) {
    console.error("Webhook handler error:", err);
    return new Response("Handler error", { status: 500 });
  }

  return new Response("OK", { status: 200 });
}
