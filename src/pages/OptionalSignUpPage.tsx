import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Navbar from '@/components/Navbar'; // Added Navbar import
// import Footer from '@/components/Footer'; // Removed Footer
import { Button } from '@/components/ui/button'; // Assuming Button component is available
import { useAuth } from "@/features/auth/useAuth"; // Added useAuth import
import { useToast } from "@/hooks/use-toast"; // Added useToast import
import { supabase } from '@/integrations/supabase/client'; // Corrected Supabase client import path
import { FORM_FLOW_ORDER } from '@/core/constants'; // Import the constant
import { useLoading } from '@/contexts/LoadingContext'; // Import useLoading

// Placeholder for Supabase auth or user context if needed later
// import { useAuth } from '@/contexts/AuthContext'; 

const OptionalSignUpPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signUp, user } = useAuth();
  const { toast } = useToast(); 
  const { hideLoading } = useLoading(); // Get hideLoading
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [signedUpUserId, setSignedUpUserId] = useState<string | null>(null); // To store userId after signup success

  // Refs for critical images
  const backgroundRef = useRef<HTMLImageElement>(null);
  const monkeyRef = useRef<HTMLImageElement>(null);

  // State to track image loading for page load buffer
  const [isPageBackgroundLoaded, setIsPageBackgroundLoaded] = useState(false);
  const [isPageMonkeyLoaded, setIsPageMonkeyLoaded] = useState(false);
  const pageHideLoadingCalledRef = useRef(false); // Ref to track if hideLoading was called for page assets

  useEffect(() => {
    // Reset the flag if the component were to somehow remount for a *new* page load.
    pageHideLoadingCalledRef.current = false;
  }, []);

  // Effect to check if images are loaded and hide loading screen
  useEffect(() => {
    const bgStatus = backgroundRef.current?.complete || isPageBackgroundLoaded;
    const monkeyStatus = monkeyRef.current?.complete || isPageMonkeyLoaded;

    if (bgStatus && monkeyStatus && !pageHideLoadingCalledRef.current) {
      console.log("OptionalSignUpPage: All critical images loaded/complete. Hiding loading screen ONCE.");
      hideLoading();
      pageHideLoadingCalledRef.current = true; // Set flag to prevent multiple calls
    }
  }, [isPageBackgroundLoaded, isPageMonkeyLoaded, hideLoading]);

  // Image load/error handlers for page load buffer
  const handlePageImageLoad = (setter: React.Dispatch<React.SetStateAction<boolean>>, imageName: string) => {
    console.log(`OptionalSignUpPage: ${imageName} loaded.`);
    setter(true);
  };

  const handlePageImageError = (imageName: string, setter: React.Dispatch<React.SetStateAction<boolean>>) => {
    console.error(`OptionalSignUpPage: ${imageName} failed to load.`);
    setter(true); // Treat error as "load attempt finished" for hiding loader
  };

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
    <div className="page-container text-white"> 
      <div className="images-container"> 
        <img 
          ref={backgroundRef}
          src="/images/background_pt_2.png" 
          alt="Jungle background with different theme"
          className="background-image-element"
          onLoad={() => handlePageImageLoad(setIsPageBackgroundLoaded, 'optional_signup_background')}
          onError={() => handlePageImageError('optional_signup_background', setIsPageBackgroundLoaded)}
        />
        <div className="auth-monkey-unit"> {/* Unit wrapper for monkey and bubble */}
          <img 
            ref={monkeyRef}
            src="/images/monkeylock.png" 
            alt="Monkey with a lock"
            className="auth-monkey-image" /* Image specific styles here */
            onLoad={() => handlePageImageLoad(setIsPageMonkeyLoaded, 'optional_signup_monkey')}
            onError={() => handlePageImageError('optional_signup_monkey', setIsPageMonkeyLoaded)}
          />
          <div className="auth-monkey-speech-bubble"> {/* Speech bubble */}
            <p>Sign up to save your progress!</p>
          </div>
        </div>
      </div>

      <div className="content-wrapper min-h-screen flex flex-col"> 
        <Navbar />
        <main className="flex-grow flex flex-col items-center justify-center p-4 md:p-8 pt-16 md:pt-20"> 
          <div className="w-full max-w-sm md:ml-[48%] md:max-w-md lg:max-w-lg bg-black bg-opacity-70 p-6 md:p-8 rounded-xl shadow-2xl mb-6">
            <h1 className="text-3xl md:text-4xl font-bold text-yellow-400 text-center mb-4">Save Your Progress?</h1>
            <p className="text-center text-gray-200 mb-6">
              Create an account to save your business ideas and pick up where you left off anytime.
              Or, continue as a guest and we'll remember you for this session.
            </p>
            <form onSubmit={handleSignUpWrapper} className="space-y-4 mb-6">
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
                  className="w-full p-3 rounded-md bg-gray-800 text-white placeholder-gray-400 border border-gray-700 focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                  placeholder="you@example.com"
                  disabled={isLoading}
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
                  className="w-full p-3 rounded-md bg-gray-800 text-white placeholder-gray-400 border border-gray-700 focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                  placeholder="Create a password (min. 6 characters)"
                  disabled={isLoading}
                />
              </div>
              <Button 
                type="submit"
                className="w-full bg-yellow-400 hover:bg-yellow-500 text-green-900 font-bold py-3 text-base shadow-md transition duration-150 ease-in-out transform hover:scale-105"
                disabled={isLoading}
              >
                {isLoading ? 'Creating Account...' : 'Sign Up & Save Progress'}
              </Button>
            </form>
          </div>

          <div className="w-full max-w-sm md:ml-[48%] md:max-w-md lg:max-w-lg flex flex-row space-x-3">
              <Button 
                  type="button"
                  onClick={handlePrevious} 
                  variant="outline"
                  className="w-1/2 text-gray-400 border-gray-500 hover:bg-gray-700 hover:text-white py-3 text-base shadow-md"
                  disabled={isLoading}
              >
                  Previous
              </Button>
              <Button 
                  type="button"
                  onClick={handleContinueAsGuestWrapper}
                  variant="outline"
                  className="w-1/2 text-yellow-500 border-yellow-400 hover:bg-yellow-400 hover:text-green-900 py-3 text-base shadow-md"
                  disabled={isLoading}
              >
                  Continue as Guest
              </Button>
          </div>
        </main>
      </div>

      <style jsx global>{`
        .page-container {
          position: relative;
          min-height: 100vh;
          overflow: hidden;
        }
        .images-container {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 0;
        }
        .background-image-element {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .auth-monkey-unit {
          position: absolute;
          left: 6%;  
          bottom: 5%; 
          width: 44%; 
          max-width: 600px; 
          height: auto;
          animation: subtleBounce 3s ease-in-out infinite;
          transform-origin: bottom center;
          z-index: 1; 
        }

        .auth-monkey-image {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .auth-monkey-speech-bubble {
          position: absolute;
          width: auto;
          max-width: 180px;
          bottom: 88%;
          left: 0%;
          background-color: white;
          color: #333;
          padding: 10px 15px; 
          border-radius: 12px; 
          box-shadow: 2px 2px 8px rgba(0,0,0,0.25); 
          text-align: center;
          font-size: 0.85rem; 
        }

        .auth-monkey-speech-bubble::after {
          content: "";
          position: absolute;
          width: 14px;  
          height: 14px;
          background-color: white;
          transform: rotate(45deg); 
          bottom: -6px;  
          right: 25%;    
          left: auto;    
          z-index: -1; 
        }
        
        .content-wrapper {
          position: relative; 
          z-index: 10;
          background-color: transparent; 
        }

        /* Tablet adjustments */
        @media (max-width: 1024px) { 
          .auth-monkey-unit {
            width: 35%; 
            left: 3%; 
            bottom: 8%; 
            max-width: 450px;
          }
          .auth-monkey-speech-bubble {
            max-width: 160px;
            bottom: 86%;
            left: 5%;
            font-size: 0.8rem;
            padding: 8px 12px;
          }
          .auth-monkey-speech-bubble::after {
             right: 20%;
             left: auto;
             width: 12px;
             height: 12px;
             bottom: -5px;
          }
          .w-full.max-w-sm.md\:ml-\[48\%\] { 
            margin-left: 40%; 
            max-width: 55%;   
          }
           .w-full.max-w-sm.md\:ml-\[48\%\] .flex.flex-row.space-x-3 { 
            margin-left: 0; 
            max-width: 100%; 
          }
        }

        /* Mobile adjustments */
        @media (max-width: 767px) { 
          .auth-monkey-unit {
            width: 50%; 
            left: 50%;
            transform: translateX(-50%); 
            bottom: 3%; 
            max-width: 280px; 
          }
          .auth-monkey-speech-bubble {
            max-width: 130px;
            bottom: 83%;
            left: 50%;
            transform: translateX(-90%);
            font-size: 0.7rem;
            padding: 6px 8px;
          }
           .auth-monkey-speech-bubble::after {
             right: 15%;
             left: auto;
             width: 10px;
             height: 10px;
             bottom: -4px;
          }
          .w-full.max-w-sm.md\:ml-\[48\%\] { 
            margin-left: auto; 
            margin-right: auto;
            max-width: 90%; 
          }
           .w-full.max-w-sm.md\:ml-\[48\%\] .flex.flex-row.space-x-3 { 
            margin-left: auto;
            margin-right: auto;
            max-width: 90%;
          }
        }

        @keyframes subtleBounce {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px); 
          }
        }
      `}</style>
    </div>
  );
};

export default OptionalSignUpPage; 