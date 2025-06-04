/**
 * Login.tsx
 * 
 * Authentication page that allows users to sign in to their account.
 * Provides a form for email/password entry and handles the authentication flow.
 */

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Mail } from "lucide-react";
import { useAuth } from "@/features/auth/useAuth";
import { useLoading } from '@/contexts/LoadingContext';

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
  const { hideLoading } = useLoading();

  useEffect(() => {
    console.log("LoginPage: Hiding loading screen immediately.");
    hideLoading();
  }, [hideLoading]);

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
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-green-700 text-white">
      {/* Header section with logo and title */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Brand logo and name */}
        <div className="flex justify-center">
          <Link to="/" className="flex items-center">
            <Mail className="h-10 w-10 text-yellow-400" />
            <span className="ml-2 text-2xl font-semibold text-white">monketer</span>
          </Link>
        </div>
        
        {/* Page title and signup link */}
        <h2 className="mt-10 text-center text-3xl font-bold tracking-tight text-yellow-400">Welcome Back to the Jungle!</h2>
        <p className="mt-2 text-center text-sm text-gray-300">
          Don't have an account?{' '}
          <Link to="/signup" className="font-semibold text-yellow-400 hover:text-yellow-300 underline">
            Sign up here
          </Link>
        </p>
      </div>

      {/* Login form container */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-green-800 bg-opacity-80 py-8 px-4 shadow-xl sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Email field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-200">
                Email address
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="appearance-none block w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent sm:text-sm text-white"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  placeholder="you@example.com"
                />
              </div>
            </div>

            {/* Password field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-200">
                Password
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="appearance-none block w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent sm:text-sm text-white"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  placeholder="••••••••"
                />
              </div>
            </div>

            {/* Remember me and forgot password row */}
            <div className="flex items-center justify-between">
              {/* Remember me checkbox */}
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-yellow-400 focus:ring-yellow-500 border-gray-500 rounded bg-gray-700"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-300">
                  Remember me
                </label>
              </div>

              {/* Forgot password link */}
              <div className="text-sm">
                <a href="#" className="font-semibold text-yellow-400 hover:text-yellow-300 underline">
                  Forgot your password?
                </a>
              </div>
            </div>

            {/* Submit button with loading state */}
            <div>
              <Button 
                type="submit"
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-green-900 bg-yellow-400 hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition duration-150 ease-in-out transform hover:scale-105"
                disabled={loading}
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
