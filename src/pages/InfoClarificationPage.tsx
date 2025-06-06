import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FORM_FLOW_ORDER } from '@/core/constants';
import { EMAIL_CAMPAIGN_CATEGORIES, EmailCampaign } from '@/core/emailCampaigns';
import { useAuth } from "@/features/auth/useAuth";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from 'lucide-react';
import Navbar from '@/components/Navbar';
import { useLoading } from '@/contexts/LoadingContext';

// TODO: Refactor PROVIDER_OPTIONS to a shared constants file
const PROVIDER_OPTIONS = [
  { id: 'shopify', name: 'Shopify' },
  { id: 'wix', name: 'Wix' },
  { id: 'webflow', name: 'Webflow' },
  { id: 'squarespace', name: 'Squarespace' },
  { id: 'godaddy', name: 'GoDaddy' },
  { id: 'custom', name: 'Custom/Developer Built' },
  { id: 'other', name: 'Other' },
];

interface DisplayCampaign extends EmailCampaign {
  categoryName: string;
}

// Interface for the data expected from initiate-email-setup
interface InitiateEmailSetupResponse {
  dnsSetupStrategy: 'manual';
  dkimSelector: string;
  // requiredDnsRecords: any[]; // Or a more specific type if available
  message: string;
}

const InfoClarificationPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const { hideLoading } = useLoading();

  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isProcessingNext, setIsProcessingNext] = useState(false);
  const [isConfirmedAccurate, setIsConfirmedAccurate] = useState(false);
  
  const [imageAttemptedLoadCount, setImageAttemptedLoadCount] = useState(0);
  const hideLoadingCalledRef = useRef(false);

  const [emailSetupId, setEmailSetupId] = useState<string | null>(null);
  const [businessDescription, setBusinessDescription] = useState('');
  const [goalsRawText, setGoalsRawText] = useState('');
  const [selectedCampaignsDetails, setSelectedCampaignsDetails] = useState<DisplayCampaign[]>([]);
  const [websiteProvider, setWebsiteProvider] = useState<string | null>(null);
  const [websiteProviderDisplay, setWebsiteProviderDisplay] = useState('');
  const [domainName, setDomainName] = useState('');

  const getCampaignDetails = useCallback((ids: string[] | null): DisplayCampaign[] => {
    if (!ids || ids.length === 0) return [];
    const details: DisplayCampaign[] = [];
    EMAIL_CAMPAIGN_CATEGORIES.forEach(category => {
      category.campaigns.forEach(campaign => {
        if (ids.includes(campaign.id)) {
          details.push({ ...campaign, categoryName: category.name });
        }
      });
    });
    return details.sort((a, b) => a.categoryName.localeCompare(b.categoryName) || a.name.localeCompare(b.name));
  }, []);

  const getProviderName = useCallback((providerId: string | null): string => {
    if (!providerId) return 'Not specified';
    const provider = PROVIDER_OPTIONS.find(p => p.id === providerId);
    return provider ? provider.name : providerId;
  }, []);

  useEffect(() => {
    hideLoadingCalledRef.current = false;
    setImageAttemptedLoadCount(0); // Reset on path change
  }, [location.pathname]);

  useEffect(() => {
    if (!isLoadingData && imageAttemptedLoadCount >= 1 && !hideLoadingCalledRef.current) {
      console.log(`InfoClarificationPage: Conditions met (Data: ${!isLoadingData}, Images: ${imageAttemptedLoadCount}). Hiding loading screen ONCE.`);
      hideLoading();
      hideLoadingCalledRef.current = true;
    }
  }, [isLoadingData, imageAttemptedLoadCount, hideLoading]);

  const handleImageLoad = (imageName: string) => {
    console.log(`InfoClarificationPage: ${imageName} loaded.`);
    setImageAttemptedLoadCount(prev => prev + 1);
  };

  const handleImageError = (imageName: string) => {
    console.error(`InfoClarificationPage: ${imageName} failed to load.`);
    setImageAttemptedLoadCount(prev => prev + 1); // Still count as an attempt
  };

  const loadData = useCallback(async () => {
    try {
      if (user && user.id) {
        const { data, error } = await supabase
          .from('email_setups')
          .select('id, business_description, goals_form_raw_text, selected_campaign_ids, website_provider, domain')
          .eq('user_id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') throw error;
        
        if (data) {
          setEmailSetupId(data.id);
          setBusinessDescription(data.business_description || '');
          setGoalsRawText(data.goals_form_raw_text || '');
          setSelectedCampaignsDetails(getCampaignDetails(data.selected_campaign_ids));
          setWebsiteProvider(data.website_provider);
          setWebsiteProviderDisplay(getProviderName(data.website_provider));
          setDomainName(data.domain || '');
        } else {
           toast({ title: "Setup data not found", description: "Could not retrieve your setup information.", variant: "destructive" });
        }
      } else {
        setBusinessDescription(localStorage.getItem('pendingBusinessDescription') || '');
        setGoalsRawText(localStorage.getItem('pendingUserGoalsRawText') || '');
        const pendingCampaignIds = JSON.parse(localStorage.getItem('pendingSelectedCampaignIds') || '[]');
        setSelectedCampaignsDetails(getCampaignDetails(pendingCampaignIds));
        setWebsiteProvider(localStorage.getItem('pendingWebsiteProvider'));
        setWebsiteProviderDisplay(getProviderName(localStorage.getItem('pendingWebsiteProvider')));
        setDomainName(localStorage.getItem('pendingDomainName') || '');
      }
    } catch (error: any) {
      console.error("InfoClarificationPage: Error loading data:", error);
      toast({ title: "Error Loading Data", description: "Could not load your information for review.", variant: "destructive" });
    }
    setIsLoadingData(false);
  }, [user, toast, getCampaignDetails, getProviderName]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleEdit = (path: string) => {
    navigate(path, { replace: true, state: { ...location.state, fromFormFlow: true } });
  };

  const handleNavigate = async (direction: 'next' | 'previous') => {
    if (direction === 'previous') {
      const currentPath = location.pathname;
      const currentIndex = FORM_FLOW_ORDER.indexOf(currentPath);
      const targetPath = (currentIndex > 0) ? FORM_FLOW_ORDER[currentIndex - 1] : FORM_FLOW_ORDER[0];
      if (targetPath) {
        navigate(targetPath, { replace: true, state: { ...location.state, fromFormFlow: true } });
      }
      return;
    }

    if (!isConfirmedAccurate) {
      toast({ title: "Confirmation Required", description: "Please confirm all information is accurate before proceeding.", variant: "default" });
      return;
    }

    let targetPath = '';
    const currentPath = location.pathname;
    const currentIndex = FORM_FLOW_ORDER.indexOf(currentPath);

    if (!user) {
      targetPath = '/auth-gate';
    } else {
      setIsProcessingNext(true);
      try {
        if (!emailSetupId) {
          throw new Error("Email Setup ID is missing. Cannot initiate DNS setup.");
        }
        if (!websiteProvider) {
          console.warn("Website provider not set, defaulting to 'Unknown' for initiate-email-setup.");
        }

        console.log(`InfoClarificationPage: Calling initiate-email-setup for ID: ${emailSetupId}, Provider: ${websiteProvider || 'Unknown'}`);
        const { data: initiateData, error: initiateError } = await supabase.functions.invoke<InitiateEmailSetupResponse>(
          'initiate-email-setup',
          { body: { emailSetupId: emailSetupId, providerInfo: { name: websiteProvider || 'Unknown' } } }
        );

        if (initiateError) {
          console.error("InfoClarificationPage: Error from initiate-email-setup:", initiateError);
          throw new Error(initiateError.message || "Failed to initiate email setup process.");
        }

        console.log("InfoClarificationPage: initiate-email-setup successful:", initiateData);
        toast({ title: "DNS Setup Initiated", description: initiateData?.message || "Your DNS records are being prepared." });
        
        let potentialNextPathIndex = currentIndex + 1;
        if (potentialNextPathIndex < FORM_FLOW_ORDER.length) {
          if (FORM_FLOW_ORDER[potentialNextPathIndex] === '/auth-gate') {
            potentialNextPathIndex++; 
          }
          if (potentialNextPathIndex < FORM_FLOW_ORDER.length) {
            targetPath = FORM_FLOW_ORDER[potentialNextPathIndex];
          } else {
            targetPath = '/dns-confirmation'; 
          }
        } else {
          targetPath = '/dns-confirmation'; 
        }

      } catch (error: any) {
        console.error("InfoClarificationPage: Error during 'next' processing or initiate-email-setup call:", error);
        toast({ title: "Error Proceeding", description: error.message || "An unexpected error occurred.", variant: "destructive" });
        setIsProcessingNext(false);
        return;
      } finally {
        setIsProcessingNext(false);
      }
    }

    if (targetPath) {
      navigate(targetPath, { replace: true, state: { ...location.state, fromFormFlow: true } });
    }
  };
  
  const SectionCard: React.FC<{ title: string; editPath: string; children: React.ReactNode }> = ({ title, editPath, children }) => (
    <Card className="bg-green-800 border-green-700">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-xl text-yellow-400">{title}</CardTitle>
        <Button variant="outline" size="sm" onClick={() => handleEdit(editPath)} className="text-yellow-300 border-yellow-400 hover:bg-yellow-400 hover:text-green-800">
          Edit
        </Button>
      </CardHeader>
      <CardContent className="text-gray-100">
        {children}
      </CardContent>
    </Card>
  );

  return (
    <div className="relative min-h-screen overflow-hidden">
      <img
        src="/images/background6.png"
        alt="Jungle background"
        className="absolute inset-0 w-full h-full object-cover -z-10"
        onLoad={() => handleImageLoad("background6.png")}
        onError={() => handleImageError("background6.png")}
      />
      <Navbar />
      <div className="min-h-screen text-white py-8 px-4 pt-24">
        <div className="container mx-auto max-w-3xl space-y-8 pb-8 z-10">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-yellow-300 mb-4">Confirm Your Information</h1>
            <p className="text-lg text-gray-100">
              Please review all the details you've provided. If anything needs changing, just click "Edit".
            </p>
          </div>

          <SectionCard title="Your Business Focus" editPath="/business-overview">
            {businessDescription ? <p className="whitespace-pre-wrap">{businessDescription}</p> : <p className="italic">No business description provided.</p>}
          </SectionCard>

          <SectionCard title="Your Main Goals" editPath="/goals-form">
            {goalsRawText ? <p className="whitespace-pre-wrap">{goalsRawText}</p> : <p className="italic">No goals provided.</p>}
          </SectionCard>

          <SectionCard title="Selected Email Campaigns" editPath="/select-emails">
            {selectedCampaignsDetails.length > 0 ? (
              <ul className="list-disc pl-5 space-y-1">
                {selectedCampaignsDetails.map(campaign => (
                  <li key={campaign.id}>
                    <strong>{campaign.categoryName}:</strong> {campaign.name}
                    {campaign.description && <p className="text-sm text-gray-200 italic ml-2">- {campaign.description}</p>}
                  </li>
                ))}
              </ul>
            ) : <p className="italic">No email campaigns selected.</p>}
          </SectionCard>

          <SectionCard title="Your Website Information" editPath="/website-status">
            <p><strong>Provider:</strong> {websiteProviderDisplay}</p>
            <p><strong>Domain:</strong> {domainName || <span className="italic">Not specified</span>}</p>
          </SectionCard>

          <div className="bg-green-700 p-4 rounded-lg flex items-center justify-center space-x-3 shadow-lg border border-yellow-500">
            <Checkbox 
              id="confirmation-checkbox" 
              checked={isConfirmedAccurate}
              onCheckedChange={(checked) => setIsConfirmedAccurate(checked as boolean)}
              className="border-yellow-400 data-[state=checked]:bg-yellow-400 data-[state=checked]:text-green-900"
            />
            <Label htmlFor="confirmation-checkbox" className="text-base text-white font-semibold cursor-pointer">
              Yes, all information is accurate and I'm ready to proceed.
            </Label>
          </div>

          <div className="flex justify-between items-center pt-6">
            <Button 
              variant="outline" 
              onClick={() => handleNavigate('previous')} 
              disabled={isProcessingNext}
              className="py-3 px-6 text-lg border-2 border-gray-600 text-gray-400 hover:bg-gray-700 hover:text-white"
            >
              Previous
            </Button>
            <Button 
              onClick={() => handleNavigate('next')} 
              disabled={isProcessingNext || !isConfirmedAccurate}
              className="py-3 px-8 text-lg bg-yellow-400 text-green-900 hover:bg-yellow-500 font-bold disabled:bg-gray-500 disabled:text-gray-300"
            >
              {isProcessingNext ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Finalizing Setup...</> : 'Confirm & Continue'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InfoClarificationPage; 