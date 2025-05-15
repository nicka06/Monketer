/**
 * Edge function to manage pending changes to email templates
 * 
 * This function handles the core logic for managing pending changes to email templates,
 * supporting both accepting and rejecting changes with proper version control.
 * 
 * Key Features:
 * - Accept/reject pending changes to email templates
 * - Version control with atomic operations
 * - HTML generation using V2 template system
 * - Proper error handling and validation
 * - CORS support
 * 
 * @module manage-pending-changes
 */

// --- External Dependencies ---
// Note: These imports are for Deno runtime and will show TypeScript errors in IDE
// but are required for the edge function to work in production
// @ts-ignore - Deno-specific import, not available in TypeScript
import "https://deno.land/x/xhr@0.1.0/mod.ts";
// @ts-ignore - Deno-specific import, not available in TypeScript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore - ESM import not available in TypeScript
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

// --- Internal Type Imports ---
import type { EmailTemplateV2Type as EmailTemplate } from '../../../shared/types/validators.ts';
import type { EmailSection, EmailSectionStyles } from '../../../shared/types/sections.ts';
import type { EmailElement, EmailElementLayout } from '../../../shared/types/elements.ts';
import type { EmailGlobalStyles } from '../../../shared/types/template.ts';
// @ts-ignore - ESM import not available in TypeScript
import { 
    GranularPendingChange, 
    GranularPendingChangeInput, 
    ChangeTypeAction, 
    ChangeStatusAction 
} from '../../../shared/types/pendingChangeTypes.ts'; // New types imported
import { corsHeadersFactory } from '../_shared/lib/constants.ts';
import { HtmlGenerator } from '../_shared/services/htmlGenerator.ts'; // V2 generator

/**
 * Type for tracking deleted elements during revert operations
 * Extends EmailElement to include the original section ID for proper restoration
 */
type DeletedElementInfo = EmailElement & {
    originalSectionId?: string; // Section ID where the element was originally located
};

// --- Core Change Management Functions ---

/**
 * Applies pending changes to an email template
 * 
 * This function handles three types of changes:
 * 1. Add - Adds new elements to specified sections
 * 2. Edit - Updates existing elements with new content
 * 3. Delete - Removes elements from their sections
 * 
 * The function maintains data integrity by:
 * - Creating deep copies to avoid modifying original data
 * - Using efficient lookup maps for element and section access
 * - Validating all operations before applying them
 * - Providing detailed logging for debugging
 * 
 * @param currentTemplate - The current email template to modify
 * @param changesToApply - Array of pending changes to apply
 * @returns Updated email template with all changes applied
 */
