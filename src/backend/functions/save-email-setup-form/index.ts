// @ts-ignore
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";
// Adjust path if your shared directory is different relative to this function
import { corsHeaders } from "../_shared/cors.ts";

interface ScenarioSenderConfig {
  scenarioId: string;
  fromName?: string;
  fromEmail?: string;
}

interface EmailSetupFormData {
  areaOfBusiness?: string;
  subCategory?: string;
  goals?: string[];
  emailScenarios?: string[];
  defaultFromName?: string;
  defaultFromEmail?: string;
  scenarioSenders?: ScenarioSenderConfig[];
  domain?: string; 
  sendTimeline?: string;
}

console.log("Function save-email-setup-form starting...");

serve(async (req) => {
  console.log("save-email-setup-form: Received request", req.method);

  if (req.method === "OPTIONS") {
    console.log("save-email-setup-form: Handling OPTIONS request");
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // @ts-ignore
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    // @ts-ignore
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"); // Use Service Role Key for backend operations

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
      return new Response(JSON.stringify({ error: "Server configuration error." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }
    
    // Create a new Supabase client with the Service Role Key for elevated privileges
    const supabaseAdminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Get the JWT from the auth header to identify the user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("save-email-setup-form: Missing Authorization header");
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }
    
    // Use the Authorization header to get the user from the client-side token
    // This client is specifically for fetching the user based on their token.
    const userSupabaseClient = createClient(
      supabaseUrl, 
      // @ts-ignore
      Deno.env.get("SUPABASE_ANON_KEY") ?? "", // Anon key is fine here for getUser
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: userError } = await userSupabaseClient.auth.getUser();

    if (userError || !user) {
      console.error("save-email-setup-form: User auth error:", userError?.message || "No user found");
      return new Response(JSON.stringify({ error: userError?.message || "User not authenticated" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }
    console.log("save-email-setup-form: Authenticated user:", user.id);

    const formData: EmailSetupFormData = await req.json();
    console.log("save-email-setup-form: Received formData for domain:", formData.domain);


    if (!formData.domain || !formData.domain.trim()) {
      return new Response(JSON.stringify({ error: "Domain is required." }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 });
    }
    if (!formData.defaultFromEmail || !formData.defaultFromEmail.trim()) {
         return new Response(JSON.stringify({ error: "Default From Email is required." }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 });
    }
     if (!formData.defaultFromName || !formData.defaultFromName.trim()) {
         return new Response(JSON.stringify({ error: "Default From Name is required." }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 });
    }
    
    const domainToSave = formData.domain.trim();

    // Upsert into email_setups
    // Using user_id and domain as conflict targets for upsert
    const { data: emailSetup, error: emailSetupError } = await supabaseAdminClient
      .from("email_setups")
      .upsert({
        user_id: user.id, // Make sure this column exists and is linked to auth.users
        domain: domainToSave, 
        business_area: formData.areaOfBusiness,
        business_subcategory: formData.subCategory,
        goals: formData.goals,
        email_scenarios: formData.emailScenarios,
        default_from_name: formData.defaultFromName,
        default_from_email: formData.defaultFromEmail,
        send_timeline: formData.sendTimeline,
        status: "pending_dns_config", // Initial status after form save
      }, { onConflict: 'user_id,domain' }) // Assumes you have a UNIQUE constraint on (user_id, domain)
      .select()
      .single();

    if (emailSetupError) {
      console.error("save-email-setup-form: Error upserting to email_setups:", emailSetupError);
      throw emailSetupError;
    }
    if (!emailSetup || !emailSetup.id) {
        console.error("save-email-setup-form: Failed to get ID from email_setups upsert.");
        throw new Error("Failed to save primary email setup data or retrieve its ID.");
    }
    
    const emailSetupId = emailSetup.id;
    console.log("save-email-setup-form: Upserted email_setups record ID:", emailSetupId);

    // Handle scenario_sender_configs
    if (formData.scenarioSenders && formData.scenarioSenders.length > 0) {
        console.log("save-email-setup-form: Processing scenarioSenders for setup ID:", emailSetupId);
        // Delete existing ones for this email_setup_id to handle updates cleanly
        const { error: deleteError } = await supabaseAdminClient
            .from("scenario_sender_configs")
            .delete()
            .eq("email_setup_id", emailSetupId);

        if (deleteError) {
            console.error("save-email-setup-form: Error deleting old scenario_sender_configs:", deleteError);
            // Potentially non-critical, but log it
        }

        const senderConfigsToInsert = formData.scenarioSenders
            .filter(s => s.fromName?.trim() || s.fromEmail?.trim()) // Only insert if there's actual data
            .map(s => ({
                email_setup_id: emailSetupId,
                scenario_id: s.scenarioId,
                from_name: s.fromName,
                from_email: s.fromEmail,
            }));
        
        if (senderConfigsToInsert.length > 0) {
            const { error: senderConfigsError } = await supabaseAdminClient
                .from("scenario_sender_configs")
                .insert(senderConfigsToInsert);

            if (senderConfigsError) {
                console.error("save-email-setup-form: Error saving scenario_sender_configs:", senderConfigsError);
                throw senderConfigsError; // This might be critical
            }
            console.log("save-email-setup-form: Saved scenario_sender_configs:", senderConfigsToInsert.length);
        } else {
            console.log("save-email-setup-form: No scenarioSenders with data to insert for setup ID:", emailSetupId);
        }
    } else {
        // No scenarioSenders provided in formData, ensure none exist in DB for this setup
        console.log("save-email-setup-form: No scenarioSenders in formData. Deleting any existing for setup ID:", emailSetupId);
        const { error: deleteError } = await supabaseAdminClient
            .from("scenario_sender_configs")
            .delete()
            .eq("email_setup_id", emailSetupId);
        if (deleteError) {
             console.error("save-email-setup-form: Error deleting scenario_sender_configs when none provided in formData:", deleteError);
        }
    }

    console.log("save-email-setup-form: Successfully saved data for emailSetupId:", emailSetupId);
    return new Response(JSON.stringify({ success: true, emailSetupId: emailSetupId, message: "Email setup data saved." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("save-email-setup-form: General error:", error.message, error.stack);
    return new Response(JSON.stringify({ error: error.message || "An unknown error occurred." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
}); 