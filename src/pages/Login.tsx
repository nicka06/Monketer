/**
 * Login.tsx
 * 
 * Authentication page that allows users to sign in to their account.
 * Provides a form for email/password entry and handles the authentication flow.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Mail } from "lucide-react";
import { useAuth } from "@/features/auth/useAuth";

/**
 * Login Component
 * 
 * Renders a login form and handles authentication through the useAuth hook.
 * Provides field validation, loading states, and navigation options.
 */
const Login = () => {
  // Form state management
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  
  // Authentication hook for sign-in functionality
  const { signIn } = useAuth();

  /**
   * Form submission handler
   * 
   * Prevents default form behavior, shows loading state,
   * and attempts to authenticate the user with provided credentials.
   * 
   * @param e - Form submit event
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await signIn(email, password);
      // Redirect is handled by the auth hook and router
    } catch (error) {
      console.error("Login error:", error);
      // Note: Error UI feedback is handled by the auth hook through toast notifications
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-gray-50">
      {/* Header section with logo and title */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Brand logo and name */}
        <div className="flex justify-center">
          <Link to="/" className="flex items-center">
            <Mail className="h-10 w-10 text-monketer-purple" />
            <span className="ml-2 text-2xl font-semibold text-gray-900">monketer</span>
          </Link>
        </div>
        
        {/* Page title and signup link */}
        <h2 className="mt-10 text-2xl font-bold leading-9 tracking-tight text-gray-900">Sign in to your account</h2>
        <p className="mt-2 text-sm text-gray-600">
          Don't have an account?{' '}
          <Link to="/signup" className="font-medium text-monketer-purple hover:text-monketer-purple-dark">
            Sign up
          </Link>
        </p>
      </div>

      {/* Login form container */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Email field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-monketer-purple focus:border-monketer-purple sm:text-sm"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            {/* Password field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-monketer-purple focus:border-monketer-purple sm:text-sm"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            {/* Remember me and forgot password row */}
            <div className="flex items-center justify-between">
              {/* Remember me checkbox - Note: Functionality not yet implemented */}
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-monketer-purple focus:ring-monketer-purple border-gray-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                  Remember me
                </label>
              </div>

              {/* Forgot password link - Note: Functionality not yet implemented */}
              <div className="text-sm">
                <a href="#" className="font-medium text-monketer-purple hover:text-monketer-purple-dark">
                  Forgot your password?
                </a>
              </div>
            </div>

            {/* Submit button with loading state */}
            <div>
              <Button 
                type="submit"
                className="w-full bg-monketer-purple hover:bg-monketer-purple-dark text-white"
                disabled={loading}
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
