import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { FORM_FLOW_ORDER } from '@/core/constants';
import Navbar from '@/components/Navbar';
import { useAuth } from "@/features/auth/useAuth";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/components/ui/use-toast";
import { Code, Copy, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import { useLoading } from '@/contexts/LoadingContext';

const WebsiteTrackingPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const { hideLoading } = useLoading();

  const [emailSetupId, setEmailSetupId] = useState<string | null>(null);
  const [pixelScript, setPixelScript] = useState<string>('');
  const [isLoadingPageData, setIsLoadingPageData] = useState(true);
  const [isTestingPixel, setIsTestingPixel] = useState(false);
  const [pixelTestResult, setPixelTestResult] = useState<{success: boolean; message: string; details?: any} | null>(null);
  const hideLoadingCalledRef = useRef(false);

  const ingestEventUrl = 'https://nvlkyadiqucpjjgnhujm.supabase.co/functions/v1/ingest-tracking-event';

  useEffect(() => {
    hideLoadingCalledRef.current = false;
  }, [location.pathname]);

  useEffect(() => {
    if (!isLoadingPageData && !authLoading && !hideLoadingCalledRef.current) {
      console.log("WebsiteTrackingPage: Page data and auth loaded. Hiding loading screen ONCE.");
      hideLoading();
      hideLoadingCalledRef.current = true;
    }
  }, [isLoadingPageData, authLoading, hideLoading]);

  useEffect(() => {
    const fetchEmailSetup = async () => {
      if (!user) {
        toast({ title: "Authentication Error", description: "Please log in to continue.", variant: "destructive" });
        navigate('/login', { replace: true, state: { from: location.pathname } });
        return;
      }
      setIsLoadingPageData(true);
      try {
        const { data, error } = await supabase
          .from('email_setups')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) throw error;

        if (data && data.id) {
          setEmailSetupId(data.id);
        } else {
          toast({ title: "Setup Incomplete", description: "Email setup not found. Please complete previous steps.", variant: "destructive" });
          console.warn("WebsiteTrackingPage: email_setup_id not found for user.");
        }
      } catch (error: any) {
        toast({ title: "Error Loading Data", description: `Could not load setup ID: ${error.message}`, variant: "destructive" });
        console.error("Error fetching email_setup_id:", error);
      } finally {
        setIsLoadingPageData(false);
      }
    };

    if (!authLoading) {
        fetchEmailSetup();
    }
  }, [user, authLoading, toast, navigate, location.pathname]);

  useEffect(() => {
    if (emailSetupId) {
      const scriptContent = `
(function() {
  var setupId = '${emailSetupId}';
  var ingestUrl = '${ingestEventUrl}';

  function sendEvent(eventName, eventData) {
    var payload = {
      email_setup_id: setupId,
      event_name: eventName,
      event_data: eventData || {},
      page_url: window.location.href,
      client_timestamp: new Date().toISOString()
    };
    if (navigator.sendBeacon) {
      try {
        var blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
        navigator.sendBeacon(ingestUrl, blob);
      } catch (e) {
        console.warn('Emailore: sendBeacon failed, falling back to fetch.', e);
        fetch(ingestUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), keepalive: true }).catch(err => console.error('Emailore event (fetch fallback) failed:', eventName, err));
      }
    } else {
      fetch(ingestUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), keepalive: true }).catch(err => console.error('Emailore event (fetch) failed:', eventName, err));
    }
  }

  sendEvent('emailore_pixel_loaded', { status: 'loaded', version: '1.0.0' });

  window.emailore = window.emailore || {};
  window.emailore.track = function(eventName, eventData) {
    if (!eventName) {
      console.warn('Emailore: eventName is required for tracking.');
      return;
    }
    sendEvent(eventName, eventData);
  };
  console.log('Emailore Tracking Pixel Initialized for ' + setupId);
})();`;
      setPixelScript(scriptContent.trim());
    } else {
      setPixelScript('');
    }
  }, [emailSetupId, ingestEventUrl]);

  const copyToClipboard = () => {
    if (pixelScript) {
      navigator.clipboard.writeText(pixelScript).then(() => {
        toast({ title: "Copied!", description: "Pixel script copied to clipboard." });
      }).catch(err => {
        toast({ title: "Copy Failed", description: "Could not copy script.", variant: "destructive" });
        console.error('Failed to copy script: ', err);
      });
    }
  };

  const handleTestPixel = async () => {
    if (!emailSetupId) {
      toast({ title: "Cannot Test Pixel", description: "Setup ID is missing.", variant: "destructive" });
      return;
    }
    setIsTestingPixel(true);
    setPixelTestResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('test-pixel-status', {
        body: { emailSetupId: emailSetupId },
      });

      if (error) throw error;
      
      setPixelTestResult(data);

    } catch (error: any) {
      console.error("Error testing pixel:", error);
      setPixelTestResult({ success: false, message: `Error testing pixel: ${error.message || 'Unknown error'}` });
      toast({ title: "Pixel Test Failed", description: error.message || "Could not get pixel status.", variant: "destructive" });
    } finally {
      setIsTestingPixel(false);
    }
  };

  const handleNavigate = (direction: 'next' | 'previous') => {
    const currentPath = location.pathname;
    const currentIndex = FORM_FLOW_ORDER.indexOf(currentPath);
    let targetPath = '';

    if (direction === 'next') {
      if (currentIndex < FORM_FLOW_ORDER.length - 1) {
        targetPath = FORM_FLOW_ORDER[currentIndex + 1];
      } else {
        targetPath = '/dashboard';
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
    <>
      <Navbar />
      <div className="min-h-screen bg-green-800 text-white py-8 px-4 pt-20 md:pt-24">
        <div className="container mx-auto max-w-3xl">
          <div className="text-center mb-10">
            <Code size={64} className="mx-auto text-yellow-400 mb-4" />
            <h1 className="text-4xl md:text-5xl font-bold text-yellow-400 mb-3">Website Tracking Pixel</h1>
            <p className="text-lg text-gray-200">
              Install our tracking pixel on your website to start collecting data and enable powerful automations.
            </p>
          </div>

          {!emailSetupId && !isLoadingPageData && !authLoading && (
            <div className="bg-red-700 bg-opacity-80 p-6 rounded-lg text-center mb-8">
                <div className="flex items-center justify-center text-yellow-300 mb-2">
                    <AlertTriangle size={24} className="mr-2" /> 
                    <h2 className="text-xl font-semibold">Setup ID Missing</h2>
                </div>
                <p className="text-gray-200">
                    We couldn't find your setup information. Please ensure you've completed the previous steps in the onboarding flow.
                </p>
            </div>
          )}

          {emailSetupId && (
            <>
              <div className="mb-8 p-6 bg-green-700 bg-opacity-60 rounded-lg shadow-lg">
                <h2 className="text-2xl font-semibold text-yellow-400 mb-4">1. Your Tracking Pixel Script</h2>
                <p className="text-gray-300 mb-4">
                  Copy the script below. It's configured with your unique Setup ID and is ready to use.
                </p>
                <div className="bg-gray-900 p-4 rounded-md relative">
                  <pre className="text-sm text-gray-200 overflow-x-auto custom-scrollbar-css">
                    <code>{pixelScript}</code>
                  </pre>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={copyToClipboard}
                    className="absolute top-2 right-2 text-gray-400 hover:text-yellow-300"
                    aria-label="Copy script"
                  >
                    <Copy size={18} />
                  </Button>
                </div>
              </div>

              <div className="mb-8 p-6 bg-green-700 bg-opacity-60 rounded-lg shadow-lg">
                <h2 className="text-2xl font-semibold text-yellow-400 mb-3">2. Installation Instructions</h2>
                <ol className="list-decimal list-inside space-y-2 text-gray-300">
                  <li>Paste the copied script just before the closing <code className="bg-gray-800 text-yellow-300 px-1 rounded">&lt;/body&gt;</code> tag on every page of your website. (Alternatively, in the <code className="bg-gray-800 text-yellow-300 px-1 rounded">&lt;head&gt;</code> tag).</li>
                  <li>Ensure your website changes are published and live.</li>
                  <li>Return here and click the "Test Pixel Installation" button below.</li>
                </ol>
              </div>

              <div className="mb-10 p-6 bg-green-700 bg-opacity-60 rounded-lg shadow-lg">
                <h2 className="text-2xl font-semibold text-yellow-400 mb-4">3. Verify Installation</h2>
                <Button 
                  onClick={handleTestPixel} 
                  disabled={isTestingPixel || !emailSetupId}
                  className="w-full sm:w-auto bg-yellow-500 hover:bg-yellow-600 text-green-900 font-semibold py-3 px-6 text-lg rounded-lg shadow-md"
                >
                  {isTestingPixel ? (
                    <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Testing...</>
                  ) : (
                    'Test Pixel Installation'
                  )}
                </Button>
                {pixelTestResult && (
                  <div className={`mt-6 p-4 rounded-md text-sm ${pixelTestResult.success ? 'bg-green-500 bg-opacity-30 text-green-200' : 'bg-red-500 bg-opacity-30 text-red-200'}`}>
                    <div className="flex items-start">
                      {pixelTestResult.success ? <CheckCircle size={20} className="mr-3 mt-1 text-green-300 flex-shrink-0" /> : <AlertTriangle size={20} className="mr-3 mt-1 text-red-300 flex-shrink-0" />}
                      <div>
                        <p className="font-semibold mb-1">{pixelTestResult.success ? 'Pixel Detected!' : 'Pixel Not Detected'}</p>
                        <p>{pixelTestResult.message}</p>
                        {pixelTestResult.details && (
                            <details className="mt-2 text-xs">
                                <summary className="cursor-pointer hover:underline">Toggle details</summary>
                                <pre className="mt-1 p-2 bg-black bg-opacity-20 rounded custom-scrollbar-css overflow-x-auto">
                                    <code>{JSON.stringify(pixelTestResult.details, null, 2)}</code>
                                </pre>
                            </details>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
          
          <div className="mb-8 p-6 bg-green-700 bg-opacity-60 rounded-lg shadow-lg">
                <h2 className="text-2xl font-semibold text-yellow-400 mb-4">Advanced: Tracking Custom Events</h2>
                <p className="text-gray-300 mb-2">
                    Once the pixel is installed, you can track custom events using <code className="bg-gray-800 text-yellow-300 px-1 rounded">window.emailore.track('yourEventName', &#123; custom: 'data' &#125;);</code> in your website's JavaScript.
                </p>
                <p className="text-gray-300 italic text-sm">
                    (Detailed documentation and UI for defining event-based automations will be available in a future update.)
                </p>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 w-full mt-12 pb-8">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleNavigate('previous')}
              className="w-full sm:w-auto text-yellow-300 border-yellow-400 hover:bg-yellow-400 hover:text-green-900 py-3 px-6 text-lg rounded-lg shadow-md"
              disabled={isTestingPixel}
            >
              Previous Step
            </Button>
            <Button
              type="button"
              onClick={() => handleNavigate('next')}
              className="w-full sm:w-auto bg-yellow-400 hover:bg-yellow-500 text-green-900 font-bold py-3 px-6 text-lg rounded-lg shadow-md"
              disabled={isTestingPixel}
            >
              Continue to Plan Selection
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default WebsiteTrackingPage; 