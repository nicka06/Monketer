/**
 * Index.tsx
 * 
 * Main landing page component for the application.
 * Serves as the entry point for users visiting the root URL.
 * Combines multiple section components to create a complete marketing page.
 */

// Navigation component for header section
import Navbar from "@/components/Navbar";
// Hero banner with main call-to-action
import HeroSection from "@/components/HeroSection";
// Product features showcase section
import FeaturesSection from "@/components/FeaturesSection";
// Customer testimonials display section
import TestimonialsSection from "@/components/TestimonialsSection";
// Site-wide footer component
import Footer from "@/components/Footer";

/**
 * Index component - Landing page layout
 * 
 * Assembles the main marketing sections in a vertical flex layout.
 * Ensures the page takes at least the full viewport height with flex-grow.
 */
const Index = () => {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header navigation */}
      <Navbar />
      
      {/* Main content area with marketing sections */}
      <main className="flex-grow">
        <HeroSection />
        <FeaturesSection />
        <TestimonialsSection />
      </main>
      
      {/* Site footer */}
      <Footer />
    </div>
  );
};

export default Index;
