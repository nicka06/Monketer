import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { FORM_FLOW_ORDER } from '@/core/constants';

const BusinessOverviewPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [businessDescription, setBusinessDescription] = useState('');

  useEffect(() => {
    // Load existing description from localStorage if available
    const savedDesc = localStorage.getItem('pendingBusinessDescription');
    if (savedDesc) {
      setBusinessDescription(savedDesc);
    }
  }, []);

  const handleNavigate = (direction: 'next' | 'previous') => {
    const currentPath = location.pathname; // Should be /business-overview
    const currentIndex = FORM_FLOW_ORDER.indexOf(currentPath);
    let targetPath = '';

    if (direction === 'next') {
      if (currentIndex !== -1 && currentIndex < FORM_FLOW_ORDER.length - 1) {
        targetPath = FORM_FLOW_ORDER[currentIndex + 1];
      } else {
        // Fallback if /business-overview is not in FORM_FLOW_ORDER or is the last item
        targetPath = '/optional-signup'; 
      }
    } else if (direction === 'previous') {
      if (currentIndex !== -1 && currentIndex > 0) {
        targetPath = FORM_FLOW_ORDER[currentIndex - 1];
      } else {
        // Fallback if /business-overview is not in FORM_FLOW_ORDER or is the first item
        targetPath = '/'; 
      }
    }

    if (targetPath) {
      navigate(targetPath, { replace: true, state: { ...location.state, fromFormFlow: true } });
    }
  };

  const handleGenerateClick = () => {
    if (businessDescription.trim() === '') {
      alert('Please describe your business first!');
      return;
    }
    localStorage.setItem('pendingBusinessDescription', businessDescription);
    handleNavigate('next'); // This should navigate to /optional-signup based on FORM_FLOW_ORDER
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
            <div className="flex flex-col space-y-3 md:flex-row md:space-y-0 md:space-x-3">
              <button 
                type="button"
                onClick={() => handleNavigate('previous')}
                className="w-full md:w-auto bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-4 rounded-lg shadow-md transition duration-150 ease-in-out"
              >
                Previous
              </button>
              <button 
                type="button"
                onClick={handleGenerateClick}
                className="w-full bg-yellow-400 hover:bg-yellow-500 text-green-900 font-bold py-3 px-4 rounded-lg shadow-md transition duration-150 ease-in-out transform hover:scale-105"
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