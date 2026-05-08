import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const token = authHeader.replace("Bearer ", "");
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    // Find Stripe customer by email
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    if (!customers.data.length) {
      return Response.json({ error: "No billing account found" }, { status: 404 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.smartlogtrading.com";
    const session = await stripe.billingPortal.sessions.create({
      customer: customers.data[0].id,
      return_url: appUrl,
    });

    return Response.json({ url: session.url });
  } catch (error) {
    console.error("Stripe portal error:", error);
    return Response.json({ error: "Portal failed" }, { status: 500 });
  }
}
