import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Navbar from '@/components/Navbar'; // Added Navbar import
// import Footer from '@/components/Footer'; // Removed Footer
import { Button } from '@/components/ui/button'; // Assuming Button component is available
import { useAuth } from "@/features/auth/useAuth"; // Added useAuth import
import { useToast } from "@/hooks/use-toast"; // Added useToast import
import { supabase } from '@/integrations/supabase/client'; // Corrected Supabase client import path
import { FORM_FLOW_ORDER } from '@/core/constants'; // Import the constant

// Placeholder for Supabase auth or user context if needed later
// import { useAuth } from '@/contexts/AuthContext'; 

const OptionalSignUpPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signUp, user } = useAuth();
  const { toast } = useToast(); 
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [signedUpUserId, setSignedUpUserId] = useState<string | null>(null); // To store userId after signup success

  // Effect to run when signedUpUserId is set (meaning signup was successful)
  // and the user object from context is available.
  useEffect(() => {
    const saveDescriptionAndNavigate = async () => {
      if (signedUpUserId && user && user.id === signedUpUserId) {
        const pendingBusinessDescription = localStorage.getItem('pendingBusinessDescription');
        if (pendingBusinessDescription) {
          console.log('User context updated. Business description to save:', pendingBusinessDescription, 'for user:', signedUpUserId);
          const { error: upsertError, data: upsertData } = await supabase
            .from('email_setups')
            .upsert(
              {
                user_id: signedUpUserId,
                business_description: pendingBusinessDescription,
                form_complete: false,
              },
              { onConflict: 'user_id' }
            )
            .select('user_id, business_description, form_complete');

          if (upsertError) {
            console.error('Error saving business description to Supabase via useEffect:', upsertError);
            toast({
              title: "Account Created, Save Issue",
              description: "Your account is created, but we couldn\'t save your business idea. You can add it later.",
            });
          } else {
            console.log('Supabase upsert successful via useEffect. Returned data:', upsertData);
            localStorage.removeItem('pendingBusinessDescription');
            console.log('Business description and form step saved to Supabase for user:', signedUpUserId);
          }
        } else {
          console.warn("useEffect: No pendingBusinessDescription found in localStorage for user:", signedUpUserId);
        }
        navigate('/goals-form', { replace: true, state: { fromFormFlow: true } });
      }
    };

    if (signedUpUserId) {
      saveDescriptionAndNavigate();
    }
  }, [signedUpUserId, user, navigate, toast]);

  const handleNavigate = (direction: 'next' | 'previous', action?: 'signup' | 'guest') => {
    const currentPath = location.pathname;
    const currentIndex = FORM_FLOW_ORDER.indexOf(currentPath);
    let targetPath = '';

    if (direction === 'next') {
      // 'Sign Up & Save' and 'Continue as Guest' both go to goals-form
      targetPath = '/goals-form'; 
    } else { // direction === 'previous'
      if (currentIndex > 0) {
        targetPath = '/business-overview'; // Always go to /business-overview on previous
      } else {
        targetPath = '/'; // Fallback, should ideally be /business-overview if FORM_FLOW_ORDER is correct
      }
    }

    if (targetPath) {
      // For signup, the navigation is handled after signup success in useEffect or handleSignUp
      if (action === 'signup') {
        // The actual navigation for signup happens after processing, so this might just be a placeholder
        // or we let handleSignUp fully manage its own navigation upon success.
        // For now, handleSignUp and useEffect already navigate to /goals-form.
        return; 
      }
      navigate(targetPath, { replace: true, state: { ...location.state, fromFormFlow: true } });
    }
  };

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
        if (user && user.id === session.user.id) {
           const pendingBusinessDescription = localStorage.getItem('pendingBusinessDescription');
           if (pendingBusinessDescription) {
             console.log('Quick save: Business description to save:', pendingBusinessDescription, 'for user:', session.user.id);
             const { error: quickUpsertError, data: quickUpsertData } = await supabase.from('email_setups').upsert({
                user_id: session.user.id,
                business_description: pendingBusinessDescription,
                form_complete: false,
              }, { onConflict: 'user_id' })
              .select('user_id, business_description, form_complete');

             if (quickUpsertError) {
                console.error("Quick save upsert error:", quickUpsertError);
             } else {
                console.log("Quick save upsert successful. Returned data:", quickUpsertData);
                localStorage.removeItem('pendingBusinessDescription');
             }
           } else {
             console.warn("Quick save: No pendingBusinessDescription found in localStorage for user:", session.user.id);
           }
           navigate('/goals-form', { replace: true, state: { fromFormFlow: true } });
           return;
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
      handleNavigate('next', 'signup'); // Signal that this is a 'next' action from signup

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

  const handleSignUpWrapper = async (e: React.FormEvent) => {
    e.preventDefault();
    // Data saving and actual navigation to /goals-form is handled by handleSignUp and its useEffect
    await handleSignUp(e);
    // Do not call handleNavigate here directly for signup, as it's handled internally by handleSignUp logic
  };

  const handleContinueAsGuestWrapper = () => {
    console.log('Continuing as guest. Data remains in local storage.');
    handleNavigate('next', 'guest');
  };

  const handlePrevious = () => {
    handleNavigate('previous');
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen flex flex-col items-center justify-center bg-green-800 text-white pt-16"> {/* Added pt-16 for spacing below navbar */}
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

              <Button 
                  type="button"
                  onClick={handlePrevious}
                  variant="outline"
                  className="w-full text-yellow-300 border-yellow-400 hover:bg-yellow-400 hover:text-green-900 py-3 text-base mb-4"
                  disabled={isLoading}
              >
                  Previous
              </Button>

              <form onSubmit={handleSignUpWrapper} className="space-y-4">
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
                onClick={handleContinueAsGuestWrapper}
                className="w-full text-yellow-300 border-yellow-400 hover:bg-yellow-400 hover:text-green-900 py-3 text-base"
                disabled={isLoading}
              >
                Continue as Guest
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default OptionalSignUpPage; 