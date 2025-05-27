import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { AuthProvider } from "../features/auth/useAuth";
import { useAuth } from "../features/auth/useAuth";
import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { FORM_FLOW_ORDER } from '@/core/constants';
import Index from "../pages/Index";
import Login from "../pages/Login";
import Signup from "../pages/Signup";
import NotFound from "../pages/NotFound";
import Dashboard from "../pages/Dashboard";
import Editor from "../pages/Editor";
import SendEmailPage from "../pages/SendEmailPage";
import PrivacyPolicy from "../pages/PrivacyPolicy";
import TermsOfService from "../pages/TermsOfService";
import BlogIndexPage from "@/pages/BlogIndexPage";
import BlogPostPage from "@/pages/BlogPostPage";
import SubscriptionProtectedRoute from "@/components/subscription/SubscriptionProtectedRoute";
import PlanSelectionPage from "@/components/subscription/PlanSelectionPage";
import DomainInputPage from "../pages/DomainInput";
import OptionalSignUpPage from "../pages/OptionalSignUpPage";
import GoalsFormPage from "../pages/GoalsFormPage";
import BusinessClarificationPage from "../pages/BusinessClarificationPage";
import SelectEmailsPage from "../pages/SelectEmailsPage";
import WebsiteStatusPage from "../pages/WebsiteStatusPage";
import InfoClarificationPage from "../pages/InfoClarificationPage";
import AuthGatePage from "../pages/AuthGatePage";
import DnsConfirmationPage from "../pages/DnsConfirmationPage";
import WebsiteTrackingPage from "../pages/WebsiteTrackingPage";
import BusinessOverviewPage from "../pages/BusinessOverviewPage";
import { toast } from "@/components/ui/use-toast";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;
  
  if (!user) {
    console.log("No user found, redirecting to login from ProtectedRoute");
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return <>{children}</>;
};

