import React, { useEffect, useState, useCallback, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "../features/auth/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { DnsStatusProvider, useDnsStatus } from "@/contexts/DnsStatusContext";
import DnsConfigurationModal from '@/components/DnsConfigurationModal';
import { DNS_PROVIDER_DISPLAY_OPTIONS, FORM_FLOW_ORDER } from '@/core/constants';
import { toast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import GlobalDnsNotificationBar from "@/components/GlobalDnsNotificationBar";
import { AlertTriangle, CheckCircle, Info, Loader2 } from 'lucide-react';

import Index from "../pages/Index";
import Login from "../pages/Login";
import Signup from "../pages/Signup";
import NotFound from "../pages/NotFound";
import Dashboard from "../pages/Dashboard";
import Editor from "../pages/Editor";
import SendEmailPage from "../pages/SendEmailPage";
import PrivacyPolicy from "../pages/PrivacyPolicy";
import TermsOfService from "../pages/TermsOfService";
import BlogIndexPage from "@/pages/BlogIndexPage";
import BlogPostPage from "@/pages/BlogPostPage";
import SubscriptionProtectedRoute from "@/components/subscription/SubscriptionProtectedRoute";
import PlanSelectionPage from "@/components/subscription/PlanSelectionPage";
import OptionalSignUpPage from "../pages/OptionalSignUpPage";
import GoalsFormPage from "../pages/GoalsFormPage";
import BusinessClarificationPage from "../pages/BusinessClarificationPage";
import SelectEmailsPage from "../pages/SelectEmailsPage";
import WebsiteStatusPage from "../pages/WebsiteStatusPage";
import InfoClarificationPage from "../pages/InfoClarificationPage";
import AuthGatePage from "../pages/AuthGatePage";
import DnsConfirmationPage from "../pages/DnsConfirmationPage"; // For types
import WebsiteTrackingPage from "../pages/WebsiteTrackingPage";
import BusinessOverviewPage from "../pages/BusinessOverviewPage";

// Interfaces for Modal Data - these were originally in DnsConfirmationPage
// It's better to have them in a shared types file, but for now, define here or import if App.tsx is the sole user of modal
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

interface EmailSetupDataForModal { // Renamed to avoid conflict if DnsConfirmationPage's type is also imported
    id: string;
    domain: string | null;
    dkim_public_key: string | null;
    // Fields from DnsConfirmationPage.EmailSetupData used by constructDnsRecords & modal
    dkim_selector?: string | null;
    spf_record_value?: string | null;
    mx_record_value?: string | null;
    dmarc_record_value?: string | null;
    mx_status?: 'verified' | 'failed' | 'pending' | 'error';
    spf_status?: 'verified' | 'failed' | 'pending' | 'error';
    dkim_status?: 'verified' | 'failed' | 'pending' | 'error';
    dmarc_status?: 'verified' | 'failed' | 'pending' | 'error';
    overall_dns_status?: 'pending' | 'partially_verified' | 'verified' | 'failed_to_verify';
}

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;
    
    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }
    return <>{children}</>;
};


