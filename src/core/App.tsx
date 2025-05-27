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
import DnsConfirmationPage from "../pages/DnsConfirmationPage";
import WebsiteTrackingPage from "../pages/WebsiteTrackingPage";
import BusinessOverviewPage from "../pages/BusinessOverviewPage";

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

  useEffect(() => {
    if (loading) return;

    if (location.state?.fromFormFlow) {
      isNavigatingFormFlow.current = true;
      const { state, ...rest } = location;
      const newLocationState = { ...state };
      delete newLocationState.fromFormFlow;
      navigate(location.pathname, { replace: true, state: Object.keys(newLocationState).length > 0 ? newLocationState : null });
      return;
    }

    if (isNavigatingFormFlow.current) {
      isNavigatingFormFlow.current = false;
      return;
    }

    if (user && user.id) {
      const fetchAndRedirect = async () => {
        const { data: emailSetup, error } = await supabase
          .from('email_setups')
          .select('form_complete, business_description, goals_form_raw_text') 
          .eq('user_id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') { // PGRST116: no rows found
          console.error("App.tsx: Error fetching email_setups:", error);
          return;
        }

        if (emailSetup) {
          if (emailSetup.form_complete === true) {
            // If form is marked fully complete, redirect to dashboard if user is on a relevant form page.
            const relevantFormPages = FORM_FLOW_ORDER.filter(p => p !== '/'); // Exclude homepage from auto-redirect to dashboard
            if (relevantFormPages.includes(location.pathname)) {
              console.log("App.tsx: Form complete, on a form page (not /), redirecting to /dashboard");
              navigate('/dashboard', { replace: true });
              return; // Exit after navigation
            }
            // User is authenticated, form complete, and not on a page that needs redirection from.
            return; 
          }

          // Form is NOT complete. Determine the earliest incomplete step.
          let targetResumePath = null;
          if (!emailSetup.business_description) {
            targetResumePath = '/';
          } else if (!emailSetup.goals_form_raw_text) {
            targetResumePath = '/goals-form';
          } else {
            // If business_description and goals_form_raw_text are present,
            // the next step in the implemented flow is /select-emails.
            targetResumePath = '/select-emails';
          }
          
          if (targetResumePath && location.pathname !== targetResumePath) {
            console.log(`App.tsx: Form incomplete. Resuming to earliest incomplete step: ${targetResumePath} from ${location.pathname}`);
            navigate(targetResumePath, { replace: true });
            return; 
          } 

        } else { // No emailSetup record found for this authenticated user.
            const nonEntryFormPages = FORM_FLOW_ORDER.filter(p => p !== '/' && p !== '/optional-signup' && p !== '/business-overview');
            if (nonEntryFormPages.includes(location.pathname)) {
              console.log("App.tsx: Auth user, no email_setups record, on a non-entry form page. Redirecting to /");
              navigate('/', { replace: true });
              return; 
            }
        }
      };

      if (location.pathname !== '/login' && location.pathname !== '/signup') {
         fetchAndRedirect();
      }

    } else if (!loading && !user) { // Not loading, no user (unauthenticated)
        const UNAUTH_REDIRECT_PAGES = [
          '/goals-form', 
          '/select-emails', 
          '/business-clarification', // This one might be unused if info-clarification is the one
          '/dashboard', 
          '/website-status', 
          '/info-clarification', 
          '/dns-confirmation', 
          '/website-tracking'
        ];
        
        if (UNAUTH_REDIRECT_PAGES.includes(location.pathname)) {
            console.log(`App.tsx: Unauthenticated on ${location.pathname}. Redirecting.`);
            if (location.pathname === '/dashboard') {
                navigate('/login', { replace: true, state: { from: location } });
            } else {
                navigate('/', { replace: true }); // For other form pages, send to homepage.
            }
        }
    }
  }, [user, loading, navigate, location]);
  
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
