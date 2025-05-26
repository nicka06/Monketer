import { Link } from "react-router-dom";

/**
 * Footer Component
 * 
 * Simplified footer for the jungle-themed site.
 * Contains links to Privacy Policy, Terms of Service, and a custom message, all centered.
 * Compacted to reduce extra vertical space.
 */
const Footer = () => {
  return (
    <footer className="bg-gray-900 text-gray-300 py-1 px-6" aria-labelledby="footer-heading">
      <h2 id="footer-heading" className="sr-only">Footer</h2>
      <div className="mx-auto max-w-7xl flex flex-col items-center text-sm">
        <div className="flex space-x-6 mb-1">
          <Link to="/privacy-policy" className="hover:text-white">
            Privacy Policy
          </Link>
          <Link to="/terms-of-service" className="hover:text-white">
            Terms of Service
          </Link>
        </div>
        <p className="text-xs text-gray-400">A Westwood Innovation</p>
      </div>
    </footer>
  );
};

export default Footer;
