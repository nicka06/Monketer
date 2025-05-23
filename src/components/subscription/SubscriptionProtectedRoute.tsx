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
    const checkSubscription = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('user_info')
          .select('subscription_tier, subscription_status, project_count')
          .eq('auth_user_uuid', user.id)
          .single();

        if (error) throw error;

        setUserInfo(data);
      } catch (error) {
        console.error('Error checking subscription:', error);
        toast({
          title: 'Error',
          description: 'Could not verify subscription status',
          variant: 'destructive',
        });
      } finally {
        setSubscriptionChecked(true);
      }
    };

    if (user) {
      checkSubscription();
    }
  }, [user, toast]);

  if (loading || !subscriptionChecked) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  // If no subscription info found, redirect to plan selection
  if (!userInfo?.subscription_tier) {
    return <Navigate to="/subscription" />;
  }

  // Check subscription status
  if (userInfo.subscription_status !== 'active') {
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
    toast({
      title: 'Project Limit Reached',
      description: `You've reached the project limit for your ${userInfo.subscription_tier} plan. Please upgrade to create more projects.`,
      variant: 'destructive',
    });
    return <Navigate to="/subscription" />;
  }

  return <>{children}</>;
};

export default SubscriptionProtectedRoute; 