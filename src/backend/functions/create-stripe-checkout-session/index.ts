// @ts-ignore: Deno-specific import
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
// @ts-ignore: Deno-specific import
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// @ts-ignore: Deno-specific import
import Stripe from "https://esm.sh/stripe@14.12.0"; // Ensure you use a version compatible with your Stripe API version
import { corsHeadersFactory } from '../_shared/lib/constants.ts';

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  // @ts-ignore: Stripe types might not perfectly align with Deno Stripe SDK
  apiVersion: "2023-10-16",
  // @ts-ignore: Deno-specific HTTP client
  httpClient: Stripe.createFetchHttpClient(),
});

// Note: This function doesn't directly use Supabase client for this operation,
// but it's good practice if you needed to fetch user details or log something.
// const supabaseClient = createClient(
//   Deno.env.get("SUPABASE_URL")!,
//   Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
// );

// @ts-ignore: Deno-specific serve function
serve(async (req: Request) => {
  const corsHeaders = corsHeadersFactory(req.headers.get("origin") || "");

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  console.log('[create-stripe-checkout-session] Received request:', req.method, req.url);
  // Log all headers
  const headersObject: { [key: string]: string } = {};
  req.headers.forEach((value, key) => {
    headersObject[key] = value;
  });
  console.log('[create-stripe-checkout-session] Request Headers:', JSON.stringify(headersObject, null, 2));
  
  let requestBodyTextForErrorLogging = "<request body not logged or failed to log>";

  try {
    try {
      // Try to clone and read text to log, without consuming the original body for req.json()
      const clonedReq = req.clone();
      const rawBody = await clonedReq.text();
      requestBodyTextForErrorLogging = rawBody; // Store for potential error logging
      console.log('[create-stripe-checkout-session] Raw Request Body Text:', rawBody);
    } catch (cloneError) {
      console.error('[create-stripe-checkout-session] Error cloning request or reading text:', cloneError);
      // If cloning fails, we might not be able to log the body before parsing but have a default message
    }

    const payload = await req.json();
    console.log('[create-stripe-checkout-session] Parsed Payload (req.json()):', payload);

    const { priceId, userId } = payload; // Destructure from the parsed payload

    console.log(`[create-stripe-checkout-session] Extracted priceId: ${priceId}, userId: ${userId}`);

    if (!priceId || !userId) {
      console.error('[create-stripe-checkout-session] Validation failed: Missing priceId or userId.', { priceId, userId });
      return new Response(
        JSON.stringify({ error: "Missing priceId or userId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const siteUrl = Deno.env.get("SITE_URL") || "http://localhost:5173"; // Default for local Vite dev

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "subscription",
      client_reference_id: userId, // Crucial for webhook to identify the user
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${siteUrl}/editor?session_id={CHECKOUT_SESSION_ID}`, // Or your desired success page
      cancel_url: `${siteUrl}/subscription`, // Back to plan selection
    });

    console.log('[create-stripe-checkout-session] Stripe session created successfully:', session.id);
    return new Response(
      JSON.stringify({ sessionId: session.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("[create-stripe-checkout-session] Error processing checkout session:", error, "Raw body was:", requestBodyTextForErrorLogging);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}); 