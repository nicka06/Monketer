// @ts-ignore
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
// @ts-ignore
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";
import { corsHeaders } from "../_shared/cors.ts";

console.log("Function verify-dns-records starting...");

interface VerifyDnsRequest {
  emailSetupId: string;
}

interface DnsVerificationStatus {
  recordType: "MX" | "SPF" | "DKIM" | "DMARC";
  status: "verified" | "failed" | "pending" | "error"; // error for issues during check
  queriedValue?: string | string[];
  expectedValue?: string;
  message?: string;
}

interface VerifyDnsResponse {
  overallDnsStatus: "pending" | "partially_verified" | "verified" | "failed_to_verify";
  mxStatus: DnsVerificationStatus;
  spfStatus: DnsVerificationStatus;
  dkimStatus: DnsVerificationStatus;
  dmarcStatus: DnsVerificationStatus;
  lastVerificationAttemptAt: string;
  verificationFailureReason?: string;
}

async function checkMxRecord(
  domain: string,
  expectedValue: string | null,
  supabaseAdminClient: SupabaseClient // For potential future complex checks
): Promise<DnsVerificationStatus> {
  const result: DnsVerificationStatus = {
    recordType: "MX",
    status: "pending",
    expectedValue: expectedValue || "Not specified",
  };
  if (!expectedValue) {
    result.status = "error";
    result.message = "Expected MX value not found in database.";
    return result;
  }
  try {
    // @ts-ignore
    const mxRecords = await Deno.resolveDns(domain, "MX");
    result.queriedValue = mxRecords.map(r => `${r.priority} ${r.exchange}`).join(', ');
    // Simple check: does any returned record's exchange contain the expected value (ignoring priority for now)?
    // Expected value might be like "10 mail.example.com" or just "mail.example.com"
    const expectedExchange = expectedValue.split(' ').pop(); // Get the hostname part

    if (mxRecords.some(record => record.exchange.includes(expectedExchange!))) {
      result.status = "verified";
      result.message = "MX record matches expected value.";
    } else {
      result.status = "failed";
      result.message = `MX record not found or does not match. Found: ${result.queriedValue || 'none'}`;
    }
  } catch (error) {
    console.error(`verify-dns-records: Error resolving MX for ${domain}:`, error);
    result.status = "error";
    result.message = error.message.includes("No records found") ? "No MX records found." : `DNS resolution error: ${error.message}`;
  }
  return result;
}

async function checkTxtRecord(
  recordName: string, // e.g., domain for SPF, _dmarc.domain for DMARC, selector._domainkey.domain for DKIM
  recordTypeForStatus: "SPF" | "DKIM" | "DMARC",
  expectedValue: string | null, // For SPF/DMARC, this is the full TXT string. For DKIM, it's the p= part.
  supabaseAdminClient: SupabaseClient
): Promise<DnsVerificationStatus> {
  const result: DnsVerificationStatus = {
    recordType: recordTypeForStatus,
    status: "pending",
    expectedValue: expectedValue || "Not specified",
  };
  if (!expectedValue) {
    result.status = "error";
    result.message = `Expected ${recordTypeForStatus} value not found in database.`;
    return result;
  }
  try {
    // @ts-ignore
    const txtRecords = await Deno.resolveDns(recordName, "TXT");
    // Deno.resolveDns returns each TXT record as an array of strings (its parts if it was split), 
    // so we join them back and then process the array of full TXT records.
    const fullTxtRecords = txtRecords.map(parts => parts.join(''));
    result.queriedValue = fullTxtRecords.join('; ' + '\n');

    let matchFound = false;
    if (recordTypeForStatus === "DKIM") {
      // Expected value is the public key (p=...)
      // We need to find a TXT record that contains this p= part.
      // Example DKIM TXT: "v=DKIM1; k=rsa; p=MIGfMA0G..."
      const expectedPkFragment = `p=${expectedValue.replace(/\s+/g, "")}`;
      if (fullTxtRecords.some(record => record.replace(/\s+/g, "").includes(expectedPkFragment))) {
        matchFound = true;
      }
    } else if (recordTypeForStatus === "SPF") {
        // SPF check: one of the TXT records should start with "v=spf1"
        // and ideally contain the expected SPF string (or parts of it if it's complex with includes)
        // For simplicity, we'll check if *any* TXT record starts with v=spf1 and contains the core part of expected value.
        const coreExpectedSpf = expectedValue.replace(/\s+/g, ""); // Normalize spaces
        if (fullTxtRecords.some(record => record.startsWith("v=spf1") && record.replace(/\s+/g, "").includes(coreExpectedSpf))) {
            matchFound = true;
        }
    } else { // DMARC
      // DMARC check: one of the TXT records should start with "v=DMARC1"
      // and match the expected value.
      const coreExpectedDmarc = expectedValue.replace(/\s+/g, "");
       if (fullTxtRecords.some(record => record.startsWith("v=DMARC1") && record.replace(/\s+/g, "").includes(coreExpectedDmarc))) {
            matchFound = true;
        }
    }

    if (matchFound) {
      result.status = "verified";
      result.message = `${recordTypeForStatus} record matches expected value.`;
    } else {
      result.status = "failed";
      result.message = `${recordTypeForStatus} record not found or does not match. Found: ${result.queriedValue || 'none'}`;
    }
  } catch (error) {
    console.error(`verify-dns-records: Error resolving TXT for ${recordName} (${recordTypeForStatus}):`, error);
    result.status = "error";
    result.message = error.message.includes("No records found") ? `No ${recordTypeForStatus} (TXT) records found for ${recordName}.` : `DNS resolution error: ${error.message}`;
  }
  return result;
}


