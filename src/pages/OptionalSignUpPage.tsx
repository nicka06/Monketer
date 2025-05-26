import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
[{"column_name":"id","data_type":"uuid"},{"column_name":"user_id","data_type":"uuid"},{"column_name":"domain","data_type":"text"},{"column_name":"business_area","data_type":"text"},{"column_name":"business_subcategory","data_type":"text"},{"column_name":"goals","data_type":"ARRAY"},{"column_name":"send_timeline","data_type":"text"},{"column_name":"dns_provider_name","data_type":"text"},{"column_name":"dns_setup_strategy","data_type":"text"},{"column_name":"dkim_selector","data_type":"text"},{"column_name":"dkim_public_key","data_type":"text"},{"column_name":"status","data_type":"text"},{"column_name":"dns_records_to_set","data_type":"jsonb"},{"column_name":"provider_api_credentials_status","data_type":"text"},{"column_name":"error_message","data_type":"text"},{"column_name":"created_at","data_type":"timestamp with time zone"},{"column_name":"updated_at","data_type":"timestamp with time zone"},{"column_name":"default_from_name","data_type":"text"},{"column_name":"default_from_email","data_type":"text"},{"column_name":"email_scenarios","data_type":"ARRAY"},{"column_name":"mx_record_value","data_type":"text"},{"column_name":"spf_record_value","data_type":"text"},{"column_name":"dmarc_record_value","data_type":"text"},{"column_name":"mx_status","data_type":"text"},{"column_name":"spf_status","data_type":"text"},{"column_name":"dkim_status","data_type":"text"},{"column_name":"dmarc_status","data_type":"text"},{"column_name":"overall_dns_status","data_type":"text"},{"column_name":"last_verification_attempt_at","data_type":"timestamp with time zone"},{"column_name":"verification_failure_reason","data_type":"text"}]// import Navbar from '@/components/Navbar'; // Removed Navbar
// import Footer from '@/components/Footer'; // Removed Footer
import { Button } from '@/components/ui/button'; // Assuming Button component is available
import { useAuth } from "@/features/auth/useAuth"; // Added useAuth import
import { useToast } from "@/hooks/use-toast"; // Added useToast import
import { supabase } from '@/integrations/supabase/client'; // Corrected Supabase client import path

// Placeholder for Supabase auth or user context if needed later
// import { useAuth } from '@/contexts/AuthContext'; 

