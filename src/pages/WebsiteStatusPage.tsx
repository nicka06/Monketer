import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { FORM_FLOW_ORDER } from '@/core/constants';
import { useAuth } from "@/features/auth/useAuth";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";
import Navbar from '@/components/Navbar';
import { useLoading } from '@/contexts/LoadingContext';

const PROVIDER_OPTIONS = [
  { id: 'shopify', name: 'Shopify' },
  { id: 'wix', name: 'Wix' },
  { id: 'webflow', name: 'Webflow' },
  { id: 'squarespace', name: 'Squarespace' },
  { id: 'godaddy', name: 'GoDaddy' },
  { id: 'custom', name: 'Custom/Developer Built' },
  { id: 'other', name: 'Other' },
];

const WebsiteStatusPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const { hideLoading } = useLoading();

  const [currentSubStep, setCurrentSubStep] = useState<1 | 2 | 3>(1);
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [domainName, setDomainName] = useState<string>('');
  const [showNoWebsiteModal, setShowNoWebsiteModal] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [imageAttemptedLoadCount, setImageAttemptedLoadCount] = useState(0);
  const hideLoadingCalledRef = useRef(false);

  useEffect(() => {
    hideLoadingCalledRef.current = false;
    setImageAttemptedLoadCount(0); // Reset on path change
  }, [location.pathname]);

  useEffect(() => {
    // Now waits for data AND the background image
    if (!isLoadingData && imageAttemptedLoadCount >= 1 && !hideLoadingCalledRef.current) {
      console.log(`WebsiteStatusPage: Conditions met (Data: ${!isLoadingData}, Images: ${imageAttemptedLoadCount}). Hiding loading screen ONCE.`);
      hideLoading();
      hideLoadingCalledRef.current = true;
    }
  }, [isLoadingData, imageAttemptedLoadCount, hideLoading]);

  const handleImageLoad = (imageName: string) => {
    console.log(`WebsiteStatusPage: ${imageName} loaded.`);
    setImageAttemptedLoadCount(prev => prev + 1);
  };

  const handleImageError = (imageName: string) => {
    console.error(`WebsiteStatusPage: ${imageName} failed to load.`);
    setImageAttemptedLoadCount(prev => prev + 1); // Still count as an attempt
  };

  const loadData = useCallback(async () => {
    if (user && user.id) {
      try {
        const { data, error } = await supabase
          .from('email_setups')
          .select('website_provider, domain')
          .eq('user_id', user.id)
          .single();
        if (error && error.code !== 'PGRST116') throw error;
        if (data) {
          if (data.website_provider) setSelectedProvider(data.website_provider);
          if (data.domain) setDomainName(data.domain);
        }
      } catch (error: any) {
        console.error("WebsiteStatusPage: Error loading data:", error);
        toast({ title: "Error Loading Data", description: "Could not load your saved website status.", variant: "destructive" });
      }
    } else {
      const savedProvider = localStorage.getItem('pendingWebsiteProvider');
      const savedDomain = localStorage.getItem('pendingDomainName');
      if (savedProvider) setSelectedProvider(savedProvider);
      if (savedDomain) setDomainName(savedDomain);
    }
    setIsLoadingData(false);
  }, [user, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleHasWebsiteResponse = (hasWebsite: boolean) => {
    if (hasWebsite) {
      setCurrentSubStep(2);
    } else {
      setShowNoWebsiteModal(true);
    }
  };

  const handleProviderSelect = (providerId: string) => {
    setSelectedProvider(providerId);
    setCurrentSubStep(3);
  };

  const saveCurrentStateToLocalStorage = () => {
    if (selectedProvider) localStorage.setItem('pendingWebsiteProvider', selectedProvider);
    else localStorage.removeItem('pendingWebsiteProvider');
    if (domainName) localStorage.setItem('pendingDomainName', domainName);
    else localStorage.removeItem('pendingDomainName');
  };
  
  const handleSaveAndNavigate = async (direction: 'next' | 'previous') => {
    if (direction === 'next') {
      if (!selectedProvider || domainName.trim() === '') {
        toast({ title: "Missing Information", description: "Please select your website provider and enter your domain name.", variant: "destructive" });
        return;
      }
      setIsSaving(true);
      try {
        if (user && user.id) {
          const { error } = await supabase
            .from('email_setups')
            .update({ website_provider: selectedProvider, domain: domainName.trim(), form_complete: false })
            .eq('user_id', user.id);
          if (error) throw error;
          toast({ title: "Website Info Saved!", description: "Your website details have been saved." });
        } else {
          saveCurrentStateToLocalStorage();
          toast({ title: "Website Info Saved (Session)!", description: "Your website details are saved for this session." });
        }
      } catch (error: any) {
        console.error("WebsiteStatusPage: Error saving data:", error);
        if (error && error.message && error.message.includes('23505')) {
            toast({ 
                title: "Domain Already In Use", 
                description: "This domain name is already registered. Please try a different one.", 
                variant: "destructive" 
            });
        } else if (error && error.code === 'PGRST301' && error.details && error.details.includes('unique constraint')) {
            toast({
                title: "Domain Already In Use",
                description: "This domain name is already registered. Please use a different one.",
                variant: "destructive"
            });
        } else {
            toast({ 
                title: "Error Saving Data", 
                description: "Could not save your website details. Please try again.", 
                variant: "destructive" 
            });
        }
        setIsSaving(false);
        return; 
      }
      setIsSaving(false);
    } else {
        if (!user) {
            saveCurrentStateToLocalStorage();
        }
    }

    const currentPath = location.pathname;
    const currentIndex = FORM_FLOW_ORDER.indexOf(currentPath);
    let targetPath = '';

    if (direction === 'next') {
      targetPath = (currentIndex < FORM_FLOW_ORDER.length - 1) ? FORM_FLOW_ORDER[currentIndex + 1] : '/info-clarification';
    } else {
      targetPath = (currentIndex > 0) ? FORM_FLOW_ORDER[currentIndex - 1] : FORM_FLOW_ORDER[0];
    }

    if (targetPath) {
      navigate(targetPath, { replace: true, state: { ...location.state, fromFormFlow: true } });
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <img
        src="/images/background5.png"
        alt="Jungle background"
        className="absolute inset-0 w-full h-full object-cover -z-10"
        onLoad={() => handleImageLoad("background5.png")}
        onError={() => handleImageError("background5.png")}
      />
      <Navbar />
      <div className="min-h-screen flex flex-col items-center justify-center text-white p-4 md:p-8 pt-20 md:pt-24">
        <div className="bg-green-800 bg-opacity-75 p-6 md:p-8 rounded-xl shadow-2xl w-full max-w-lg space-y-8 z-10">
          {currentSubStep === 1 && (
            <div className="text-center space-y-6">
              <h2 className="text-3xl font-bold text-yellow-400">Do you have a website?</h2>
              <p className="text-gray-200">This helps us tailor our services for you.</p>
              <div className="flex justify-center gap-4">
                <Button onClick={() => handleHasWebsiteResponse(true)} size="lg" className="bg-yellow-400 hover:bg-yellow-500 text-green-900">Yes, I do!</Button>
                <Button onClick={() => handleHasWebsiteResponse(false)} variant="outline" size="lg" className="text-yellow-300 border-yellow-400 hover:bg-yellow-400 hover:text-green-900">No, not yet</Button>
              </div>
            </div>
          )}

          {currentSubStep === 2 && (
            <div className="space-y-6">
              <h2 className="text-3xl font-bold text-yellow-400 text-center">Who hosts your website?</h2>
              <p className="text-gray-200 text-center">Knowing your provider helps us with setup guidance later.</p>
              <div className="flex flex-wrap justify-center gap-4">
                {PROVIDER_OPTIONS.map(provider => (
                  <Button 
                    key={provider.id} 
                    variant={selectedProvider === provider.id ? "default" : "outline"} 
                    onClick={() => handleProviderSelect(provider.id)} 
                    className={`w-40 py-4 h-auto text-center whitespace-normal ${selectedProvider === provider.id ? 'bg-yellow-400 text-green-900' : 'text-yellow-300 border-yellow-400 hover:bg-yellow-400 hover:text-green-900'}`}>
                    {provider.name}
                  </Button>
                ))}
              </div>
              <div className="flex justify-center pt-2">
                <Button 
                  variant="outline"
                  onClick={() => setCurrentSubStep(1)} 
                  className="text-yellow-300 border-yellow-400 hover:bg-yellow-400 hover:text-green-900 py-2 px-4 text-sm rounded-lg shadow-md transition duration-150 ease-in-out transform hover:scale-105">
                  Back
                </Button>
              </div>
            </div>
          )}

          {currentSubStep === 3 && (
            <div className="space-y-6">
              <h2 className="text-3xl font-bold text-yellow-400 text-center">What's your domain name?</h2>
              <p className="text-gray-200 text-center">Please enter your primary website domain (e.g., example.com).</p>
              <Input 
                type="text" 
                placeholder="yourwebsite.com"
                value={domainName}
                onChange={(e) => setDomainName(e.target.value.toLowerCase())}
                className="w-full p-3 rounded-md bg-gray-800 text-white placeholder-gray-400 border border-gray-700 focus:ring-2 focus:ring-yellow-400 focus:border-transparent text-lg"
              />
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Button type="button" variant="outline" onClick={() => setCurrentSubStep(2)} className="w-full sm:w-auto text-yellow-300 border-yellow-400 hover:bg-yellow-400 hover:text-green-900 py-3 px-6 text-lg">Back</Button>
                <Button type="button" onClick={() => handleSaveAndNavigate('next')} disabled={isSaving} className="w-full bg-yellow-400 hover:bg-yellow-500 text-green-900 font-bold py-3 px-6 text-lg">
                  {isSaving ? 'Saving...' : 'Save & Continue'}
                </Button>
              </div>
            </div>
          )}
        </div>

        {currentSubStep === 1 && (
          <div className="mt-8 w-full max-w-lg flex justify-center z-10">
              <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleSaveAndNavigate('previous')}
                  className="text-yellow-300 border-yellow-400 hover:bg-yellow-400 hover:text-green-900 py-3 px-6 text-lg rounded-lg shadow-md transition duration-150 ease-in-out transform hover:scale-105"
                  disabled={isSaving || isLoadingData}
              >
                  Previous Page
              </Button>
          </div>
        )}

        <Dialog open={showNoWebsiteModal} onOpenChange={setShowNoWebsiteModal}>
          <DialogContent className="bg-green-700 text-white border-yellow-400 z-20">
            <DialogHeader>
              <DialogTitle className="text-yellow-400">Website Required</DialogTitle>
              <DialogDescription className="text-gray-200">
                To effectively use our email marketing tools and features like DNS setup for your domain, a website is required. Please create a website and then return to this step.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button onClick={() => setShowNoWebsiteModal(false)} className="bg-yellow-400 hover:bg-yellow-500 text-green-900">OK</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default WebsiteStatusPage; 