function applyPendingChanges(currentTemplate: EmailTemplate, changesToApply: GranularPendingChangeInput[]): EmailTemplate {
    // Create deep copy of template to avoid modifying original
    let updatedTemplate = JSON.parse(JSON.stringify(currentTemplate));

    // Create lookup maps for efficient element and section access
    const sectionMap = new Map<string, EmailSection>();
    updatedTemplate.sections.forEach((section: EmailSection) => {
        sectionMap.set(section.id, section);
        // Element map will be more dynamic as elements are processed per section
    });

    // Filter changes by type for ordered processing
    const sectionDeletes = changesToApply.filter(c => c.change_type === 'section_delete');
    const sectionEdits = changesToApply.filter(c => c.change_type === 'section_edit');
    const sectionAdds = changesToApply.filter(c => c.change_type === 'section_add');
    const elementDeletes = changesToApply.filter(c => c.change_type === 'element_delete');
    const elementEdits = changesToApply.filter(c => c.change_type === 'element_edit');
    const elementAdds = changesToApply.filter(c => c.change_type === 'element_add');

    // 1. Process Section Deletes
    sectionDeletes.forEach(change => {
        const sectionIndex = updatedTemplate.sections.findIndex((s: EmailSection) => s.id === change.target_id);
        if (sectionIndex > -1) {
            updatedTemplate.sections.splice(sectionIndex, 1);
            sectionMap.delete(change.target_id!);
            console.log(`Applied SECTION_DELETE for section ${change.target_id}`);
                    } else {
            console.warn(`Cannot apply SECTION_DELETE: Section ${change.target_id} not found.`);
        }
    });

    // 2. Process Section Edits
    sectionEdits.forEach(change => {
        const sectionToEdit = sectionMap.get(change.target_id!);
        if (sectionToEdit && change.new_content) {
            const newSectionData = change.new_content as EmailSection;
            // Update properties, but preserve elements array from the original sectionToEdit
            // The 'elements' array within newSectionData from a 'section_edit' should reflect property changes, not element list changes.
            // However, a 'section_edit' by definition in GranularPendingChange should only contain section properties, not a new elements array.
            // For safety, explicitly copy only non-element properties.
            Object.keys(newSectionData).forEach(key => {
                if (key !== 'elements' && key !== 'id') {
                    (sectionToEdit as any)[key] = (newSectionData as any)[key];
                }
            });
            // If new_content specific to section_edit *only* includes changed properties (e.g., styles), then direct assignment is safer.
            // Assuming change.new_content for section_edit is the full section object with updated properties (but original elements list)
            // sectionToEdit.styles = newSectionData.styles; // Example: if only styles are in new_content or being targeted
            // For a full property update:
            // const { elements, ...newProps } = newSectionData; // Exclude elements from new_content
            // Object.assign(sectionToEdit, newProps); // Assign new properties

            console.log(`Applied SECTION_EDIT for section ${change.target_id}`);
        } else {
            console.warn(`Cannot apply SECTION_EDIT: Section ${change.target_id} not found or no new content.`);
        }
    });
    
    // Rebuild sectionMap after potential additions if IDs could change or for new sections
    // For section adds, we add them directly to updatedTemplate.sections and then update the map.

    // 3. Process Section Adds
    sectionAdds.forEach(change => {
        if (change.new_content) {
            const newSection = change.new_content as EmailSection;
            // Ensure no duplicate section ID if one is somehow regenerated with same ID as existing
            if (!sectionMap.has(newSection.id)) {
                updatedTemplate.sections.push(newSection);
                sectionMap.set(newSection.id, newSection); // Add to map
                console.log(`Applied SECTION_ADD for section ${newSection.id}`);
            } else {
                 console.warn(`Cannot apply SECTION_ADD: Section ${newSection.id} already exists. Consider using a unique ID or section_edit.`);
            }
                } else {
            console.warn(`Cannot apply SECTION_ADD: No new_content provided.`);
                }
    });

    // 4. Process Element Deletes
    elementDeletes.forEach(change => {
        if (!change.target_parent_id || !change.target_id) {
            console.warn(`Cannot apply ELEMENT_DELETE: Missing target_parent_id or target_id.`);
            return;
        }
        const parentSection = sectionMap.get(change.target_parent_id);
        if (parentSection) {
            const elementIndex = parentSection.elements.findIndex((el: EmailElement) => el.id === change.target_id);
                    if (elementIndex > -1) {
                parentSection.elements.splice(elementIndex, 1);
                console.log(`Applied ELEMENT_DELETE for element ${change.target_id} from section ${change.target_parent_id}`);
            } else {
                console.warn(`Cannot apply ELEMENT_DELETE: Element ${change.target_id} not found in section ${change.target_parent_id}.`);
            }
        } else {
            console.warn(`Cannot apply ELEMENT_DELETE: Parent section ${change.target_parent_id} not found for element ${change.target_id}.`);
        }
    });

    // 5. Process Element Edits
    elementEdits.forEach(change => {
        if (!change.target_parent_id || !change.target_id || !change.new_content) {
            console.warn(`Cannot apply ELEMENT_EDIT: Missing target_parent_id, target_id, or new_content.`);
            return;
        }
        const parentSection = sectionMap.get(change.target_parent_id);
        if (parentSection) {
            const elementToEdit = parentSection.elements.find((el: EmailElement) => el.id === change.target_id);
            if (elementToEdit) {
                // Preserve ID and type, merge other properties.
                const newElementData = change.new_content as EmailElement;
                Object.keys(newElementData).forEach(key => {
                    if (key !== 'id' && key !== 'type') { // id and type should not change in an edit
                        (elementToEdit as any)[key] = (newElementData as any)[key];
                    }
                });
                console.log(`Applied ELEMENT_EDIT for element ${change.target_id} in section ${change.target_parent_id}`);
            } else {
                console.warn(`Cannot apply ELEMENT_EDIT: Element ${change.target_id} not found in section ${change.target_parent_id}.`);
            }
        } else {
            console.warn(`Cannot apply ELEMENT_EDIT: Parent section ${change.target_parent_id} not found for element ${change.target_id}.`);
        }
    });

    // 6. Process Element Adds
    elementAdds.forEach(change => {
        if (!change.target_parent_id || !change.new_content) {
            console.warn(`Cannot apply ELEMENT_ADD: Missing target_parent_id or new_content.`);
            return;
        }
        const parentSection = sectionMap.get(change.target_parent_id);
        if (parentSection) {
            const newElement = change.new_content as EmailElement;
            // Ensure element ID is unique within the section if that's a constraint, or that it's a new element.
            if (!parentSection.elements.find((el: EmailElement) => el.id === newElement.id)) {
                parentSection.elements.push(newElement);
                console.log(`Applied ELEMENT_ADD for element ${newElement.id} to section ${change.target_parent_id}`);
            } else {
                console.warn(`Cannot apply ELEMENT_ADD: Element with ID ${newElement.id} already exists in section ${change.target_parent_id}.`);
            }
        } else {
            console.warn(`Cannot apply ELEMENT_ADD: Parent section ${change.target_parent_id} not found for new element.`);
                }
    });
    
    // The old complex loop with switch case is replaced by the ordered processing above.
    // The original elementMap and direct manipulation within a single loop can be error-prone with additions/deletions.
    // This ordered approach is more robust.

    return updatedTemplate;
}

