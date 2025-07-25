export const FORM_FLOW_ORDER = [
  '/',                             // Business Description (Index.tsx)
  '/business-overview',            // BusinessOverviewPage.tsx (new step)
  '/optional-signup',              // OptionalSignUpPage.tsx
  '/goals-form',                   // GoalsFormPage.tsx
  '/select-emails',                // SelectEmailsPage.tsx
  '/website-status',               // WebsiteStatusPage.tsx
  '/info-clarification',           // InfoClarificationPage.tsx
  '/auth-gate',                    // AuthGatePage.tsx 
  '/dns-confirmation',             // DnsConfirmationPage.tsx
  '/website-tracking',              // WebsiteTrackingPage.tsx
  '/subscription-plan'             // PlanSelectionPage.tsx 
];

export const DNS_PROVIDER_DISPLAY_OPTIONS = [
  { id: 'godaddy', name: 'GoDaddy', logo: '/images/domain_provider_images/godaddy.png', instructionsUrl: 'https://dcc.godaddy.com/manage/{domain}/dns' },
  { id: 'namecheap', name: 'Namecheap', logo: '/images/domain_provider_images/namecheap.png', instructionsUrl: 'https://ap.www.namecheap.com/domains/dns/{domain}' },
  { id: 'cloudflare', name: 'Cloudflare', logo: '/images/domain_provider_images/cloudflare.png', instructionsUrl: 'https://dash.cloudflare.com/?to=/:account/:zone/dns/records' },
  { id: 'google_domains', name: 'Google Domains', logo: '/images/domain_provider_images/googledomain.png', instructionsUrl: 'https://domains.google.com/registrar/{domain}/dns' },
  { id: 'amazon_route_53', name: 'Amazon Route 53', logo: '/images/domain_provider_images/amazonroute53.png', instructionsUrl: 'https://console.aws.amazon.com/route53/v2/hostedzones#ListRecordSets/{domain}' },
  { id: 'squarespace', name: 'Squarespace', logo: '/images/domain_provider_images/squarespace.png', instructionsUrl: 'https://config.squarespace.com/pages/{domain}/settings/domains/dns' },
  { id: 'wix', name: 'Wix', logo: '/images/domain_provider_images/wix.png', instructionsUrl: 'https://www.wix.com/my-account/domain-manager/{domain}/dns-records' },
  { id: 'other', name: 'Other/Manual', logo: '/images/logos/', instructionsUrl: '' }
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