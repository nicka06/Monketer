import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { FORM_FLOW_ORDER } from '@/core/constants';
import Navbar from '@/components/Navbar';
// import Footer from '@/components/Footer'; // If needed later

const BusinessClarificationPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(false);

  // Placeholder useEffect for data loading
  useEffect(() => {
    // console.log("BusinessClarificationPage: loading data...");
  }, []);

  const handleNavigate = (direction: 'next' | 'previous') => {
    const currentPath = location.pathname;
    const currentIndex = FORM_FLOW_ORDER.indexOf(currentPath);
    let targetPath = '';

    if (direction === 'next') {
      if (currentIndex < FORM_FLOW_ORDER.length - 1) {
        targetPath = FORM_FLOW_ORDER[currentIndex + 1];
      } else {
        targetPath = '/dashboard'; // Or last defined step
      }
    } else { // direction === 'previous'
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
      <div className="min-h-screen flex flex-col items-center justify-center bg-green-800 text-white p-4 md:p-8 pt-20 md:pt-24">
        <div className="w-full max-w-2xl space-y-8 text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-yellow-400 mb-4">
            Business Clarification
          </h1>
          <p className="text-lg text-gray-200">
            This page is under construction.
          </p>
          <p className="text-gray-300">
            (Content for clarifying business details will go here)
          </p>
          {/* Placeholder for next button or further actions */}
          {/* <button className="mt-6 bg-yellow-400 hover:bg-yellow-500 text-green-900 font-bold py-3 px-6 text-lg rounded-lg shadow-md">Next</button> */}
        </div>
        {/* Navigation Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-xs sm:max-w-sm mt-8">
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
    </>
  );
};

export default BusinessClarificationPage; 