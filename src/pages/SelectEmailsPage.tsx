import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { FORM_FLOW_ORDER } from '@/core/constants';

const SelectEmailsPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Placeholder useEffect for data loading - adapt as needed
    // const loadData = async () => {
    //   setIsLoading(true);
    //   // TODO: Load any data relevant to this page (e.g., from localStorage or Supabase)
    //   console.log("SelectEmailsPage: loading data...");
    //   setIsLoading(false);
    // };
    // loadData();
  }, [location.state]);

  const handleNavigate = (direction: 'next' | 'previous') => {
    const currentPath = location.pathname;
    const currentIndex = FORM_FLOW_ORDER.indexOf(currentPath);
    let targetPath = '';

    if (direction === 'next') {
      if (currentIndex < FORM_FLOW_ORDER.length - 1) {
        targetPath = FORM_FLOW_ORDER[currentIndex + 1];
      } else {
        console.log("SelectEmailsPage: Reached end of defined flow, going to dashboard (placeholder)");
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
    <div className="min-h-screen flex flex-col items-center justify-center bg-green-800 text-white p-4 md:p-8">
      <div className="flex flex-col md:flex-row items-center justify-center gap-8 w-full max-w-6xl mb-8">
        {/* Left Side: Image */}
        <div className="w-full md:w-1/2 flex justify-center">
          <img 
            src="/images/homepage_monkey_swinging.png" 
            alt="Jungle Monkey" 
            className="max-w-md w-full h-auto object-cover rounded-lg shadow-xl" 
          />
        </div>

        {/* Right Side: Card for Checklist */}
        <div className="w-full md:w-1/2 flex justify-center">
          <div className="bg-green-700 bg-opacity-75 p-8 rounded-xl shadow-2xl w-full max-w-md">
            <h2 className="text-3xl font-bold text-yellow-400 mb-6 text-center">Select Your Emails</h2>
            <div className="space-y-4">
              <p className="text-gray-200 text-center">
                Your email checklist will appear here soon!
              </p>
              {/* Placeholder for checklist items */}
              <div className="bg-green-600 bg-opacity-50 p-4 rounded-lg text-center">
                <p className="italic text-gray-300">(Checklist items coming soon)</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Navigation Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md mt-8">
        <Button
          type="button"
          variant="outline"
          onClick={() => handleNavigate('previous')}
          className="w-full sm:w-auto text-yellow-300 border-yellow-400 hover:bg-yellow-400 hover:text-green-900 py-3 px-6 text-lg rounded-lg shadow-md transition duration-150 ease-in-out transform hover:scale-105"
          disabled={isLoading}
        >
          Previous
        </Button>
        <Button
          type="button"
          onClick={() => handleNavigate('next')}
          className="w-full bg-yellow-400 hover:bg-yellow-500 text-green-900 font-bold py-3 px-6 text-lg rounded-lg shadow-md transition duration-150 ease-in-out transform hover:scale-105"
          disabled={isLoading}
        >
          Next
        </Button>
      </div>
    </div>
  );
};

export default SelectEmailsPage; 