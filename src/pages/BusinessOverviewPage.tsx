import Navbar from "@/components/Navbar";
// import Footer from "@/components/Footer"; // Removed Footer
import { useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import { FORM_FLOW_ORDER } from '@/core/constants';
import { useAuth } from "@/features/auth/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const BusinessOverviewPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [businessDescription, setBusinessDescription] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const loadBusinessDescription = useCallback(async () => {
    setIsLoading(true);
    let desc = '';
    if (user && user.id) {
      try {
        const { data, error } = await supabase
          .from('email_setups')
          .select('business_description')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          throw error;
        }
        if (data?.business_description) {
          desc = data.business_description;
        } else {
          const savedDesc = localStorage.getItem('pendingBusinessDescription');
          if (savedDesc) {
            desc = savedDesc;
          }
        }
      } catch (error: any) {
        console.error("BusinessOverviewPage: Error loading data for authenticated user:", error);
        toast({ title: "Error Loading Data", description: "Could not load your business description.", variant: "destructive" });
      }
    } else {
      const savedDesc = localStorage.getItem('pendingBusinessDescription');
      if (savedDesc) {
        desc = savedDesc;
      }
    }
    setBusinessDescription(desc);
    setIsLoading(false);
  }, [user, toast]);

  useEffect(() => {
    loadBusinessDescription();
  }, [loadBusinessDescription]);

  // Simplified navigation: this page only goes 'next'
  const handleNavigateNext = () => {
    const currentPath = location.pathname; // Should be /business-overview
    const currentIndex = FORM_FLOW_ORDER.indexOf(currentPath);
    let targetPath = '';
    
    // Determine the default next path from FORM_FLOW_ORDER
    let defaultNextPath = '/optional-signup'; // Default if not found or at end
    if (currentIndex !== -1 && currentIndex < FORM_FLOW_ORDER.length - 1) {
      defaultNextPath = FORM_FLOW_ORDER[currentIndex + 1];
    }

    // If user is authenticated and the default next step is /optional-signup,
    // find /goals-form and set it as the target.
    if (user && defaultNextPath === '/optional-signup') {
      const goalsFormPath = '/goals-form';
      const goalsFormIndex = FORM_FLOW_ORDER.indexOf(goalsFormPath);
      if (goalsFormIndex !== -1) {
        targetPath = FORM_FLOW_ORDER[goalsFormIndex];
      } else {
        targetPath = goalsFormPath; // Fallback, though /goals-form should be in FORM_FLOW_ORDER
      }
    } else {
      // For guests, or if the next step for an auth user isn't /optional-signup, use the default next path
      targetPath = defaultNextPath;
    }
    
    if (targetPath) {
      navigate(targetPath, { replace: true, state: { ...location.state, fromFormFlow: true } });
    }
  };

  const handleConfirmAndContinue = () => {
    if (businessDescription.trim() === '') {
      alert('Please describe your business first!');
      return;
    }
    localStorage.setItem('pendingBusinessDescription', businessDescription);
    handleNavigateNext(); 
  };

  return (
    <div className="page-container text-white"> {/* Added page-container */}
      <div className="images-container"> {/* Added images-container */}
        <img 
          src="/images/background.png" 
          alt="Jungle background"
          className="background-image-element"
        />
      </div>

      <div className="content-wrapper min-h-screen flex flex-col"> {/* Added content-wrapper */}
        <Navbar />
        
        <main className="flex-grow flex items-center justify-center p-8">
          <div className="flex flex-col md:flex-row items-stretch gap-8 w-full max-w-6xl">
            <div className="md:w-1/2 bg-black bg-opacity-50 p-6 rounded-lg flex flex-col space-y-4">
              <h2 className="text-2xl font-bold text-yellow-400 mb-4 text-center">Describe Your Business</h2>
              {isLoading ? (
                <div className="flex-grow flex items-center justify-center">
                  <p className="text-lg">Loading description...</p>
                </div>
              ) : (
                <textarea 
                  id="businessDescription"
                  placeholder="Explain your business. ex: An ecommerce store selling candles and soaps"
                  className="flex-grow p-3 rounded-md bg-gray-800 text-white placeholder-gray-400 border border-gray-700 focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                  rows={8}
                  value={businessDescription}
                  onChange={(e) => setBusinessDescription(e.target.value)}
                />
              )}
              <div className="flex flex-col space-y-3 md:flex-row md:space-y-0 md:justify-end">
                <button 
                  type="button"
                  onClick={handleConfirmAndContinue}
                  className="w-full md:w-auto bg-yellow-400 hover:bg-yellow-500 text-green-900 font-bold py-3 px-4 rounded-lg shadow-md transition duration-150 ease-in-out transform hover:scale-105"
                >
                  Confirm Business Overview & Continue
                </button>
              </div>
            </div>

            <div className="md:w-1/2 flex justify-center items-center">
              <img 
                src="/images/businessmonkey.png" 
                alt="Business monkey with briefcase"
                className="max-w-md h-auto object-contain business-overview-monkey" /* Apply bounce and size styling, changed max-w-sm to max-w-md */
              />
            </div>
          </div>
        </main>
        
        {/* <Footer /> Removed Footer */}
      </div>
      <style jsx global>{`
        .page-container {
          position: relative;
          min-height: 100vh;
          overflow: hidden; /* Prevents scrollbars if background is larger */
        }
        .images-container {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 0; /* Background behind content */
        }
        .background-image-element {
          width: 100%;
          height: 100%;
          object-fit: cover; /* Cover the entire container */
          display: block;
        }
        .content-wrapper {
          position: relative; /* To sit on top of the images-container */
          z-index: 1;
          background-color: transparent; /* Ensure it doesn't hide the background */
        }
        /* Adjust main content padding if needed due to navbar or other elements */
        .content-wrapper > main {
           padding-top: 4rem; /* Example: if Navbar is fixed height */
        }

        .business-overview-monkey {
          max-width: 90%; /* Increased from 80% */
          max-height: 500px; /* Increased from 450px */
          animation: subtleBounce 3s ease-in-out infinite;
          transform-origin: bottom center;
          margin-top: 1rem; /* Added for downward shift */
          margin-left: 1rem; /* Added for rightward shift */
        }

        @keyframes subtleBounce {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px); 
          }
        }
      `}</style>
    </div>
  );
};

export default BusinessOverviewPage; 