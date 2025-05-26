/**
 * PrivacyPolicy.tsx
 * 
 * Privacy policy page that displays the company's data handling practices
 * and user rights regarding personal information.
 */

import React from 'react';
import { Container } from '@/components/ui/container';
import { Typography } from '@/components/ui/typography';

/**
 * PrivacyPolicy Component
 * 
 * Displays a comprehensive privacy policy with multiple sections covering data
 * collection, usage, security, and user rights. Styled with a jungle theme.
 * Updates the "last updated" date automatically to the current date.
 */
const PrivacyPolicy: React.FC = () => {
  return (
    <Container className="py-16 bg-green-700 text-white min-h-screen">
      <div className="max-w-3xl mx-auto bg-green-800 bg-opacity-90 rounded-xl shadow-xl p-8 md:p-12">
        {/* Header with title and last updated date */}
        <div className="text-center mb-12">
          <Typography variant="h1" className="mb-4 text-yellow-400">
            Privacy Policy
          </Typography>
          <p className="text-gray-300">Last updated: {new Date().toLocaleDateString()}</p>
        </div>
        
        <div className="space-y-10 text-gray-200">
          {/* Policy sections - each with a title and descriptive content */}
          <section className="bg-green-900 bg-opacity-75 p-6 rounded-lg text-center">
            <Typography variant="h2" className="mb-4 text-yellow-300">
              Introduction
            </Typography>
            <p className="leading-relaxed max-w-2xl mx-auto">
              At Monketer, we take your privacy seriously. This Privacy Policy explains how we collect, use, and protect your personal information when you use our email creation service.
            </p>
          </section>

          <section className="bg-green-900 bg-opacity-75 p-6 rounded-lg text-center">
            <Typography variant="h2" className="mb-4 text-yellow-300">
              Information We Collect
            </Typography>
            <p className="mb-4 max-w-2xl mx-auto">
              We collect information that you provide directly to us, including:
            </p>
            <ul className="space-y-2 max-w-2xl mx-auto">
              <li className="flex items-center justify-center">
                <span className="text-yellow-400 mr-2">•</span>
                <span>Email addresses</span>
              </li>
              <li className="flex items-center justify-center">
                <span className="text-yellow-400 mr-2">•</span>
                <span>Account information</span>
              </li>
              <li className="flex items-center justify-center">
                <span className="text-yellow-400 mr-2">•</span>
                <span>Content you create using our service</span>
              </li>
            </ul>
          </section>

          <section className="bg-green-900 bg-opacity-75 p-6 rounded-lg text-center">
            <Typography variant="h2" className="mb-4 text-yellow-300">
              How We Use Your Information
            </Typography>
            <p className="mb-4 max-w-2xl mx-auto">
              We use your information to:
            </p>
            <ul className="space-y-2 max-w-2xl mx-auto">
              <li className="flex items-center justify-center">
                <span className="text-yellow-400 mr-2">•</span>
                <span>Provide and improve our services</span>
              </li>
              <li className="flex items-center justify-center">
                <span className="text-yellow-400 mr-2">•</span>
                <span>Send you important updates and notifications</span>
              </li>
              <li className="flex items-center justify-center">
                <span className="text-yellow-400 mr-2">•</span>
                <span>Ensure the security of your account</span>
              </li>
              <li className="flex items-center justify-center">
                <span className="text-yellow-400 mr-2">•</span>
                <span>Comply with legal obligations</span>
              </li>
            </ul>
          </section>

          <section className="bg-green-900 bg-opacity-75 p-6 rounded-lg text-center">
            <Typography variant="h2" className="mb-4 text-yellow-300">
              Data Security
            </Typography>
            <p className="leading-relaxed max-w-2xl mx-auto">
              We implement robust security measures to protect your personal information. Our systems use industry-standard encryption and security protocols to ensure your data remains secure. We regularly update our security practices to maintain the highest level of protection.
            </p>
          </section>

          <section className="bg-green-900 bg-opacity-75 p-6 rounded-lg text-center">
            <Typography variant="h2" className="mb-4 text-yellow-300">
              Your Rights
            </Typography>
            <p className="mb-4 max-w-2xl mx-auto">
              You have the right to:
            </p>
            <ul className="space-y-2 max-w-2xl mx-auto">
              <li className="flex items-center justify-center">
                <span className="text-yellow-400 mr-2">•</span>
                <span>Access your personal information</span>
              </li>
              <li className="flex items-center justify-center">
                <span className="text-yellow-400 mr-2">•</span>
                <span>Correct inaccurate information</span>
              </li>
              <li className="flex items-center justify-center">
                <span className="text-yellow-400 mr-2">•</span>
                <span>Request deletion of your information</span>
              </li>
              <li className="flex items-center justify-center">
                <span className="text-yellow-400 mr-2">•</span>
                <span>Opt-out of marketing communications</span>
              </li>
            </ul>
          </section>

          <section className="bg-green-900 bg-opacity-75 p-6 rounded-lg text-center">
            <Typography variant="h2" className="mb-4 text-yellow-300">
              Changes to This Policy
            </Typography>
            <p className="leading-relaxed max-w-2xl mx-auto">
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the effective date.
            </p>
          </section>

          <section className="bg-green-900 bg-opacity-75 p-6 rounded-lg text-center">
            <Typography variant="h2" className="mb-4 text-yellow-300">
              Contact Us
            </Typography>
            <p className="leading-relaxed max-w-2xl mx-auto">
              If you have any questions about this Privacy Policy, please contact us at{' '}
              <a href="mailto:support@monketer.com" className="text-yellow-400 hover:underline">
                support@monketer.com
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </Container>
  );
};

export default PrivacyPolicy; 