const AppRoutes = () => {
    const { user, loading: authLoading, session } = useAuth(); // renamed loading to authLoading
    const navigate = useNavigate();
    const location = useLocation();
    const isNavigatingFormFlow = useRef(false);
    const previousUserRef = useRef(user);
    const previousLoadingRef = useRef(authLoading);
    const { setOverallDnsStatus: setGlobalDnsStatusContext, setDnsContextLoaded } = useDnsStatus(); // Renamed setOverallDnsStatus

    useEffect(() => {
        const authStateJustChanged = (previousLoadingRef.current && !authLoading) || (previousUserRef.current?.id !== user?.id);
        previousUserRef.current = user;
        previousLoadingRef.current = authLoading;

        if (authLoading) return;

        if (location.state?.fromFormFlow) {
            isNavigatingFormFlow.current = true;
            const { state, ...rest } = location;
            const newLocationState = { ...state };
            delete newLocationState.fromFormFlow;
            navigate(location.pathname, { replace: true, state: Object.keys(newLocationState).length > 0 ? newLocationState : null });
            return;
        }
        if (isNavigatingFormFlow.current) {
            isNavigatingFormFlow.current = false;
            return;
        }

        if (user && user.id) {
            const fetchAndRedirect = async () => {
                if (!user || !user.id) {
                    setDnsContextLoaded(true);
                    setGlobalDnsStatusContext(null);
                    return;
                }
                const [emailSetupResult, userInfoResult] = await Promise.all([
                    supabase
                        .from('email_setups')
                        .select('id, business_description, goals_form_raw_text, form_complete, selected_campaign_ids, website_provider, domain, overall_dns_status')
                        .eq('user_id', user.id)
                        .maybeSingle(),
                    supabase
                        .from('user_info')
                        .select('subscription_status')
                        .eq('auth_user_uuid', user.id)
                        .maybeSingle()
                ]);
                let { data: emailSetup, error: emailSetupError } = emailSetupResult;
                const { data: userInfo, error: userInfoError } = userInfoResult;

                if (emailSetupError) {
                    toast({ title: "Error Loading Setup", description: "Could not retrieve your setup information.", variant: "destructive" });
                    setDnsContextLoaded(true); // Still mark as loaded to prevent indefinite loading states for DNS bar
                    setGlobalDnsStatusContext(null);
                    return;
                }
                if (userInfoError) {
                    toast({ title: "Error Loading User Profile", description: "Could not retrieve user profile.", variant: "default" });
                }

                if (emailSetup) {
                    setGlobalDnsStatusContext(emailSetup.overall_dns_status as any || null);
                } else {
                    setGlobalDnsStatusContext(null);
                }
                setDnsContextLoaded(true);

                if (userInfo?.subscription_status === 'active' && emailSetup) {
                    const allFieldsFilled =
                        emailSetup.business_description &&
                        emailSetup.goals_form_raw_text &&
                        emailSetup.selected_campaign_ids && emailSetup.selected_campaign_ids.length > 0 &&
                        emailSetup.website_provider &&
                        emailSetup.domain;
                    if (allFieldsFilled && emailSetup.form_complete === false) {
                        const { data: updatedEmailSetup, error: updateError } = await supabase
                            .from('email_setups')
                            .update({ form_complete: true })
                            .eq('id', emailSetup.id)
                            .select('id, business_description, goals_form_raw_text, form_complete, selected_campaign_ids, website_provider, domain, overall_dns_status')
                            .single();
                        if (updateError) {
                            toast({ title: "Error Saving Progress", description: "Could not update completion status.", variant: "destructive" });
                        } else if (updatedEmailSetup) {
                            emailSetup = updatedEmailSetup;
                        }
                    }
                }

                if (emailSetup) {
                    if (emailSetup.form_complete === true) {
                        const nonDashboardFormPages = FORM_FLOW_ORDER.filter(p => p !== '/' && p !== '/dashboard');
                        if (nonDashboardFormPages.includes(location.pathname) || location.pathname === '/') {
                            navigate('/dashboard', { replace: true, state: { fromApp: true } });
                            return;
                        }
                        return;
                    }
                    let targetResumePath = null;
                    const requiredFields = [
                        { field: 'business_description', path: '/' },
                        { field: 'goals_form_raw_text', path: '/goals-form' },
                        { field: 'selected_campaign_ids', path: '/select-emails', check: (val: any) => Array.isArray(val) && val.length > 0 },
                        { field: 'website_provider', path: '/website-status' },
                        { field: 'domain', path: '/website-status' },
                    ];

                    let firstIncompletePath = null;
                    for (const item of requiredFields) {
                        const value = emailSetup[item.field as keyof typeof emailSetup];
                        const isMissing = item.check ? !item.check(value) : !value;
                        if (isMissing) {
                            firstIncompletePath = item.path;
                            break;
                        }
                    }

                    if (firstIncompletePath) {
                        targetResumePath = firstIncompletePath;
                    } else {
                        const infoClarificationPath = '/info-clarification';
                        const infoClarificationIndex = FORM_FLOW_ORDER.indexOf(infoClarificationPath);
                        const currentIndexInFlow = FORM_FLOW_ORDER.indexOf(location.pathname);

                        if (infoClarificationIndex !== -1 && currentIndexInFlow !== -1 && currentIndexInFlow < infoClarificationIndex) {
                            targetResumePath = infoClarificationPath;
                        } else {
                            targetResumePath = null;
                        }
                    }

                    if (targetResumePath && location.pathname !== targetResumePath) {
                        if (!(location.state?.fromApp && location.pathname === targetResumePath)) {
                            navigate(targetResumePath, { replace: true, state: { fromApp: true } });
                            return;
                        }
                    } else if (location.state?.fromApp && location.pathname === targetResumePath) {
                        const { fromApp, ...restOfState } = location.state;
                        navigate(location.pathname, { replace: true, state: Object.keys(restOfState).length > 0 ? restOfState : undefined });
                    }
                } else {
                    const nonEntryFormPages = FORM_FLOW_ORDER.filter(p => p !== '/' && p !== '/optional-signup' && p !== '/business-overview');
                    if (nonEntryFormPages.includes(location.pathname) && location.pathname !== '/subscription-plan' && location.pathname !== '/auth-gate') {
                        navigate('/', { replace: true, state: { fromApp: true } });
                        return;
                    }
                }
            };
            if (location.pathname !== '/login' && location.pathname !== '/signup' && location.pathname !== '/auth-gate') {
                if (authStateJustChanged) {
                    const timer = setTimeout(fetchAndRedirect, 50);
                    return () => clearTimeout(timer);
                } else {
                    fetchAndRedirect();
                }
            }
        } else if (!authLoading && !user) {
            const UNAUTH_REDIRECT_PAGES = ['/goals-form', '/select-emails', '/dashboard', '/website-status', '/dns-confirmation', '/website-tracking'];
            if (UNAUTH_REDIRECT_PAGES.includes(location.pathname)) {
                if (location.pathname === '/dashboard') navigate('/login', { replace: true, state: { from: location } });
                else navigate('/', { replace: true });
            }
            setGlobalDnsStatusContext(null);
            setDnsContextLoaded(true);
        }
    }, [user, authLoading, navigate, location, setGlobalDnsStatusContext, setDnsContextLoaded]);
  
    if (authLoading) return <div className="flex items-center justify-center h-screen">Loading...</div>;
    
    return (
        <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
            <Route path="/signup" element={user ? <Navigate to="/" /> : <Signup />} />
            <Route path="/subscription" element={<ProtectedRoute><PlanSelectionPage /></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/editor" element={<ProtectedRoute><SubscriptionProtectedRoute><Editor /></SubscriptionProtectedRoute></ProtectedRoute>} />
            <Route path="/editor/:projectId" element={<ProtectedRoute><SubscriptionProtectedRoute><Editor /></SubscriptionProtectedRoute></ProtectedRoute>} />
            <Route path="/editor/:username/:projectName" element={<ProtectedRoute><SubscriptionProtectedRoute><Editor /></SubscriptionProtectedRoute></ProtectedRoute>} />
            <Route path="/send-email" element={<ProtectedRoute><SendEmailPage /></ProtectedRoute>} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/terms-of-service" element={<TermsOfService />} />
            <Route path="/blog" element={<BlogIndexPage />} />
            <Route path="/blog/:slug" element={<BlogPostPage />} />
            <Route path="/optional-signup" element={<OptionalSignUpPage />} />
            <Route path="/goals-form" element={<GoalsFormPage />} />
            <Route path="/business-clarification" element={<BusinessClarificationPage />} />
            <Route path="/select-emails" element={<SelectEmailsPage />} />
            <Route path="/website-status" element={<WebsiteStatusPage />} />
            <Route path="/info-clarification" element={<InfoClarificationPage />} />
            <Route path="/auth-gate" element={<AuthGatePage />} />
            <Route path="/dns-confirmation" element={<DnsConfirmationPage />} />
            <Route path="/website-tracking" element={<WebsiteTrackingPage />} />
            <Route path="/subscription-plan" element={<ProtectedRoute><PlanSelectionPage /></ProtectedRoute>} />
            <Route path="/business-overview" element={<BusinessOverviewPage />} />
            <Route path="*" element={<NotFound />} />
        </Routes>
    );
};

const MainContentWithGlobalModal: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const { 
        isDnsModalOpenGlobally,
        hideDnsModal,
        selectedDnsProvider,
        setOverallDnsStatus: setGlobalDnsStatusContext, // Renamed for clarity
        overallDnsStatus,
        dnsContextLoaded // Added dnsContextLoaded here
    } = useDnsStatus();
    const location = useLocation();

    const [emailSetupDataForModal, setEmailSetupDataForModal] = useState<EmailSetupDataForModal | null>(null);
    const [displayedDnsRecordsForModal, setDisplayedDnsRecordsForModal] = useState<DnsRecord[]>([]);
    const [isVerifyingDnsModal, setIsVerifyingDnsModal] = useState(false);
    const [isLoadingModalData, setIsLoadingModalData] = useState(false);

    const constructDnsRecordsForModal = useCallback((data: EmailSetupDataForModal | null): DnsRecord[] => {
        if (!data || !data.domain) return [];
        const records: DnsRecord[] = [];
        if (data.mx_record_value) {
            const parts = data.mx_record_value.split(' ');
            const priority = parts.length > 1 ? parseInt(parts[0], 10) : 10;
            const value = parts.length > 1 ? parts[1] : parts[0];
            records.push({ id: 'mx', type: 'MX', name: data.domain, value: value, priority: priority, purpose: 'Routes incoming mail.', status: data.mx_status || 'pending' });
        }
        if (data.spf_record_value) {
            records.push({ id: 'spf', type: 'TXT', name: data.domain, value: data.spf_record_value, purpose: 'Authorizes sending servers.', status: data.spf_status || 'pending' });
        }
        if (data.dkim_selector && data.dkim_public_key) {
            records.push({ id: 'dkim', type: 'TXT', name: `${data.dkim_selector}._domainkey.${data.domain}`, value: `v=DKIM1; k=rsa; p=${data.dkim_public_key}`, purpose: 'Verifies email authenticity.', status: data.dkim_status || 'pending' });
        }
        if (data.dmarc_record_value) {
            records.push({ id: 'dmarc', type: 'TXT', name: `_dmarc.${data.domain}`, value: data.dmarc_record_value, purpose: 'Handles unauthenticated mail.', status: data.dmarc_status || 'pending' });
        }
        return records;
    }, []);

    const fetchFullEmailSetupForModal = useCallback(async (userId: string): Promise<EmailSetupDataForModal | null> => {
        const { data, error } = await supabase
            .from('email_setups')
            .select('id, domain, dkim_public_key, dkim_selector, spf_record_value, mx_record_value, dmarc_record_value, mx_status, spf_status, dkim_status, dmarc_status, overall_dns_status')
            .eq('user_id', userId)
            .maybeSingle();
        if (error) {
            toast({ title: "Modal Error", description: "Could not load DNS data for modal.", variant: "destructive" });
            throw error;
        }
        return data as EmailSetupDataForModal | null;
    }, []);

    useEffect(() => {
        if (isDnsModalOpenGlobally && user?.id) {
            setIsLoadingModalData(true);
            fetchFullEmailSetupForModal(user.id)
                .then(data => {
                    setEmailSetupDataForModal(data);
                    setDisplayedDnsRecordsForModal(constructDnsRecordsForModal(data));
                })
                .catch(err => console.error("Error fetching data for global modal:", err))
                .finally(() => setIsLoadingModalData(false));
        }
    }, [isDnsModalOpenGlobally, user?.id, fetchFullEmailSetupForModal, constructDnsRecordsForModal]);

    const handleVerifyDnsInModal = async () => {
        if (!emailSetupDataForModal?.id || !user?.id) {
            toast({ title: "Verification Error", description: "Required data not found.", variant: "destructive" });
            return;
        }
        setIsVerifyingDnsModal(true);
        try {
            const { data: verificationResult, error } = await supabase.functions.invoke('verify-dns-records', {
                body: { emailSetupId: emailSetupDataForModal.id },
            });
            if (error) throw error;
            if (verificationResult) {
                toast({ title: "DNS Verification Complete", description: `Overall status: ${verificationResult.overallDnsStatus}. Record statuses updated.`, duration: 5000 });
                const updatedSetup = await fetchFullEmailSetupForModal(user.id);
                setEmailSetupDataForModal(updatedSetup);
                setDisplayedDnsRecordsForModal(constructDnsRecordsForModal(updatedSetup));
                setGlobalDnsStatusContext(updatedSetup?.overall_dns_status as any || null);
            }
        } catch (err: any) {
            toast({ title: "DNS Verification Error", description: err.message || "Could not verify records.", variant: "destructive" });
            const currentStatus = emailSetupDataForModal?.overall_dns_status;
            setGlobalDnsStatusContext(currentStatus as any || 'failed_to_verify');
        } finally {
            setIsVerifyingDnsModal(false);
        }
    };

    const copyToClipboardInModal = (text: string, type: string) => {
        navigator.clipboard.writeText(text).then(() => {
            toast({ title: "Copied!", description: `${type} copied.`, duration: 2000 });
        }).catch(err => {
            toast({ title: "Copy Failed", description: `Could not copy.`, variant: "destructive" });
        });
    };

    const getStatusIconForModal = (status?: DnsRecord['status'] | EmailSetupDataForModal['overall_dns_status']) => {
        switch (status) {
            case 'verified': return <CheckCircle className="text-green-400 h-5 w-5" />;
            case 'partially_verified': return <Info className="text-yellow-400 h-5 w-5" />;
            case 'failed': case 'failed_to_verify': return <AlertTriangle className="text-red-400 h-5 w-5" />;
            case 'error': return <AlertTriangle className="text-orange-400 h-5 w-5" />;
            default: return <Loader2 className="text-gray-400 h-5 w-5 animate-spin" />;
        }
    };

    // Logic for main content padding
    const PAGES_WITHOUT_NAVBAR = ['/dashboard', '/editor']; // Mirrored from GlobalDnsNotificationBar
    const hasNavbar = !PAGES_WITHOUT_NAVBAR.some(path => location.pathname.startsWith(path));

    const dnsConfirmationPath = '/dns-confirmation';
    const locationPath = location.pathname;
    const dnsConfirmationIndex = FORM_FLOW_ORDER.indexOf(dnsConfirmationPath);
    const currentIndexInFlow = FORM_FLOW_ORDER.indexOf(locationPath);
    const shouldShowBasedOnPageEligibility = dnsConfirmationIndex !== -1 && (currentIndexInFlow === -1 || currentIndexInFlow >= dnsConfirmationIndex);
    
    const isNotificationBarActuallyVisible = 
        dnsContextLoaded && // Use dnsContextLoaded from useDnsStatus
        overallDnsStatus !== 'verified' && 
        overallDnsStatus !== null && 
        shouldShowBasedOnPageEligibility && 
        !isDnsModalOpenGlobally;

    let paddingTopClass = 'pt-0'; // Default to no padding if no navbar and no bar
    if (hasNavbar) {
        paddingTopClass = isNotificationBarActuallyVisible ? "pt-[108px]" : "pt-16";
    } else {
        paddingTopClass = isNotificationBarActuallyVisible ? "pt-[44px]" : "pt-0"; // Assuming bar height is approx 44px (p-3 = 12px*2 + text height)
        // p-3 tailwind is 0.75rem = 12px. So padding is 24px. Let's say text is 20px. Total height ~44px. Or measure precisely if needed.
    }

    return (
        <div className={`app-container flex flex-col min-h-screen ${paddingTopClass}`}>
            {children}
            {selectedDnsProvider && (
                <DnsConfigurationModal
                    isOpen={isDnsModalOpenGlobally}
                    onOpenChange={(isOpen) => {
                        if (!isOpen) {
                            hideDnsModal();
                            // If the modal is closed and DNS is not verified, the bar should reflect this.
                            // The overallDnsStatus is already in context, so the bar will update.
                            // We might also want to ensure the global state (`overallDnsStatus` in context)
                            // is updated if a verification attempt inside the modal changed it and wasn't the last thing to set it.
                            // For now, handleVerifyDnsInModal updates it.
                        }
                    }}
                    selectedProvider={selectedDnsProvider}
                    emailSetupData={isLoadingModalData ? { id: '', domain: 'Loading...', dkim_public_key: null } : emailSetupDataForModal}
                    displayedDnsRecords={isLoadingModalData ? [] : displayedDnsRecordsForModal}
                    onVerifyDns={handleVerifyDnsInModal}
                    isVerifyingDns={isVerifyingDnsModal}
                    copyToClipboard={copyToClipboardInModal}
                    getStatusIcon={getStatusIconForModal}
                />
            )}
        </div>
    );
};

const App = () => {
    return (
        <QueryClientProvider client={queryClient}>
            <TooltipProvider>
                <BrowserRouter>
                    <AuthProvider>
                        <DnsStatusProvider>
                            <GlobalDnsNotificationBar />
                            <MainContentWithGlobalModal>
                                <AppRoutes />
                            </MainContentWithGlobalModal>
                            <Toaster />
                        </DnsStatusProvider>
                    </AuthProvider>
                </BrowserRouter>
            </TooltipProvider>
        </QueryClientProvider>
    );
};

export default App;
