import { ArrowRight } from "lucide-react";
import { useState } from "react";
const HeroSection = () => {
  const [email, setEmail] = useState("");
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Functionality will be added later
    console.log("Email submitted:", email);
  };
  return <div className="relative overflow-hidden bg-white pt-24 pb-16 sm:pt-32">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-[calc(50%-30rem)] top-[calc(50%-20rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-emailore-purple-light to-white opacity-30 sm:left-[calc(50%-30rem)] sm:top-[calc(50%-25rem)] sm:w-[72.1875rem]"></div>
      </div>
      
      <div className="mx-auto max-w-7xl px-6 lg:px-8 text-center">
        <div className="mx-auto max-w-2xl">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-gray-900 mb-4">
            Reach Your Audience <span className="text-emailore-purple">~</span> Emailore
          </h1>
          <p className="mt-2 text-xl md:text-2xl leading-8 text-gray-600 mb-8">
            Create "wow worthy" emails in a matter of seconds
          </p>
          
          <form onSubmit={handleSubmit} className="mt-6 flex max-w-md mx-auto gap-x-4">
            <div className="min-w-0 flex-auto">
              <label htmlFor="email-address" className="sr-only">Email address</label>
              <input id="email-address" type="email" autoComplete="email" required placeholder="Enter your email" value={email} onChange={e => setEmail(e.target.value)} className="block w-full rounded-md border-0 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-emailore-purple py-[11px] px-[10px] mx-0 my-0" />
            </div>
            <button type="submit" className="flex-none rounded-md bg-emailore-purple px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emailore-purple-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emailore-purple relative group">
              Start Creating
              <ArrowRight className="ml-2 h-4 w-4 inline-block transition-all group-hover:translate-x-1" />
            </button>
          </form>
        </div>
      </div>
    </div>;
};
export default HeroSection;