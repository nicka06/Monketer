export interface ProviderDnsUiFieldNames {
  recordType?: string; // How they label "Type" (e.g., "Record Type")
  host?: string;       // How they label "Host", "Name", "Hostname" (e.g., "Name")
  value?: string;      // How they label "Value", "Points to", "Content", "Target" (e.g., "Content")
  priority?: string;   // How they label "Priority" (e.g., "Priority")
  ttl?: string;        // How they label "TTL" (e.g., "TTL")
}

export interface ProviderInstructionStep {
  title: string;
  description: string; // Can include markdown for simple formatting if rendered appropriately
  link?: string;      // Optional link for more details on this step
}

export interface ProviderInstruction {
  id: string; // A unique identifier, e.g., "cloudflare", "godaddy", "google_domains". Should match `dns_provider_name` from `email_setups` table (after normalization like lowercasing).
  displayName: string; // User-friendly name, e.g., "Cloudflare"
  logoUrl?: string;     // URL to an SVG or PNG logo
  dnsManagementUrl?: string; // Direct link to their DNS management login/dashboard
  generalNotes?: string[]; // General tips or important notes for this provider
  instructionSteps: ProviderInstructionStep[];
  uiFieldNames?: ProviderDnsUiFieldNames; // Helps map our record fields to their UI labels
  recordSpecificTips?: {
    MX?: string[];
    TXT?: string[];
    SPF?: string[]; // Specific tip for SPF if needed
    DKIM?: string[];// Specific tip for DKIM if needed
    DMARC?: string[];// Specific tip for DMARC if needed
  };
}

// Example Data (to be expanded)
export const DNS_PROVIDER_INSTRUCTIONS: ProviderInstruction[] = [
  {
    id: "cloudflare", // Assuming dns_provider_name will be 'Cloudflare', then frontend will lowercase it.
    displayName: "Cloudflare",
    logoUrl: "/path/to/cloudflare-logo.svg", // Replace with actual path or URL
    dnsManagementUrl: "https://dash.cloudflare.com/",
    generalNotes: [
      "Cloudflare typically has very fast DNS propagation.",
      "Ensure the 'Proxy status' for these DNS records is set to 'DNS only' (grey cloud), not 'Proxied' (orange cloud), especially for MX, DKIM, and SPF records related to mail.",
    ],
    instructionSteps: [
      {
        title: "Log in to Cloudflare",
        description: "Go to [dash.cloudflare.com](https://dash.cloudflare.com/) and log in to your account.",
      },
      {
        title: "Select your domain",
        description: "From the dashboard, select the domain you are setting up (e.g., yourdomain.com).",
      },
      {
        title: "Navigate to DNS settings",
        description: "In the sidebar, click on 'DNS'.",
      },
      {
        title: "Add DNS Records",
        description: "Click the '+ Add record' button. For each record we provide below, you'll select the type (MX, TXT), and fill in the Host (Name), Value (Content), and Priority (for MX records) fields.",
        link: "https://developers.cloudflare.com/dns/manage-dns-records/how-to/create-dns-records/"
      },
    ],
    uiFieldNames: {
      host: "Name",
      value: "Content",
      ttl: "TTL"
    },
    recordSpecificTips: {
      MX: ["Cloudflare's 'Name' field for an MX record on the root domain should be '@' or your domain name.", "Ensure 'Proxy status' is 'DNS only'."],
      TXT: ["For TXT records on the root domain, use '@' or your domain name in the 'Name' field.", "Ensure 'Proxy status' is 'DNS only'."],
    }
  },
  {
    id: "godaddy",
    displayName: "GoDaddy",
    logoUrl: "/path/to/godaddy-logo.svg",
    dnsManagementUrl: "https://dcc.godaddy.com/domains",
    generalNotes: [
      "DNS changes on GoDaddy can sometimes take a bit longer to propagate.",
      "GoDaddy's interface might vary slightly depending on your account type."
    ],
    instructionSteps: [
      {
        title: "Log in to GoDaddy",
        description: "Go to [godaddy.com](https://www.godaddy.com/) and log in.",
      },
      {
        title: "Go to 'My Products'",
        description: "Navigate to your products page, usually accessible from the account menu.",
      },
      {
        title: "Find your domain and manage DNS",
        description: "Locate the domain you're setting up and click on 'DNS' or 'Manage DNS'.",
      },
      {
        title: "Add DNS Records",
        description: "Look for an 'Add' button to create new DNS records. You'll need to select the Type (MX, TXT) and fill in Host, Points to (Value), Priority (for MX), and TTL fields.",
        link: "https://www.godaddy.com/help/add-a-dns-record-19239"
      }
    ],
    uiFieldNames: {
      host: "Host",
      value: "Points to",
      ttl: "TTL"
    },
    recordSpecificTips: {
       MX: ["For the root domain, GoDaddy often uses '@' in the 'Host' field."],
       TXT: ["For the root domain, GoDaddy often uses '@' in the 'Host' field."],
    }
  },
  // Add more providers here (e.g., Google Domains, Namecheap, AWS Route 53, etc.)
  {
    id: "unknown", // Fallback for unknown providers
    displayName: "Your DNS Provider",
    generalNotes: [
      "The following are general instructions. Please consult your DNS provider's documentation for specific steps.",
      "You will need to log in to your domain registrar or DNS hosting provider's website to add these records.",
      "Look for a section like 'DNS Management', 'Advanced DNS Settings', or similar."
    ],
    instructionSteps: [
      {
        title: "Log in to your DNS Provider",
        description: "Access the control panel where you manage your domain's DNS settings."
      },
      {
        title: "Navigate to DNS Records Section",
        description: "Find the area to add or modify DNS records (e.g., MX, TXT, CNAME)."
      },
      {
        title: "Add Each Record",
        description: "Carefully add each record provided. Pay attention to Type, Host/Name, Value/Content, Priority (for MX), and TTL."
      }
    ],
    uiFieldNames: { // General terms
      host: "Host/Name",
      value: "Value/Content/Target/Points to",
      ttl: "TTL"
    }
  }
];

/**
 * Helper function to get instructions for a given provider ID.
 * Provider IDs should be normalized (e.g., lowercase).
 */
export const getInstructionsForProvider = (providerName?: string): ProviderInstruction => {
  const normalizedProviderId = providerName?.toLowerCase().replace(/\s+/g, '_') || 'unknown';
  return DNS_PROVIDER_INSTRUCTIONS.find(p => p.id === normalizedProviderId) || 
         DNS_PROVIDER_INSTRUCTIONS.find(p => p.id === 'unknown')!; // Fallback to unknown
}; 