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
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

/**
 * Index component - Landing page layout
 * 
 * Assembles the main marketing sections in a vertical flex layout.
 * Ensures the page takes at least the full viewport height with flex-grow.
 */
const Index = () => {
  const navigate = useNavigate();
  const [businessDescription, setBusinessDescription] = useState('');

  const handleGenerateClick = () => {
    if (businessDescription.trim() === '') {
      alert('Please describe your business first!');
      return;
    }
    localStorage.setItem('pendingBusinessDescription', businessDescription);
    navigate('/optional-signup');
  };

  return (
    <div className="min-h-screen flex flex-col bg-green-700 text-white">
      {/* Header navigation */}
      <Navbar />
      
      {/* Main content area with new layout */}
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
              make me an email marketing machine!
            </button>
          </div>

          {/* Large image of a monkey on the right */}
          <div className="md:w-1/2 flex justify-center items-center">
            <img 
              src="/public/images/homepage_monkey_swinging.png" 
              alt="Monkey in the jungle" 
              className="max-w-full h-auto object-cover"
            />
          </div>
        </div>
      </main>
      
      {/* Site footer */}
      <Footer />
    </div>
  );
};

export default Index;
