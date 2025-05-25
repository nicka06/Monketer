// @ts-ignore
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";
import { corsHeaders } from "../_shared/cors.ts"; // Assuming this path is correct as per sitemap/save-email-setup-form

interface ProviderInfo {
  name: string; // e.g., "Cloudflare", "GoDaddy", "Unknown"
  nameservers: string[];
}

interface InitiateEmailSetupRequest {
  emailSetupId: string; // ID from the email_setups table
  providerInfo: ProviderInfo;
}

interface DnsRecord {
  type: "MX" | "TXT" | "CNAME";
  host: string; // e.g., "@", "_dmarc", "selector._domainkey"
  value: string;
  priority?: number; // For MX records
  ttl?: number; // Optional TTL, e.g., 3600 for 1 hour
}

interface InitiateEmailSetupResponse {
  dnsSetupStrategy: 'manual'; // Always manual for now
  dkimSelector: string;
  requiredDnsRecords: DnsRecord[];
  message: string; // Message will now be more dynamic
}

// Updated to reflect the Express API response structure
interface MailServerDkimResponse {
  success?: boolean; // Assuming the script implies success if it returns a record
  dnsTxtRecord?: string; // e.g., "default._domainkey.example.com IN TXT \"v=DKIM1; k=rsa; p=...\""
  error?: string; // For explicit errors from the Express wrapper
  // selector is not explicitly returned as a separate field by the sample Express app
  message?: string; // Optional message from mail server API
}

console.log("Function initiate-email-setup (orchestrator) starting...");

