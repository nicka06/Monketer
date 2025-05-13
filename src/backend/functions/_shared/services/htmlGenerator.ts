/**
 * Backend HTML Email Generator
 * 
 * This module provides the backend-specific implementation of the email HTML generator.
 * It follows the adapter pattern to maintain consistency with the frontend implementation
 * while avoiding code duplication.
 */

// Import only the specific types needed for this implementation
import type { EmailTemplate } from '@shared/types';
// Import the core implementation that contains all the shared HTML generation logic
import { HtmlGeneratorCore } from '@shared/services/htmlGenerator.ts';

/**
 * Backend-specific implementation of HTML generator for email templates.
 * This class extends the core implementation for the backend/Deno environment.
 * 
 * ADAPTER PATTERN IMPLEMENTATION:
 * This is the backend-specific adapter in our adapter pattern implementation.
 * Since the backend doesn't need special handling for placeholders or
 * edit mode data attributes, this adapter simply extends the core 
 * without adding additional functionality.
 * 
 * The backend implementation is intentionally minimal because:
 * 1. There's no visual editor in the backend environment
 * 2. No need for placeholder handling or edit-mode data attributes
 * 3. Email rendering for delivery doesn't require interactive elements
 * 
 * The pattern still provides these benefits:
 * 1. Code organization - keeping environment-specific implementations separate
 * 2. Future extensibility - if backend-specific features are needed later, we can add them here
 *    (e.g., server-side personalization, tracking pixel insertion, etc.)
 * 3. Consistent API - both frontend and backend use the same interface
 * 4. Reduced maintenance - changes to core logic automatically apply to both environments
 */
export class HtmlGenerator extends HtmlGeneratorCore {
  /**
   * The backend implementation doesn't override any methods from the core.
   * 
   * This is intentional - we're leveraging the core implementation's functionality
   * without modification, as we don't need any backend-specific customizations
   * for generating the HTML.
   * 
   * If future backend-specific features are needed (like adding tracking pixels,
   * server-side personalization, or email service provider specific optimizations),
   * we can override specific methods here while still inheriting the core logic.
   */
}

/**
 * Convenience function for backend usage to generate HTML from an email template.
 * 
 * This function instantiates the backend-specific HtmlGenerator and calls its
 * generate method, providing a simpler API for backend services.
 * 
 * @param template The email template object containing all sections and elements
 * @returns The complete HTML string ready for sending as an email
 */
export function generateHtml(template: EmailTemplate): string {
  const generator = new HtmlGenerator();
  return generator.generate(template);
}