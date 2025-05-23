// @ts-ignore: Deno-specific import
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
// @ts-ignore: Deno-specific import
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeadersFactory } from '../_shared/lib/constants.ts';

// @ts-ignore: Deno-specific serve function
serve(async (req: Request) => {
  const corsHeaders = corsHeadersFactory(req.headers.get("origin") || "");

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  let supabase: SupabaseClient;

  try {
    const { userId } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Missing userId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // @ts-ignore: Deno-specific environment variable access
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    // @ts-ignore: Deno-specific environment variable access
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Supabase environment variables (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) are not set.");
      throw new Error("Supabase environment variables are not set.");
    }

    supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { error } = await supabase
      .from("user_info")
      .update({
        subscription_tier: "free",
        subscription_status: "active", // Or "free_active", depending on your status conventions
        stripe_customer_id: null, // Clear any previous Stripe IDs
        stripe_subscription_id: null,
      })
      .eq("auth_user_uuid", userId);

    if (error) {
      console.error("Error updating user to free plan:", error);
      throw error;
    }

    return new Response(
      JSON.stringify({ message: "Successfully subscribed to free plan" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("Error in subscribe-to-free-plan function:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}); 