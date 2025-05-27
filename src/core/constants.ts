export const FORM_FLOW_ORDER = [
  '/',                             // Business Description (Index.tsx)
  '/business-overview',            // BusinessOverviewPage.tsx (new step)
  '/optional-signup',              // OptionalSignUpPage.tsx
  '/goals-form',                   // GoalsFormPage.tsx
  '/select-emails',                // SelectEmailsPage.tsx
  '/website-status',               // WebsiteStatusPage.tsx
  '/info-clarification',           // InfoClarificationPage.tsx
  '/auth-gate',                    // AuthGatePage.tsx (NEW)
  '/dns-confirmation',             // DnsConfirmationPage.tsx
  '/website-tracking'              // WebsiteTrackingPage.tsx
];

export const DNS_PROVIDER_DISPLAY_OPTIONS = [
  { id: 'godaddy', name: 'GoDaddy', logo: '/images/logos/godaddy-logo.png', instructionsUrl: 'https://dcc.godaddy.com/manage/{domain}/dns' },
  { id: 'namecheap', name: 'Namecheap', logo: '/images/logos/namecheap-logo.png', instructionsUrl: 'https://ap.www.namecheap.com/domains/dns/{domain}' },
  { id: 'cloudflare', name: 'Cloudflare', logo: '/images/logos/cloudflare-logo.png', instructionsUrl: 'https://dash.cloudflare.com/?to=/:account/:zone/dns/records' },
  { id: 'google_domains', name: 'Google Domains', logo: '/images/logos/google-domains-logo.png', instructionsUrl: 'https://domains.google.com/registrar/{domain}/dns' },
  { id: 'amazon_route_53', name: 'Amazon Route 53', logo: '/images/logos/aws-logo.png', instructionsUrl: 'https://console.aws.amazon.com/route53/v2/hostedzones#ListRecordSets/{domain}' },
  { id: 'squarespace', name: 'Squarespace', logo: '/images/logos/squarespace-logo.png', instructionsUrl: 'https://config.squarespace.com/pages/{domain}/settings/domains/dns' },
  { id: 'wix', name: 'Wix', logo: '/images/logos/wix-logo.png', instructionsUrl: 'https://www.wix.com/my-account/domain-manager/{domain}/dns-records' },
  { id: 'other', name: 'Other/Manual', logo: '/images/logos/dns-logo.png', instructionsUrl: '' }
];

export const PROVIDER_MAP_TO_DISPLAY_OPTION_ID: { [key: string]: string } = {
  'GoDaddy': 'godaddy',
  'GoDaddy (Legacy/Reseller)': 'godaddy',
  'Namecheap': 'namecheap',
  'Namecheap (Default)': 'namecheap',
  'Cloudflare': 'cloudflare',
  'Google Domains': 'google_domains',
  'Google Cloud DNS': 'google_domains',
  'Amazon Route 53': 'amazon_route_53',
  'Squarespace': 'squarespace',
  'Wix': 'wix',
  'Unknown / Custom Setup': 'other',
}; 