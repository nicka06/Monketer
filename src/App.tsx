import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import { useAuth } from "./hooks/useAuth";
import { useEffect } from "react";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import NotFound from "./pages/NotFound";
import Dashboard from "./pages/Dashboard";
import Editor from "./pages/Editor";

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

// Redirect to editor if authenticated
const RedirectIfAuthenticated = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  
  if (user) {
    // Redirect to editor instead of dashboard
    return <Navigate to="/editor" />;
  }
  
  return <>{children}</>;
};

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
          user ? (
            // Redirect to editor instead of dashboard
            <Navigate to="/editor" />
          ) : (
            <RedirectIfAuthenticated>
              <Index />
            </RedirectIfAuthenticated>
          )
        } 
      />
      <Route 
        path="/login" 
        element={
          <RedirectIfAuthenticated>
            <Login />
          </RedirectIfAuthenticated>
        } 
      />
      <Route 
        path="/signup" 
        element={
          <RedirectIfAuthenticated>
            <Signup />
          </RedirectIfAuthenticated>
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
            <Editor />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/editor/:projectId" 
        element={
          <ProtectedRoute>
            <Editor />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/editor/:username/:projectName" 
        element={
          <ProtectedRoute>
            <Editor />
          </ProtectedRoute>
        } 
      />
      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
