// @ts-ignore Deno specific import
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
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
    
    const domainName = body.domainName;
    console.log(`[get-domain-provider] Processing domain: ${domainName}`);

    if (!domainName || typeof domainName !== 'string' || domainName.trim().length === 0) {
      console.warn('[get-domain-provider] domainName is required or invalid.');
      return new Response(JSON.stringify({ error: 'domainName is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Basic domain validation regex (not exhaustive)
    if (!/^[a-zA-Z0-9][a-zA-Z0-9-.]{1,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+$/.test(domainName)) {
      console.warn(`[get-domain-provider] Invalid domain name format: ${domainName}`);
      return new Response(JSON.stringify({ error: 'Invalid domain name format' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
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
    const providerName = identifyProvider(nameservers);
    console.log(`[get-domain-provider] Identified provider for ${domainName}: ${providerName}`);
    
    const response: GetDomainProviderResponse = {
      domain: domainName,
      provider: providerName || "Unknown / Custom Setup",
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