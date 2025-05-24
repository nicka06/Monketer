// dns-lookup.ts
// Note: Deno and its APIs are available in Supabase Edge Functions.

/**
 * Resolves NS records for a given domain name using Deno.resolveDns.
 * 
 * @param domainName The domain to resolve.
 * @returns An object containing nameservers, an error message if applicable,
 *          and the raw DNS records for debugging.
 */
export async function resolveNS(domainName: string): Promise<{
  nameservers?: string[];
  error?: string;
  rawDetails?: any[]; // Deno.resolveDns returns an array of DnsRecord objects
}> {
  try {
    // Deno.resolveDns for 'NS' records typically returns an array of objects,
    // where each object has a `value` property containing the NS hostname.
    // Example: { type: "NS", name: "example.com", value: "ns1.example.com", ttl: 3600 }
    // @ts-ignore Deno is a global in Supabase Edge Functions
    const records: any[] = await Deno.resolveDns(domainName, "NS");

    if (records && records.length > 0) {
      const nsHostnames = records.map(r => {
        if (typeof r === 'string') {
          return r; // If the record itself is the hostname string
        }
        if (r && typeof r.value === 'string') {
          return r.value; // If the record is an object with a 'value' property
        }
        if (r && typeof r.target === 'string') { // Some DNS libs use 'target' for CNAME-like records
            return r.target;
        }
        return null; // Or some other way to indicate an invalid record structure
      }).filter(value => typeof value === 'string' && value.length > 0) as string[];
      
      if (nsHostnames.length > 0) {
        return { nameservers: nsHostnames, rawDetails: records };
      }
      return { error: "No valid NS record values found after mapping.", rawDetails: records };
    }
    return { error: "No NS records found.", rawDetails: records };
  } catch (e) {
    console.error(`DNS resolution error for ${domainName}:`, e);
    // Check for common error types if Deno.resolveDns throws specific errors
    // This part might need adjustment based on how Deno.resolveDns behaves for various errors.
    // @ts-ignore Deno is a global in Supabase Edge Functions
    if (e instanceof Deno.errors.NotFound || (e.message && (e.message.includes('NXDOMAIN') || e.message.includes('No such host')))) {
      return { error: "Domain does not exist (NXDOMAIN)." };
    }
    return { error: `DNS lookup failed: ${e.message}` };
  }
} 