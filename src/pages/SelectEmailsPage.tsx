import React, { useEffect, useState, useCallback, useRef } from 'react';
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
import { useLoading } from '@/contexts/LoadingContext';

const SelectEmailsPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const { hideLoading } = useLoading();

  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // Image loading states
  const [imagesAttemptedLoadCount, setImagesAttemptedLoadCount] = useState(0);
  const hideLoadingCalledRef = useRef(false);

  useEffect(() => {
    hideLoadingCalledRef.current = false;
    setImagesAttemptedLoadCount(0); // Reset image load count on navigation to page
  }, [location.pathname]); // Reset on path change

  // Effect to hide global loading screen
  useEffect(() => {
    if (!isLoadingData && imagesAttemptedLoadCount >= 2 && !hideLoadingCalledRef.current) {
      console.log(`SelectEmailsPage: Conditions met (Data: ${!isLoadingData}, Images Attempted: ${imagesAttemptedLoadCount}). Hiding loading screen ONCE.`);
      hideLoading();
      hideLoadingCalledRef.current = true;
    }
  }, [isLoadingData, imagesAttemptedLoadCount, hideLoading]);

  const handleImageLoad = (imageName: string) => {
    console.log(`SelectEmailsPage: ${imageName} loaded.`);
    setImagesAttemptedLoadCount(prev => prev + 1);
  };

  const handleImageError = (imageName: string) => {
    console.error(`SelectEmailsPage: ${imageName} failed to load.`);
    setImagesAttemptedLoadCount(prev => prev + 1); // Still counts as an attempt
  };

  const loadSelectedCampaigns = useCallback(async () => {
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
    setIsLoadingData(false);
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
        if (direction === 'next' && !saveSuccess) return; 
    }

    const currentPath = location.pathname;
    const currentIndex = FORM_FLOW_ORDER.indexOf(currentPath);
    let targetPath = '';

    if (direction === 'next') {
      if (currentIndex < FORM_FLOW_ORDER.length - 1) {
        targetPath = FORM_FLOW_ORDER[currentIndex + 1];
      } else {
        console.log("SelectEmailsPage: Reached end of defined flow, should go to next step or dashboard");
        targetPath = '/website-status'; 
      }
    } else { 
      if (currentIndex > 0) {
        targetPath = FORM_FLOW_ORDER[currentIndex - 1];
      } else {
        targetPath = FORM_FLOW_ORDER[0]; 
      }
    }

    if (targetPath) {
      navigate(targetPath, { replace: true, state: { ...location.state, fromFormFlow: true } });
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <img
        src="/images/Background pt 4.png"
        alt="Jungle background"
        className="absolute inset-0 w-full h-full object-cover -z-10"
        onLoad={() => handleImageLoad("Background pt 4.png")}
        onError={() => handleImageError("Background pt 4.png")}
      />
      <Navbar />
      <div className="min-h-screen flex flex-col items-center justify-center text-white p-4 md:p-8 pt-20 md:pt-24">
        <div className="flex flex-col lg:flex-row items-start justify-center gap-8 w-full max-w-7xl mb-8 z-10">
          {/* Left Side: Monkey - Column width adjusted */}
          <div className="w-full lg:w-1/2 flex justify-center lg:sticky lg:top-48 self-start mt-16 lg:mt-0">
            <div className="relative w-full max-w-md sm:max-w-lg md:max-w-xl flex flex-col items-center animate-bounce-custom">
              <img 
                src="/images/monkey_with_list.png" 
                alt="Monkey with checklist" 
                className="w-full h-auto object-contain"
                onLoad={() => handleImageLoad("monkey_with_list.png")}
                onError={() => handleImageError("monkey_with_list.png")}
              />
              {/* Speech Bubble - Positioned to the LEFT of the monkey, moved up slightly */}
              <div 
                className="absolute top-[0%] right-[60%] sm:right-[65%] md:right-[70%] transform 
                           bg-white text-gray-800 p-3 rounded-lg shadow-xl 
                           w-[150px] sm:w-[180px] md:w-[200px] text-sm md:text-base break-words
                           after:content-[''] after:absolute after:top-[calc(50%-8px)] after:right-[-8px] 
                           after:border-t-[8px] after:border-t-transparent 
                           after:border-l-[8px] after:border-l-white 
                           after:border-b-[8px] after:border-b-transparent"
                style={{ filter: 'drop-shadow(0 3px 5px rgba(0,0,0,0.1))' }} 
              >
                Tell us what emails you want in your marketing campaign!
              </div>
            </div>
          </div>

          {/* Right Side: Card for Checklist - Tiny bit narrower */}
          <div className="w-full lg:w-1/2 flex justify-center">
            <div className="bg-green-700 bg-opacity-80 p-6 md:p-8 rounded-xl shadow-2xl w-full backdrop-blur-sm">
              <h2 className="text-3xl font-bold text-yellow-400 mb-6 text-center">Select The Emails You'd Like To Set Up</h2>
              <p className="text-gray-200 mb-6 text-center">Choose the automated emails and campaigns you're interested in. We'll help you tailor them later!</p>
              
              <ScrollArea className="h-[50vh] md:h-[60vh] pr-4">
                <div className="space-y-6">
                  {EMAIL_CAMPAIGN_CATEGORIES.map((category: EmailCategory) => (
                    <div key={category.id} className="p-4 bg-green-600 bg-opacity-50 rounded-lg">
                      <h3 className="text-xl font-semibold text-yellow-300 mb-3">{category.name}</h3>
                      <div className="space-y-3">
                        {category.campaigns.map((campaign: EmailCampaign) => (
                          <div key={campaign.id} className="flex items-start space-x-3 p-3 bg-green-500 bg-opacity-40 rounded-md hover:bg-opacity-60 transition-colors">
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
        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md mt-8 z-10">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleNavigate('previous')}
            className="w-full sm:w-auto text-yellow-300 border-yellow-400 hover:bg-yellow-400 hover:text-green-900 py-3 px-6 text-lg rounded-lg shadow-md transition duration-150 ease-in-out transform hover:scale-105"
            disabled={isSaving || isLoadingData}
          >
            Previous
          </Button>
          <Button
            type="button"
            onClick={() => handleNavigate('next')}
            className="w-full bg-yellow-400 hover:bg-yellow-500 text-green-900 font-bold py-3 px-6 text-lg rounded-lg shadow-md transition duration-150 ease-in-out transform hover:scale-105"
            disabled={isSaving || isLoadingData}
          >
            {isSaving ? 'Saving...' : 'Save & Continue'}
          </Button>
        </div>
      </div>
      <style jsx global>{`
        @keyframes bounce-custom {
          0%, 100% {
            transform: translateY(-2%);
            animation-timing-function: cubic-bezier(0.8, 0, 1, 1);
          }
          50% {
            transform: translateY(0);
            animation-timing-function: cubic-bezier(0, 0, 0.2, 1);
          }
        }
        .animate-bounce-custom {
          animation: bounce-custom 2s infinite;
        }
      `}</style>
    </div>
  );
};

export default SelectEmailsPage; 