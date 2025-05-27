import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FORM_FLOW_ORDER, DNS_PROVIDER_DISPLAY_OPTIONS, PROVIDER_MAP_TO_DISPLAY_OPTION_ID } from '@/core/constants';
import { useAuth } from "@/features/auth/useAuth";
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle, CheckCircle, Copy, ExternalLink, Info, Loader2 } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";


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
      <div className="min-h-screen flex flex-col items-center justify-center bg-green-800 text-white p-8">
        <Loader2 className="h-16 w-16 text-yellow-400 animate-spin mb-4" />
        <p className="text-xl">Loading your DNS jungle map...</p>
      </div>
    );
  }
  
  if (pageError && !emailSetupData) { 
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-red-800 text-white p-8 text-center">
         <AlertTriangle className="h-16 w-16 text-yellow-300 mb-4" />
        <h1 className="text-3xl font-bold mb-2">Loading Error</h1>
        <p className="text-lg mb-4">{pageError}</p>
        <Button onClick={() => window.location.reload()} className="bg-yellow-400 text-red-900 hover:bg-yellow-500">
          Try Again
        </Button>
      </div>
    );
  }

  if (!emailSetupData || !emailSetupData.domain) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-green-800 text-white p-8">
        <AlertTriangle className="h-16 w-16 text-yellow-400 mb-4" />
        <p className="text-xl">Your email adventure map is missing! Please complete previous steps.</p>
        <Button onClick={() => navigate(FORM_FLOW_ORDER[0], { replace: true })} className="mt-4 bg-yellow-400 text-green-900 hover:bg-yellow-500">
          Go to Start
        </Button>
      </div>
    );
  }
  
  const currentOverallStatus = emailSetupData.overall_dns_status || 'pending';

  return (
    <div className="min-h-screen flex flex-col items-center bg-green-700 text-white p-4 md:p-8 pt-16 md:pt-24">
      <img src="/images/monkey_dns.png" alt="DNS Guide Monkey" className="w-40 md:w-48 h-auto mb-6" />
      <h1 className="text-3xl md:text-5xl font-bold text-yellow-400 mb-3 text-center">Tune Your Domain's Vines (DNS)</h1>
      <p className="text-md md:text-lg text-gray-200 mb-2 text-center max-w-2xl">
        To send emails from <strong className="text-yellow-300">{emailSetupData.domain}</strong>, add these records with your domain provider.
      </p>
      {emailSetupData.last_verification_attempt_at && (
        <p className="text-xs text-gray-400 mb-1">Last check: {new Date(emailSetupData.last_verification_attempt_at).toLocaleString()}</p>
      )}
      {isDetectingProvider && <p className="text-sm text-yellow-300 italic my-2"><Loader2 size={16} className="inline mr-1 animate-spin"/>Sniffing out your provider...</p>}
      {detectedProviderDisplayName && !userSetProviderId && (
        <p className="text-sm text-green-200 my-2">Our monkeys think your provider is <strong className="text-yellow-300">{detectedProviderDisplayName}</strong>.</p>
      )}
       {pageError && <p className="text-red-300 bg-red-700 bg-opacity-60 p-3 rounded-md my-3 text-sm max-w-xl text-center">Error: {pageError}</p>}

      <Card className="w-full max-w-3xl bg-green-800 bg-opacity-90 border-yellow-500 shadow-xl mb-8">
        <CardHeader>
          <CardTitle className="text-xl md:text-2xl text-yellow-400 flex items-center justify-between">
            Required DNS Records
            <div className="flex items-center">
              {getStatusIcon(currentOverallStatus)}
              <span className={`ml-2 text-xs md:text-sm font-semibold ${
                currentOverallStatus === 'verified' ? 'text-green-400' :
                currentOverallStatus === 'failed_to_verify' ? 'text-red-400' :
                currentOverallStatus === 'partially_verified' ? 'text-yellow-400' : 'text-gray-400'
              }`}>
                {currentOverallStatus.replace('_', ' ').toUpperCase()}
              </span>
            </div>
          </CardTitle>
          {emailSetupData.verification_failure_reason && (currentOverallStatus === 'failed_to_verify' || currentOverallStatus === 'partially_verified') && (
             <p className="text-xs text-red-300 mt-1">Reason: {emailSetupData.verification_failure_reason}</p>
          )}
        </CardHeader>
        <CardContent className="space-y-3 md:space-y-4">
          {displayedDnsRecords.length > 0 ? displayedDnsRecords.map((record) => (
            <div key={record.id} className="p-3 bg-green-900 rounded-md shadow-md">
              <div className="flex justify-between items-start mb-1.5">
                <h3 className="text-md md:text-lg font-semibold text-yellow-300">{record.type} Record 
                  <span className="text-xs text-gray-400 ml-2 hidden sm:inline">({record.purpose})</span>
                </h3>
                 <div className="flex items-center text-xs">
                    {getStatusIcon(record.status)}
                    <span className={`ml-1 capitalize ${record.status === 'verified' ? 'text-green-400' : record.status === 'failed' || record.status === 'error' ? 'text-red-400' : 'text-gray-400'}`}>
                      {record.status || 'pending'}
                    </span>
                 </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-x-3 gap-y-1 text-xs md:text-sm mb-1">
                <div className="truncate">
                  <label className="block text-xs text-gray-400">Name/Host:</label>
                  <div className="flex items-center">
                    <span className="text-green-200 break-all" title={record.name}>{record.name}</span>
                    <Button variant="ghost" size="sm" onClick={() => copyToClipboard(record.name, 'Name/Host')} className="ml-1 p-1 h-auto text-gray-400 hover:text-yellow-300">
                      <Copy size={12} />
                    </Button>
                  </div>
                </div>
                <div className="md:col-span-2 truncate">
                  <label className="block text-xs text-gray-400">Value/Target:</label>
                   <div className="flex items-center">
                    <span className="text-green-200 break-all" title={record.value}>{record.value}</span>
                    <Button variant="ghost" size="sm" onClick={() => copyToClipboard(record.value, 'Value/Target')} className="ml-1 p-1 h-auto text-gray-400 hover:text-yellow-300">
                      <Copy size={12} />
                    </Button>
                  </div>
                </div>
              </div>
              {record.priority !== undefined && (
                <div>
                  <label className="block text-xs text-gray-400">Priority:</label>
                  <span className="text-green-200 text-xs md:text-sm">{record.priority}</span>
                </div>
              )}
               <p className="text-xs text-gray-500 sm:hidden">({record.purpose})</p> {/* Purpose visible on small screens here*/}
              {record.verificationMessage && (record.status === 'failed' || record.status === 'error') && (
                <p className="text-xs text-red-300 mt-1">Note: {record.verificationMessage}</p>
              )}
            </div>
          )) : (
            <p className="text-gray-300 text-center py-4">DNS records are brewing... Hang tight!</p>
          )}
        </CardContent>
      </Card>
      
       <h2 className="text-xl md:text-2xl font-semibold text-yellow-400 mb-4 text-center">Need a Map? Select Your DNS Provider</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-4 w-full max-w-4xl mb-8">
        {DNS_PROVIDER_DISPLAY_OPTIONS.map((provider) => (
          <Card
            key={provider.id}
            onClick={() => handleProviderCardClick(provider)}
            className={`bg-green-800 hover:bg-green-900 border-2 transition-all cursor-pointer shadow-lg hover:shadow-2xl 
                        ${(userSetProviderId === provider.id ) ? 'border-yellow-500 ring-2 ring-yellow-400 scale-105' : 
                          (detectedProviderId === provider.id && !userSetProviderId) ? 'border-yellow-400 scale-105' : 'border-green-600 hover:border-yellow-300'}`}
          >
            <CardContent className="flex flex-col items-center justify-center p-3 md:p-4 text-center h-full">
              <img src={provider.logo} alt={`${provider.name} logo`} className="h-10 md:h-12 w-auto mb-2 object-contain" />
              <p className="text-xs md:text-sm font-medium text-gray-200">{provider.name}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md mb-6">
        <Button
          variant="outline"
          onClick={() => handleNavigate('previous')}
          className="w-full sm:w-auto text-yellow-300 border-yellow-400 hover:bg-yellow-400 hover:text-green-900 py-3 px-6 text-lg"
          disabled={isVerifyingDns || isLoadingPage}
        >
          Previous
        </Button>
        <Button
          onClick={handleVerifyDns}
          className="w-full bg-yellow-400 hover:bg-yellow-500 text-green-900 font-bold py-3 px-6 text-lg shadow-md hover:shadow-lg"
          disabled={isVerifyingDns || isLoadingPage || displayedDnsRecords.length === 0}
        >
          {isVerifyingDns ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <CheckCircle size={20} className="mr-2"/>}
          {isVerifyingDns ? "Checking Vines..." : "Verify DNS Records"}
        </Button>
      </div>
      <Button
          onClick={() => handleNavigate('next')}
          className="w-full max-w-md bg-green-500 hover:bg-green-400 text-white font-bold py-3 px-6 text-lg shadow-md hover:shadow-lg"
          disabled={isVerifyingDns || isLoadingPage }
        >
          Next Step
        </Button>


      {selectedProviderForModal && emailSetupData && (
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="bg-green-800 text-white border-yellow-500 max-w-lg shadow-2xl">
            <DialogHeader className="pb-3 border-b border-green-700">
              <DialogTitle className="text-yellow-400 text-xl md:text-2xl flex items-center">
                <img src={selectedProviderForModal.logo} alt="" className="h-7 w-auto mr-2 md:mr-3 object-contain"/>
                {selectedProviderForModal.name} DNS Guide
              </DialogTitle>
              <DialogDescription className="text-gray-300 text-xs md:text-sm pt-1">
                Add these records for <strong className="text-yellow-300">{emailSetupData.domain}</strong>.
                {selectedProviderForModal.instructionsUrl && emailSetupData.domain && (
                    <a 
                        href={selectedProviderForModal.instructionsUrl.replace('{domain}', emailSetupData.domain).replace(':account/:zone', '')} // Basic placeholder replace
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 underline ml-1 inline-flex items-center text-xs md:text-sm"
                    >
                         Go to {selectedProviderForModal.name} <ExternalLink size={12} className="ml-1"/>
                    </a>
                )}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-2 md:space-y-3 max-h-[50vh] overflow-y-auto p-1 pr-2 md:pr-3 mt-3 text-sm">
              {displayedDnsRecords.map(record => (
                <div key={record.id + '-modal'} className="p-2 md:p-3 bg-green-900 rounded-md shadow">
                  <h4 className="text-sm md:text-md font-semibold text-yellow-300 mb-1">{record.type} Record 
                    <span className="text-xs text-gray-400 ml-1.5">({record.purpose})</span>
                  </h4>
                   <div className="text-xs space-y-1">
                      <div className="flex items-start"><strong className="text-gray-400 w-16 shrink-0">Type:</strong> {record.type}</div>
                      <div className="flex items-start"><strong className="text-gray-400 w-16 shrink-0">Name/Host:</strong> 
                        <span className="text-green-200 break-all flex-grow mr-1">{record.name}</span>
                        <Button variant="ghost" size="sm" onClick={() => copyToClipboard(record.name, 'Name/Host')} className="ml-auto p-0.5 h-auto text-gray-400 hover:text-yellow-300 shrink-0">
                            <Copy size={11} />
                        </Button>
                      </div>
                      <div className="flex items-start"><strong className="text-gray-400 w-16 shrink-0">Value:</strong> 
                        <span className="text-green-200 break-all flex-grow mr-1">{record.value}</span>
                        <Button variant="ghost" size="sm" onClick={() => copyToClipboard(record.value, 'Value/Target')} className="ml-auto p-0.5 h-auto text-gray-400 hover:text-yellow-300 shrink-0">
                            <Copy size={11} />
                        </Button>
                      </div>
                      {record.priority !== undefined && <div className="flex items-start"><strong className="text-gray-400 w-16 shrink-0">Priority:</strong> {record.priority}</div>}
                   </div>
                </div>
              ))}
               {displayedDnsRecords.length === 0 && (
                <p className="text-center text-gray-400 py-4">DNS records are still swinging through the vines... almost here!</p>
               )}
            </div>

            <DialogFooter className="mt-4 pt-3 border-t border-green-700">
              <DialogClose asChild>
                <Button type="button" variant="outline" className="text-yellow-300 border-yellow-400 hover:bg-yellow-400 hover:text-green-900 w-full">
                  Got it, Close
                </Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default DnsConfirmationPage; 