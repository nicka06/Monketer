import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { FORM_FLOW_ORDER } from '@/core/constants';
import { useAuth } from "@/features/auth/useAuth";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";

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

  const [currentSubStep, setCurrentSubStep] = useState<1 | 2 | 3>(1);
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [domainName, setDomainName] = useState<string>('');
  const [showNoWebsiteModal, setShowNoWebsiteModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
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
          // Determine currentSubStep based on loaded data if needed, or start at 1
          // For now, we will always start at step 1 and let user confirm.
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
    setIsLoading(false);
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
        // Check for Supabase unique constraint violation (PostgreSQL error code 23505)
        // The actual error structure might vary, check Supabase client library specifics if needed.
        // Often the code is on error.code or error.details.code or similar.
        // For PostgREST, a 409 conflict often includes a code in the message or details.
        // Example: error.message might contain "duplicate key value violates unique constraint"
        // and error.code might be 'PGRST116' (if no rows found for update, not our case)
        // or a more specific PostgreSQL code passed through.
        // A direct 409 from the fetch response usually means a constraint.
        if (error && error.message && error.message.includes('23505')) { // More robust check based on actual Supabase error object might be needed
            toast({ 
                title: "Domain Already In Use", 
                description: "This domain name is already registered. Please try a different one.", 
                variant: "destructive" 
            });
        } else if (error && error.code === 'PGRST301' && error.details && error.details.includes('unique constraint')) { // Another possible way Supabase signals unique constraint
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
    } else { // Previous navigation for guest
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

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-green-800 text-white">Loading...</div>;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-green-800 text-white p-4 md:p-8">
      <div className="bg-green-700 bg-opacity-75 p-6 md:p-8 rounded-xl shadow-2xl w-full max-w-lg space-y-8">
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
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {PROVIDER_OPTIONS.map(provider => (
                <Button key={provider.id} variant={selectedProvider === provider.id ? "default" : "outline"} onClick={() => handleProviderSelect(provider.id)} className={`py-4 h-auto text-center ${selectedProvider === provider.id ? 'bg-yellow-400 text-green-900' : 'text-yellow-300 border-yellow-400 hover:bg-yellow-400 hover:text-green-900'}`}>
                  {provider.name}
                </Button>
              ))}
            </div>
             <Button variant="link" onClick={() => setCurrentSubStep(1)} className="text-sm text-yellow-200 hover:text-yellow-100">Back</Button>
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

      {currentSubStep !== 3 && (
        <div className="mt-8 w-full max-w-lg flex justify-start">
            <Button
                type="button"
                variant="outline"
                onClick={() => handleSaveAndNavigate('previous')}
                className="text-yellow-300 border-yellow-400 hover:bg-yellow-400 hover:text-green-900 py-3 px-6 text-lg rounded-lg shadow-md transition duration-150 ease-in-out transform hover:scale-105"
                disabled={isSaving || isLoading || currentSubStep === 1} // Can't go previous from step 1 of this page.
            >
                Previous Page
            </Button>
        </div>
      )}

      <Dialog open={showNoWebsiteModal} onOpenChange={setShowNoWebsiteModal}>
        <DialogContent className="bg-green-700 text-white border-yellow-400">
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
  );
};

export default WebsiteStatusPage; 