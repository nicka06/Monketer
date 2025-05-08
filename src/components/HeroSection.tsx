import { ArrowRight } from "lucide-react";
import { useState, useEffect } from "react";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { useNavigate } from "react-router-dom";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "./ui/dialog";

/**
 * HeroSection Component
 * 
 * A landing page hero section that serves as the main entry point for email creation.
 * Features an AI-powered email generation interface with authentication flow.
 * 
 * Key Features:
 * - Email content persistence across sessions
 * - Authentication gate for generation
 * - Responsive design with gradient background
 * - Interactive UI elements with hover states
 * 
 * State Management:
 * - emailContent: Stores user's email description
 * - showAuthDialog: Controls authentication modal visibility
 * - Persists content in localStorage during auth flow
 * 
 * Authentication Flow:
 * 1. User enters email description
 * 2. On submit, shows auth dialog
 * 3. User chooses sign up or sign in
 * 4. Content is preserved during authentication
 * 
 * UI Components:
 * - Gradient background with rotation
 * - Centered content layout
 * - Multi-line text input
 * - Animated submit button
 * - Modal dialog for auth
 * 
 * Dependencies:
 * - UI: Button, Textarea, Dialog components
 * - Icons: ArrowRight from lucide-react
 * - Routing: react-router-dom for navigation
 * - Storage: localStorage for content persistence
 */
const HeroSection = () => {
  // State for managing email content and auth dialog visibility
  const [emailContent, setEmailContent] = useState("");
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const navigate = useNavigate();

  /**
   * Load saved content on component mount
   * Retrieves any previously saved email content from localStorage
   * This ensures content persistence across the auth flow
   */
  useEffect(() => {
    const savedContent = localStorage.getItem('savedEmailContent');
    if (savedContent) {
      setEmailContent(savedContent);
    }
  }, []);

  /**
   * Handle form submission
   * Instead of direct generation, shows auth dialog
   * Preserves entered content for post-auth flow
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowAuthDialog(true);
    console.log("Email content submitted:", emailContent);
  };

  /**
   * Handle authentication option selection
   * Saves current content to localStorage before navigation
   * Ensures smooth user experience across auth flow
   * 
   * @param route - Target authentication route ('/signup' or '/login')
   */
  const handleAuthOption = (route: string) => {
    if (emailContent.trim()) {
      localStorage.setItem('savedEmailContent', emailContent);
    }
    setShowAuthDialog(false);
    navigate(route);
  };

  return <div className="relative overflow-hidden bg-white pt-24 pb-16 sm:pt-32">
      {/* Decorative gradient background */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-[calc(50%-30rem)] top-[calc(50%-20rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-monketer-purple-light to-white opacity-30 sm:left-[calc(50%-30rem)] sm:top-[calc(50%-25rem)] sm:w-[72.1875rem]"></div>
      </div>
      
      {/* Main content container */}
      <div className="mx-auto max-w-7xl px-6 lg:px-8 text-center">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-gray-900 mb-4">
            Reach Your Audience <span className="text-monketer-purple">~</span> Monketer
          </h1>
          <p className="mt-2 text-xl md:text-2xl leading-8 text-gray-600 mb-8">
            Create "wow worthy" emails in a matter of seconds
          </p>
          
          {/* Email generation form */}
          <form onSubmit={handleSubmit} className="mt-10 mx-auto max-w-2xl">
            <div className="flex flex-col items-center">
              <label htmlFor="email-content" className="text-left self-start mb-2 text-sm font-medium text-gray-700">
                Describe the email you want to create
              </label>
              <div className="relative w-full">
                <Textarea 
                  id="email-content" 
                  placeholder="E.g., Create a promotional email announcing our summer sale with 20% off all products..." 
                  value={emailContent} 
                  onChange={e => setEmailContent(e.target.value)} 
                  className="min-h-[120px] text-base p-4 border-2 border-monketer-purple/30 focus:border-monketer-purple shadow-sm transition-all duration-200" 
                />
                <div className="flex justify-center mt-4">
                  <Button type="submit" className="w-auto flex items-center justify-center bg-monketer-purple hover:bg-monketer-purple-dark transition-colors group px-8">
                  Generate Email
                  <ArrowRight className="ml-2 h-4 w-4 inline-block transition-all group-hover:translate-x-1" />
                </Button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
      
      {/* Authentication Dialog */}
      <Dialog open={showAuthDialog} onOpenChange={setShowAuthDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create your email</DialogTitle>
            <DialogDescription>
              Sign up or sign in to continue generating your email
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex flex-col sm:flex-row gap-4 mt-4">
            <Button
              className="flex-1 bg-monketer-purple hover:bg-monketer-purple-dark"
              onClick={() => handleAuthOption('/signup')}
            >
              Sign Up
            </Button>
            <Button
              className="flex-1"
              variant="outline"
              onClick={() => handleAuthOption('/login')}
            >
              Sign In
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>;
};

export default HeroSection;
