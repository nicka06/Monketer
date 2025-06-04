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
  const [persistentTrackingId, setPersistentTrackingId] = useState<string | null>(null);
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
    const fetchIdsAndGenerateScript = async () => {
      if (!user) {
        toast({ title: "Authentication Error", description: "Please log in to continue.", variant: "destructive" });
        navigate('/login', { replace: true, state: { from: location.pathname } });
        return;
      }
      setIsLoadingPageData(true);
      let currentEmailSetupId: string | null = null;
      try {
        const { data: setupData, error: setupError } = await supabase
          .from('email_setups')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (setupError) throw setupError;

        if (setupData && setupData.id) {
          currentEmailSetupId = setupData.id;
          setEmailSetupId(currentEmailSetupId);

          const { data: trackingIdData, error: trackingIdError } = await supabase.functions.invoke(
            'get-or-create-tracking-id',
            { body: { emailSetupId: currentEmailSetupId } }
          );

          if (trackingIdError) {
            console.error("Error fetching/creating trackingPixelId:", trackingIdError);
            throw new Error(trackingIdError.message || "Could not get or create tracking ID.");
          }

          if (trackingIdData && trackingIdData.trackingPixelId) {
            setPersistentTrackingId(trackingIdData.trackingPixelId);
          } else {
            throw new Error("No trackingPixelId returned from function.");
          }
        } else {
          toast({ title: "Setup Incomplete", description: "Email setup not found. Please complete previous steps.", variant: "destructive" });
          console.warn("WebsiteTrackingPage: email_setup_id not found for user.");
        }
      } catch (error: any) {
        toast({ title: "Error Loading Data", description: `Could not load required IDs: ${error.message}`, variant: "destructive" });
        console.error("Error fetching IDs:", error);
      } finally {
        setIsLoadingPageData(false);
      }
    };

    if (!authLoading) {
        fetchIdsAndGenerateScript();
    }
  }, [user, authLoading, toast, navigate, location.pathname, supabase]);

  useEffect(() => {
    const scriptContent = `
(function() {
  var setupId = '${persistentTrackingId}';
  var ingestUrl = '${ingestEventUrl}';

  function sendEvent(eventName, eventData) {
    var payload = {
      email_setup_id: setupId,
      event_name: eventName,
      event_data: eventData || {},
      page_url: window.location.href,
      client_timestamp: new Date().toISOString()
    };
    fetch(ingestUrl, { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify(payload), 
      keepalive: true,
      credentials: 'omit'
    }).catch(err => console.error('Emailore event (fetch) failed:', eventName, err));
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
  }, [persistentTrackingId, ingestEventUrl]);

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
    <div className="relative flex flex-col min-h-screen overflow-hidden">
      <img
        src="/images/background8.png"
        alt="Jungle background"
        className="absolute inset-0 w-full h-full object-cover -z-10"
        // Add onLoad/onError if this page's loading screen needs to wait for it
        // onLoad={() => console.log("background8.png loaded")}
        // onError={() => console.error("background8.png failed to load")}
      />
      <Navbar />
      <main className="flex-grow py-8 px-4 pt-24 md:pt-28 text-white">
        <div className="container mx-auto max-w-3xl">
          <div className="bg-black bg-opacity-60 p-6 rounded-lg mb-10">
            <div className="text-center">
              <Code size={64} className="mx-auto text-yellow-400 mb-4" />
              <h1 className="text-4xl md:text-5xl font-bold text-yellow-300 mb-3">Website Tracking Pixel</h1>
              <p className="text-lg text-gray-100">
                Install our tracking pixel on your website to start collecting data and enable powerful automations.
              </p>
            </div>
          </div>

          {!emailSetupId && !isLoadingPageData && !authLoading && (
            <div className="bg-red-700 bg-opacity-90 p-6 rounded-lg text-center mb-8">
                <div className="flex items-center justify-center text-yellow-300 mb-2">
                    <AlertTriangle size={24} className="mr-2" /> 
                    <h2 className="text-xl font-semibold">Setup ID Missing</h2>
                </div>
                <p className="text-gray-100">
                  We couldn't find your setup ID. Please ensure you've completed the previous steps in the onboarding flow. 
                  If the issue persists, try refreshing or contacting support.
                </p>
            </div>
          )}

          {emailSetupId && (
            <div className="space-y-8">
              <div className="bg-green-700 bg-opacity-80 p-6 rounded-lg">
                <h2 className="text-2xl font-semibold text-yellow-300 mb-3">1. Your Pixel Script</h2>
                <p className="text-gray-100">Copy the script below and paste it into the {'`<head>`'} section of every page on your website. If you're using a website builder (like Shopify, WordPress, Wix, etc.), you can usually add this to a "custom code" or "header scripts" section in your site's settings.</p>
              </div>
              <div className="bg-gray-800 bg-opacity-90 rounded-md p-4 relative">
                <pre className="text-sm text-gray-200 overflow-x-auto whitespace-pre-wrap break-all">
                  {pixelScript || "Generating your script..."}
                </pre>
                <Button 
                  onClick={copyToClipboard} 
                  variant="ghost" 
                  size="sm" 
                  className="absolute top-2 right-2 bg-yellow-400 text-green-900 hover:bg-yellow-500 px-3 py-1"
                  disabled={!pixelScript}
                >
                  <Copy size={16} className="mr-2" /> Copy Script
                </Button>
              </div>

              <div>
                <h2 className="text-2xl font-semibold text-yellow-300 mb-3">2. Test Your Installation</h2>
                <div className="bg-green-700 bg-opacity-80 p-6 rounded-lg">
                  <p className="text-gray-100 mb-4">
                    Once you've added the script to your site, publish the changes. Then, visit any page on your site where the pixel is installed. Finally, click the button below to test if we've received the signal. It might take a minute or two for the first event to arrive.
                  </p>
                  <Button 
                    onClick={handleTestPixel} 
                    disabled={isTestingPixel || !emailSetupId}
                    className="w-full sm:w-auto bg-yellow-400 text-green-900 hover:bg-yellow-500 font-semibold py-3 px-6 rounded-lg text-lg"
                  >
                    {isTestingPixel ? (
                      <><Loader2 size={20} className="animate-spin mr-2" /> Testing...</>
                    ) : (
                      "Test Pixel Installation"
                    )}
                  </Button>
                  {pixelTestResult && (
                    <div className={`mt-4 p-4 rounded-md text-gray-50 ${pixelTestResult.success ? 'bg-green-600 bg-opacity-90' : 'bg-red-600 bg-opacity-90'}`}>
                      <div className="flex items-center">
                        {pixelTestResult.success ? <CheckCircle size={20} className="mr-2" /> : <AlertTriangle size={20} className="mr-2" />}
                        <h3 className="text-lg font-semibold">{pixelTestResult.message}</h3>
                      </div>
                      {pixelTestResult.details && typeof pixelTestResult.details === 'object' && (
                        <pre className="mt-2 text-xs bg-black bg-opacity-30 p-2 rounded overflow-x-auto">
                          {JSON.stringify(pixelTestResult.details, null, 2)}
                        </pre>
                      )}
                       {!pixelTestResult.success && pixelTestResult.message.includes("not yet received") && (
                         <p className="text-sm mt-2">Make sure you've saved/published the script on your site and visited a page. It can sometimes take a few minutes for the first signal to arrive.</p>
                       )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="mt-12 flex flex-col sm:flex-row justify-between items-center gap-4 pb-8">
            <Button
              variant="outline"
              onClick={() => handleNavigate('previous')}
              className="w-full sm:w-auto text-yellow-300 border-yellow-400 hover:bg-yellow-400 hover:text-green-900 py-3 px-6 text-lg rounded-lg shadow-md"
              disabled={isLoadingPageData || isTestingPixel}
            >
              Previous Step
            </Button>
            <Button
              onClick={() => handleNavigate('next')}
              className="w-full sm:w-auto bg-yellow-400 hover:bg-yellow-500 text-green-900 font-bold py-3 px-6 text-lg rounded-lg shadow-md"
              disabled={isLoadingPageData || isTestingPixel}
            >
              Continue to Plan Selection
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default WebsiteTrackingPage; 