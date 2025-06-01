import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { FORM_FLOW_ORDER } from '@/core/constants';
import { EMAIL_CAMPAIGN_CATEGORIES, EmailCategory, EmailCampaign } from '@/core/emailCampaigns';
import { useAuth } from "@/features/auth/useAuth";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from '@/components/ui/scroll-area';
import Navbar from '@/components/Navbar';

const SelectEmailsPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();

  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const loadSelectedCampaigns = useCallback(async () => {
    setIsLoading(true);
    if (user && user.id) {
      try {
        const { data, error } = await supabase
          .from('email_setups')
          .select('selected_campaign_ids')
          .eq('user_id', user.id)
          .maybeSingle();
        if (error) throw error;
        if (data && data.selected_campaign_ids) {
          setSelectedCampaigns(data.selected_campaign_ids);
        }
      } catch (error: any) {
        console.error("SelectEmailsPage: Error loading selected campaigns from Supabase:", error);
        toast({ title: "Error Loading Data", description: "Could not load your previously selected emails.", variant: "destructive" });
      }
    } else {
      const saved = localStorage.getItem('pendingSelectedCampaignIds');
      if (saved) {
        setSelectedCampaigns(JSON.parse(saved));
      }
    }
    setIsLoading(false);
  }, [user, toast]);

  useEffect(() => {
    loadSelectedCampaigns();
  }, [loadSelectedCampaigns]);

  const handleCheckboxChange = (campaignId: string) => {
    setSelectedCampaigns(prev =>
      prev.includes(campaignId)
        ? prev.filter(id => id !== campaignId)
        : [...prev, campaignId]
    );
  };

  const saveSelections = async () => {
    setIsSaving(true);
    try {
      if (user && user.id) {
        const { error } = await supabase
          .from('email_setups')
          .update({ selected_campaign_ids: selectedCampaigns, form_complete: false })
          .eq('user_id', user.id);
        if (error) throw error;
        toast({ title: "Selections Saved!", description: "Your email selections have been saved to your profile." });
      } else {
        localStorage.setItem('pendingSelectedCampaignIds', JSON.stringify(selectedCampaigns));
        toast({ title: "Selections Saved (for now)!", description: "Your email selections are saved for this session." });
      }
    } catch (error: any) {
      console.error("SelectEmailsPage: Error saving selections:", error);
      toast({ title: "Error Saving Data", description: "Could not save your email selections. Please try again.", variant: "destructive" });
      setIsSaving(false);
      return false; // Indicate save failure
    }
    setIsSaving(false);
    return true; // Indicate save success
  };

  const handleNavigate = async (direction: 'next' | 'previous') => {
    if (direction === 'next' || (!user && direction === 'previous')) {
        const saveSuccess = await saveSelections();
        if (direction === 'next' && !saveSuccess) return; // Don't navigate if save failed for 'next'
    }

    const currentPath = location.pathname;
    const currentIndex = FORM_FLOW_ORDER.indexOf(currentPath);
    let targetPath = '';

    if (direction === 'next') {
      if (currentIndex < FORM_FLOW_ORDER.length - 1) {
        targetPath = FORM_FLOW_ORDER[currentIndex + 1];
      } else {
        console.log("SelectEmailsPage: Reached end of defined flow, should go to next step or dashboard");
        targetPath = '/website-status'; // Example: next step after select-emails
      }
    } else { // 'previous'
      if (currentIndex > 0) {
        targetPath = FORM_FLOW_ORDER[currentIndex - 1];
      } else {
        targetPath = FORM_FLOW_ORDER[0]; // Should be /goals-form or similar
      }
    }

    if (targetPath) {
      navigate(targetPath, { replace: true, state: { ...location.state, fromFormFlow: true } });
    }
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-green-800 text-white">Loading email options...</div>;
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen flex flex-col items-center justify-center bg-green-800 text-white p-4 md:p-8 pt-20 md:pt-24">
        <div className="flex flex-col lg:flex-row items-start justify-center gap-8 w-full max-w-7xl mb-8">
          {/* Left Side: Image - smaller on large screens, potentially above on smaller */}
          <div className="w-full lg:w-1/3 flex justify-center lg:sticky lg:top-8 self-start">
            <img 
              src="/images/homepage_monkey_swinging.png" 
              alt="Jungle Monkey" 
              className="max-w-sm w-full h-auto object-cover rounded-lg shadow-xl" 
            />
          </div>

          {/* Right Side: Card for Checklist */}
          <div className="w-full lg:w-2/3 flex justify-center">
            <div className="bg-green-700 bg-opacity-75 p-6 md:p-8 rounded-xl shadow-2xl w-full">
              <h2 className="text-3xl font-bold text-yellow-400 mb-6 text-center">Select The Emails You'd Like To Set Up</h2>
              <p className="text-gray-200 mb-6 text-center">Choose the automated emails and campaigns you're interested in. We'll help you tailor them later!</p>
              
              <ScrollArea className="h-[50vh] md:h-[60vh] pr-4">
                <div className="space-y-6">
                  {EMAIL_CAMPAIGN_CATEGORIES.map((category: EmailCategory) => (
                    <div key={category.id} className="p-4 bg-green-600 bg-opacity-40 rounded-lg">
                      <h3 className="text-xl font-semibold text-yellow-300 mb-3">{category.name}</h3>
                      <div className="space-y-3">
                        {category.campaigns.map((campaign: EmailCampaign) => (
                          <div key={campaign.id} className="flex items-start space-x-3 p-3 bg-green-500 bg-opacity-30 rounded-md hover:bg-opacity-50 transition-colors">
                            <Checkbox 
                              id={campaign.id} 
                              checked={selectedCampaigns.includes(campaign.id)}
                              onCheckedChange={() => handleCheckboxChange(campaign.id)}
                              className="mt-1 border-yellow-400 data-[state=checked]:bg-yellow-400 data-[state=checked]:text-green-900"
                            />
                            <Label htmlFor={campaign.id} className="flex-1 cursor-pointer">
                              <span className="block font-medium text-white">{campaign.name}</span>
                              <span className="block text-sm text-gray-300 font-light">{campaign.description}</span>
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>
        </div>
        {/* Navigation Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md mt-8">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleNavigate('previous')}
            className="w-full sm:w-auto text-yellow-300 border-yellow-400 hover:bg-yellow-400 hover:text-green-900 py-3 px-6 text-lg rounded-lg shadow-md transition duration-150 ease-in-out transform hover:scale-105"
            disabled={isSaving || isLoading}
          >
            Previous
          </Button>
          <Button
            type="button"
            onClick={() => handleNavigate('next')}
            className="w-full bg-yellow-400 hover:bg-yellow-500 text-green-900 font-bold py-3 px-6 text-lg rounded-lg shadow-md transition duration-150 ease-in-out transform hover:scale-105"
            disabled={isSaving || isLoading}
          >
            {isSaving ? 'Saving...' : 'Save & Continue'}
          </Button>
        </div>
      </div>
    </>
  );
};

export default SelectEmailsPage; 