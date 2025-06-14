import { Link } from "react-router-dom";

/**
 * Navigation data structure defining all footer links organized by category
 * Categories include:
 * - product: Main product-related links
 * - company: Organization and corporate information
 * - support: Help and documentation resources
 * - legal: Compliance and policy documents
 * 
 * Each link contains:
 * - name: Display text for the link
 * - href: Target URL/route
 */
const footerNavigation = {
  product: [
    { name: 'Features', href: '#' },
    { name: 'Pricing', href: '#' },
    { name: 'Product Roadmap', href: '#' },
    { name: 'Guides', href: '#' },
  ],
  company: [
    { name: 'About Us', href: '#' },
    { name: 'Blog', href: '#' },
    { name: 'Careers', href: '#' },
    { name: 'Partners', href: '#' },
  ],
  support: [
    { name: 'Help', href: '#' },
    { name: 'Documentation', href: '#' },
    { name: 'Contact Us', href: '#' },
    { name: 'Status', href: '#' },
  ],
  legal: [
    { name: 'Privacy Policy', href: '/privacy-policy' },
    { name: 'Terms of Service', href: '/terms-of-service' },
    { name: 'Cookie Policy', href: '#' },
  ],
};

/**
 * Footer Component
 * 
 * A responsive footer component that provides site-wide navigation and branding.
 * 
 * Layout Structure:
 * - Main grid with 3 columns on XL screens:
 *   • Left column: Brand section with logo and tagline
 *   • Center/Right columns: Navigation sections in a 2x2 grid
 * 
 * Features:
 * - Responsive layout that adapts to different screen sizes
 * - Organized navigation with categorized links
 * - Consistent branding with monketer purple accent
 * - Accessible with proper ARIA labels and semantic HTML
 * - Dynamic copyright year
 * 
 * Navigation Categories:
 * - Product: Features, pricing, roadmap, guides
 * - Company: About, blog, careers, partners
 * - Support: Help, docs, contact, status
 * - Legal: Privacy, terms, cookies
 * 
 * Styling:
 * - Dark theme (bg-gray-900)
 * - Hover effects on navigation links
 * - Consistent spacing and typography
 * - Border separator above copyright
 */
const Footer = () => {
  return (
    <footer className="bg-gray-900" aria-labelledby="footer-heading">
      <h2 id="footer-heading" className="sr-only">Footer</h2>
      <div className="mx-auto max-w-7xl px-6 pb-8 pt-16 sm:pt-24 lg:px-8 lg:pt-20">
        <div className="xl:grid xl:grid-cols-3 xl:gap-8">
          <div className="space-y-8">
            <Link to="/" className="text-monketer-purple text-3xl font-bold tracking-tight">
              monketer
            </Link>
            <p className="text-sm leading-6 text-gray-300">
              Create emails that captivate, convert, and make your audience say "wow".
            </p>
          </div>
          <div className="mt-16 grid grid-cols-2 gap-8 xl:col-span-2 xl:mt-0">
            <div className="md:grid md:grid-cols-2 md:gap-8">
              <div>
                <h3 className="text-sm font-semibold leading-6 text-white">Product</h3>
                <ul role="list" className="mt-6 space-y-4">
                  {footerNavigation.product.map((item) => (
                    <li key={item.name}>
                      <Link to={item.href} className="text-sm leading-6 text-gray-300 hover:text-white">
                        {item.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-10 md:mt-0">
                <h3 className="text-sm font-semibold leading-6 text-white">Company</h3>
                <ul role="list" className="mt-6 space-y-4">
                  {footerNavigation.company.map((item) => (
                    <li key={item.name}>
                      <Link to={item.href} className="text-sm leading-6 text-gray-300 hover:text-white">
                        {item.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="md:grid md:grid-cols-2 md:gap-8">
              <div>
                <h3 className="text-sm font-semibold leading-6 text-white">Support</h3>
                <ul role="list" className="mt-6 space-y-4">
                  {footerNavigation.support.map((item) => (
                    <li key={item.name}>
                      <Link to={item.href} className="text-sm leading-6 text-gray-300 hover:text-white">
                        {item.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-10 md:mt-0">
                <h3 className="text-sm font-semibold leading-6 text-white">Legal</h3>
                <ul role="list" className="mt-6 space-y-4">
                  {footerNavigation.legal.map((item) => (
                    <li key={item.name}>
                      <Link to={item.href} className="text-sm leading-6 text-gray-300 hover:text-white">
                        {item.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-16 border-t border-white/10 pt-8 sm:mt-20 lg:mt-24">
          <p className="text-xs leading-5 text-gray-400">&copy; {new Date().getFullYear()} Monketer. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
