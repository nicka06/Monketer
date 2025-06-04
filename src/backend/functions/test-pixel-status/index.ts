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

    // Note: User authentication for this specific test function might not be strictly necessary
    // if emailSetupId is considered a sufficiently unique token for this context.
    // However, for other functions interacting with user data, auth is crucial.
    // For now, proceeding without user auth check for simplicity of this test endpoint.

    const requestData = await req.json();
    const emailSetupId = requestData?.emailSetupId;

    if (!emailSetupId) {
      console.error("test-pixel-status: emailSetupId is required in request body.");
      return new Response(JSON.stringify({ error: "emailSetupId is required." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }
    console.log("test-pixel-status: Testing for emailSetupId:", emailSetupId);

    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

    const { data, error } = await supabaseAdminClient
      .from("tracked_events")
      .select("page_url, client_timestamp, received_at")
      .eq("email_setup_id", emailSetupId)
      .eq("event_name", "emailore_pixel_loaded")
      .gte("received_at", tenMinutesAgo)
      .order("received_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("test-pixel-status: Error querying tracked_events:", error.message);
      return new Response(JSON.stringify({ error: "Failed to query tracking data.", details: error.message }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    if (data) {
      console.log("test-pixel-status: Pixel detected for", emailSetupId, "Data:", data);
      return new Response(
        JSON.stringify({
          success: true,
          message: `Pixel signal received successfully! Last seen on ${data.page_url || 'your site'} around ${new Date(data.received_at).toLocaleString()}.`,
          details: data,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    } else {
      console.log("test-pixel-status: Pixel not detected for", emailSetupId);
      return new Response(
        JSON.stringify({
          success: false,
          message: "Pixel not detected. We haven't received the initial signal from your website in the last 10 minutes. Please ensure the script is correctly installed, your website changes are live, and then try again. If you just installed it, wait a moment and retry.",
        }),
        // Consistent 200 OK with success:false, or 404 if preferred for "not found"
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