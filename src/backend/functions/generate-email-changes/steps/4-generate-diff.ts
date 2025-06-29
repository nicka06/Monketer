import { DifferV2 } from '../../_shared/services/differ.ts';
import type { EmailTemplate, TemplateDiffResult } from '@shared/types';

/**
 * Step 4: Generate Diff
 * 
 * This is the final step in the agent's core process. It takes the original
 * email document and the newly modified document and runs a diffing algorithm
 * to produce a human-readable list of changes.
 * 
 * This list is what gets sent back to the frontend to populate the
 * "Pending Changes" bar, allowing the user to approve or reject the
 * AI's suggestions.
 * 
 * NOTE: This step currently uses the existing DifferV2 service. As part of
 * the refactor, the DifferV2 service itself will be rewritten to understand
 * the new Section->Row->Column structure.
 */

export async function generateDiff(
  originalEmail: EmailTemplate,
  modifiedEmail: EmailTemplate
): Promise<TemplateDiffResult> {
  console.log('[Agent Step 4] Generating diff between original and modified email.');

  try {
    const differ = new DifferV2();
    const diffResult = differ.diffTemplates(originalEmail, modifiedEmail);

    console.log(`[Agent Step 4] Diff generated. Changes found: ${diffResult.hasChanges}`);
    return Promise.resolve(diffResult);

  } catch (error) {
    console.error('[Agent Step 4] Failed to generate diff:', error.message);
    throw new Error(`Failed to generate diff: ${error.message}`);
  }
} 