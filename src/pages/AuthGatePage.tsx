import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/features/auth/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom'; 
import { FORM_FLOW_ORDER } from '@/core/constants';
import Navbar from '@/components/Navbar';

const AuthGatePage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signUp, signIn, user } = useAuth();
  const { toast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(true); // To toggle between Sign Up and Sign In views

  // Redirect if user is already logged in
  useEffect(() => {
    if (user) {
      // User is already authenticated, should not be on this page unless something went wrong.
      // Attempt to proceed to next step in form flow if data exists, or dashboard.
      // For simplicity, let's try to navigate to the next logical step. App.tsx will handle resumption.
      const currentIndex = FORM_FLOW_ORDER.indexOf('/auth-gate');
      const nextPath = (currentIndex !== -1 && currentIndex < FORM_FLOW_ORDER.length - 1) 
                          ? FORM_FLOW_ORDER[currentIndex + 1] 
                          : '/dashboard'; // Fallback to dashboard
      navigate(nextPath, { replace: true, state: { fromFormFlow: true }});
    }
  }, [user, navigate]);

  const persistGuestData = async (userId: string) => {
    const pendingBusinessDescription = localStorage.getItem('pendingBusinessDescription');
    const pendingUserGoalsRawText = localStorage.getItem('pendingUserGoalsRawText');
    const pendingSelectedCampaignIdsRaw = localStorage.getItem('pendingSelectedCampaignIds');
    const pendingWebsiteProvider = localStorage.getItem('pendingWebsiteProvider');
    const pendingDomainName = localStorage.getItem('pendingDomainName');

    let selected_campaign_ids: string[] = [];
    if (pendingSelectedCampaignIdsRaw) {
      try {
        selected_campaign_ids = JSON.parse(pendingSelectedCampaignIdsRaw);
      } catch (e) {
        console.error("AuthGatePage: Error parsing pendingSelectedCampaignIds from localStorage", e);
        toast({ title: "Data Error", description: "Could not parse selected campaigns. Please try again or contact support.", variant: "destructive" });
        return false;
      }
    }
    
    // Construct the object with only defined values to avoid overwriting existing DB fields with null
    const updateData: any = { user_id: userId, form_complete: false };
    if (pendingBusinessDescription) updateData.business_description = pendingBusinessDescription;
    if (pendingUserGoalsRawText) updateData.goals_form_raw_text = pendingUserGoalsRawText;
    // Goals array would be parsed from goals_form_raw_text by a backend process or later step if needed
    // For now, just raw text is fine. If goals (array) column exists and needs population, add logic here.
    if (selected_campaign_ids.length > 0) updateData.selected_campaign_ids = selected_campaign_ids;
    if (pendingWebsiteProvider) updateData.website_provider = pendingWebsiteProvider;
    if (pendingDomainName) updateData.domain = pendingDomainName;

    if (Object.keys(updateData).length <= 2) { // Only user_id and form_complete
        console.log("AuthGatePage: No pending data found in localStorage to persist.");
        return true; // Nothing to save, but not an error state
    }

    console.log("AuthGatePage: Persisting to email_setups:", updateData);

    const { error } = await supabase
      .from('email_setups')
      .upsert(updateData, { onConflict: 'user_id' })
      .select('user_id'); 

    if (error) {
      console.error('AuthGatePage: Error upserting email_setups:', error);
      toast({ title: isSignUp ? "Sign Up Succeeded, Data Save Failed" : "Sign In Succeeded, Data Save Failed", description: `Your account was ${isSignUp ? 'created' : 'accessed'}, but we couldn't save your previous progress. Please contact support or try re-entering data. Error: ${error.message}`, variant: "destructive" });
      setLoading(false);
      return false;
    }

    // Clear localStorage items
    localStorage.removeItem('pendingBusinessDescription');
    localStorage.removeItem('pendingUserGoalsRawText');
    localStorage.removeItem('pendingUserGoals'); 
    localStorage.removeItem('pendingSelectedCampaignIds');
    localStorage.removeItem('pendingWebsiteProvider');
    localStorage.removeItem('pendingDomainName');
    
    toast({ title: "Progress Saved!", description: "Your previous progress has been linked to your account." });
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let authenticatedUser;
      if (isSignUp) {
        await signUp(email, password, email); // Assuming signUp throws on error and useAuth handles user object update
      } else {
        await signIn(email, password); // Assuming signIn throws on error
      }
      
      // Fetch the user freshly after sign-in/sign-up as useAuth might not update immediately for this component instance
      const { data: { user: freshUser }, error: getUserError } = await supabase.auth.getUser();
      if (getUserError || !freshUser) {
          throw getUserError || new Error("Could not retrieve user after authentication.");
      }
      authenticatedUser = freshUser;

      const dataPersisted = await persistGuestData(authenticatedUser.id);
      if (!dataPersisted) {
        // Error toast already shown in persistGuestData
        setLoading(false);
        return;
      }

      navigate('/dns-confirmation', { replace: true, state: { ...location.state, fromFormFlow: true } });

    } catch (error: any) {
      console.error(`AuthGatePage: ${isSignUp ? 'Sign Up' : 'Sign In'} Error:`, error);
      toast({ title: isSignUp ? 'Sign Up Failed' : 'Sign In Failed', description: error.message || 'An unexpected error occurred.', variant: "destructive" });
    }
    setLoading(false);
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-green-700 flex flex-col items-center justify-center p-4 relative pt-20">
        <img src="/images/homepage_monkey_swinging.png" alt="Jungle Monkey" className="absolute top-20 left-10 w-32 h-auto hidden md:block opacity-80 z-0" />
        <img src="/images/leaf_pattern_bottom_right.png" alt="Leaf Pattern" className="absolute bottom-0 right-0 w-64 h-auto hidden md:block opacity-70 z-0" />

        <div className="w-full max-w-md bg-green-800 bg-opacity-80 p-8 rounded-xl shadow-2xl space-y-6 z-10">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-yellow-400 mb-2">Almost There!</h1>
            <p className="text-gray-200">
              {isSignUp ? 'Create an account to save your progress and continue.' : 'Sign in to save your progress and continue.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-yellow-300">
                Email Address
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full bg-gray-800 border-gray-700 text-white rounded-md shadow-sm focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm p-3"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-yellow-300">
                Password
              </label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete={isSignUp ? "new-password" : "current-password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full bg-gray-800 border-gray-700 text-white rounded-md shadow-sm focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm p-3"
                placeholder="••••••••"
              />
            </div>

            <div>
              <Button 
                type="submit" 
                disabled={loading} 
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-green-900 bg-yellow-400 hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition duration-150 ease-in-out"
              >
                {loading ? 'Processing...' : (isSignUp ? 'Sign Up & Save Progress' : 'Sign In & Save Progress')}
              </Button>
            </div>
          </form>

          <p className="mt-6 text-center text-sm text-gray-300">
            {isSignUp ? 'Already have an account?' : 'Don\'t have an account?'}{' '}
            <button 
              onClick={() => setIsSignUp(!isSignUp)} 
              className="font-medium text-yellow-400 hover:text-yellow-300 focus:outline-none focus:underline transition ease-in-out duration-150"
            >
              {isSignUp ? 'Sign In' : 'Sign Up'}
            </button>
          </p>
          
          <div className="text-center mt-4">
              <Link to="/" className="text-xs text-yellow-200 hover:text-yellow-100 underline">
                  Or, start over from homepage?
              </Link>
          </div>
        </div>
      </div>
    </>
  );
};

export default AuthGatePage; 