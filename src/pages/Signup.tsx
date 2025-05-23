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
 * On successful registration, redirects users to the subscription page.
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
      console.log("Signup successful, navigating to subscription page");
      // Navigate to the subscription page after successful signup
      navigate('/subscription');
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
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-sm w-full max-w-md">
        <div className="flex flex-col items-center space-y-2 mb-8">
          <Mail className="h-8 w-8 text-monketer-purple" />
          <h1 className="text-2xl font-semibold">Create an account</h1>
          <p className="text-gray-500">Sign up to start creating emails</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-monketer-purple focus:border-transparent"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-monketer-purple focus:border-transparent"
              required
            />
          </div>

          <div className="flex items-center">
            <input
              id="terms"
              type="checkbox"
              className="h-4 w-4 text-monketer-purple focus:ring-monketer-purple border-gray-300 rounded"
              required
            />
            <label htmlFor="terms" className="ml-2 block text-sm text-gray-600">
              I agree to the{" "}
              <Link to="#" className="text-monketer-purple hover:text-monketer-purple-dark">
                Terms
              </Link>{" "}
              and{" "}
              <Link to="#" className="text-monketer-purple hover:text-monketer-purple-dark">
                Privacy Policy
              </Link>
            </label>
          </div>

          <Button
            type="submit"
            className="w-full bg-monketer-purple hover:bg-monketer-purple-dark"
            disabled={loading}
          >
            {loading ? "Creating account..." : "Sign up"}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-600">
          Already have an account?{" "}
          <Link to="/login" className="text-monketer-purple hover:text-monketer-purple-dark">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Signup;
