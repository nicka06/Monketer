/**
 * Index.tsx
 * 
 * Main landing page component for the application.
 * Serves as the entry point for users visiting the root URL.
 * Combines multiple section components to create a complete marketing page.
 */

// Navigation component for header section
import Navbar from "@/components/Navbar";
// Site-wide footer component
import Footer from "@/components/Footer";
import { useNavigate, useLocation } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import { FORM_FLOW_ORDER } from '@/core/constants';
import { useLoading } from '@/contexts/LoadingContext';

/**
 * Index component - Landing page layout
 * 
 * Assembles the main marketing sections in a vertical flex layout.
 * Ensures the page takes at least the full viewport height with flex-grow.
 */
const Index = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { hideLoading } = useLoading();
  const [businessDescription, setBusinessDescription] = useState('');
  const backgroundRef = useRef<HTMLImageElement>(null);
  const monkeyRef = useRef<HTMLImageElement>(null);
  const [isBackgroundLoaded, setIsBackgroundLoaded] = useState(false);
  const [isMonkeyLoaded, setIsMonkeyLoaded] = useState(false);
  const hideLoadingCalledRef = useRef(false); // Ref to track if hideLoading was called

  useEffect(() => {
    // Reset the flag if the component were to somehow remount for a *new* page load, though unlikely here.
    // For this page, it's primarily for ensuring one call per image set load.
    hideLoadingCalledRef.current = false; 
  }, []); // Empty dependency array means this runs once on mount

  useEffect(() => {
    const bgStatus = backgroundRef.current?.complete || isBackgroundLoaded;
    const monkeyStatus = monkeyRef.current?.complete || isMonkeyLoaded;

    if (bgStatus && monkeyStatus && !hideLoadingCalledRef.current) {
      console.log("IndexPage: All critical images loaded/complete. Hiding loading screen ONCE.");
      hideLoading();
      hideLoadingCalledRef.current = true; // Set flag to prevent multiple calls
    }
  }, [isBackgroundLoaded, isMonkeyLoaded, hideLoading]); // hideLoading is stable, fine in deps

  // Simplified navigation: Index only goes to /business-overview
  const handleNavigateToNextStep = () => {
    const targetPath = '/optional-signup'; // Changed to navigate directly to optional-signup
    navigate(targetPath, { replace: true, state: { ...location.state, fromFormFlow: true } });
  };

  const handleGenerateClick = () => {
    if (businessDescription.trim() === '') {
      alert('Please describe your business first!');
      return;
    }
    localStorage.setItem('pendingBusinessDescription', businessDescription);
    handleNavigateToNextStep();
  };

  const handleImageLoad = (setter: React.Dispatch<React.SetStateAction<boolean>>, imageName: string) => {
    console.log(`IndexPage: ${imageName} loaded.`);
    setter(true);
  };

  const handleImageError = (imageName: string, setter: React.Dispatch<React.SetStateAction<boolean>>) => {
    console.error(`IndexPage: ${imageName} failed to load.`);
    setter(true); 
  };

  return (
    <div className="page-container text-white"> 
      <div className="images-container">
        <img 
          ref={backgroundRef}
          src="/images/background.png" 
          alt="Jungle background"
          className="background-image-element"
          onLoad={() => handleImageLoad(setIsBackgroundLoaded, 'background')}
          onError={() => handleImageError('background', setIsBackgroundLoaded)}
        />
        {/* New Monkey Unit Container */}
        <div className="monkey-unit-container">
          <img 
            ref={monkeyRef}
            src="/images/monketer_main_monkey.png" 
            alt="Emailore Monkey Assistant"
            className="scene-monkey-image"
            onLoad={() => handleImageLoad(setIsMonkeyLoaded, 'monkey')}
            onError={() => handleImageError('monkey', setIsMonkeyLoaded)}
          />
          <div className="monkey-speech-bubble">
            <p>Tell me about your business and I'll help you get started!</p>
          </div>
        </div>
      </div>

      {/* Main Content Wrapper - sits on top of images */}
      <div className="content-wrapper min-h-screen flex flex-col">
        <Navbar />
        
        <main className="flex-grow flex items-center justify-center p-8">
          <div className="flex flex-col md:flex-row items-stretch gap-8 w-full max-w-6xl">
            {/* Large text box input on the left */}
            <div className="md:w-1/2 bg-black bg-opacity-50 p-6 rounded-lg flex flex-col space-y-4">
              <textarea 
                id="businessDescription"
                placeholder="Explain your business. ex: An ecommerce store selling candles and soaps"
                className="flex-grow p-3 rounded-md bg-gray-800 text-white placeholder-gray-400 border border-gray-700 focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                rows={8}
                value={businessDescription}
                onChange={(e) => setBusinessDescription(e.target.value)}
              />
              <button 
                type="button"
                onClick={handleGenerateClick}
                className="w-full bg-yellow-400 hover:bg-yellow-500 text-green-900 font-bold py-3 px-4 rounded-lg shadow-md transition duration-150 ease-in-out transform hover:scale-105"
              >
                Make Me An Email Marketing Machine!
              </button>
            </div>

            {/* Large image of a monkey on the right - REMOVED AS PER REQUEST */}
            {/* 
            <div className="md:w-1/2 flex justify-center items-center">
              <img 
                src="/images/homepage_monkey_swinging.png" 
                alt="Monkey in the jungle" 
                className="max-w-full h-auto object-cover"
              />
            </div>
            */}
          </div>
        </main>
        <Footer />
      </div>

      <style jsx global>{`
        .page-container {
          position: relative;
          min-height: 100vh;
          overflow: hidden; /* Ensures absolute children don't cause scrollbars if slightly off */
        }

        .images-container {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 0; /* Behind content */
        }

        .background-image-element {
          width: 100%;
          height: 100%;
          object-fit: cover; /* Behaves like background-size: cover */
          display: block; /* Removes extra space below image */
        }

        .monkey-unit-container { /* Takes over original monkey positioning */
          position: absolute;
          right: 15%; 
          bottom: 10%; 
          width: 25.2%; 
          max-width: 380px; 
          height: auto; /* Height will be determined by the monkey image content */
          /* aspect-ratio: attr(width) / attr(height); */ /* Consider if monkey img has fixed aspect */
          animation: subtleBounce 3s ease-in-out infinite;
          transform-origin: bottom center; /* Helps bounce look more natural */
          z-index: 1; /* To be above background but allow bubble to be part of it */
        }

        .scene-monkey-image { /* Now relative to monkey-unit-container */
          display: block; /* Remove extra space below img */
          width: 100%;    /* Fills the width of monkey-unit-container */
          height: 100%;   /* Fills the height of monkey-unit-container if unit has explicit height, or drives unit height if auto */
          object-fit: contain; /* Ensures monkey aspect ratio is maintained within its unit space */
          /* No absolute positioning needed here anymore unless for finer control within unit */
        }

        .monkey-speech-bubble { /* Now relative to monkey-unit-container */
          position: absolute;
          width: 75%;  /* Bubble width relative to monkey unit's width */
          max-width: 220px; /* Overriding max-width from before, slightly larger relative */
          bottom: 85%; /* Its bottom relative to monkey unit's height (e.g. near monkey's head) */
          left: 70%;   /* Its left edge relative to monkey unit's left (e.g., starting from monkey's right shoulder) */
          /* transform: translateX(-50%); Might not be needed if left is used well */
          background-color: white;
          color: #333;
          padding: 8px 12px;
          border-radius: 10px;
          box-shadow: 2px 2px 6px rgba(0,0,0,0.2);
          text-align: center;
          font-size: 0.8rem; 
          /* z-index still 1 if needed, or manage within unit */
        }

        .monkey-speech-bubble::after { /* Tail pointing from bubble (bottom-left) to monkey (upper-right body) */
          content: "";
          position: absolute;
          width: 12px; /* Size of the tail */
          height: 12px;
          background-color: white;
          transform: rotate(45deg); /* Makes it a diamond */
          bottom: -5px;  /* Position tail at bottom edge of bubble, adjust for connection */
          left: 15%;    /* Position tail towards left side of bubble, adjust for pointing */
          z-index: -1; /* So tail is behind bubble */
          box-shadow: 1px 1px 1px rgba(0,0,0,0.1); /* Optional subtle shadow on tail */
        }

        .content-wrapper {
          position: relative; /* Needed to stack on top of images-container */
          z-index: 1; /* Ensures content is above images */
          background-color: transparent; /* Ensure it doesn't obscure images unless intended */
        }

        /* Tablet adjustments for monkey unit and bubble */
        @media (max-width: 992px) { 
          .monkey-unit-container {
            width: 23.5%; 
            right: 12%;
            bottom: 8%;
          }
          .monkey-speech-bubble {
            bottom: 83%; 
            left: 68%; 
            width: 78%;
            max-width: 200px;
            font-size: 0.75rem;
            padding: 6px 10px;
          }
          .monkey-speech-bubble::after {
            left: 18%;
            width: 10px;
            height: 10px;
            bottom: -4px;
          }
        }

        /* Mobile adjustments for monkey unit and bubble */
        @media (max-width: 576px) { 
          .monkey-unit-container {
            width: 21.3%;
            right: 10%;
            bottom: 5%;
          }
          .monkey-speech-bubble {
            bottom: 80%; 
            left: 65%; 
            width: 80%;
            max-width: 160px;
            font-size: 0.7rem;
            padding: 5px 8px;
          }
          .monkey-speech-bubble::after {
            left: 20%;
            width: 8px;
            height: 8px;
            bottom: -3px;
          }
        }

        @keyframes subtleBounce {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-8px); /* Adjust for bounce height */
          }
        }
      `}</style>
    </div>
  );
};

export default Index;
