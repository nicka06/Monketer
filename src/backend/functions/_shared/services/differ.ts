/**
 * V2 Differ Service - Deno/Supabase Adapter
 * 
 * This is the Deno/Supabase adapter for the DifferV2 service.
 * It imports the shared core implementation and adapts it to the Deno environment.
 * 
 * IMPORTANT: This file is a Deno-specific adapter for the shared differ implementation
 * in src/shared/differ.ts. If you modify the diffing algorithm, be sure to update
 * the core implementation in the shared directory, not this adapter.
 * 
 * NOTE ON LINTER ERRORS: The URL imports will show TypeScript errors in VS Code but will
 * work correctly in the Deno/Supabase environment at runtime.
 */

// @ts-ignore: Deno-specific URL import will work at runtime despite TypeScript errors
import _ from 'https://esm.sh/lodash-es@4.17.21'; // Use URL import for Deno
import { DifferCore } from '../../../../shared/services/differ.ts';

// Re-export the types from the core
// @ts-ignore: Path resolution works in Deno but may show errors in editor
import type {
  EmailTemplate,
  EmailSection,
  EmailElement,
  TemplateDiffResult,
  SectionDiff,
  ElementDiff,
  PropertyChange,
  ElementType
} from '../../../../shared/types';

// Re-export all types for consumers of this module
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
 * Deno/Supabase implementation of the V2 template differ.
 * This class adapts the shared core implementation to the Deno environment.
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
  
  // Any Deno/Supabase specific methods or overrides can be added here
}