import { ArrowRight } from "lucide-react";
import { useState } from "react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
const HeroSection = () => {
  const [emailContent, setEmailContent] = useState("");
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Functionality will be added later
    console.log("Email content submitted:", emailContent);
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
              <label htmlFor="email-content" className="text-left self-start mb-2 text-sm font-medium text-gray-700 px-[209px]">
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
    </div>;
};
export default HeroSection;