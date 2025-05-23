export const FREE_TIER = {
  name: 'Free',
  price: 0,
  projectLimit: 1,
  features: [
    'Create 1 email project',
    'Basic email templates',
    'Preview and test sending'
  ]
};

console.log('[stripe.ts] VITE_STRIPE_PRO_PRICE_ID:', import.meta.env.VITE_PUBLIC_STRIPE_PRO_PRICE_ID);
console.log('[stripe.ts] VITE_STRIPE_PREMIUM_PRICE_ID:', import.meta.env.VITE_PUBLIC_STRIPE_PREMIUM_PRICE_ID);

export const SUBSCRIPTION_PLANS = [
  {
    ...FREE_TIER,
    id: 'free'
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 19,
    projectLimit: 25,
    features: [
      'Create up to 25 email projects',
      'Advanced email templates',
      'Priority support',
      'Analytics and tracking',
      'Team collaboration'
    ],
    stripePriceId: import.meta.env.VITE_PUBLIC_STRIPE_PRO_PRICE_ID
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 49,
    projectLimit: Infinity,
    features: [
      'Unlimited email projects',
      'Custom email templates',
      'Priority support',
      'Advanced analytics',
      'Team collaboration',
      'Custom branding',
      'API access'
    ],
    stripePriceId: import.meta.env.VITE_PUBLIC_STRIPE_PREMIUM_PRICE_ID
  }
]; 