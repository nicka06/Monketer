export type SubscriptionTier = 'free' | 'pro' | 'premium';

export interface SubscriptionPlan {
  name: string;
  description: string;
  features: string[];
  priceId: string;
  projectLimit: number;
}

// Price ID prefixes for different tiers
export const PRICE_ID_PREFIXES = {
  PRO: 'price_PRO_',
  PREMIUM: 'price_PREMIUM_'
} as const;

export function determineTierFromPriceId(priceId: string): SubscriptionTier {
  if (priceId.startsWith(PRICE_ID_PREFIXES.PRO)) {
    return 'pro';
  } else if (priceId.startsWith(PRICE_ID_PREFIXES.PREMIUM)) {
    return 'premium';
  }
  return 'free';
} 