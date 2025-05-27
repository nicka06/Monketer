import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { FORM_FLOW_ORDER } from '@/core/constants';
import { useAuth } from "@/features/auth/useAuth";

const BusinessOverviewPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [businessDescription, setBusinessDescription] = useState('');

  useEffect(() => {
    // Load existing description from localStorage if available
    const savedDesc = localStorage.getItem('pendingBusinessDescription');
    if (savedDesc) {
      setBusinessDescription(savedDesc);
    }
  }, []);

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
    <div className="min-h-screen flex flex-col bg-green-700 text-white">
      <Navbar />
      
      <main className="flex-grow flex items-center justify-center p-8">
        <div className="flex flex-col md:flex-row items-stretch gap-8 w-full max-w-6xl">
          <div className="md:w-1/2 bg-black bg-opacity-50 p-6 rounded-lg flex flex-col space-y-4">
            <h2 className="text-2xl font-bold text-yellow-400 mb-4 text-center">Describe Your Business</h2>
            <textarea 
              id="businessDescription"
              placeholder="Explain your business. ex: An ecommerce store selling candles and soaps"
              className="flex-grow p-3 rounded-md bg-gray-800 text-white placeholder-gray-400 border border-gray-700 focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
              rows={8}
              value={businessDescription}
              onChange={(e) => setBusinessDescription(e.target.value)}
            />
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
              src="/public/images/homepage_monkey_swinging.png" 
              alt="Monkey in the jungle" 
              className="max-w-full h-auto object-cover"
            />
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default BusinessOverviewPage; 