/**
 * Reverts changes to an email template
 * 
 * This function processes changes in reverse order to maintain correct state
 * and handles three types of reverts:
 * 1. Add - Removes added elements
 * 2. Edit - Restores original element content
 * 3. Delete - Reinserts deleted elements into their original sections
 * 
 * The function ensures data integrity by:
 * - Processing changes in reverse chronological order
 * - Maintaining proper section and element relationships
 * - Validating all revert operations
 * - Providing detailed logging for debugging
 * 
 * @param template - The current email template to revert
 * @param changes - Array of changes to revert
 * @returns Reverted email template
 */
function applyRevert(template: EmailTemplate, changesToRevert: GranularPendingChange[]): EmailTemplate {
    // Create deep copy of template
    let revertedTemplate = JSON.parse(JSON.stringify(template));

    // Create lookup map for sections. Elements are handled within their sections.
    const sectionMap = new Map<string, EmailSection>();
    revertedTemplate.sections.forEach((section: EmailSection) => {
        sectionMap.set(section.id, section);
    });

    // Order of revert: additions (delete), edits (restore old), deletions (re-add old)
    // Element changes should generally be reverted before their parent sections if structure is affected.
    const elementAddReverts = changesToRevert.filter(c => c.change_type === 'element_add');
    const sectionAddReverts = changesToRevert.filter(c => c.change_type === 'section_add');
    
    const elementEditReverts = changesToRevert.filter(c => c.change_type === 'element_edit');
    const sectionEditReverts = changesToRevert.filter(c => c.change_type === 'section_edit');
    
    const elementDeleteReverts = changesToRevert.filter(c => c.change_type === 'element_delete');
    const sectionDeleteReverts = changesToRevert.filter(c => c.change_type === 'section_delete');

    // 1. Revert Element Adds (by deleting the element that was added)
    elementAddReverts.forEach(change => {
        if (!change.target_parent_id || !change.target_id) {
            console.warn(`Cannot revert ELEMENT_ADD: Missing target_parent_id or target_id for change ${change.id}`);
            return;
        }
        const parentSection = sectionMap.get(change.target_parent_id);
        if (parentSection) {
            const elementIndex = parentSection.elements.findIndex((el: EmailElement) => el.id === change.target_id);
            if (elementIndex > -1) {
                parentSection.elements.splice(elementIndex, 1);
                console.log(`Reverted ELEMENT_ADD for element ${change.target_id} from section ${change.target_parent_id}`);
                    } else {
                console.warn(`Cannot revert ELEMENT_ADD: Element ${change.target_id} not found in section ${change.target_parent_id} for change ${change.id}`);
                    }
        } else {
            console.warn(`Cannot revert ELEMENT_ADD: Parent section ${change.target_parent_id} not found for element ${change.target_id} (change ${change.id})`);
        }
    });

    // 2. Revert Section Adds (by deleting the section that was added)
    sectionAddReverts.forEach(change => {
        if (!change.target_id) {
            console.warn(`Cannot revert SECTION_ADD: Missing target_id for change ${change.id}`);
            return;
        }
        const sectionIndex = revertedTemplate.sections.findIndex((s: EmailSection) => s.id === change.target_id);
        if (sectionIndex > -1) {
            revertedTemplate.sections.splice(sectionIndex, 1);
            sectionMap.delete(change.target_id); // Keep map consistent
            console.log(`Reverted SECTION_ADD for section ${change.target_id}`);
        } else {
            console.warn(`Cannot revert SECTION_ADD: Section ${change.target_id} not found for change ${change.id}`);
        }
    });

    // 3. Revert Element Edits (by applying old_content)
    elementEditReverts.forEach(change => {
        if (!change.target_parent_id || !change.target_id || !change.old_content) {
            console.warn(`Cannot revert ELEMENT_EDIT: Missing target_parent_id, target_id, or old_content for change ${change.id}`);
            return;
        }
        const parentSection = sectionMap.get(change.target_parent_id);
        if (parentSection) {
            const elementToRevert = parentSection.elements.find((el: EmailElement) => el.id === change.target_id);
            if (elementToRevert) {
                const oldElementData = change.old_content as EmailElement;
                Object.keys(oldElementData).forEach(key => {
                     // old_content should be the complete old element. ID and Type should match.
                    (elementToRevert as any)[key] = (oldElementData as any)[key];
                });
                console.log(`Reverted ELEMENT_EDIT for element ${change.target_id} in section ${change.target_parent_id}`);
                    } else {
                console.warn(`Cannot revert ELEMENT_EDIT: Element ${change.target_id} not found in section ${change.target_parent_id} for change ${change.id}`);
                    }
                } else {
            console.warn(`Cannot revert ELEMENT_EDIT: Parent section ${change.target_parent_id} not found for element ${change.target_id} (change ${change.id})`);
        }
    });

    // 4. Revert Section Edits (by applying old_content)
    sectionEditReverts.forEach(change => {
        if (!change.target_id || !change.old_content) {
            console.warn(`Cannot revert SECTION_EDIT: Missing target_id or old_content for change ${change.id}`);
            return;
        }
        const sectionToRevert = sectionMap.get(change.target_id);
        if (sectionToRevert) {
            const oldSectionData = change.old_content as EmailSection;
            Object.keys(oldSectionData).forEach(key => {
                if (key !== 'elements' && key !== 'id') { // Elements are handled by their own changes, ID shouldn't change.
                    (sectionToRevert as any)[key] = (oldSectionData as any)[key];
                }
            });
             // If old_content.elements exists and is an array, ensure the section's elements are also reverted if this is a full section snapshot
            if (Array.isArray(oldSectionData.elements)) {
                // This assumes that a section_edit's old_content might contain the element list state.
                // This could be complex if elements were also individually edited. 
                // For now, let's assume section_edit old_content is primarily for section properties.
                // If element restoration for section_edit is needed, it must be carefully coordinated.
                // sectionToRevert.elements = JSON.parse(JSON.stringify(oldSectionData.elements)); // Potentially risky without more context
            }
            console.log(`Reverted SECTION_EDIT for section ${change.target_id}`);
        } else {
            console.warn(`Cannot revert SECTION_EDIT: Section ${change.target_id} not found for change ${change.id}`);
        }
    });

    // 5. Revert Element Deletes (by re-adding the element from old_content)
    elementDeleteReverts.forEach(change => {
        if (!change.target_parent_id || !change.old_content) {
            console.warn(`Cannot revert ELEMENT_DELETE: Missing target_parent_id or old_content for change ${change.id}`);
            return;
        }
        const parentSection = sectionMap.get(change.target_parent_id);
        if (parentSection) {
            const elementToReAdd = change.old_content as EmailElement;
            // Check if element already exists (e.g., due to out-of-order processing or bad data)
            if (!parentSection.elements.find((el: EmailElement) => el.id === elementToReAdd.id)) {
                parentSection.elements.push(elementToReAdd); // Consider order of application if available
                console.log(`Reverted ELEMENT_DELETE for element ${elementToReAdd.id} by re-adding to section ${change.target_parent_id}`);
            } else {
                console.warn(`Cannot revert ELEMENT_DELETE: Element ${elementToReAdd.id} already exists in section ${change.target_parent_id}. Change ${change.id}`);
            }
        } else {
             // If parent section was also deleted and needs to be reverted first, this could fail.
             // This highlights the importance of the order_of_application or careful batching of reverts.
            console.warn(`Cannot revert ELEMENT_DELETE: Parent section ${change.target_parent_id} not found for element re-add (change ${change.id})`);
        }
    });

    // 6. Revert Section Deletes (by re-adding the section from old_content)
    sectionDeleteReverts.forEach(change => {
        if (!change.old_content) {
            console.warn(`Cannot revert SECTION_DELETE: Missing old_content for change ${change.id}`);
            return;
        }
        const sectionToReAdd = change.old_content as EmailSection;
        if (!sectionMap.has(sectionToReAdd.id)) {
            revertedTemplate.sections.push(sectionToReAdd); // Consider order of application
            sectionMap.set(sectionToReAdd.id, sectionToReAdd); // Update map
            console.log(`Reverted SECTION_DELETE for section ${sectionToReAdd.id} by re-adding it.`);
        } else {
            console.warn(`Cannot revert SECTION_DELETE: Section ${sectionToReAdd.id} already exists. Change ${change.id}`);
        }
    });

    // The old processing loop is replaced by this ordered approach.
    return revertedTemplate;
}