serve(async (req) => {
  console.log("initiate-email-setup: Received request", req.method);

  if (req.method === "OPTIONS") {
    console.log("initiate-email-setup: Handling OPTIONS request");
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // @ts-ignore
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    // @ts-ignore
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    // @ts-ignore
    const mailServerDkimEndpoint = Deno.env.get("MAIL_SERVER_DKIM_ENDPOINT");
    // @ts-ignore
    const mailServerApiKey = Deno.env.get("MAIL_SERVER_SHARED_SECRET");
    // @ts-ignore
    const defaultMxValue = Deno.env.get("DEFAULT_MX_VALUE");
    // @ts-ignore
    const defaultSpfValue = Deno.env.get("DEFAULT_SPF_VALUE");

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("initiate-email-setup: Missing Supabase server configuration.");
      return new Response(JSON.stringify({ error: "Server configuration error (Supabase)." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }
    if (!mailServerDkimEndpoint) { // API key check removed if Express app doesn't use it yet, but highly recommended
      console.error("initiate-email-setup: Missing Mail Server DKIM endpoint configuration.");
      return new Response(JSON.stringify({ error: "Server configuration error (Mail Server DKIM)." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }
    // Add this check once your Express app supports API key
    if (!mailServerApiKey) {
        console.warn("initiate-email-setup: WARNING - MAIL_SERVER_SHARED_SECRET is not set. Calls to mail server will be unauthenticated.");
    }
    if (!defaultMxValue) {
        console.warn("initiate-email-setup: WARNING - DEFAULT_MX_VALUE environment variable not set. Using a placeholder.");
    }
    if (!defaultSpfValue) {
        console.warn("initiate-email-setup: WARNING - DEFAULT_SPF_VALUE environment variable not set. Using a placeholder.");
    }
    
    const supabaseAdminClient = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("initiate-email-setup: Missing Authorization header");
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    // @ts-ignore
    const userSupabaseClient = createClient(
      supabaseUrl,
      // @ts-ignore
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: userError } = await userSupabaseClient.auth.getUser();

    if (userError || !user) {
      console.error("initiate-email-setup: User auth error:", userError?.message || "No user found");
      return new Response(JSON.stringify({ error: userError?.message || "User not authenticated" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }
    console.log("initiate-email-setup: Authenticated user:", user.id);

    const requestData: InitiateEmailSetupRequest = await req.json();
    if (!requestData.emailSetupId || !requestData.providerInfo || !requestData.providerInfo.name) {
        console.error("initiate-email-setup: Invalid request payload. Missing emailSetupId or providerInfo.name.");
        return new Response(JSON.stringify({ error: "Invalid request payload. Missing emailSetupId or providerInfo.name." }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
        });
    }
    console.log("initiate-email-setup: Processing for emailSetupId:", requestData.emailSetupId, "Provider:", requestData.providerInfo.name);

    // 1. Fetch email_setups record (ensure user_id matches authenticated user)
    const { data: emailSetup, error: fetchError } = await supabaseAdminClient
      .from("email_setups")
      .select("domain, user_id, dkim_public_key, dns_records_to_set, dkim_selector") // Fetch dkim_public_key for idempotency
      .eq("id", requestData.emailSetupId)
      .single();

    if (fetchError) {
      console.error("initiate-email-setup: Error fetching email_setups record:", fetchError.message);
      return new Response(JSON.stringify({ error: "Failed to retrieve email setup details." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }
    if (!emailSetup) {
      console.error("initiate-email-setup: Email setup not found for id:", requestData.emailSetupId);
      return new Response(JSON.stringify({ error: "Email setup not found." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 404,
      });
    }
    if (emailSetup.user_id !== user.id) {
        console.error("initiate-email-setup: User ID mismatch. Authenticated user does not own this email setup.");
        return new Response(JSON.stringify({ error: "Access denied. You do not own this email setup." }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 403, // Forbidden
        });
    }
    const domain = emailSetup.domain;
    console.log("initiate-email-setup: Found domain:", domain, "for user:", user.id);

    let publicKeyBase64: string | undefined | null = undefined; // Can be null if provisioning fails
    const dkimSelectorToUse = emailSetup.dkim_selector || "default"; // Use stored selector or default
    let mailServerMessage = "DKIM provisioning status unknown.";
    let dkimProvisioningSuccessful = false;

    // Idempotency: Check if DKIM public key already exists and is valid
    if (emailSetup.dkim_public_key && typeof emailSetup.dkim_public_key === 'string' && /^[A-Za-z0-9+/]+={0,2}$/.test(emailSetup.dkim_public_key)) {
        publicKeyBase64 = emailSetup.dkim_public_key;
        dkimProvisioningSuccessful = true;
        mailServerMessage = "DKIM previously provisioned and key found in DB.";
        console.log("initiate-email-setup: " + mailServerMessage);
    } else if (emailSetup.dkim_public_key) {
        // Key exists but is invalid, recommend re-provisioning
        mailServerMessage = "Previously stored DKIM public key is invalid. Re-provisioning recommended.";
        console.warn("initiate-email-setup: " + mailServerMessage);
    }

    if (!dkimProvisioningSuccessful) {
        console.log(`Requesting DKIM from mail server for ${domain}, selector: ${dkimSelectorToUse}`);
        try {
            const headers: HeadersInit = { "Content-Type": "application/json" };
            if (mailServerApiKey) {
                headers["Authorization"] = `Bearer ${mailServerApiKey}`;
            }

            const mailServerResponse = await fetch(mailServerDkimEndpoint, {
                method: "POST",
                headers: headers,
                body: JSON.stringify({ domain: domain }) 
            });

            const mailServerResult: MailServerDkimResponse = await mailServerResponse.json();

            if (mailServerResponse.ok && mailServerResult.dnsTxtRecord) {
                const dkimMatch = mailServerResult.dnsTxtRecord.match(/IN TXT\s+"(?:v=DKIM1;\s*k=rsa;\s*p=)([^\"]+)"/i);
                const extractedPk = dkimMatch && dkimMatch[1] ? dkimMatch[1].replace(/\s+/g, "") : null;

                if (extractedPk && /^[A-Za-z0-9+/]+={0,2}$/.test(extractedPk)) {
                    publicKeyBase64 = extractedPk;
                    mailServerMessage = mailServerResult.message || "DKIM provisioned by mail server. DNS TXT record received.";
                    dkimProvisioningSuccessful = true;
                } else {
                    publicKeyBase64 = null; // Explicitly set to null on failure to extract/validate
                    mailServerMessage = `Mail server returned invalid DKIM TXT record format or key. Raw: ${mailServerResult.dnsTxtRecord}`;
                    console.error("initiate-email-setup: " + mailServerMessage);
                    dkimProvisioningSuccessful = false;
                }
            } else {
                publicKeyBase64 = null;
                mailServerMessage = `Mail server DKIM provisioning failed: ${mailServerResult.error || mailServerResponse.statusText || "Unknown error"}`;
                console.error("initiate-email-setup:", mailServerMessage);
                dkimProvisioningSuccessful = false;
            }
        } catch (e) {
            publicKeyBase64 = null;
            mailServerMessage = `Error calling mail server DKIM API: ${e.message}`;
            console.error("initiate-email-setup:", mailServerMessage, e.stack);
            dkimProvisioningSuccessful = false;
        }
    }

    const dnsSetupStrategy = 'manual'; // Always manual
    console.log("initiate-email-setup: Determined DNS setup strategy:", dnsSetupStrategy);

    const finalMxValue = defaultMxValue || `mail.${domain}`;
    const finalSpfValue = defaultSpfValue || `v=spf1 include:_spf.${domain} ~all`;

    const requiredDnsRecords: DnsRecord[] = [
      { type: "MX", host: "@", value: finalMxValue, priority: 10, ttl: 3600 },
      { type: "TXT", host: "@", value: finalSpfValue, ttl: 3600 },
      {
        type: "TXT",
        host: `${dkimSelectorToUse}._domainkey`,
        value: dkimProvisioningSuccessful && publicKeyBase64 ? `v=DKIM1; k=rsa; p=${publicKeyBase64}` : "v=DKIM1; k=rsa; p=ERROR_DKIM_NOT_PROVISIONED_OR_INVALID_KEY",
        ttl: 3600
      },
      { type: "TXT", host: "_dmarc", value: `v=DMARC1; p=none; rua=mailto:dmarc-reports@${domain}`, ttl: 3600 },
    ];
    console.log("initiate-email-setup: Generated required DNS records:", requiredDnsRecords.length);
    // Explicitly log the records for easier debugging in Supabase function logs
    console.log("Required DNS Records Details:", JSON.stringify(requiredDnsRecords, null, 2));

    // 4. Update email_setups table
    const newStatus = "awaiting_manual_dns_config"; // Always manual
    
    const updatePayload: any = {
        dns_provider_name: requestData.providerInfo.name,
        dns_setup_strategy: dnsSetupStrategy,
        dkim_selector: dkimSelectorToUse, 
        dkim_public_key: dkimProvisioningSuccessful ? publicKeyBase64 : null, // Store public key or null
        dns_records_to_set: requiredDnsRecords,
        status: newStatus,
        updated_at: new Date().toISOString(),
    };

    const { data: updatedSetup, error: updateError } = await supabaseAdminClient
      .from("email_setups")
      .update(updatePayload)
      .eq("id", requestData.emailSetupId)
      .select("id")
      .single();

    let finalClientMessage = dkimProvisioningSuccessful && publicKeyBase64 ? mailServerMessage : `DNS records ready for manual setup. ${mailServerMessage}`;
    if (!dkimProvisioningSuccessful || !publicKeyBase64) {
        finalClientMessage = `DKIM provisioning encountered an issue. ${mailServerMessage} Please check logs. DNS records provided with DKIM placeholder.`;
    }
    if (updateError) {
      console.error("initiate-email-setup: Error updating email_setups record:", updateError.message);
      finalClientMessage = `${finalClientMessage} (DB Update failed: ${updateError.message})` ;
    }

    console.log("Processed. Final client msg:", finalClientMessage);

    const responsePayload: InitiateEmailSetupResponse = {
      dnsSetupStrategy,
      dkimSelector: dkimSelectorToUse,
      requiredDnsRecords,
      message: finalClientMessage
    };

    return new Response(JSON.stringify(responsePayload), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200, 
    });

  } catch (error) {
    console.error("initiate-email-setup: General error:", error.message, error.stack);
    return new Response(JSON.stringify({ error: error.message || "An unknown error occurred." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
}); 