const OptionalSignUpPage: React.FC = () => {
  const navigate = useNavigate();
  const { signUp, user } = useAuth(); // user from useAuth will be populated by onAuthStateChange
  const { toast } = useToast(); 
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [signedUpUserId, setSignedUpUserId] = useState<string | null>(null); // To store userId after signup success

  // Effect to run when signedUpUserId is set (meaning signup was successful)
  // and the user object from context is available.
  useEffect(() => {
    const saveDescription = async () => {
      if (signedUpUserId && user && user.id === signedUpUserId) {
        const pendingBusinessDescription = localStorage.getItem('pendingBusinessDescription');
        if (pendingBusinessDescription) {
          console.log('User context updated. Business description to save:', pendingBusinessDescription, 'for user:', signedUpUserId);
          const { error: upsertError } = await supabase
            .from('email_setups')
            .upsert(
              { user_id: signedUpUserId, business_description: pendingBusinessDescription },
              { onConflict: 'user_id' } 
            );

          if (upsertError) {
            console.error('Error saving business description to Supabase:', upsertError);
            toast({
              title: "Account Created, Save Issue",
              description: "Your account is created, but we couldn\'t save your business idea. You can add it later.",
              // variant: "warning", // Removed unsupported variant, default will be used
            });
          } else {
            localStorage.removeItem('pendingBusinessDescription');
            console.log('Business description saved to Supabase for user:', signedUpUserId);
          }
        }
        // Whether description was saved or not, navigate now.
        navigate('/subscription');
      }
    };

    if (signedUpUserId) {
      saveDescription();
    }
  }, [signedUpUserId, user, navigate, toast]); // Added dependencies

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setSignedUpUserId(null); // Reset before new attempt

    try {
      // 1. Call Supabase auth to create user using the signUp from useAuth
      // signUp from useAuth handles its own errors and toasts for auth part.
      // It doesn't return user data directly, but updates context.
      await signUp(email, password, email); // Using email as username as per useAuth implementation

      // Success: signUp would have thrown an error if auth failed.
      // Now we need the user ID. The `user` from `useAuth()` should update via onAuthStateChange.
      // We set a temporary state `signedUpUserId` which will trigger the useEffect.
      // The useEffect will wait for the `user` object in context to match the new user.

      // Attempt to get user ID from the current session immediately after signUp
      // as onAuthStateChange might have a slight delay.
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.warn("Could not get session immediately after sign up:", sessionError.message);
        // Fallback to waiting for useEffect if session is not immediately available
      }
      
      if (session?.user?.id) {
        setSignedUpUserId(session.user.id);
        // If user from context is already updated, useEffect might run immediately
        if (user && user.id === session.user.id) {
           // Already handled by useEffect, but for safety, ensure navigation if all conditions met
           // This direct call is a bit redundant if useEffect works as expected but acts as a safeguard.
           const pendingBusinessDescription = localStorage.getItem('pendingBusinessDescription');
           if (pendingBusinessDescription) {
             // Perform quick save attempt, errors handled similarly
             await supabase.from('email_setups').upsert({ user_id: session.user.id, business_description: pendingBusinessDescription }, { onConflict: 'user_id' });
             localStorage.removeItem('pendingBusinessDescription');
           }
           navigate('/subscription');
           return; // Skip further processing in this handler
        }
      } else if (user?.id && user.email === email) {
        // If user context has updated and email matches, assume it's the new user
        setSignedUpUserId(user.id);
      } else {
        // If we can't get user ID immediately, useEffect will handle it when context updates.
        // Display a generic success and rely on useEffect for the final steps.
        console.log("Sign up auth successful. Waiting for user context to finalize saving description and navigation.");
         toast({
          title: "Account Created!",
          description: "Finalizing setup...",
        });
      }
      // If we couldn't navigate immediately, the useEffect will handle it.

    } catch (error: any) {
      // Errors from signUp in useAuth are already toasted.
      // This catch is for other unexpected issues if any, or if signUp doesn't throw but fails.
      // We don't need to double toast here if useAuth.signUp handles it.
      // setError(error.message || "An unexpected error occurred during sign up.");
      console.error("Sign up process caught an error in OptionalSignUpPage:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinueAsGuest = () => {
    console.log('Continuing as guest. Data remains in local storage.');
    // TODO: Determine where to navigate guests. For now, could be a dashboard-like page
    // that operates purely on localStorage data or has limited functionality.
    // navigate('/guest-dashboard'); 
    alert("Continuing as guest. Navigation to next step pending. Business description is in local storage.");
  };

  return (
    // Outer div centers content and ensures full height with bg-green-800
    <div className="min-h-screen flex flex-col items-center justify-center bg-green-800 text-white">
      {/* Inner div now takes full width and has adjusted padding for full-screen feel */}
      <div className="w-full h-full flex flex-col items-center justify-center p-4 md:p-8">
        <div className="flex flex-col md:flex-row gap-6 md:gap-10 items-center w-full">
          {/* Left Column: Monkey Image */}
          <div className="md:w-1/2 flex justify-center items-center">
            <img
              src="/public/images/homepage_monkey_swinging.png"
              alt="Monkey suggesting to sign up"
              className="max-w-xs md:max-w-sm h-auto object-contain"
            />
          </div>

          {/* Right Column: Sign Up Form */}
          <div className="md:w-1/2 flex flex-col space-y-6 w-full">
            <h1 className="text-3xl md:text-4xl font-bold text-yellow-400 text-center">Save Your Progress?</h1>
            <p className="text-center text-gray-200">
              Create an account to save your business ideas and pick up where you left off anytime.
              Or, continue as a guest and we'll remember you for this session.
            </p>

            <form onSubmit={handleSignUp} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">
                  Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-3 rounded-md bg-gray-700 text-white placeholder-gray-400 border border-gray-600 focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-3 rounded-md bg-gray-700 text-white placeholder-gray-400 border border-gray-600 focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                  placeholder="••••••••"
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-yellow-400 hover:bg-yellow-500 text-green-900 font-bold py-3 text-base"
                disabled={isLoading}
              >
                {isLoading ? 'Creating Account...' : 'Sign Up & Save Progress'}
              </Button>
            </form>

            <Button
              variant="outline"
              onClick={handleContinueAsGuest}
              className="w-full text-yellow-300 border-yellow-400 hover:bg-yellow-400 hover:text-green-900 py-3 text-base"
              disabled={isLoading}
            >
              Continue as Guest
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OptionalSignUpPage; 