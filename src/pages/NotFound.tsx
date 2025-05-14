/**
 * NotFound.tsx
 * 
 * 404 error page that displays when users navigate to non-existent routes.
 * Provides navigation options to return to appropriate landing page based on auth state.
 */

import { useLocation, useNavigate, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/useAuth";

/**
 * NotFound Component
 * 
 * Displays a user-friendly 404 error page with contextual navigation options.
 * Logs error information and adapts navigation based on user authentication status.
 */
const NotFound = () => {
  // Get current location for error logging
  const location = useLocation();
  // Navigation hook for programmatic routing
  const navigate = useNavigate();
  // Auth context to determine user state
  const { user } = useAuth();

  /**
   * Log route error to console on component mount
   * Helps with debugging by tracking attempted access to invalid routes
   */
  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  /**
   * Navigation handler for the primary button
   * Routes authenticated users to dashboard, unauthenticated users to homepage
   */
  const handleReturnHome = () => {
    // If user is authenticated, go to dashboard, otherwise go to landing page
    navigate(user ? "/dashboard" : "/");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center p-8 bg-white rounded-lg shadow-sm">
        {/* Error status code */}
        <h1 className="text-4xl font-bold mb-4">404</h1>
        
        {/* Primary error message */}
        <p className="text-xl text-gray-600 mb-6">Oops! Page not found</p>
        
        {/* Explanatory text */}
        <p className="text-gray-500 mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        
        {/* Primary navigation button - adapts text based on auth state */}
        <Button 
          onClick={handleReturnHome}
          className="bg-monketer-purple hover:bg-monketer-purple-dark mb-2 w-full"
        >
          Return to {user ? "Dashboard" : "Home"}
        </Button>
        
        {/* Secondary navigation option - only visible to authenticated users */}
        {user && (
          <Link to="/editor" className="text-monketer-purple hover:text-monketer-purple-dark block mt-4">
            Go to Email Editor
          </Link>
        )}
      </div>
    </div>
  );
};

export default NotFound;