// --- Main Server Handler ---

interface ManagePendingChangesPayload {
    projectId: string;
    operation: 'accept_one' | 'reject_one' | 'accept_batch' | 'reject_batch' | 'get_batch' | 'get_all_project';
    change_id?: string; // For accept_one, reject_one
    batch_id?: string;  // For accept_batch, reject_batch, get_batch
}

/**
 * Main server handler for managing pending changes
 * 
 * This function handles HTTP requests to manage pending changes to email templates.
 * It supports two main actions:
 * 1. accept - Applies changes and creates new version
 * 2. reject - Reverts changes and marks them as rejected
 * 
 * The function includes:
 * - CORS support
 * - Request validation
 * - Database operations
 * - Error handling
 * - Version control
 * 
 * @param req - The incoming HTTP request
 * @returns HTTP response with operation result
 */
serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeadersFactory(req.headers.get('origin')) });
    }

    let payload: ManagePendingChangesPayload | null = null;
    let supabase: SupabaseClient;
    const htmlGenerator = new HtmlGenerator(); // V2 generator instance

    try {
        payload = await req.json();
        if (!payload || !payload.projectId || !payload.operation) {
            throw new Error("Missing required fields: projectId and operation.");
        }

        const { projectId, operation, change_id, batch_id } = payload;

        // Initialize Supabase client
        // @ts-ignore - Deno types are not available in TypeScript
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        // @ts-ignore - Deno types are not available in TypeScript
        const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
        if (!supabaseUrl || !supabaseAnonKey) throw new Error("Supabase connection details are not configured.");

        supabase = createClient(supabaseUrl!, supabaseAnonKey!, {
            global: { headers: { Authorization: req.headers.get('Authorization')! } }
        });

        // Fetch current project state (V2 template and version)
        console.log(`Fetching project data for ID: ${projectId}`);
        const { data: projectData, error: projectError } = await supabase
            .from('projects')
            .select('id, semantic_email_v2, version') // Fetch V2 template
            .eq('id', projectId)
            .single();

        if (projectError) throw new Error(`Failed to fetch project: ${projectError.message}`);
        if (!projectData) throw new Error(`Project with ID ${projectId} not found.`);

        // Ensure currentSemanticEmail is properly typed as EmailTemplate (which is EmailTemplateV2Type)
        // and can be null if the project is new or semantic_email_v2 is not yet populated.
        const currentSemanticEmail = projectData.semantic_email_v2 as EmailTemplate | null;
        const currentVersion = projectData.version as number ?? 0; // Default to 0 if null

        switch (operation) {
            case 'accept_one':
                if (!change_id) throw new Error("change_id is required for accept_one operation.");
                if (!currentSemanticEmail) throw new Error("Cannot accept change: Project current template (semantic_email_v2) is missing.");

                console.log(`Processing ACCEPT_ONE for change ${change_id} in project ${projectId}`);

                // Fetch the specific pending change
                const { data: singleChange, error: fetchError } = await supabase
            .from('pending_changes')
            .select('*')
                    .eq('id', change_id)
            .eq('project_id', projectId)
                    .single();

                if (fetchError) throw new Error(`Failed to fetch change ${change_id}: ${fetchError.message}`);
                if (!singleChange) throw new Error(`Change ${change_id} not found or does not belong to project ${projectId}.`);
                if (singleChange.status !== 'pending') {
                    return new Response(JSON.stringify({ message: `Change ${change_id} is not in pending status.` }), {
                headers: { ...corsHeadersFactory(req.headers.get('origin')), 'Content-Type': 'application/json' },
                        status: 400,
            });
        }

                const changeToApply = singleChange as GranularPendingChangeInput; // Cast, as it will be used as input
                const updatedTemplate = applyPendingChanges(currentSemanticEmail, [changeToApply]);
                const newHtml = htmlGenerator.generate(updatedTemplate);
                const nextVersionNumber = currentVersion + 1;

                // Update project and change status in a transaction if possible, or sequentially.
                // For simplicity here, sequential. Consider Supabase transactions/RPC for atomicity if needed.
                const { error: updateProjectError } = await supabase
                    .from('projects')
                    .update({
                        semantic_email_v2: updatedTemplate,
                        current_html: newHtml,
                        version: nextVersionNumber,
                        last_edited_at: new Date().toISOString(),
                    })
                    .eq('id', projectId);
                if (updateProjectError) throw new Error(`Failed to update project: ${updateProjectError.message}`);

            const { error: updateStatusError } = await supabase
                .from('pending_changes')
                    .update({ status: 'accepted', updated_at: new Date().toISOString() })
                    .eq('id', change_id);
            if (updateStatusError) {
                     // Attempt to rollback or log inconsistency if project updated but status didn't
                    console.error(`Failed to update status for change ${change_id} after project update. Potential inconsistency.`);
                    throw new Error(`Failed to update change status: ${updateStatusError.message}`);
            }

                // Create new version snapshot (optional but good practice)
            const { error: saveVersionError } = await supabase
                .from('email_versions')
                .insert({
                    project_id: projectId,
                    version_number: nextVersionNumber,
                        // content: updatedTemplate, // content was original V1, use semantic_email_v2 for V2
                        semantic_email_v2: updatedTemplate, 
                    created_at: new Date().toISOString()
                });
                if (saveVersionError) console.error("Failed to save email version snapshot:", saveVersionError);

                return new Response(JSON.stringify({ 
                    message: `Change ${change_id} accepted. Project updated to version ${nextVersionNumber}.`,
                    updatedTemplate,
                    newHtml 
                }), {
                    headers: { ...corsHeadersFactory(req.headers.get('origin')), 'Content-Type': 'application/json' },
                    status: 200,
                });

            case 'reject_one':
                if (!change_id) throw new Error("change_id is required for reject_one operation.");
                console.log(`Processing REJECT_ONE for change ${change_id} in project ${projectId}`);

                const { data: changeToReject, error: fetchRejectError } = await supabase
                    .from('pending_changes')
                    .select('id, status')
                    .eq('id', change_id)
                    .eq('project_id', projectId)
                    .single();

                if (fetchRejectError) throw new Error(`Failed to fetch change ${change_id} for rejection: ${fetchRejectError.message}`);
                if (!changeToReject) throw new Error(`Change ${change_id} not found for rejection.`);
                if (changeToReject.status !== 'pending') {
                     return new Response(JSON.stringify({ message: `Change ${change_id} is not in pending status, cannot reject.` }), {
                        headers: { ...corsHeadersFactory(req.headers.get('origin')), 'Content-Type': 'application/json' },
                        status: 400, 
                    });
                }

                const { error: rejectStatusError } = await supabase
                    .from('pending_changes')
                    .update({ status: 'rejected', updated_at: new Date().toISOString() })
                    .eq('id', change_id);
                if (rejectStatusError) throw new Error(`Failed to update status to rejected for change ${change_id}: ${rejectStatusError.message}`);

                return new Response(JSON.stringify({ message: `Change ${change_id} rejected.` }), {
                    headers: { ...corsHeadersFactory(req.headers.get('origin')), 'Content-Type': 'application/json' },
                    status: 200,
                });
            
            case 'accept_batch':
                if (!batch_id) throw new Error("batch_id is required for accept_batch operation.");
                if (!currentSemanticEmail) throw new Error("Cannot accept batch: Project current template (semantic_email_v2) is missing.");
                
                console.log(`Processing ACCEPT_BATCH for batch ${batch_id} in project ${projectId}`);
                
                const { data: pendingChangesInBatch, error: batchFetchError } = await supabase
                    .from('pending_changes')
                    .select('*')
                    .eq('batch_id', batch_id)
                    .eq('project_id', projectId)
                    .eq('status', 'pending');

                if (batchFetchError) throw new Error(`Failed to fetch pending changes for batch ${batch_id}: ${batchFetchError.message}`);
                if (!pendingChangesInBatch || pendingChangesInBatch.length === 0) {
                    return new Response(JSON.stringify({ message: `No pending changes found for batch ${batch_id}.` }), {
                        headers: { ...corsHeadersFactory(req.headers.get('origin')), 'Content-Type': 'application/json' },
                        status: 200,
                    });
                }

                const changesToApplyBatch = pendingChangesInBatch as GranularPendingChangeInput[];
                const updatedTemplateBatch = applyPendingChanges(currentSemanticEmail, changesToApplyBatch);
                const newHtmlBatch = htmlGenerator.generate(updatedTemplateBatch);
                const nextVersionNumberBatch = currentVersion + (changesToApplyBatch.length > 0 ? 1: 0); // Increment only if changes applied

                // Update project (if changes were applied)
                if (changesToApplyBatch.length > 0) {
                    const { error: updateProjectErrorBatch } = await supabase
                .from('projects')
                        .update({
                            semantic_email_v2: updatedTemplateBatch,
                            current_html: newHtmlBatch,
                            version: nextVersionNumberBatch,
                            last_edited_at: new Date().toISOString(),
                        })
                .eq('id', projectId);
                    if (updateProjectErrorBatch) throw new Error(`Failed to update project for batch ${batch_id}: ${updateProjectErrorBatch.message}`);
                
                    // Create new version snapshot
                    const { error: saveVersionErrorBatch } = await supabase
                        .from('email_versions')
                        .insert({
                            project_id: projectId,
                            version_number: nextVersionNumberBatch,
                            semantic_email_v2: updatedTemplateBatch,
                            created_at: new Date().toISOString()
                        });
                    if (saveVersionErrorBatch) console.error("Failed to save email version snapshot for batch:", saveVersionErrorBatch);
                }

                // Update status of all processed changes in the batch
                const changeIdsInBatch = pendingChangesInBatch.map(c => c.id);
                if (changeIdsInBatch.length > 0) {
                    const { error: updateBatchStatusError } = await supabase
                        .from('pending_changes')
                        .update({ status: 'accepted', updated_at: new Date().toISOString() })
                        .in('id', changeIdsInBatch);
                    if (updateBatchStatusError) throw new Error(`Failed to update status for changes in batch ${batch_id}: ${updateBatchStatusError.message}`);
            }

                return new Response(JSON.stringify({ 
                    message: `Accepted ${pendingChangesInBatch.length} changes in batch ${batch_id}. Project updated.`, 
                    updatedTemplate: updatedTemplateBatch, 
                    newHtml: newHtmlBatch 
                }), {
                headers: { ...corsHeadersFactory(req.headers.get('origin')), 'Content-Type': 'application/json' },
                status: 200,
            });

            case 'reject_batch':
                if (!batch_id) throw new Error("batch_id is required for reject_batch operation.");
                console.log(`Processing REJECT_BATCH for batch ${batch_id} in project ${projectId}`);
            
                const { data: changesToRejectBatch, error: fetchRejectBatchError } = await supabase
                    .from('pending_changes')
                    .select('id') // Only need IDs to update status
                    .eq('batch_id', batch_id)
                    .eq('project_id', projectId)
                    .eq('status', 'pending');

                if (fetchRejectBatchError) throw new Error(`Failed to fetch changes for batch ${batch_id} to reject: ${fetchRejectBatchError.message}`);
                
                if (!changesToRejectBatch || changesToRejectBatch.length === 0) {
                     return new Response(JSON.stringify({ message: `No pending changes to reject in batch ${batch_id}.` }), {
                        headers: { ...corsHeadersFactory(req.headers.get('origin')), 'Content-Type': 'application/json' },
                        status: 200,
                    });
                }

                const changeIdsToReject = changesToRejectBatch.map(c => c.id);
                const { error: rejectBatchStatusError } = await supabase
                    .from('pending_changes')
                    .update({ status: 'rejected', updated_at: new Date().toISOString() })
                    .in('id', changeIdsToReject);
                if (rejectBatchStatusError) throw new Error(`Failed to update status to rejected for batch ${batch_id}: ${rejectBatchStatusError.message}`);

                return new Response(JSON.stringify({ message: `Rejected ${changeIdsToReject.length} pending changes in batch ${batch_id}.` }), {
                    headers: { ...corsHeadersFactory(req.headers.get('origin')), 'Content-Type': 'application/json' },
                    status: 200,
                });
            
            case 'get_batch':
                if (!batch_id) throw new Error("batch_id is required for get_batch operation.");
                console.log(`Processing GET_BATCH for batch ${batch_id} in project ${projectId}`);
                
                const { data: batchChanges, error: getBatchError } = await supabase
                    .from('pending_changes')
                    .select('*')
                    .eq('batch_id', batch_id)
                    .eq('project_id', projectId)
                    .order('created_at', { ascending: true }); // Or by order_of_application if used
                
                if (getBatchError) throw new Error(`Failed to fetch batch ${batch_id}: ${getBatchError.message}`);
                return new Response(JSON.stringify(batchChanges || []), {
                    headers: { ...corsHeadersFactory(req.headers.get('origin')), 'Content-Type': 'application/json' },
                    status: 200,
                });

            case 'get_all_project':
                console.log(`Processing GET_ALL_PROJECT for project ${projectId}`);
                const { data: allProjectChanges, error: getAllError } = await supabase
                    .from('pending_changes')
                    .select('*')
                    .eq('project_id', projectId)
                    .order('batch_id', { ascending: true })
                    .order('created_at', { ascending: true });

                if (getAllError) throw new Error(`Failed to fetch all changes for project ${projectId}: ${getAllError.message}`);
                return new Response(JSON.stringify(allProjectChanges || []), {
                headers: { ...corsHeadersFactory(req.headers.get('origin')), 'Content-Type': 'application/json' },
                status: 200,
            });

            default:
                throw new Error(`Invalid operation specified: ${operation}`);
        }

    } catch (error) {
        // Global error handler
        console.error('Error in manage-pending-changes:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeadersFactory(req.headers.get('origin')), 'Content-Type': 'application/json' },
            status: 400, // Or 500 for internal errors
        });
    }
}); 