/**
 * TermsOfService.tsx
 * 
 * Legal terms page that outlines the service usage rules, user responsibilities,
 * and legal framework for using the Monketer platform.
 */

import React from 'react';
import { Container } from '@/components/ui/container';
import { Typography } from '@/components/ui/typography';

/**
 * TermsOfService Component
 * 
 * Displays a comprehensive terms of service document with multiple sections covering
 * usage rules, account responsibilities, and legal disclaimers. Styled with a jungle theme.
 * Updates the "last updated" date automatically to the current date.
 */
const TermsOfService: React.FC = () => {
  return (
    <Container className="py-16 bg-green-700 text-white min-h-screen">
      <div className="max-w-3xl mx-auto bg-green-800 bg-opacity-90 rounded-xl shadow-xl p-8 md:p-12">
        {/* Header with title and last updated date */}
        <div className="text-center mb-12">
          <Typography variant="h1" className="mb-4 text-yellow-400">
            Terms of Service
          </Typography>
          <p className="text-gray-300">Last updated: {new Date().toLocaleDateString()}</p>
        </div>
        
        <div className="space-y-10 text-gray-200">
          {/* Terms sections - each with a title and descriptive content */}
          <section className="bg-green-900 bg-opacity-75 p-6 rounded-lg text-center">
            <Typography variant="h2" className="mb-4 text-yellow-300">
              Introduction
            </Typography>
            <p className="leading-relaxed max-w-2xl mx-auto">
              Welcome to Monketer. By accessing or using our service, you agree to be bound by these Terms of Service. Please read them carefully.
            </p>
          </section>

          <section className="bg-green-900 bg-opacity-75 p-6 rounded-lg text-center">
            <Typography variant="h2" className="mb-4 text-yellow-300">
              Use of Service
            </Typography>
            <p className="mb-4 max-w-2xl mx-auto">
              Monketer provides tools for creating and managing email content. You may use the emails you create through our service for any lawful purpose, including commercial use. However, you may not:
            </p>
            <ul className="space-y-2 max-w-2xl mx-auto">
              <li className="flex items-center justify-center">
                <span className="text-yellow-400 mr-2">•</span>
                <span>Resell, redistribute, or sublicense the Monketer service itself</span>
              </li>
              <li className="flex items-center justify-center">
                <span className="text-yellow-400 mr-2">•</span>
                <span>Use the service to create content that violates any laws or regulations</span>
              </li>
              <li className="flex items-center justify-center">
                <span className="text-yellow-400 mr-2">•</span>
                <span>Use the service to create content that infringes on intellectual property rights</span>
              </li>
              <li className="flex items-center justify-center">
                <span className="text-yellow-400 mr-2">•</span>
                <span>Use the service to create content that is harmful, abusive, or discriminatory</span>
              </li>
            </ul>
          </section>

          <section className="bg-green-900 bg-opacity-75 p-6 rounded-lg text-center">
            <Typography variant="h2" className="mb-4 text-yellow-300">
              Account Responsibilities
            </Typography>
            <p className="mb-4 max-w-2xl mx-auto">
              You are responsible for:
            </p>
            <ul className="space-y-2 max-w-2xl mx-auto">
              <li className="flex items-center justify-center">
                <span className="text-yellow-400 mr-2">•</span>
                <span>Maintaining the security of your account</span>
              </li>
              <li className="flex items-center justify-center">
                <span className="text-yellow-400 mr-2">•</span>
                <span>All activities that occur under your account</span>
              </li>
              <li className="flex items-center justify-center">
                <span className="text-yellow-400 mr-2">•</span>
                <span>Complying with all applicable laws and regulations</span>
              </li>
            </ul>
          </section>

          <section className="bg-green-900 bg-opacity-75 p-6 rounded-lg text-center">
            <Typography variant="h2" className="mb-4 text-yellow-300">
              Intellectual Property
            </Typography>
            <p className="leading-relaxed max-w-2xl mx-auto">
              The Monketer service and its original content, features, and functionality are owned by Monketer and are protected by international copyright, trademark, and other intellectual property laws. The emails you create using our service are your property, and you retain all rights to them.
            </p>
          </section>

          <section className="bg-green-900 bg-opacity-75 p-6 rounded-lg text-center">
            <Typography variant="h2" className="mb-4 text-yellow-300">
              Limitation of Liability
            </Typography>
            <p className="leading-relaxed max-w-2xl mx-auto">
              Monketer shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of or inability to use the service.
            </p>
          </section>

          <section className="bg-green-900 bg-opacity-75 p-6 rounded-lg text-center">
            <Typography variant="h2" className="mb-4 text-yellow-300">
              Changes to Terms
            </Typography>
            <p className="leading-relaxed max-w-2xl mx-auto">
              We reserve the right to modify or replace these Terms at any time. We will provide notice of any significant changes by posting the new Terms on this page.
            </p>
          </section>

          <section className="bg-green-900 bg-opacity-75 p-6 rounded-lg text-center">
            <Typography variant="h2" className="mb-4 text-yellow-300">
              Contact Us
            </Typography>
            <p className="leading-relaxed max-w-2xl mx-auto">
              If you have any questions about these Terms, please contact us at{' '}
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

export default TermsOfService; 