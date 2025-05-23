import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SubscriptionProtectedRouteProps {
  children: React.ReactNode;
}

const SubscriptionProtectedRoute: React.FC<SubscriptionProtectedRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const [subscriptionChecked, setSubscriptionChecked] = useState(false);
  const [userInfo, setUserInfo] = useState<{
    subscription_tier: 'free' | 'pro' | 'premium';
    subscription_status: string;
    project_count: number;
  } | null>(null);

  useEffect(() => {
    console.log('[SubscriptionProtectedRoute] useEffect triggered. User:', user);
    const checkSubscription = async () => {
      if (!user) {
        console.log('[SubscriptionProtectedRoute] No user in checkSubscription, returning.');
        setSubscriptionChecked(true); // Still set to true to allow rendering of login redirect if needed
        return;
      }

      try {
        console.log(`[SubscriptionProtectedRoute] Fetching user_info for user ID: ${user.id}`);
        const { data, error } = await supabase
          .from('user_info')
          .select('subscription_tier, subscription_status, project_count')
          .eq('auth_user_uuid', user.id)
          .single();

        if (error) {
          console.error('[SubscriptionProtectedRoute] Error fetching user_info:', error);
          toast({
            title: 'Error',
            description: 'Could not fetch subscription details',
            variant: 'destructive',
          });
          // If error fetching, treat as no subscription info for now, could be more nuanced
          setUserInfo(null); 
        } else {
          console.log('[SubscriptionProtectedRoute] Fetched user_info data:', data);
          setUserInfo(data);
        }
      } catch (error) {
        console.error('[SubscriptionProtectedRoute] Outer error in checkSubscription:', error);
        toast({
          title: 'Error',
          description: 'Could not verify subscription status',
          variant: 'destructive',
        });
        setUserInfo(null); // Ensure userInfo is null on error
      } finally {
        console.log('[SubscriptionProtectedRoute] Setting subscriptionChecked to true.');
        setSubscriptionChecked(true);
      }
    };

    if (user) {
      checkSubscription();
    } else if (!loading) { // If no user and not loading, means unauthenticated
      console.log('[SubscriptionProtectedRoute] No user and not loading, setting subscriptionChecked to true for redirect logic.');
      setSubscriptionChecked(true);
    }
  }, [user, loading, toast]); // Added loading to dependency array

  console.log('[SubscriptionProtectedRoute] Rendering. Loading:', loading, 'SubscriptionChecked:', subscriptionChecked, 'User:', user, 'UserInfo:', userInfo);

  if (loading || !subscriptionChecked) {
    console.log('[SubscriptionProtectedRoute] Condition: Loading or subscription not checked. Showing loading screen...');
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  if (!user) {
    console.log('[SubscriptionProtectedRoute] Condition: No user. Redirecting to /login.');
    return <Navigate to="/login" />;
  }

  // If no subscription info found, redirect to plan selection
  if (!userInfo?.subscription_tier) {
    console.log('[SubscriptionProtectedRoute] Condition: No userInfo.subscription_tier. Redirecting to /subscription. UserInfo:', userInfo);
    return <Navigate to="/subscription" />;
  }

  // Check subscription status
  if (userInfo.subscription_status !== 'active') {
    console.log(`[SubscriptionProtectedRoute] Condition: userInfo.subscription_status is "${userInfo.subscription_status}" (not 'active'). Redirecting to /subscription.`);
    toast({
      title: 'Subscription Required',
      description: 'Your subscription is not active. Please update your subscription to continue.',
      variant: 'destructive',
    });
    return <Navigate to="/subscription" />;
  }

  // Check project limits based on tier
  const projectLimits = {
    free: 1,
    pro: 25,
    premium: Infinity,
  };

  if (userInfo.project_count >= projectLimits[userInfo.subscription_tier]) {
    console.log(`[SubscriptionProtectedRoute] Condition: Project limit reached for tier "${userInfo.subscription_tier}". Redirecting to /subscription.`);
    toast({
      title: 'Project Limit Reached',
      description: `You've reached the project limit for your ${userInfo.subscription_tier} plan. Please upgrade to create more projects.`,
      variant: 'destructive',
    });
    return <Navigate to="/subscription" />;
  }

  console.log('[SubscriptionProtectedRoute] All checks passed. Rendering children.');
  return <>{children}</>;
};

export default SubscriptionProtectedRoute; 