import {
    EmailTemplate,
    EmailSection,
    EmailElement,
    PendingChangeInput,
} from './types.ts'; // Assuming types.ts is in the same _shared directory
import { normalizeElement, normalizeTemplate } from './normalize.ts'; // Import from new normalize.ts file

// Type for the object returned by the diff function (matches structure needed for insertion)
// Duplicated from generate-email-changes - consider consolidating types
type DiffResult = Omit<PendingChangeInput, 'project_id' | 'status'>;

// Helper function to compare style objects (deep comparison for simplicity)
function areStylesEqual(style1?: Record<string, any>, style2?: Record<string, any>): boolean {
    // Simple JSON stringify comparison - might not be robust for all cases 
    // (e.g., key order), but often sufficient for basic style objects.
    // Consider a more robust deep comparison library if needed.
    try {
      const s1 = style1 ? JSON.stringify(style1) : '';
      const s2 = style2 ? JSON.stringify(style2) : '';
      return s1 === s2;
    } catch (e) {
        console.error("Error comparing styles:", e);
        return false; // Treat comparison error as not equal
    }
}

/**
 * Compares two EmailTemplate structures and generates a list of pending changes.
 * 
 * TODO:
 * - Improve handling of element/section reordering.
 * - Consider adding diffs for global styles (EmailTemplate.styles).
 */
export function diffSemanticEmails(
    oldSemantic: EmailTemplate | null,
    newSemantic: EmailTemplate
): Array<DiffResult> {
    console.log("Starting semantic diff...");
    
    // Normalize both templates first to ensure consistent structures
    let normalizedNewSemantic = normalizeTemplate(newSemantic);
    let normalizedOldSemantic = oldSemantic ? normalizeTemplate(oldSemantic) : null;
    
    console.log("Templates normalized with default styles applied.");
    
    const changes: Array<DiffResult> = [];
    
    // Handle cases where oldSemantic might be null (e.g., initial creation)
    if (!normalizedOldSemantic) {
        console.log("Old semantic is null, treating all new elements as additions.");
        normalizedNewSemantic.sections?.forEach(section => {
            section.elements?.forEach(element => {
                 // Include the target section ID in new_content
                 const newContentWithTarget = { 
                     ...element, // Already normalized by normalizeTemplate
                     targetSectionId: section.id 
                 };
                 changes.push({ 
                     element_id: element.id, 
                     change_type: 'add', 
                     new_content: newContentWithTarget, 
                     old_content: null 
                 });
                 console.log(` Diff: Added element ${element.id} to section ${section.id}`);
            });
        });
        return changes;
    }

    // --- Create maps for efficient lookup --- 
    const oldSectionsMap = new Map(normalizedOldSemantic.sections?.map(s => [s.id, s]));
    const oldElementsMap = new Map<string, { element: EmailElement; sectionId: string }>();
    normalizedOldSemantic.sections?.forEach(s => s.elements?.forEach(e => oldElementsMap.set(e.id, { element: e, sectionId: s.id })));

    const newSectionsMap = new Map(normalizedNewSemantic.sections?.map(s => [s.id, s]));
    const newElementsMap = new Map<string, { element: EmailElement; sectionId: string }>();
    normalizedNewSemantic.sections?.forEach(s => s.elements?.forEach(e => newElementsMap.set(e.id, { element: e, sectionId: s.id })));

    // --- Detect Added and Edited Elements --- 
    newElementsMap.forEach(({ element: newElement, sectionId: newSectionId }, elementId) => {
        const oldEntry = oldElementsMap.get(elementId);

        if (!oldEntry) {
             // Element Added
             const newContentWithTarget = { 
                 ...newElement, // Already normalized by normalizeTemplate
                 targetSectionId: newSectionId 
             };
            changes.push({ 
                element_id: elementId, 
                change_type: 'add', 
                new_content: newContentWithTarget,
                old_content: null 
            });
            console.log(` Diff: Added element ${elementId} to section ${newSectionId}`);
        } else {
            // Element Exists - Check for Edits
            const oldElement = oldEntry.element;
            let hasChanged = false;
            const changedProps: Partial<EmailElement> = {};

            // Compare elements (both already normalized)
            if (oldElement.content !== newElement.content) {
                changedProps.content = newElement.content;
                hasChanged = true;
            }
            if (oldElement.type !== newElement.type) {
                changedProps.type = newElement.type;
                hasChanged = true;
            }
            if (!areStylesEqual(oldElement.styles, newElement.styles)) {
                changedProps.styles = newElement.styles;
                hasChanged = true;
            }
            if (oldEntry.sectionId !== newSectionId) {
                 console.warn(` Element ${elementId} moved from section ${oldEntry.sectionId} to ${newSectionId}. Diff currently treats this as edit.`);
                 hasChanged = true;
            }

            if (hasChanged) {
                 // Prepare old content for storage (already normalized)
                 const oldContentForStorage = {
                     id: oldElement.id,
                     type: oldElement.type,
                     content: oldElement.content,
                     styles: oldElement.styles,
                     // Potentially add sectionId: oldEntry.sectionId here if needed for revert
                 };

                changes.push({ 
                    element_id: elementId, 
                    change_type: 'edit', 
                    new_content: newElement, // Already normalized
                    old_content: oldContentForStorage // Already normalized
                });
                console.log(` Diff: Edited element ${elementId}`);
            }
        }
    });

    // --- Detect Deleted Elements --- 
    oldElementsMap.forEach(({ element: oldElement, sectionId: oldSectionId }, elementId) => {
        if (!newElementsMap.has(elementId)) {
            // Element Deleted
            // Add originalSectionId to the old_content for revert logic
            const oldContentWithSection = {
                ...oldElement, // Already normalized by normalizeTemplate
                originalSectionId: oldSectionId
            };
            changes.push({ 
                element_id: elementId, 
                change_type: 'delete', 
                new_content: null, 
                old_content: oldContentWithSection
            });
            console.log(` Diff: Deleted element ${elementId} from section ${oldSectionId}`);
        }
    });

    // --- Detect Section Add/Delete/Edit (Optional Enhancement) --- 
    // Similar logic can be applied to sections themselves if needed.
    // For now, focusing on element changes.

    console.log(`Semantic diff complete. Found ${changes.length} changes.`);
    return changes;
} 