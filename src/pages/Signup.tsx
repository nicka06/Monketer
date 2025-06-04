/**
 * Signup.tsx
 * 
 * User registration page that allows new users to create an account.
 * Handles form submission, validation, and account creation via Supabase.
 */

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { FORM_FLOW_ORDER } from "@/core/constants";
import Navbar from "@/components/Navbar";
import { useLoading } from '@/contexts/LoadingContext';

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
  const { hideLoading } = useLoading();

  useEffect(() => {
    console.log("SignupPage: Hiding loading screen immediately.");
    hideLoading();
  }, [hideLoading]);

  /**
   * Form submission handler for account creation
   * Prevents default form behavior, manages loading state,
   * and handles success/error scenarios
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // signUp in useAuth likely returns void and handles errors by throwing
      // or updates user state internally.
      await signUp(email, password, email);

      // Attempt to get the user immediately after signUp
      const { data: { user }, error: getUserError } = await supabase.auth.getUser();

      if (getUserError || !user) {
        console.error("Signup.tsx: Error getting user after signup or no user found:", getUserError);
        throw getUserError || new Error("User not found after signup.");
      }

      // If signup is successful and we have a user, save business description
      const pendingBusinessDescription = localStorage.getItem('pendingBusinessDescription');
      
      if (pendingBusinessDescription) {
        const { error: upsertError } = await supabase
          .from('email_setups')
          .upsert({
            user_id: user.id,
            business_description: pendingBusinessDescription,
            form_complete: false, 
          }, { onConflict: 'user_id' })
          .select('user_id, business_description, form_complete');

        if (upsertError) {
          console.error("Signup.tsx: Error upserting business description:", upsertError);
          toast({
            title: "Error Saving Progress",
            description: "Could not save your business description. Please proceed and update it later if needed.",
            variant: "default", 
          });
        } else {
          localStorage.removeItem('pendingBusinessDescription');
          console.log("Signup.tsx: Business description saved and removed from localStorage.");
        }
      } else {
         const { error: upsertError } = await supabase
          .from('email_setups')
          .upsert({
            user_id: user.id,
            form_complete: false,
          }, { onConflict: 'user_id' })
          .select('user_id, form_complete');
          if (upsertError) {
              console.error("Signup.tsx: Error creating basic email_setups record:", upsertError);
          }
      }
      
      console.log("Signup successful, navigating to goals form");
      const goalsFormPath = FORM_FLOW_ORDER.includes('/goals-form') ? '/goals-form' : FORM_FLOW_ORDER[2] || '/';
      navigate(goalsFormPath, { replace: true, state: { fromFormFlow: true } });

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
    <>
      <Navbar />
      <div className="min-h-screen flex items-center justify-center bg-green-700 text-white pt-16">
        <div className="bg-green-800 bg-opacity-80 p-8 rounded-lg shadow-xl w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-yellow-400">Create Your Monketer Account</h1>
            <p className="text-gray-300">Unleash the email beast!</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-200 mb-1">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent placeholder-gray-400 text-white"
                required
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-200 mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent placeholder-gray-400 text-white"
                required
                placeholder="••••••••"
              />
            </div>

            <div className="flex items-center">
              <input
                id="terms"
                type="checkbox"
                className="h-4 w-4 text-yellow-400 focus:ring-yellow-500 border-gray-500 rounded bg-gray-700"
                required
              />
              <label htmlFor="terms" className="ml-2 block text-sm text-gray-300">
                I agree to the{" "}
                <Link to="/terms-of-service" className="text-yellow-400 hover:text-yellow-300 underline">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link to="/privacy-policy" className="text-yellow-400 hover:text-yellow-300 underline">
                  Privacy Policy
                </Link>
              </label>
            </div>

            <Button
              type="submit"
              className="w-full bg-yellow-400 hover:bg-yellow-500 text-green-900 font-bold py-3 px-4 rounded-lg shadow-md transition duration-150 ease-in-out transform hover:scale-105"
              disabled={loading}
            >
              {loading ? "Creating Account..." : "Sign Up & Enter the Jungle"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-300">
            Already have an account?{" "}
            <Link to="/login" className="text-yellow-400 hover:text-yellow-300 font-semibold underline">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </>
  );
};

export default Signup;
