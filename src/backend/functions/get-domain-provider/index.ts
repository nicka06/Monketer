// @ts-ignore Deno specific import
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
// @ts-ignore
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";
import { GetDomainProviderRequest, GetDomainProviderResponse } from './types.ts';
import { resolveNS } from './dns-lookup.ts';
import { identifyProvider } from './provider-map.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // IMPORTANT: Restrict this in production!
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS', // Explicitly allow POST and OPTIONS
};

console.log(`[get-domain-provider] Function starting up at ${new Date().toISOString()}`);

serve(async (req: Request) => {
  console.log(`[get-domain-provider] Received request: ${req.method} ${req.url}`);
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('[get-domain-provider] Handling OPTIONS preflight request.');
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      console.warn(`[get-domain-provider] Method not allowed: ${req.method}`);
      return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // @ts-ignore
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    // @ts-ignore
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("[get-domain-provider] Missing Supabase server configuration.");
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }
    const supabaseAdminClient = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 });
    }
    // @ts-ignore
    const userSupabaseClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: userError } = await userSupabaseClient.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: userError?.message || "User not authenticated" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 });
    }

    let body: GetDomainProviderRequest;
    try {
      body = await req.json();
    } catch (jsonError) {
      console.warn('[get-domain-provider] Invalid JSON body:', jsonError);
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const { emailSetupId } = body;
    console.log(`[get-domain-provider] Processing emailSetupId: ${emailSetupId}`);

    if (!emailSetupId || typeof emailSetupId !== 'string' || emailSetupId.trim().length === 0) {
      console.warn('[get-domain-provider] emailSetupId is required or invalid.');
      return new Response(JSON.stringify({ error: 'emailSetupId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch email_setups record to get the domain
    const { data: emailSetup, error: fetchError } = await supabaseAdminClient
      .from("email_setups")
      .select("domain, user_id, dns_provider_name")
      .eq("id", emailSetupId)
      .maybeSingle();

    if (fetchError || !emailSetup) {
      console.error(`[get-domain-provider] Error fetching email_setups for ID ${emailSetupId}:`, fetchError?.message);
      return new Response(JSON.stringify({ error: "Failed to retrieve email setup details or not found." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: fetchError ? 500 : 404 });
    }

    if (emailSetup.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Access denied. User does not own this email setup." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 });
    }

    const domainName = emailSetup.domain;
    if (!domainName || typeof domainName !== 'string' || domainName.trim().length === 0) {
      console.warn(`[get-domain-provider] Domain name not found or invalid for emailSetupId ${emailSetupId}.`);
      return new Response(JSON.stringify({ error: 'Domain name not found or invalid in email_setups record' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[get-domain-provider] Looking up NS records for domain: ${domainName}`);
    const { nameservers, error: dnsError, rawDetails } = await resolveNS(domainName);

    if (dnsError) {
      console.log(`[get-domain-provider] DNS error for ${domainName}: ${dnsError}`);
      const response: GetDomainProviderResponse = { domain: domainName, error: dnsError, rawNSDetails: rawDetails };
      return new Response(JSON.stringify(response), {
        // Consider 404 for NXDOMAIN, 503 for general lookup failures, or 200 with error payload
        status: dnsError.includes('NXDOMAIN') ? 404 : 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!nameservers || nameservers.length === 0) {
      console.log(`[get-domain-provider] No Name Servers found for ${domainName}`);
      const response: GetDomainProviderResponse = { domain: domainName, error: "No Name Servers found for this domain.", rawNSDetails: rawDetails };
      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[get-domain-provider] Nameservers for ${domainName}: ${nameservers.join(', ')}`);
    const identifiedProviderName = identifyProvider(nameservers);
    console.log(`[get-domain-provider] Identified provider for ${domainName}: ${identifiedProviderName}`);
    
    let finalProviderName = identifiedProviderName || "Unknown / Custom Setup";

    // Update dns_provider_name in email_setups table if a provider was identified
    // and it's different from what might already be there (or if it's null).
    if (identifiedProviderName && identifiedProviderName !== emailSetup.dns_provider_name) {
        const { error: updateError } = await supabaseAdminClient
            .from('email_setups')
            .update({ dns_provider_name: identifiedProviderName })
            .eq('id', emailSetupId);
        if (updateError) {
            console.error(`[get-domain-provider] Error updating dns_provider_name for ${emailSetupId}:`, updateError.message);
            // Don't fail the request, just log the error. The primary goal is to return the detected provider.
        } else {
            console.log(`[get-domain-provider] Successfully updated dns_provider_name to '${identifiedProviderName}' for ${emailSetupId}`);
            finalProviderName = identifiedProviderName; // Ensure the returned name reflects the update
        }
    } else if (identifiedProviderName) {
        finalProviderName = identifiedProviderName; // Use the identified one if it matched existing or was the first time.
    } else if (emailSetup.dns_provider_name) {
        finalProviderName = emailSetup.dns_provider_name; // Fallback to existing if no new one was identified.
    }

    const response: GetDomainProviderResponse = {
      domain: domainName,
      provider: finalProviderName,
      nameservers: nameservers,
      rawNSDetails: rawDetails
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (e) {
    console.error("[get-domain-provider] Unhandled error in function:", e);
    // Avoid sending detailed internal errors to client in production
    const errorMessage = (e instanceof Error) ? e.message : 'An internal server error occurred.';
    return new Response(JSON.stringify({ error: 'An internal server error occurred', details: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

console.log('[get-domain-provider] Function event listener attached.'); 