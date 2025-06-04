// @ts-ignore: Deno-specific URL import
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore: Deno-specific URL import
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// @ts-ignore: Deno-specific path import, if linter has issues with .ts extension or path resolution
import { corsHeaders } from "../_shared/cors.ts"; // Assuming cors.ts is one level up in _shared
// @ts-ignore Deno-specific environment variables
const supabaseUrl = Deno.env.get("SUPABASE_URL");
// @ts-ignore Deno-specific environment variables
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.");
  // Deno.exit(1); // Or handle more gracefully
}

// Initialize Supabase client with service_role key
const supabaseAdmin = createClient(supabaseUrl!, supabaseServiceKey!
  , { global: { headers: { Authorization: `Bearer ${supabaseServiceKey!}` } } }
);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { emailSetupId } = await req.json();

    if (!emailSetupId) {
      return new Response(JSON.stringify({ error: "emailSetupId is required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Fetch the current email_setup record
    let { data: setup, error: fetchError } = await supabaseAdmin
      .from("email_setups")
      .select("tracking_pixel_id")
      .eq("id", emailSetupId)
      .single();

    if (fetchError && fetchError.code !== "PGRST116") { // PGRST116 means no rows found, which is fine if we're creating
      console.error("Error fetching email_setup:", fetchError);
      return new Response(JSON.stringify({ error: "Failed to fetch setup data", details: fetchError.message }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    if (setup && setup.tracking_pixel_id) {
      // If tracking_pixel_id already exists, return it
      return new Response(JSON.stringify({ trackingPixelId: setup.tracking_pixel_id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    } else {
      // Generate a new UUID for tracking_pixel_id
      const newTrackingPixelId = crypto.randomUUID();

      // Update the email_setups table with the new tracking_pixel_id
      const { error: updateError } = await supabaseAdmin
        .from("email_setups")
        .update({ tracking_pixel_id: newTrackingPixelId })
        .eq("id", emailSetupId);

      if (updateError) {
        console.error("Error updating email_setup with new tracking_pixel_id:", updateError);
        return new Response(JSON.stringify({ error: "Failed to save new tracking ID", details: updateError.message }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        });
      }

      return new Response(JSON.stringify({ trackingPixelId: newTrackingPixelId }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200, // Or 201 if you consider it a new resource creation, though we return the ID
      });
    }
  } catch (e) {
    console.error("Error in get-or-create-tracking-id function:", e);
    return new Response(JSON.stringify({ error: "Internal server error", details: e.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
}); 