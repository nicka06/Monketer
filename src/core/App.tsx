import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "../features/auth/useAuth";
import { useAuth } from "../features/auth/useAuth";
import { useEffect } from "react";
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

const queryClient = new QueryClient();

// Protected route component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  
  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;
  
  if (!user) {
    console.log("No user found, redirecting to login");
    return <Navigate to="/login" />;
  }
  
  console.log("User authenticated, rendering protected content");
  return <>{children}</>;
};

// Redirect to subscription page if authenticated
// const RedirectIfAuthenticated = ({ children }: { children: React.ReactNode }) => {
//   const { user } = useAuth();
  
//   if (user) {
//     // First direct users to subscription page
//     return <Navigate to="/subscription" />;
//   }
  
//   return <>{children}</>;
// };

const AppRoutes = () => {
  const { user, loading } = useAuth();
  
  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;
  
  console.log("Auth state in AppRoutes:", user ? "Authenticated" : "Unauthenticated");
  
  return (
    <Routes>
      {/* Use the RedirectIfAuthenticated component to handle the root route */}
      <Route 
        path="/" 
        element={
          user ? <Navigate to="/dashboard" /> : <Index />
        } 
      />
      <Route 
        path="/login" 
        element={
          user ? <Navigate to="/" /> : <Login />
        } 
      />
      <Route 
        path="/signup" 
        element={
          user ? <Navigate to="/" /> : <Signup />
        } 
      />
      <Route 
        path="/subscription" 
        element={
          <ProtectedRoute>
            <PlanSelectionPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/editor" 
        element={
          <ProtectedRoute>
            <SubscriptionProtectedRoute>
              <Editor />
            </SubscriptionProtectedRoute>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/editor/:projectId" 
        element={
          <ProtectedRoute>
            <SubscriptionProtectedRoute>
              <Editor />
            </SubscriptionProtectedRoute>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/editor/:username/:projectName" 
        element={
          <ProtectedRoute>
            <SubscriptionProtectedRoute>
              <Editor />
            </SubscriptionProtectedRoute>
          </ProtectedRoute>
        } 
      />
      <Route
        path="/send-email"
        element={
          <ProtectedRoute>
            <SendEmailPage />
          </ProtectedRoute>
        } 
      />
      <Route path="/privacy-policy" element={<PrivacyPolicy />} />
      <Route path="/terms-of-service" element={<TermsOfService />} />
      <Route path="/blog" element={<BlogIndexPage />} />
      <Route path="/blog/:slug" element={<BlogPostPage />} />
      <Route path="/domain-input" element={<DomainInputPage />} />
      <Route path="/optional-signup" element={<OptionalSignUpPage />} />
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
