import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Mail } from "lucide-react";

/**
 * Navbar Component
 * 
 * A responsive navigation bar component that provides site-wide navigation and authentication options.
 * Features a mobile-first design with a collapsible menu and seamless desktop experience.
 * 
 * Key Features:
 * - Responsive design with mobile and desktop layouts
 * - Collapsible hamburger menu for mobile
 * - Fixed positioning with blur effect
 * - Brand logo and navigation
 * - Authentication buttons (Sign in/Sign up)
 * 
 * Visual Elements:
 * - Semi-transparent white background with blur
 * - Subtle shadow for depth
 * - Brand icon using Mail component
 * - Animated hamburger menu icon
 * - Consistent monketer purple theming
 * 
 * Interaction States:
 * - Desktop: Static buttons with hover effects
 * - Mobile: Expandable menu with full-width buttons
 * - Smooth transitions for menu toggle
 * 
 * Dependencies:
 * - UI: Button component from shadcn/ui
 * - Icons: Mail from lucide-react
 * - Routing: Link from react-router-dom
 * - Styling: Tailwind CSS for responsive design
 */
const Navbar = () => {
  /**
   * State for mobile menu visibility
   * Controls the display of the mobile navigation menu
   * Toggled by the hamburger menu button
   */
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 w-full bg-white/90 backdrop-blur-sm z-50 shadow-sm">
      <div className="w-full px-0">
        {/* Main navigation bar */}
        <div className="flex items-center justify-between h-16 relative">
          {/* Brand section with logo */}
          <div className="flex items-center pl-6 sm:pl-8">
            <Link to="/" className="flex items-center">
              <Mail className="h-8 w-8 text-monketer-purple" />
              <span className="ml-2 text-lg font-semibold text-gray-900">monketer</span>
            </Link>
          </div>
          
          {/* Mobile menu button - Only visible on mobile */}
          <div className="flex md:hidden absolute right-6">
            <button
              type="button"
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-monketer-purple"
              aria-controls="mobile-menu"
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <span className="sr-only">Open main menu</span>
              {/* Dynamic icon based on menu state */}
              {mobileMenuOpen ? (
                <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
          
          {/* Desktop navigation - Hidden on mobile */}
          <div className="hidden md:flex md:items-center md:space-x-4 absolute right-6 sm:right-8">
            <Button variant="ghost" asChild>
              <Link to="/login">Sign in</Link>
            </Button>
            <Button className="bg-monketer-purple hover:bg-monketer-purple-dark text-white" asChild>
              <Link to="/signup">Sign up</Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile menu - Conditionally rendered based on state */}
      {mobileMenuOpen && (
        <div className="md:hidden" id="mobile-menu">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-white shadow-lg">
            <Button variant="ghost" className="w-full justify-center" asChild>
              <Link to="/login">Sign in</Link>
            </Button>
            <Button className="w-full justify-center bg-monketer-purple hover:bg-monketer-purple-dark text-white" asChild>
              <Link to="/signup">Sign up</Link>
            </Button>
          </div>
        </div>
      )}
    </nav>
  );
}

export default Navbar;
