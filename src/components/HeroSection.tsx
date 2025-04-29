
import { ArrowRight } from "lucide-react";
import { useState } from "react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { useNavigate } from "react-router-dom";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "./ui/dialog";
import { Link } from "react-router-dom";

const HeroSection = () => {
  const [emailContent, setEmailContent] = useState("");
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Show the authentication dialog instead of proceeding directly
    setShowAuthDialog(true);
    console.log("Email content submitted:", emailContent);
  };

  const handleAuthOption = (route: string) => {
    // Save the email content to localStorage before navigating
    if (emailContent.trim()) {
      localStorage.setItem('savedEmailContent', emailContent);
    }
    
    // Close dialog and navigate to the selected route
    setShowAuthDialog(false);
    navigate(route);
  };

  return <div className="relative overflow-hidden bg-white pt-24 pb-16 sm:pt-32">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-[calc(50%-30rem)] top-[calc(50%-20rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-emailore-purple-light to-white opacity-30 sm:left-[calc(50%-30rem)] sm:top-[calc(50%-25rem)] sm:w-[72.1875rem]"></div>
      </div>
      
      <div className="mx-auto max-w-7xl px-6 lg:px-8 text-center">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-gray-900 mb-4">
            Reach Your Audience <span className="text-emailore-purple">~</span> Emailore
          </h1>
          <p className="mt-2 text-xl md:text-2xl leading-8 text-gray-600 mb-8">
            Create "wow worthy" emails in a matter of seconds
          </p>
          
          <form onSubmit={handleSubmit} className="mt-10 mx-auto max-w-2xl">
            <div className="flex flex-col items-center">
              <label htmlFor="email-content" className="text-left self-start mb-2 text-sm font-medium text-gray-700 px-[240px]">
                Describe the email you want to create
              </label>
              <div className="relative w-full">
                <Textarea id="email-content" placeholder="E.g., Create a promotional email announcing our summer sale with 20% off all products..." value={emailContent} onChange={e => setEmailContent(e.target.value)} className="min-h-[120px] text-base p-4 border-2 border-emailore-purple/30 focus:border-emailore-purple shadow-sm transition-all duration-200" />
                <Button type="submit" className="mt-4 w-full sm:w-auto flex items-center justify-center bg-emailore-purple hover:bg-emailore-purple-dark transition-colors group px-[93px]">
                  Generate Email
                  <ArrowRight className="ml-2 h-4 w-4 inline-block transition-all group-hover:translate-x-1" />
                </Button>
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
              className="flex-1 bg-emailore-purple hover:bg-emailore-purple-dark"
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
