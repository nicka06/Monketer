import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FORM_FLOW_ORDER, DNS_PROVIDER_DISPLAY_OPTIONS, PROVIDER_MAP_TO_DISPLAY_OPTION_ID } from '@/core/constants';
import { useAuth } from "@/features/auth/useAuth";
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle, CheckCircle, Info, Loader2 } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import Navbar from '@/components/Navbar';
import DnsConfigurationModal from '@/components/DnsConfigurationModal';

interface DnsRecord {
  id: string;
  type: 'MX' | 'TXT' | 'CNAME'; 
  name: string;
  value: string;
  priority?: number; 
  purpose: string;
  status?: 'verified' | 'failed' | 'pending' | 'error'; 
  verificationMessage?: string;
}

interface EmailSetupData {
  id: string; 
  domain: string;
  website_provider: string | null; // User-set in WebsiteStatusPage
  dns_provider_name: string | null; // Detected by get-domain-provider function
  dkim_selector: string | null;
  dkim_public_key: string | null;
  spf_record_value: string | null;
  mx_record_value: string | null;
  dmarc_record_value: string | null;
  mx_status?: 'verified' | 'failed' | 'pending' | 'error';
  spf_status?: 'verified' | 'failed' | 'pending' | 'error';
  dkim_status?: 'verified' | 'failed' | 'pending' | 'error';
  dmarc_status?: 'verified' | 'failed' | 'pending' | 'error';
  overall_dns_status?: 'pending' | 'partially_verified' | 'verified' | 'failed_to_verify';
  last_verification_attempt_at?: string;
  verification_failure_reason?: string;
}

const DnsConfirmationPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [emailSetupData, setEmailSetupData] = useState<EmailSetupData | null>(null);
  const [displayedDnsRecords, setDisplayedDnsRecords] = useState<DnsRecord[]>([]);
  
  const [userSetProviderId, setUserSetProviderId] = useState<string | null>(null);
  const [detectedProviderId, setDetectedProviderId] = useState<string | null>(null);
  const [detectedProviderDisplayName, setDetectedProviderDisplayName] = useState<string | null>(null);

  const [selectedProviderForModal, setSelectedProviderForModal] = useState<typeof DNS_PROVIDER_DISPLAY_OPTIONS[0] | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [isLoadingPage, setIsLoadingPage] = useState(true); 
  const [isDetectingProvider, setIsDetectingProvider] = useState(true);
  const [isVerifyingDns, setIsVerifyingDns] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);

  const mountedRef = useRef(true);

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: "Copied to clipboard!",
        description: `${type} copied successfully.`,
        duration: 2000,
      });
    }).catch(err => {
      toast({
        title: "Copy Failed",
        description: `Could not copy ${type}. Please try again.`,
        variant: "destructive",
        duration: 3000,
      });
      console.error('Failed to copy text: ', err);
    });
  };

  const constructDnsRecords = useCallback((data: EmailSetupData | null): DnsRecord[] => {
    if (!data || !data.domain) return [];
    const records: DnsRecord[] = [];

    if (data.mx_record_value) {
      const parts = data.mx_record_value.split(' ');
      const priority = parts.length > 1 ? parseInt(parts[0], 10) : 10;
      const value = parts.length > 1 ? parts[1] : parts[0];
      records.push({
        id: 'mx',
        type: 'MX',
        name: data.domain, // Typically '@' or domain itself
        value: value,
        priority: priority,
        purpose: 'Routes incoming mail.',
        status: data.mx_status || 'pending',
      });
    }

    if (data.spf_record_value) {
      records.push({
        id: 'spf',
        type: 'TXT',
        name: data.domain, // Typically '@' or domain itself
        value: data.spf_record_value,
        purpose: 'Authorizes sending servers.',
        status: data.spf_status || 'pending',
      });
    }

    if (data.dkim_selector && data.dkim_public_key) {
      records.push({
        id: 'dkim',
        type: 'TXT', 
        name: `${data.dkim_selector}._domainkey.${data.domain}`,
        value: `v=DKIM1; k=rsa; p=${data.dkim_public_key}`,
        purpose: 'Verifies email authenticity.',
        status: data.dkim_status || 'pending',
      });
    }
    
    if (data.dmarc_record_value){
       records.push({
        id: 'dmarc',
        type: 'TXT',
        name: `_dmarc.${data.domain}`,
        value: data.dmarc_record_value,
        purpose: 'Handles unauthenticated mail.',
        status: data.dmarc_status || 'pending',
      });
    }
    return records;
  }, []);

  const fetchFullEmailSetup = useCallback(async (userId: string) => {
    console.log("DnsConfirmationPage: Fetching full email_setups for user:", userId);
    const { data, error: dbError } = await supabase
      .from('email_setups')
      .select('*, dns_provider_name') // Ensure dns_provider_name is selected
      .eq('user_id', userId)
      .maybeSingle();
    if (dbError) throw dbError;
    return data as EmailSetupData | null;
  }, [supabase]);

  useEffect(() => {
    mountedRef.current = true;
    setIsLoadingPage(true);
    setIsDetectingProvider(true);
    setPageError(null);

    const initialLoad = async () => {
      try {
        if (!user || !mountedRef.current) return;

        let currentEmailSetup = await fetchFullEmailSetup(user.id);
        if (!mountedRef.current) return;

        if (!currentEmailSetup || !currentEmailSetup.id || !currentEmailSetup.domain) {
          console.warn("DnsConfirmationPage: No email setup data or domain found. Navigating to start.");
          toast({ title: "Setup Incomplete", description: "Please complete previous steps first.", variant: "destructive" });
          if (mountedRef.current) navigate(FORM_FLOW_ORDER[0], { replace: true, state: { fromFormFlow: true } });
          return;
        }
        
        if (mountedRef.current) {
            setEmailSetupData(currentEmailSetup);
            console.log("DnsConfirmationPage: currentEmailSetup before constructDnsRecords:", JSON.stringify(currentEmailSetup));
            setDisplayedDnsRecords(constructDnsRecords(currentEmailSetup));
            const providerIdFromWebsiteProvider = currentEmailSetup.website_provider ? PROVIDER_MAP_TO_DISPLAY_OPTION_ID[currentEmailSetup.website_provider] || 'other' : null;
            setUserSetProviderId(providerIdFromWebsiteProvider);
        }

        let finalDetectedProviderId = currentEmailSetup.dns_provider_name ? PROVIDER_MAP_TO_DISPLAY_OPTION_ID[currentEmailSetup.dns_provider_name] || 'other' : null;
        let finalDetectedProviderDisplayName = currentEmailSetup.dns_provider_name;

        if (currentEmailSetup.domain && currentEmailSetup.id) {
            try {
                console.log("DnsConfirmationPage: Calling get-domain-provider for emailSetupId:", currentEmailSetup.id);
                const { data: providerDetectionResult, error: providerFuncError } = await supabase.functions.invoke('get-domain-provider', {
                    body: { emailSetupId: currentEmailSetup.id },
                });
                if (!mountedRef.current) return;

                if (providerFuncError) {
                    console.error("DnsConfirmationPage: get-domain-provider function invocation error object:", JSON.stringify(providerFuncError));
                    let detailedError = providerFuncError.message;
                    if (providerFuncError.context && typeof providerFuncError.context.responseText === 'string') {
                        try {
                            const errorResponse = JSON.parse(providerFuncError.context.responseText);
                            if (errorResponse && errorResponse.error) {
                                detailedError = `Function Error: ${errorResponse.error}`;
                            } else {
                                detailedError = `Function returned non-JSON error: ${providerFuncError.context.responseText.substring(0,150)}`;
                            }
                        } catch (e) {
                            detailedError = `Function returned unparseable error: ${providerFuncError.context.responseText.substring(0,150)}`;
                        }
                    }
                    throw new Error(detailedError);
                }

                if (providerDetectionResult && providerDetectionResult.provider) {
                    console.log("DnsConfirmationPage: Detected provider from function:", providerDetectionResult.provider);
                    finalDetectedProviderDisplayName = providerDetectionResult.provider;
                    finalDetectedProviderId = PROVIDER_MAP_TO_DISPLAY_OPTION_ID[providerDetectionResult.provider] || 'other';
                    if (mountedRef.current) {
                        setEmailSetupData(prev => prev ? { ...prev, dns_provider_name: providerDetectionResult.provider } : null);
                    }
                } else {
                    console.warn("DnsConfirmationPage: No provider returned from function or error in detection:", providerDetectionResult?.error);
                }
            } catch (funcError: any) {
                if (!mountedRef.current) return;
                console.error("DnsConfirmationPage: Error calling get-domain-provider function:", funcError.message);
                toast({ title: "Provider Detection Issue", description: `Could not auto-detect provider. Details: ${funcError.message}`, variant: "default"});
            }
        }

        if (mountedRef.current) {
            setDetectedProviderDisplayName(finalDetectedProviderDisplayName);
            setDetectedProviderId(finalDetectedProviderId);
            setIsDetectingProvider(false);

            const providerModalTargetId = userSetProviderId || finalDetectedProviderId || 'other';
            const providerToShowInModal = DNS_PROVIDER_DISPLAY_OPTIONS.find(p => p.id === providerModalTargetId) || DNS_PROVIDER_DISPLAY_OPTIONS.find(p => p.id === 'other');
            if (providerToShowInModal) {
                setSelectedProviderForModal(providerToShowInModal);
                setIsModalOpen(true); 
            }
        }

      } catch (err: any) {
        if (!mountedRef.current) return;
        console.error("DnsConfirmationPage: Error during initial load:", err.message);
        setPageError('Failed to load your DNS configuration. Please try refreshing.');
        toast({ title: "Loading Error", description: err.message || "Could not load data.", variant: "destructive" });
      } finally {
        if (mountedRef.current) {
            console.log("DnsConfirmationPage: initialLoad finally block. Setting isLoadingPage to false.");
            setIsLoadingPage(false);
        }
      }
    };

    if (authLoading) {
        setIsLoadingPage(true);
        return;
    }
    if (!user) {
        setIsLoadingPage(false);
        navigate('/login', { replace: true, state: { from: location.pathname } });
        return;
    }

    initialLoad();

    return () => {
      mountedRef.current = false;
    };
  }, [user, authLoading, navigate, location.pathname, toast, constructDnsRecords, fetchFullEmailSetup, supabase]);


  const handleNavigate = (direction: 'next' | 'previous') => {
    const currentPath = location.pathname;
    const currentIndex = FORM_FLOW_ORDER.indexOf(currentPath);
    let targetPath = '';

    if (direction === 'next') {
      const allEssentialRecordsConfigured = displayedDnsRecords.length >= 3; 
      if (emailSetupData?.overall_dns_status === 'verified' || (emailSetupData?.overall_dns_status === 'partially_verified' && allEssentialRecordsConfigured)) {
         if (currentIndex < FORM_FLOW_ORDER.length - 1) {
            targetPath = FORM_FLOW_ORDER[currentIndex + 1];
          } else {
            targetPath = '/dashboard'; 
          }
      } else {
        toast({
            title: "DNS Verification Recommended",
            description: "Please ensure DNS records are added and try verifying. You can proceed, but email sending may fail.",
            variant: "default",
            duration: 7000,
        });
        // Allow proceeding even if not verified, but with a warning
         if (currentIndex < FORM_FLOW_ORDER.length - 1) {
            targetPath = FORM_FLOW_ORDER[currentIndex + 1];
          } else {
            targetPath = '/dashboard'; 
          }
      }
    } else { 
      if (currentIndex > 0) {
        let prevPathCandidate = FORM_FLOW_ORDER[currentIndex - 1];
        if (prevPathCandidate === '/auth-gate') {
          const infoClarificationIndex = FORM_FLOW_ORDER.indexOf('/info-clarification');
          targetPath = (infoClarificationIndex !== -1) ? FORM_FLOW_ORDER[infoClarificationIndex] : FORM_FLOW_ORDER[0];
        } else {
          targetPath = prevPathCandidate;
        }
      } else {
        targetPath = FORM_FLOW_ORDER[0]; 
      }
    }
    if (targetPath) {
      navigate(targetPath, { replace: true, state: { ...location.state, fromFormFlow: true } });
    }
  };

  const handleProviderCardClick = (provider: typeof DNS_PROVIDER_DISPLAY_OPTIONS[0]) => {
    setSelectedProviderForModal(provider);
    setIsModalOpen(true);
  };
  
  const handleVerifyDns = async () => {
    if (!emailSetupData || !emailSetupData.id) {
        toast({ title: "Error", description: "Email setup data not found.", variant: "destructive"});
        return;
    }
    setIsVerifyingDns(true);
    setPageError(null);
    console.log("DnsConfirmationPage: Verifying DNS for emailSetupId:", emailSetupData.id);
    try {
        const { data: verificationResult, error: verificationError } = await supabase.functions.invoke('verify-dns-records', {
            body: { emailSetupId: emailSetupData.id },
        });

        if (verificationError) throw verificationError;

        if (verificationResult) {
            console.log("DnsConfirmationPage: DNS verification result:", verificationResult);
            toast({
                title: "DNS Verification Complete",
                description: `Overall status: ${verificationResult.overallDnsStatus}. Record statuses updated.`,
                duration: 5000
            });
            
            const updatedSetup = await fetchFullEmailSetup(user!.id); // Refetch to get all latest statuses
            if (updatedSetup) {
                setEmailSetupData(updatedSetup);
                setDisplayedDnsRecords(constructDnsRecords(updatedSetup));
            } else {
                 throw new Error("Failed to refetch email setup after verification.");
            }

        } else {
            throw new Error("Empty response from DNS verification function.");
        }
    } catch (err: any) {
        console.error("DnsConfirmationPage: Error verifying DNS:", err.message);
        setPageError(`DNS verification failed: ${err.message}`);
        toast({ title: "DNS Verification Error", description: err.message || "Could not verify DNS records.", variant: "destructive" });
    } finally {
        setIsVerifyingDns(false);
    }
  };
  
  const getStatusIcon = (status?: 'verified' | 'failed' | 'pending' | 'error' | 'partially_verified' | 'failed_to_verify') => {
    switch (status) {
      case 'verified': return <CheckCircle className="text-green-400 h-5 w-5" />;
      case 'partially_verified': return <Info className="text-yellow-400 h-5 w-5" />;
      case 'failed':
      case 'failed_to_verify': 
        return <AlertTriangle className="text-red-400 h-5 w-5" />;
      case 'error': return <AlertTriangle className="text-orange-400 h-5 w-5" />;
      case 'pending':
      default: return <Loader2 className="text-gray-400 h-5 w-5 animate-spin" />;
    }
  };

  if (isLoadingPage || authLoading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen flex flex-col items-center justify-center bg-green-800 text-white p-8 pt-20">
          <Loader2 className="h-16 w-16 text-yellow-400 animate-spin mb-4" />
          <p className="text-xl">Loading your DNS jungle map...</p>
        </div>
      </>
    );
  }

  if (pageError && !emailSetupData) { 
    return (
      <>
        <Navbar />
        <div className="min-h-screen flex flex-col items-center justify-center bg-red-800 text-white p-8 text-center pt-20">
           <AlertTriangle className="h-16 w-16 text-yellow-300 mb-4" />
          <h1 className="text-3xl font-bold mb-2">Loading Error</h1>
          <p className="text-lg mb-4">{pageError}</p>
          <Button onClick={() => window.location.reload()} className="bg-yellow-400 text-red-900 hover:bg-yellow-500">
            Try Again
          </Button>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-green-800 text-white py-8 px-4 pt-20 md:pt-24">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-8 md:mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-yellow-400 mb-3">Configure Your DNS</h1>
            <p className="text-lg text-gray-200 max-w-2xl mx-auto">
              Select your DNS provider below to get tailored instructions. If your provider isn't listed, choose "Other".
            </p>
            {emailSetupData?.domain && (
                 <p className="text-md text-yellow-500 mt-2">Configuring for domain: <span className="font-semibold">{emailSetupData.domain}</span></p>
            )}
          </div>

          {isDetectingProvider && (
            <div className="flex justify-center items-center my-8 p-6 bg-green-700 bg-opacity-50 rounded-lg">
              <Loader2 className="mr-3 h-6 w-6 animate-spin text-yellow-400" />
              <p className="text-yellow-400 text-lg">Detecting your DNS provider for <span className="font-semibold">{emailSetupData?.domain || 'your domain'}</span>...</p>
            </div>
          )}

          {!isDetectingProvider && detectedProviderDisplayName && (
            <div className="my-6 p-4 bg-green-600 bg-opacity-70 rounded-lg text-center">
              <p className="text-yellow-300 text-md">
                <Info size={18} className="inline mr-2" /> 
                We think your DNS provider is <span className="font-bold">{detectedProviderDisplayName}</span>. 
                Click its card below or choose another if this is incorrect.
              </p>
            </div>
          )}
            
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 mb-10">
            {DNS_PROVIDER_DISPLAY_OPTIONS.map((provider) => (
              <Card 
                key={provider.id}
                onClick={() => handleProviderCardClick(provider)}
                className={`bg-green-700 hover:bg-green-600 border-2 border-green-600 hover:border-yellow-400 cursor-pointer transition-all duration-200 ease-in-out transform hover:scale-105 shadow-lg rounded-xl overflow-hidden 
                            ${(userSetProviderId === provider.id || detectedProviderId === provider.id) && !selectedProviderForModal ? 'border-yellow-500 ring-2 ring-yellow-500' : ''}
                            ${selectedProviderForModal?.id === provider.id ? 'border-yellow-400 ring-2 ring-yellow-400' : ''}`}
              >
                <CardHeader className="items-center justify-center text-center p-4">
                  {provider.logo && <img src={provider.logo} alt={`${provider.name} logo`} className="h-12 w-auto mx-auto mb-2" />}
                  <CardTitle className="text-lg text-yellow-300">{provider.name}</CardTitle>
                </CardHeader>
              </Card>
            ))}
          </div>
          
          {/* Overall DNS Status - To be refactored into the global banner later */}
          {emailSetupData && emailSetupData.overall_dns_status && (
            <Card className="mb-8 bg-green-700 bg-opacity-60 border-green-600">
              <CardHeader>
                <CardTitle className="text-xl text-yellow-400 flex items-center">
                  {getStatusIcon(emailSetupData.overall_dns_status)} 
                  <span className="ml-2">Overall DNS Status</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-200">
                  Current status: <span className={`font-semibold ${emailSetupData.overall_dns_status === 'verified' ? 'text-green-400' : 'text-yellow-400'}`}>{emailSetupData.overall_dns_status?.replace('_',' ')}</span>.
                  {emailSetupData.last_verification_attempt_at && ` Last checked: ${new Date(emailSetupData.last_verification_attempt_at).toLocaleString()}`}
                </p>
                {emailSetupData.overall_dns_status !== 'verified' && (
                     <p className="text-sm text-gray-300 mt-1">It can take some time for DNS changes to propagate. You can re-verify in the provider's guide.</p>
                )}
                {emailSetupData.verification_failure_reason && (
                    <p className="text-sm text-red-400 mt-1">Details: {emailSetupData.verification_failure_reason}</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Navigation Buttons */}
          <div className="mt-8 flex flex-col sm:flex-row justify-between items-center gap-4 pb-8">
            <Button
              variant="outline"
              onClick={() => handleNavigate('previous')}
              disabled={isVerifyingDns}
              className="w-full sm:w-auto text-yellow-300 border-yellow-400 hover:bg-yellow-400 hover:text-green-900 py-3 px-6 text-lg rounded-lg shadow-md"
            >
              Previous Step
            </Button>
            <Button
              onClick={() => handleNavigate('next')}
              disabled={isVerifyingDns || (emailSetupData?.overall_dns_status !== 'verified' && emailSetupData?.overall_dns_status !== 'partially_verified')}
              className="w-full sm:w-auto bg-yellow-400 hover:bg-yellow-500 text-green-900 font-bold py-3 px-6 text-lg rounded-lg shadow-md"
            >
              {isVerifyingDns ? (
                <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Checking...</>
              ) : (emailSetupData?.overall_dns_status === 'verified' || emailSetupData?.overall_dns_status === 'partially_verified' ? 'Continue to Website Tracking' : 'Verify DNS to Proceed')}
            </Button>
          </div>
        </div>

        {/* Render the DnsConfigurationModal component */}
        <DnsConfigurationModal
            isOpen={isModalOpen}
            onOpenChange={setIsModalOpen}
            selectedProvider={selectedProviderForModal}
            emailSetupData={emailSetupData} // This is EmailSetupData | null
            displayedDnsRecords={displayedDnsRecords}
            onVerifyDns={handleVerifyDns}
            isVerifyingDns={isVerifyingDns}
            copyToClipboard={copyToClipboard} 
            getStatusIcon={getStatusIcon}
        />
      </div>
    </>
  );
};

export default DnsConfirmationPage; 