serve(async (req: Request) => {
  console.log("verify-dns-records: Received request", req.method);

  if (req.method === "OPTIONS") {
    console.log("verify-dns-records: Handling OPTIONS request");
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // @ts-ignore
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    // @ts-ignore
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("verify-dns-records: Missing Supabase server configuration.");
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

    const requestData: VerifyDnsRequest = await req.json();
    const { emailSetupId } = requestData;

    if (!emailSetupId) {
      return new Response(JSON.stringify({ error: "Missing emailSetupId" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 });
    }

    // 1. Fetch the email_setups record
    const { data: emailSetup, error: fetchError } = await supabaseAdminClient
      .from("email_setups")
      .select("domain, user_id, dkim_selector, dkim_public_key, mx_record_value, spf_record_value, dmarc_record_value")
      .eq("id", emailSetupId)
      .single();

    if (fetchError || !emailSetup) {
      console.error(`verify-dns-records: Error fetching email_setups for ID ${emailSetupId}:`, fetchError?.message);
      return new Response(JSON.stringify({ error: "Failed to retrieve email setup details or not found." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: fetchError ? 500 : 404 });
    }

    if (emailSetup.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Access denied." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 });
    }

    const { domain, dkim_selector, dkim_public_key, mx_record_value, spf_record_value, dmarc_record_value } = emailSetup;

    // 2. Perform DNS checks
    const mxStatus = await checkMxRecord(domain, mx_record_value, supabaseAdminClient);
    const spfStatus = await checkTxtRecord(domain, "SPF", spf_record_value, supabaseAdminClient);
    const dkimStatus = await checkTxtRecord(`${dkim_selector}._domainkey.${domain}`, "DKIM", dkim_public_key, supabaseAdminClient);
    const dmarcStatus = await checkTxtRecord(`_dmarc.${domain}`, "DMARC", dmarc_record_value, supabaseAdminClient);

    // 3. Determine overall status
    let overallStatus: VerifyDnsResponse['overallDnsStatus'] = "pending";
    const statuses = [mxStatus.status, spfStatus.status, dkimStatus.status, dmarcStatus.status];
    
    if (statuses.every(s => s === "verified")) {
      overallStatus = "verified";
    } else if (statuses.some(s => s === "failed")) {
      overallStatus = "failed_to_verify"; // If any fail, overall is failed
    } else if (statuses.some(s => s === "verified") && statuses.some(s => s === "pending")) {
      overallStatus = "partially_verified";
    } else if (statuses.every(s => s === "pending")) {
        overallStatus = "pending";
    } else if (statuses.some(s => s === "error")) {
        // If any individual check had an error (e.g. missing expected value, DNS resolution issue not being "not found")
        overallStatus = "failed_to_verify"; 
    }
    // If some are verified, some pending, but none failed or errored, it stays partially_verified or pending.

    const lastVerificationAttemptAt = new Date().toISOString();
    let verificationFailureReason = null;
    if (overallStatus === "failed_to_verify") {
        // Concatenate individual failure messages if any, or provide a general one
        verificationFailureReason = [
            mxStatus.status === 'failed' || mxStatus.status === 'error' ? `MX: ${mxStatus.message}` : null,
            spfStatus.status === 'failed' || spfStatus.status === 'error' ? `SPF: ${spfStatus.message}` : null,
            dkimStatus.status === 'failed' || dkimStatus.status === 'error' ? `DKIM: ${dkimStatus.message}` : null,
            dmarcStatus.status === 'failed' || dmarcStatus.status === 'error' ? `DMARC: ${dmarcStatus.message}` : null,
        ].filter(Boolean).join('; ') || "One or more DNS records could not be verified.";
    }

    // 4. Update database
    const updatePayload = {
      mx_status: mxStatus.status,
      spf_status: spfStatus.status,
      dkim_status: dkimStatus.status,
      dmarc_status: dmarcStatus.status,
      overall_dns_status: overallStatus,
      last_verification_attempt_at: lastVerificationAttemptAt,
      verification_failure_reason: verificationFailureReason,
      // Optionally update dns_records_to_set if queried values are more accurate/useful?
      // For now, we're just updating statuses.
    };

    const { error: updateError } = await supabaseAdminClient
      .from("email_setups")
      .update(updatePayload)
      .eq("id", emailSetupId);

    if (updateError) {
      console.error(`verify-dns-records: Error updating email_setups for ID ${emailSetupId}:`, updateError.message);
      // Don't fail the whole request if DB update fails, but log it and maybe return a specific error code/message to FE
      // For now, we proceed to return the checked statuses.
    }

    // 5. Return response
    const response: VerifyDnsResponse = {
      overallDnsStatus: overallStatus,
      mxStatus: mxStatus,
      spfStatus: spfStatus,
      dkimStatus: dkimStatus,
      dmarcStatus: dmarcStatus,
      lastVerificationAttemptAt: lastVerificationAttemptAt,
      verificationFailureReason: verificationFailureReason || undefined,
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("verify-dns-records: Unhandled error:", error);
    return new Response(JSON.stringify({ error: error.message || "An unexpected error occurred." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
}); 