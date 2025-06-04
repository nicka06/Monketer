import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/useAuth';
import { loadStripe } from '@stripe/stripe-js';
import { SUBSCRIPTION_PLANS } from '@/shared/config/stripe';
import { useLoading } from '@/contexts/LoadingContext';

interface PlanFeature {
  name: string;
  included: boolean;
}

// Helper to get the base URL for Supabase functions
const getSupabaseFunctionUrl = (functionName: string) => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL; // Use import.meta.env
  if (supabaseUrl && supabaseUrl.includes('localhost')) {
    // Local development with Supabase CLI
    return `http://localhost:54321/functions/v1/${functionName}`;
  } else if (supabaseUrl) {
    // Production or staging environment
    // Assumes VITE_SUPABASE_URL is like https://your-project-ref.supabase.co
    const projectRef = supabaseUrl.split('.')[0].replace('https://', '');
    return `https://${projectRef}.functions.supabase.co/${functionName}`;
  }
  // Fallback or error if URL not defined, though it should be
  console.error('VITE_SUPABASE_URL is not defined in your environment variables.');
  return `/api-error-${functionName}`; // This will cause a 404, indicating a config issue
};

const PlanSelectionPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, session } = useAuth();
  const [selectedPlan, setSelectedPlan] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const { hideLoading } = useLoading();

  useEffect(() => {
    console.log("PlanSelectionPage: Hiding loading screen immediately.");
    hideLoading();
  }, [hideLoading]);

  const handlePlanSelection = async (plan: typeof SUBSCRIPTION_PLANS[number]) => {
    if (!user || !session) {
      navigate('/login');
      return;
    }

    setIsLoading(true);
    try {
      if (plan.id === 'free') {
        console.log('[PlanSelectionPage.tsx] handleSelectFreePlan started. User ID:', user.id);
        const freePlanUrl = getSupabaseFunctionUrl('subscribe-to-free-plan');
        console.log('[PlanSelectionPage.tsx] Calling Supabase function at URL:', freePlanUrl);
        const response = await fetch(freePlanUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ userId: user.id }),
        });
        console.log('[PlanSelectionPage.tsx] Response status from subscribe-to-free-plan:', response.status);

        if (!response.ok) {
          let errorData = { error: 'Failed to select free plan with no details' };
          try {
            errorData = await response.json();
            console.error('[PlanSelectionPage.tsx] Error response data from subscribe-to-free-plan:', errorData);
          } catch (jsonError) {
            console.error('[PlanSelectionPage.tsx] Failed to parse JSON error response from subscribe-to-free-plan:', jsonError);
          }
          throw new Error(errorData.error || 'Failed to select free plan');
        }
        
        try {
          const responseData = await response.json();
          console.log('[PlanSelectionPage.tsx] Success response data from subscribe-to-free-plan:', responseData);
        } catch (jsonError) {
          console.warn('[PlanSelectionPage.tsx] Could not parse JSON from successful response (subscribe-to-free-plan):', jsonError);
        }

        navigate('/editor');
      } else {
        const checkoutUrl = getSupabaseFunctionUrl('create-stripe-checkout-session');
        const response = await fetch(checkoutUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            priceId: plan.stripePriceId,
            userId: user.id,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Failed to create checkout session with no details' }));
          throw new Error(errorData.error || 'Failed to create checkout session');
        }

        const { sessionId } = await response.json();
        
        console.log('[PlanSelectionPage.tsx] VITE_STRIPE_PUBLISHABLE_KEY just before check:', import.meta.env.VITE_PUBLIC_STRIPE_PUBLISHABLE_KEY);
        const stripePublishableKey = import.meta.env.VITE_PUBLIC_STRIPE_PUBLISHABLE_KEY;
        if (!stripePublishableKey) {
          throw new Error('Stripe publishable key is not configured.');
        }

        const stripe = await loadStripe(stripePublishableKey);
        if (stripe) {
          const { error } = await stripe.redirectToCheckout({ sessionId });
          if (error) {
            console.error('Stripe redirect error:', error);
            throw new Error(error.message || 'Failed to redirect to Stripe checkout.');
          }
        }
      }
    } catch (error: any) {
      console.error('Error selecting plan:', error);
      // TODO: Add error notification using useToast or similar
      alert(`Error: ${error.message}`); // Simple alert for now
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            Choose Your Plan
          </h2>
          <p className="mt-4 text-xl text-gray-600">
            Select the plan that best fits your needs
          </p>
        </div>

        <div className="mt-12 space-y-4 sm:mt-16 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-6 lg:max-w-4xl lg:mx-auto xl:max-w-none xl:grid-cols-3">
          {SUBSCRIPTION_PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`rounded-lg shadow-lg divide-y divide-gray-200 bg-white
                ${selectedPlan === plan.id ? 'ring-2 ring-indigo-600' : ''}
              `}
            >
              <div className="p-6">
                <h3 className="text-2xl font-semibold text-gray-900">{plan.name}</h3>
                <p className="mt-4 text-sm text-gray-500">
                  {plan.id === 'free' ? 'Perfect for trying out the platform' :
                   plan.id === 'pro' ? 'For professionals and small teams' :
                   'For power users and agencies'}
                </p>
                <p className="mt-8">
                  <span className="text-4xl font-extrabold text-gray-900">${plan.price}</span>
                  {plan.price !== 0 && <span className="text-base font-medium text-gray-500">/month</span>}
                </p>
                <button
                  onClick={() => handlePlanSelection(plan)}
                  disabled={isLoading}
                  className={`mt-8 block w-full py-3 px-6 border border-transparent rounded-md text-center font-medium
                    ${plan.id === 'premium'
                      ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                      : plan.id === 'pro'
                      ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                      : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                    } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                >
                  {isLoading ? 'Processing...' : plan.id === 'free' ? 'Select Plan' : 'Subscribe Now'}
                </button>
              </div>
              <div className="px-6 pt-6 pb-8">
                <h4 className="text-sm font-medium text-gray-900 tracking-wide">Features include:</h4>
                <ul className="mt-6 space-y-4">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex space-x-3">
                      <svg className="flex-shrink-0 h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm text-gray-900">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PlanSelectionPage; 