const AppRoutes = () => {
  const { user, loading, session } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isNavigatingFormFlow = useRef(false);
  const previousUserRef = useRef(user);
  const previousLoadingRef = useRef(loading);

  useEffect(() => {
    console.log(`App.tsx useEffect (NEW LOG): Path: ${location.pathname}. Auth User ID: ${user?.id || 'NONE'}. Auth Loading: ${loading}.`);
    console.log('App.tsx useEffect: Start', { path: location.pathname, state: location.state });

    const authStateJustChanged = (previousLoadingRef.current && !loading) || (previousUserRef.current?.id !== user?.id);

    // Update refs for the next render *before* any early returns
    previousUserRef.current = user;
    previousLoadingRef.current = loading;

    if (loading) {
      console.log('App.tsx useEffect: Still loading auth state, returning.');
      return;
    }

    if (location.state?.fromFormFlow) {
      console.log('App.tsx useEffect: fromFormFlow is true. Setting isNavigatingFormFlow.current = true and re-navigating to clear state.', { path: location.pathname });
      isNavigatingFormFlow.current = true;
      const { state, ...rest } = location;
      const newLocationState = { ...state };
      delete newLocationState.fromFormFlow;
      navigate(location.pathname, { replace: true, state: Object.keys(newLocationState).length > 0 ? newLocationState : null });
      return;
    }

    if (isNavigatingFormFlow.current) {
      console.log('App.tsx useEffect: isNavigatingFormFlow.current is true. Resetting and returning.', { path: location.pathname });
      isNavigatingFormFlow.current = false;
      return;
    }

    console.log('App.tsx useEffect: Past fromFormFlow checks. Proceeding with main redirection logic.', { path: location.pathname, userId: user?.id });

    if (user && user.id) {
      console.log('App.tsx useEffect: User is authenticated. Current path before fetchAndRedirect:', location.pathname);
      const fetchAndRedirect = async () => {
        // Log current session details from useAuth()
        if (session) {
          const accessTokenShort = session.access_token.substring(0, 10) + "..." + session.access_token.substring(session.access_token.length - 10);
          console.log('App.tsx fetchAndRedirect: Current session state:', {
            userId: session.user?.id,
            accessToken: accessTokenShort,
            expiresAt: session.expires_at ? new Date(session.expires_at * 1000).toISOString() : 'N/A',
            expiresIn: session.expires_in,
            tokenType: session.token_type,
          });
        } else {
          console.log('App.tsx fetchAndRedirect: No active session object from useAuth.');
        }

        console.log('App.tsx fetchAndRedirect: Fetching email_setups for user:', user.id);
        const { data: emailSetup, error } = await supabase
          .from('email_setups')
          .select('business_description, goals_form_raw_text, form_complete, selected_campaign_ids, website_provider, domain')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          console.error("App.tsx: Error fetching email_setups:", error);
          toast({ title: "Error Loading Setup", description: "Could not retrieve your setup information. Please try again.", variant: "destructive" });
          return;
        }

        console.log('App.tsx fetchAndRedirect: Fetched emailSetup (with reduced columns):', emailSetup);

        if (emailSetup) {
          if (emailSetup.form_complete === true) {
            const relevantFormPages = FORM_FLOW_ORDER.filter(p => p !== '/');
            if (relevantFormPages.includes(location.pathname)) {
              console.log("App.tsx: Form complete, on a form page (not /), redirecting to /dashboard");
              navigate('/dashboard', { replace: true });
              return; 
            }
            return; 
          }

          let targetResumePath = null;
          if (!emailSetup.business_description) {
            targetResumePath = '/';
          } else if (!emailSetup.goals_form_raw_text) {
            targetResumePath = '/goals-form';
          } else if (!(emailSetup.selected_campaign_ids && Array.isArray(emailSetup.selected_campaign_ids) && emailSetup.selected_campaign_ids.length > 0)) {
            targetResumePath = '/select-emails';
          } else if (!emailSetup.website_provider) {
            targetResumePath = '/website-status';
          } else if (!emailSetup.domain) {
            targetResumePath = '/website-status';
          } else {
            const authGateIndex = FORM_FLOW_ORDER.indexOf('/auth-gate');
            if (authGateIndex !== -1 && authGateIndex < FORM_FLOW_ORDER.length - 1) {
              targetResumePath = FORM_FLOW_ORDER[authGateIndex + 1];
            } else {
              targetResumePath = '/dashboard'; 
            }
          }
          
          console.log('App.tsx fetchAndRedirect: Determined targetResumePath (with reduced columns logic):', targetResumePath);

          if (targetResumePath && location.pathname !== targetResumePath) {
            console.log(`App.tsx fetchAndRedirect: Navigating from ${location.pathname} to targetResumePath: ${targetResumePath}`);
            navigate(targetResumePath, { replace: true });
            return; 
          } 

        } else { // No emailSetup record found for this authenticated user.
            const nonEntryFormPages = FORM_FLOW_ORDER.filter(p => p !== '/' && p !== '/optional-signup' && p !== '/business-overview');
            if (nonEntryFormPages.includes(location.pathname)) {
              console.log("App.tsx fetchAndRedirect: Auth user, no email_setups. Navigating from non-entry page to /");
              navigate('/', { replace: true });
              return; 
            }
        }
      };

      if (location.pathname !== '/login' && location.pathname !== '/signup' && location.pathname !== '/auth-gate') {
         console.log("App.tsx useEffect: Calling fetchAndRedirect because user is authenticated and not on login/signup/auth-gate.");
         if (authStateJustChanged) {
          console.log("App.tsx useEffect: Auth state just changed. Delaying fetchAndRedirect by 100ms.");
          setTimeout(fetchAndRedirect, 100); // Introduce a small delay
         } else {
          fetchAndRedirect();
         }
      } else {
        console.log("App.tsx useEffect: User is authenticated but on login/signup/auth-gate. Skipping fetchAndRedirect.");
      }

    } else if (!loading && !user) { // Not loading, no user (unauthenticated)
        console.log('App.tsx useEffect: User is unauthenticated. Checking UNAUTH_REDIRECT_PAGES.', { path: location.pathname });
        const UNAUTH_REDIRECT_PAGES = [
          '/goals-form', 
          '/select-emails', 
          '/dashboard', 
          '/website-status', 
          '/dns-confirmation', 
          '/website-tracking'
        ];
        
        if (UNAUTH_REDIRECT_PAGES.includes(location.pathname)) {
            console.log(`App.tsx useEffect: Unauthenticated on ${location.pathname}. Redirecting.`);
            if (location.pathname === '/dashboard') {
                console.log("App.tsx useEffect: Unauthenticated on /dashboard. Redirecting to /login.");
                navigate('/login', { replace: true, state: { from: location } });
            } else {
                console.log(`App.tsx useEffect: Unauthenticated on ${location.pathname} (form page). Redirecting to /.`);
                navigate('/', { replace: true }); // For other form pages, send to homepage.
            }
        } else {
          console.log(`App.tsx useEffect: Unauthenticated. Path ${location.pathname} does not require redirect.`);
        }
    }
    console.log('App.tsx useEffect: End', { path: location.pathname });
  }, [user, loading, navigate, location, toast]);
  
  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;
  
  return (
    <Routes>
      <Route
        path="/"
        element={<Index /> // Always render Index initially. useEffect will redirect if needed.
        }
      />
      <Route 
        path="/login" 
        element={user ? <Navigate to="/" /> : <Login />}
      />
      <Route 
        path="/signup" 
        element={user ? <Navigate to="/" /> : <Signup />}
      />
      <Route 
        path="/subscription" 
        element={<ProtectedRoute><PlanSelectionPage /></ProtectedRoute>}
      />
      <Route 
        path="/dashboard" 
        element={<ProtectedRoute><Dashboard /></ProtectedRoute>} // ProtectedRoute handles no user
      />
      <Route 
        path="/editor"
        element={<ProtectedRoute><SubscriptionProtectedRoute><Editor /></SubscriptionProtectedRoute></ProtectedRoute>}
      />
      <Route 
        path="/editor/:projectId" 
        element={<ProtectedRoute><SubscriptionProtectedRoute><Editor /></SubscriptionProtectedRoute></ProtectedRoute>}
      />
      <Route 
        path="/editor/:username/:projectName" 
        element={<ProtectedRoute><SubscriptionProtectedRoute><Editor /></SubscriptionProtectedRoute></ProtectedRoute>}
      />
      <Route
        path="/send-email"
        element={<ProtectedRoute><SendEmailPage /></ProtectedRoute>}
      />
      <Route path="/privacy-policy" element={<PrivacyPolicy />} />
      <Route path="/terms-of-service" element={<TermsOfService />} />
      <Route path="/blog" element={<BlogIndexPage />} />
      <Route path="/blog/:slug" element={<BlogPostPage />} />
      <Route path="/domain-input" element={<DomainInputPage />} />
      <Route path="/optional-signup" element={<OptionalSignUpPage />} />
      <Route path="/goals-form" element={<GoalsFormPage />} />
      <Route path="/business-clarification" element={<BusinessClarificationPage />} />
      <Route path="/select-emails" element={<SelectEmailsPage />} />
      <Route path="/website-status" element={<WebsiteStatusPage />} />
      <Route path="/info-clarification" element={<InfoClarificationPage />} />
      <Route path="/auth-gate" element={<AuthGatePage />} />
      <Route path="/dns-confirmation" element={<DnsConfirmationPage />} />
      <Route path="/website-tracking" element={<WebsiteTrackingPage />} />
      <Route path="/business-overview" element={<BusinessOverviewPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => {
  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <AppRoutes />
            <Toaster />
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );
};

export default App;
