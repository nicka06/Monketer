export interface GetDomainProviderRequest {
  emailSetupId: string;
}

export interface GetDomainProviderResponse {
  domain: string;
  provider?: string;
  nameservers?: string[];
  error?: string;
  rawNSDetails?: any[]; // For debugging or more detailed info from Deno.resolveDns
} 