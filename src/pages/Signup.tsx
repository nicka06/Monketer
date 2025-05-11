/**
 * Signup.tsx
 * 
 * User registration page that allows new users to create an account.
 * Handles form submission, validation, and account creation via Supabase.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { Mail } from "lucide-react";
import { useAuth } from "@/features/auth/useAuth";
import { useToast } from "@/hooks/use-toast";

/**
 * Signup Component
 * 
 * Provides a registration form for new users to create accounts.
 * Includes email/password inputs, terms acceptance, and error handling.
 * On successful registration, redirects users to the editor page.
 */
const Signup = () => {
  // Form state for email and password fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // Loading state for submission feedback
  const [loading, setLoading] = useState(false);
  
  // Auth hook for signup functionality
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  /**
   * Form submission handler for account creation
   * Prevents default form behavior, manages loading state,
   * and handles success/error scenarios
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await signUp(email, password, email);
      console.log("Signup successful, navigating to /editor");
      // Navigate to the editor page after successful signup
      navigate('/editor');
    } catch (error: any) {
      console.error("Signup error:", error);
      
      // Provide a more specific message for rate limiting errors
      if (error.status === 429 || (error.message && error.message.includes("after 7 seconds"))) {
        toast({
          title: "Too many requests",
          description: "Please wait a few seconds before trying again",
          variant: "destructive",
        });
      }
      // The general error toast is already shown in the useAuth hook
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-gray-50">
      {/* Header section with logo and title */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <Link to="/" className="flex items-center">
            <Mail className="h-10 w-10 text-monketer-purple" />
            <span className="ml-2 text-2xl font-semibold text-gray-900">monketer</span>
          </Link>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">Create your account</h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Or{" "}
          <Link to="/login" className="font-medium text-monketer-purple hover:text-monketer-purple-dark">
            sign in to an existing account
          </Link>
        </p>
      </div>

      {/* Registration form card */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Email input field */}
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

            {/* Password input field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-monketer-purple focus:border-monketer-purple sm:text-sm"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            {/* Terms and conditions checkbox */}
            <div className="flex items-center">
              <input
                id="terms"
                name="terms"
                type="checkbox"
                required
                className="h-4 w-4 text-monketer-purple focus:ring-monketer-purple border-gray-300 rounded"
              />
              <label htmlFor="terms" className="ml-2 block text-sm text-gray-900">
                I agree to the{" "}
                <a href="#" className="font-medium text-monketer-purple hover:text-monketer-purple-dark">
                  Terms of Service
                </a>{" "}
                and{" "}
                <a href="#" className="font-medium text-monketer-purple hover:text-monketer-purple-dark">
                  Privacy Policy
                </a>
              </label>
            </div>

            {/* Submit button with loading state */}
            <div>
              <Button 
                type="submit"
                className="w-full bg-monketer-purple hover:bg-monketer-purple-dark text-white"
                disabled={loading}
              >
                {loading ? 'Creating account...' : 'Sign up'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Signup;
