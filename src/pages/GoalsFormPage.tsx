import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea'; // Assuming a Textarea component is available
import { useAuth } from "@/features/auth/useAuth";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";
import { FORM_FLOW_ORDER } from '@/core/constants'; // Import the constant
// import Navbar from '@/components/Navbar'; // No Navbar for this form page for now
// import Footer from '@/components/Footer'; // No Footer for this form page for now

const GoalsFormPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [goals, setGoals] = useState(''); // This will store the raw text from textarea
  const [isLoading, setIsLoading] = useState(false);
  const [businessDescription, setBusinessDescription] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      const desc = localStorage.getItem('pendingBusinessDescription');
      if (desc) {
        setBusinessDescription(desc);
      }

      if (user && user.id) {
        setIsLoading(true);
        console.log(`GoalsFormPage: Attempting to load goals for user ${user.id}`);
        const { data, error } = await supabase
          .from('email_setups')
          .select('goals_form_raw_text, business_description') // also fetch business_description for context
          .eq('user_id', user.id)
          .single();
        
        if (error && error.code !== 'PGRST116') { 
          console.error("GoalsFormPage: Error fetching data from Supabase:", error);
          toast({ title: "Error", description: "Could not load saved data.", variant: "destructive" });
        } else if (data) {
          console.log("GoalsFormPage: Data fetched from Supabase:", data);
          if (data.goals_form_raw_text) {
            setGoals(data.goals_form_raw_text);
          }
          if (data.business_description && !desc) { // If no localStorage desc, use DB one
            setBusinessDescription(data.business_description);
          }
        }
        setIsLoading(false);
      } else {
        // Guest user, load from localStorage
        const savedGoalsRaw = localStorage.getItem('pendingUserGoalsRawText');
        if (savedGoalsRaw) {
          setGoals(savedGoalsRaw);
        }
      }
    };
    loadData();
  }, [user, toast]); // Added toast to dependency array

  const handleNavigate = (direction: 'next' | 'previous') => {
    const currentPath = location.pathname;
    const currentIndex = FORM_FLOW_ORDER.indexOf(currentPath);

    let targetPath = '';

    if (direction === 'next') {
      if (currentIndex < FORM_FLOW_ORDER.length - 1) {
        targetPath = FORM_FLOW_ORDER[currentIndex + 1];
      } else {
        // Handle case where it's the last step (e.g., navigate to dashboard or summary)
        // For now, let's assume it navigates to /select-emails as per original logic
        targetPath = '/select-emails'; // Or determine dynamically if it's truly the end
      }
    } else { // direction === 'previous'
      if (currentIndex > 0) {
        targetPath = FORM_FLOW_ORDER[currentIndex - 1];
      } else {
        // Handle case where it's the first step (e.g., do nothing or specific back action)
        targetPath = '/optional-signup'; // Navigate to Optional Sign Up if this is the effective first data entry page
      }
    }

    if (targetPath) {
      navigate(targetPath, { replace: true, state: { ...location.state, fromFormFlow: true } });
    }
  };

  const handleSubmitGoals = async (e: React.FormEvent, navigateNext = true) => {
    e.preventDefault();
    if (goals.trim() === '') {
      toast({
        title: "No Goals?",
        description: "Please tell us about your goals.",
        variant: "destructive",
      });
      return;
    }
    setIsLoading(true);

    const goalsArray = goals.split('\n').map(g => g.trim()).filter(g => g !== '');

    try {
      if (user && user.id) {
        console.log(`GoalsFormPage: Attempting to save goals for user ${user.id}`);
        const { data: updateData, error } = await supabase
          .from('email_setups')
          .update({
            goals: goalsArray,
            goals_form_raw_text: goals, 
            form_complete: false,
          })
          .eq('user_id', user.id)
          .select('user_id, form_complete, goals'); // Select to confirm, removed last_completed_step

        if (error) throw error;

        console.log("GoalsFormPage: Goals saved successfully. Returned data:", updateData);
        toast({
          title: "Goals Saved!",
          description: "Your goals have been saved to your profile.",
        });
        if (navigateNext) handleNavigate('next');
      } else {
        // User is a guest, save to localStorage
        localStorage.setItem('pendingUserGoals', JSON.stringify(goalsArray));
        localStorage.setItem('pendingUserGoalsRawText', goals); // Save raw text for guest
        toast({
          title: "Goals Saved (for now)!",
          description: "Your goals are saved for this session.",
        });
        if (navigateNext) handleNavigate('next');
      }
    } catch (error: any) {
      console.error("Error saving goals:", error);
      toast({
        title: "Error Saving Goals",
        description: error.message || "Could not save your goals. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-green-800 text-white p-4 md:p-8">
      <div className="w-full max-w-2xl space-y-8">
        <div className="text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-yellow-400 mb-4">What Are Your Goals?</h1>
          <p className="text-lg text-gray-200">
            Help us understand what you want to achieve with your email marketing.
          </p>
          {businessDescription && (
            <p className="mt-4 text-sm text-gray-300 bg-black bg-opacity-20 p-3 rounded-md">
              <strong>Your Business:</strong> {businessDescription}
            </p>
          )}
        </div>

        <form onSubmit={(e) => handleSubmitGoals(e, true)} className="space-y-6 bg-green-700 bg-opacity-50 p-6 md:p-8 rounded-xl shadow-xl">
          <div>
            <label htmlFor="goals-input" className="block text-lg font-medium text-yellow-300 mb-2">
              List your main goals (one per line):
            </label>
            <Textarea
              id="goals-input"
              value={goals}
              onChange={(e) => setGoals(e.target.value)}
              placeholder="e.g.\nIncrease sales by 20%\nGrow my email list\nImprove customer engagement"
              className="w-full p-3 rounded-md bg-gray-700 text-white placeholder-gray-400 border border-gray-600 focus:ring-2 focus:ring-yellow-400 focus:border-transparent min-h-[150px]"
              rows={5}
              required
              disabled={isLoading} // Disable textarea while loading saved goals
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleNavigate('previous')}
              className="w-full sm:w-auto text-yellow-300 border-yellow-400 hover:bg-yellow-400 hover:text-green-900 py-3 px-6 text-lg rounded-lg shadow-md transition duration-150 ease-in-out transform hover:scale-105"
              disabled={isLoading}
            >
              Previous
            </Button>
            <Button
              type="submit"
              className="w-full bg-yellow-400 hover:bg-yellow-500 text-green-900 font-bold py-3 px-6 text-lg rounded-lg shadow-md transition duration-150 ease-in-out transform hover:scale-105"
              disabled={isLoading}
            >
              {isLoading ? 'Saving Goals...' : 'Save Goals & Continue'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GoalsFormPage; 