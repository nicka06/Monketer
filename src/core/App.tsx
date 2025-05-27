import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { AuthProvider } from "../features/auth/useAuth";
import { useAuth } from "../features/auth/useAuth";
import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
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
  const initialRedirectDone = useRef(false);

  useEffect(() => {
    if (loading) return; 

    if (!user) {
      initialRedirectDone.current = false;
    }

    if (location.state?.fromFormFlow) {
      const { state, ...rest } = location; 
      const newLocationState = { ...state }; 
      delete newLocationState.fromFormFlow; 
      navigate(location.pathname, { replace: true, state: Object.keys(newLocationState).length > 0 ? newLocationState : null });
      return; 
    }

    if (user && user.id) {
      const fetchAndRedirect = async () => {
        const { data: emailSetup, error } = await supabase
          .from('email_setups')
          // Reverting to include all anticipated columns, even if they don't exist in DB yet.
          // This will cause runtime DB errors until columns are created.
          .select('form_complete, business_description, goals_form_raw_text, selected_emails_data, clarification_data, website_status_data, dns_confirmation_data, website_tracking_data') 
          .eq('user_id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') { // PGRST116: no rows found
          console.error("App.tsx: Error fetching email_setups:", error);
          return;
        }

        if (emailSetup) {
          if (emailSetup.form_complete === true) {
            // If form is marked fully complete, redirect to dashboard if user is on a form page or homepage.
            if (location.pathname !== '/' && location.pathname !== '/optional-signup') {
              console.log("App.tsx: Form complete, on form page or /, redirecting to /dashboard");
              navigate('/dashboard', { replace: true });
            }
            return; // Form is complete, and user is not on a page needing redirection.
          }

          // Form is NOT complete. Determine the earliest incomplete step.
          if (!initialRedirectDone.current) {
            let targetResumePath = null;

            if (!emailSetup.business_description) {
              targetResumePath = '/';
            } else if (!emailSetup.goals_form_raw_text) {
              targetResumePath = '/goals-form';
            // The following checks will result in undefined for now, leading to /select-emails if the above are filled.
            // This maintains current behavior until DB columns are added.
            } else if (!emailSetup.selected_emails_data) { 
              targetResumePath = '/select-emails';
            } else if (!emailSetup.website_status_data) {
                targetResumePath = '/website-status';
            } else if (!emailSetup.clarification_data) {
              targetResumePath = '/info-clarification';
            } else if (!emailSetup.dns_confirmation_data) {
                targetResumePath = '/dns-confirmation';
            } else if (!emailSetup.website_tracking_data) {
                targetResumePath = '/website-tracking';
            } else {
                // All known data fields are filled, but form_complete is still false.
                // This implies the very last step's logic to set form_complete=true hasn't run or there is a new unhandled step.
                // Default to the last known step in the sequence from FORM_FLOW_ORDER
                const { FORM_FLOW_ORDER } = await import('@/core/constants'); // Dynamically import if not already available
                targetResumePath = FORM_FLOW_ORDER[FORM_FLOW_ORDER.length -1] || '/'; 
            }
            
            if (targetResumePath && location.pathname !== targetResumePath) {
              console.log(`App.tsx (Initial): Form incomplete. Resuming to earliest incomplete step: ${targetResumePath}`);
              navigate(targetResumePath, { replace: true });
              initialRedirectDone.current = true; // Set flag after the initial redirect attempt
              return; // Return after navigation to prevent further checks in this effect run
            } else if (targetResumePath && location.pathname === targetResumePath) {
              // User is already on the correct earliest incomplete step page
              initialRedirectDone.current = true; // Also set flag here
            }
            // If targetResumePath is null, it means all checks passed, or it's a new state.
            // We should still mark initial check as done if we reached here for a logged-in user.
            initialRedirectDone.current = true;
          }

        } else { // No emailSetup record found for this authenticated user.
          if (!initialRedirectDone.current) {
            if (location.pathname !== '/' && location.pathname !== '/optional-signup') {
              console.log("App.tsx (Initial): Auth user, no email_setups record. Redirecting to /");
              navigate('/', { replace: true });
              initialRedirectDone.current = true; // Set flag
              return; // Return after navigation
            } else {
              initialRedirectDone.current = true; // User is on / or /optional-signup, allow it
            }
          }
        }
      };

      if (location.pathname !== '/login' && location.pathname !== '/signup') {
         fetchAndRedirect();
      }

    } else if (!loading && !user) { // Not loading, no user (unauthenticated)
        initialRedirectDone.current = false; // Reset flag when user is not authenticated
        // Pages that unauthenticated users should be redirected from.
        // /optional-signup, /business-overview and / are entry points/accessible.
        const UNAUTH_REDIRECT_PAGES = [
          '/goals-form', 
          '/select-emails', 
          '/business-clarification', // This one might be unused if info-clarification is the one
          '/dashboard', 
          '/website-status', 
          '/info-clarification', 
          '/dns-confirmation', 
          '/website-tracking'
          // Removed '/business-overview' from this list
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
