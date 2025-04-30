
import { useLocation, useNavigate, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  const handleReturnHome = () => {
    // If user is authenticated, go to dashboard, otherwise go to landing page
    navigate(user ? "/dashboard" : "/");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center p-8 bg-white rounded-lg shadow-sm">
        <h1 className="text-4xl font-bold mb-4">404</h1>
        <p className="text-xl text-gray-600 mb-6">Oops! Page not found</p>
        <p className="text-gray-500 mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Button 
          onClick={handleReturnHome}
          className="bg-emailore-purple hover:bg-emailore-purple-dark mb-2 w-full"
        >
          Return to {user ? "Dashboard" : "Home"}
        </Button>
        {user && (
          <Link to="/editor" className="text-emailore-purple hover:text-emailore-purple-dark block mt-4">
            Go to Email Editor
          </Link>
        )}
      </div>
    </div>
  );
};

export default NotFound;
