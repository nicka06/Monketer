// @ts-ignore: Deno-specific URL import, works at runtime
import * as jsonpatch from 'https://esm.sh/fast-json-patch@3.1.1';

/**
 * Step 3: Execute Plan
 * 
 * This module applies the AI-generated JSON Patch from the previous step
 * to the original email JSON document. It's a non-AI, deterministic step.
 * 
 * It's crucial to use a reliable JSON Patch library to ensure that the
 * modifications are applied correctly and safely.
 */

export async function executePlan(plan: jsonpatch.Operation[], currentEmail: any): Promise<any> {
  console.log('[Agent Step 3] Executing plan:', plan);

  try {
    // A deep copy is essential here to avoid mutating the original object in place.
    // This ensures that if the patch fails, we still have the original, untouched document.
    const newEmail = JSON.parse(JSON.stringify(currentEmail));

    // The fast-json-patch library applies the operations to the document.
    const patchResult = jsonpatch.applyPatch(newEmail, plan, true, false); // Throws on error

    console.log('[Agent Step 3] Plan executed successfully.');
    return Promise.resolve(patchResult.newDocument);

  } catch (error) {
    console.error('[Agent Step 3] Failed to apply JSON patch:', error.message);
    // Propagate the error to the agent runner so it can be logged.
    throw new Error(`Failed to execute plan: ${error.message}`);
  }
} 