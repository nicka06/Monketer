/**
 * V2 Differ Service - Browser/Node.js Adapter
 * 
 * This is the browser/Node.js adapter for the DifferV2 service.
 * It imports the shared core implementation and adapts it to the browser/Node.js environment.
 * 
 * IMPORTANT: This file is a browser/Node.js-specific adapter for the shared differ implementation
 * in src/shared/differ.ts. If you modify the diffing algorithm, be sure to update
 * the core implementation in the shared directory, not this adapter.
 */

import _ from 'lodash'; // Using regular lodash for browser/Node.js environment
import { DifferCore } from '../../shared/services/differ';

// Import types from the core
import type {
  EmailTemplate,
  EmailSection,
  EmailElement,
  TemplateDiffResult,
  SectionDiff,
  ElementDiff,
  PropertyChange,
  ElementType
} from '../../shared/services/differ';

// Re-export the types for consumers of this module
export type {
  EmailTemplate,
  EmailSection,
  EmailElement,
  TemplateDiffResult,
  SectionDiff,
  ElementDiff,
  PropertyChange,
  ElementType
};

/**
 * Browser/Node.js implementation of the V2 template differ.
 * This class adapts the shared core implementation to the browser/Node.js environment.
 * 
 * Explicitly exposes the inherited diffTemplates method to ensure TypeScript
 * properly recognizes it across module boundaries.
 */
export class DifferV2 extends DifferCore {
  constructor() {
    super(_); // Pass lodash instance to the core
  }
  
  /**
   * Compares two EmailTemplate objects to identify differences.
   * This method explicitly forwards to the parent implementation to ensure
   * TypeScript correctly recognizes it across module boundaries.
   * 
   * @param oldTemplate The previous version of the template
   * @param newTemplate The current version of the template
   * @returns A TemplateDiffResult object detailing the changes
   */
  public diffTemplates(
    oldTemplate: EmailTemplate, 
    newTemplate: EmailTemplate
  ): TemplateDiffResult {
    return super.diffTemplates(oldTemplate, newTemplate);
  }
  
  // Any browser/Node.js specific methods or overrides can be added here
} 