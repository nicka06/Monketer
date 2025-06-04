// src/backend/functions/test-pixel-status/index.ts
// @ts-ignore
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";
import { corsHeaders } from "../_shared/cors.ts";

console.log("Function test-pixel-status (orchestrator) starting...");

serve(async (req) => {
  console.log("test-pixel-status: Received request", req.method);

  if (req.method === "OPTIONS") {
    console.log("test-pixel-status: Handling OPTIONS request");
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // @ts-ignore
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    // @ts-ignore
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      const errorMsg = "Server configuration error: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.";
      console.error("test-pixel-status: " + errorMsg);
      return new Response(JSON.stringify({ error: errorMsg }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }
    
    const supabaseAdminClient = createClient(supabaseUrl, supabaseServiceKey);

    const requestData = await req.json();
    const emailSetupRecordId = requestData?.emailSetupId; // This is the primary ID of the email_setups table row

    if (!emailSetupRecordId) {
      console.error("test-pixel-status: emailSetupId (record ID) is required in request body.");
      return new Response(JSON.stringify({ error: "emailSetupId (record ID) is required." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }
    console.log("test-pixel-status: Testing for email_setups record ID:", emailSetupRecordId);

    // 1. Fetch the tracking_pixel_id from the email_setups table
    const { data: setupData, error: setupFetchError } = await supabaseAdminClient
      .from("email_setups")
      .select("tracking_pixel_id, id") // Also select id for logging clarity
      .eq("id", emailSetupRecordId)
      .single();

    if (setupFetchError) {
      console.error("test-pixel-status: Error fetching email_setup data for record ID:", emailSetupRecordId, "Error:", setupFetchError.message);
      return new Response(JSON.stringify({ error: "Failed to fetch setup data.", details: setupFetchError.message }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    if (!setupData || !setupData.tracking_pixel_id) {
      console.error("test-pixel-status: tracking_pixel_id not found or is null in email_setups for record ID:", emailSetupRecordId, "Fetched setupData:", JSON.stringify(setupData));
      return new Response(JSON.stringify({ 
        success: false, 
        message: "Tracking pixel ID not configured for this setup. Please ensure the pixel setup process on the Website Tracking page has completed."
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200, // Still 200, but success: false
      });
    }

    const actualTrackingPixelId = setupData.tracking_pixel_id;
    console.log("test-pixel-status: Successfully fetched from email_setups. Record ID:", emailSetupRecordId, "Retrieved tracking_pixel_id:", actualTrackingPixelId);

    // 2. Use the actualTrackingPixelId to query tracked_events
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const eventName = "emailore_pixel_loaded";

    console.log(
      "test-pixel-status: Querying tracked_events with params:",
      JSON.stringify({
        email_setup_id: actualTrackingPixelId,
        event_name: eventName,
        received_at_gte: tenMinutesAgo,
      })
    );

    const { data: eventData, error: eventFetchError } = await supabaseAdminClient
      .from("tracked_events")
      .select("page_url, client_timestamp, received_at")
      // IMPORTANT: Ensure the column in tracked_events that stores the pixel's ID is actually named 'email_setup_id'
      // If it was intended to store the tracking_pixel_id, this query is correct.
      .eq("email_setup_id", actualTrackingPixelId) 
      .eq("event_name", eventName)
      .gte("received_at", tenMinutesAgo)
      .order("received_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (eventFetchError) {
      console.error("test-pixel-status: Error querying tracked_events:", eventFetchError.message);
      return new Response(JSON.stringify({ error: "Failed to query tracking data.", details: eventFetchError.message }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    if (eventData) {
      console.log("test-pixel-status: Pixel detected for actualTrackingPixelId:", actualTrackingPixelId, "Data:", eventData);
      return new Response(
        JSON.stringify({
          success: true,
          message: `Pixel signal received successfully! Last seen on ${eventData.page_url || 'your site'} around ${new Date(eventData.received_at).toLocaleString()}.`,
          details: eventData,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    } else {
      console.log("test-pixel-status: Pixel not detected for actualTrackingPixelId:", actualTrackingPixelId);
      return new Response(
        JSON.stringify({
          success: false,
          message: "Pixel not detected. We haven't received the initial signal from your website (using the correct tracking ID) in the last 10 minutes. Please ensure the script is correctly installed with the latest ID, your website changes are live, and then try again. If you just installed it, wait a moment and retry.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 } 
      );
    }
  } catch (err) {
    console.error("test-pixel-status: General error:", err.message, err.stack ? err.stack : '');
    return new Response(JSON.stringify({ error: err.message || "An unknown error occurred." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
}); 