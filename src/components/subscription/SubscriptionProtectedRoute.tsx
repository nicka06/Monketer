import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SubscriptionProtectedRouteProps {
  children: React.ReactNode;
}

type UserInfoType = {
  subscription_tier: 'free' | 'pro' | 'premium';
  subscription_status: string;
  project_count: number;
};

const SubscriptionProtectedRoute: React.FC<SubscriptionProtectedRouteProps> = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [userInfo, setUserInfo] = useState<UserInfoType | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [navigationPath, setNavigationPath] = useState<string | null>(null);
  const [toastInfo, setToastInfo] = useState<{ title: string; description: string; variant: 'default' | 'destructive' } | null>(null);

  const showToast = useCallback((title: string, description: string, variant: 'default' | 'destructive') => {
    setToastInfo({ title, description, variant });
  }, []);

  useEffect(() => {
    if (toastInfo) {
      toast(toastInfo);
      setToastInfo(null);
    }
  }, [toastInfo, toast]);

  useEffect(() => {
    if (authLoading) {
      setIsChecking(true);
      return;
    }

    if (!user) {
      setIsChecking(false);
      setNavigationPath('/login');
      return;
    }

    setIsChecking(true);
    const fetchSubscription = async () => {
      try {
        const { data, error } = await supabase
          .from('user_info')
          .select('subscription_tier, subscription_status, project_count')
          .eq('auth_user_uuid', user.id)
          .single();

        if (error) {
          console.error('[SPR] Error fetching user_info:', error);
          showToast('Error', 'Could not fetch subscription details.', 'destructive');
          setUserInfo(null);
          setNavigationPath('/subscription');
        } else if (data) {
          setUserInfo(data as UserInfoType);
        } else {
          showToast('Setup Required', 'Please complete your subscription setup.', 'default');
          setUserInfo(null);
          setNavigationPath('/subscription');
        }
      } catch (e) {
        console.error('[SPR] Outer error in checkSubscription:', e);
        showToast('Error', 'An unexpected error occurred while checking your subscription.', 'destructive');
        setUserInfo(null);
        setNavigationPath('/subscription');
      } finally {
        setIsChecking(false);
      }
    };

    fetchSubscription();
  }, [user, authLoading, showToast]);

  useEffect(() => {
    if (navigationPath) {
      navigate(navigationPath, { replace: true });
    }
  }, [navigationPath, navigate]);

  let shouldRedirect = false;
  let redirectReason = '';

  if (!authLoading && !isChecking && user && userInfo) {
    if (userInfo.subscription_status !== 'active') {
      shouldRedirect = true;
      redirectReason = 'Subscription Inactive';
    }

    const projectLimits = { free: 1, pro: 25, premium: Infinity };
    const tier = userInfo.subscription_tier;
    if (userInfo.project_count > projectLimits[tier]) {
      shouldRedirect = true;
      redirectReason = 'Project Limit Exceeded';
    } else if (userInfo.project_count === projectLimits[tier]) {
      console.log(`[SPR] User is AT project limit for tier "${tier}". Access to editor for existing projects is allowed.`);
    }
  }

  useEffect(() => {
    if (!authLoading && !isChecking && user && userInfo) {
      let path: string | null = null;
      if (userInfo.subscription_status !== 'active') {
        showToast('Subscription Required', 'Your subscription is not active. Please update your subscription.', 'default');
        path = '/subscription';
      }

      const projectLimits = { free: 1, pro: 25, premium: Infinity };
      const tier = userInfo.subscription_tier;
      if (userInfo.project_count > projectLimits[tier]) {
        showToast('Project Limit Exceeded', `You have more projects than allowed for your ${tier} plan. Please upgrade or manage your projects.`, 'destructive');
        path = '/subscription';
      } else if (userInfo.project_count === projectLimits[tier]) {
        console.log(`[SPR] User is AT project limit for tier "${tier}". Access to editor for existing projects is allowed.`);
      }
      
      if (path && !navigationPath) {
          setNavigationPath(path);
      }
    }
  }, [authLoading, isChecking, user, userInfo, showToast, navigationPath]);

  if (authLoading || isChecking) {
    console.log('[SPR] Render: Loading authentication or subscription...');
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  if (navigationPath) {
    console.log(`[SPR] Render: Navigation pending to ${navigationPath}.`);
    return <div className="flex items-center justify-center h-screen">Redirecting...</div>;
  }

  if (user && userInfo) {
    console.log('[SPR] Render: All checks passed. Rendering children.');
    return <>{children}</>;
  }
  
  console.warn('[SPR] Render: Fallback, unexpected state. Redirecting to login.');
  return <div className="flex items-center justify-center h-screen">An unexpected error occurred.</div>;
};

export default SubscriptionProtectedRoute; 