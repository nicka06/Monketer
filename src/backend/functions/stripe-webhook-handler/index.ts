import { serve } from "std/http/server";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { determineTierFromPriceId, type SubscriptionTier } from "./types.ts";

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

const supabaseClient = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

serve(async (req) => {
  try {
    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      return new Response('No signature provided', { status: 400 });
    }

    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SIGNING_SECRET')!;
    const body = await req.text();
    
    let event;
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        webhookSecret
      );
    } catch (err) {
      return new Response(`Webhook signature verification failed: ${err.message}`, { status: 400 });
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.client_reference_id;
        const stripeCustomerId = session.customer;
        const stripeSubscriptionId = session.subscription;

        if (!userId || !stripeCustomerId || !stripeSubscriptionId) {
          throw new Error('Missing required session data');
        }

        // Fetch subscription to determine tier
        const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
        const priceId = subscription.items.data[0].price.id;
        const newTier = determineTierFromPriceId(priceId);

        // Update user_info table
        const { error } = await supabaseClient
          .from('user_info')
          .update({
            stripe_customer_id: stripeCustomerId,
            stripe_subscription_id: stripeSubscriptionId,
            subscription_tier: newTier,
            subscription_status: 'active'
          })
          .eq('auth_user_uuid', userId);

        if (error) throw error;
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        if (
          invoice.billing_reason === 'subscription_cycle' ||
          invoice.billing_reason === 'subscription_create'
        ) {
          const stripeCustomerId = invoice.customer;
          const stripeSubscriptionId = invoice.subscription;

          // Update subscription status to active
          const { error } = await supabaseClient
            .from('user_info')
            .update({
              subscription_status: 'active'
            })
            .eq('stripe_customer_id', stripeCustomerId)
            .eq('stripe_subscription_id', stripeSubscriptionId);

          if (error) throw error;
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const stripeCustomerId = invoice.customer;
        const stripeSubscriptionId = invoice.subscription;

        // Update subscription status to past_due
        const { error } = await supabaseClient
          .from('user_info')
          .update({
            subscription_status: 'past_due'
          })
          .eq('stripe_customer_id', stripeCustomerId)
          .eq('stripe_subscription_id', stripeSubscriptionId);

        if (error) throw error;
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const stripeCustomerId = subscription.customer;
        const stripeSubscriptionId = subscription.id;
        const priceId = subscription.items.data[0].price.id;
        const newTier = determineTierFromPriceId(priceId);

        // Update user's subscription information
        const { error } = await supabaseClient
          .from('user_info')
          .update({
            subscription_tier: newTier,
            subscription_status: subscription.status
          })
          .eq('stripe_customer_id', stripeCustomerId)
          .eq('stripe_subscription_id', stripeSubscriptionId);

        if (error) throw error;
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const stripeCustomerId = subscription.customer;

        // Reset user to free tier
        const { error } = await supabaseClient
          .from('user_info')
          .update({
            subscription_tier: 'free',
            subscription_status: 'canceled',
            stripe_subscription_id: null
          })
          .eq('stripe_customer_id', stripeCustomerId);

        if (error) throw error;
        break;
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error('Error processing webhook:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}); 