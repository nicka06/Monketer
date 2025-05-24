// In a real-world scenario, this list would be much more extensive and carefully curated.
interface ProviderRule {
  pattern: RegExp;
  name: string;
}

export const PROVIDER_RULES: ProviderRule[] = [
  { pattern: /awsdns-\d{2}\.(com|net|org|co\.uk)/i, name: 'Amazon Route 53' },
  { pattern: /dns\.google\.com/i, name: 'Google Cloud DNS' },
  { pattern: /\.googledomains\.com/i, name: 'Google Domains' },
  { pattern: /azure-dns\.(com|net|org|info)/i, name: 'Azure DNS' },
  { pattern: /\.ns\.cloudflare\.com/i, name: 'Cloudflare' },
  { pattern: /\.godaddy\.com/i, name: 'GoDaddy' },
  { pattern: /\.domaincontrol\.com/i, name: 'GoDaddy (Legacy/Reseller)' },
  { pattern: /\.namecheaphosting\.com/i, name: 'Namecheap' },
  { pattern: /dns[0-9]*\.registrar-servers\.com/i, name: 'Namecheap (Default)'},
  { pattern: /dnsimple\.com/i, name: 'DNSimple' },
  { pattern: /akam\.net/i, name: 'Akamai' },
  { pattern: /squarespacedns\.com/i, name: 'Squarespace' },
  { pattern: /wixdns\.net/i, name: 'Wix' },
  // Add more common providers here
];

export function identifyProvider(nameservers: string[]): string | undefined {
  if (!nameservers || nameservers.length === 0) {
    return undefined;
  }
  for (const ns of nameservers) {
    for (const rule of PROVIDER_RULES) {
      if (rule.pattern.test(ns)) {
        return rule.name;
      }
    }
  }
  return undefined; // Or a default like "Unknown / Custom Nameservers"
} 