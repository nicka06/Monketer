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
import type { PendingChangeInput, PendingChange } from '../../../shared/types/pendingChangeTypes.ts';
import { corsHeadersFactory } from '../_shared/lib/constants.ts';
import { HtmlGeneratorCore } from '../../../shared/services/htmlGenerator.ts';

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
 * @param changes - Array of pending changes to apply
 * @returns Updated email template with all changes applied
 */
function applyPendingChanges(currentTemplate: EmailTemplate, changes: PendingChangeInput[]): EmailTemplate {
    // Create deep copy of template to avoid modifying original
    let updatedTemplate = JSON.parse(JSON.stringify(currentTemplate));

    // Create lookup maps for efficient element and section access
    const elementMap = new Map<string, EmailElement>();
    const sectionMap = new Map<string, EmailSection>();
    updatedTemplate.sections.forEach((section: EmailSection) => {
        sectionMap.set(section.id, section);
        section.elements.forEach((element: EmailElement) => {
            elementMap.set(element.id, element);
        });
    });

    // Process each pending change
    changes.forEach(change => {
        if (change.status !== 'pending') return; // Skip non-pending changes

        switch (change.change_type) {
            case 'add':
                // Handle adding new elements
                const newElementData = change.new_content as (EmailElement & { targetSectionId?: string });
                if (newElementData && newElementData.targetSectionId) {
                    const targetSection = sectionMap.get(newElementData.targetSectionId);
                    if (targetSection) {
                        // Remove temporary targetSectionId and add element
                        const { targetSectionId, ...elementToAdd } = newElementData;
                        targetSection.elements.push(elementToAdd as EmailElement);
                        elementMap.set(elementToAdd.id, elementToAdd as EmailElement);
                        console.log(`Applied ADD for element ${elementToAdd.id} to section ${targetSectionId}`);
                    } else {
                        console.warn(`Cannot apply ADD: Target section ${newElementData.targetSectionId} not found for element ${newElementData.id}`);
                    }
                } else {
                    console.warn(`Cannot apply ADD: Missing target section info or element data for element ID ${change.element_id}`);
                }
                break;

            case 'edit':
                // Handle editing existing elements
                const elementToEdit = elementMap.get(change.element_id);
                if (elementToEdit && change.new_content) {
                    Object.assign(elementToEdit, change.new_content);
                    console.log(`Applied EDIT for element ${change.element_id}`);
                } else {
                    console.warn(`Cannot apply EDIT: Element ${change.element_id} not found or no new content provided.`);
                }
                break;

            case 'delete':
                // Handle deleting elements
                let elementDeleted = false;
                for (const section of updatedTemplate.sections) {
                    const elementIndex = section.elements.findIndex((el: EmailElement) => el.id === change.element_id);
                    if (elementIndex > -1) {
                        section.elements.splice(elementIndex, 1);
                        elementMap.delete(change.element_id);
                        console.log(`Applied DELETE for element ${change.element_id} from section ${section.id}`);
                        elementDeleted = true;
                        break;
                    }
                }
                if (!elementDeleted) {
                    console.warn(`Cannot apply DELETE: Element ${change.element_id} not found.`);
                }
                break;
        }
    });

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
function applyRevert(template: EmailTemplate, changes: PendingChange[]): EmailTemplate {
    // Create deep copy of template
    let revertedTemplate = JSON.parse(JSON.stringify(template));

    // Process changes in reverse order for correct revert
    for (let i = changes.length - 1; i >= 0; i--) {
        const change = changes[i];
        const elementId = change.element_id;

        console.log(`Reverting change ${change.id}: Type ${change.change_type} for element ${elementId}`);

        let elementFound = false;
        let sectionFound = false;

        // Find and process the target element
        for (const section of revertedTemplate.sections) {
            const elementIndex = section.elements.findIndex(el => el.id === elementId);

            if (elementIndex !== -1) {
                elementFound = true;
                sectionFound = true;
                
                if (change.change_type === 'add') {
                    // Revert add by removing the element
                    console.log(` Reverting add: Removing element ${elementId} from section ${section.id}`);
                    section.elements.splice(elementIndex, 1);
                } else if (change.change_type === 'edit') {
                    // Revert edit by restoring old content
                    if (change.old_content) {
                        console.log(` Reverting edit: Applying old content to ${elementId}`);
                        Object.assign(section.elements[elementIndex], change.old_content);
                    } else {
                        console.warn(` Cannot revert edit for ${elementId}: old_content is missing.`);
                    }
                }
                break;
            }
        }

        // Handle reverting delete operations
        if (change.change_type === 'delete' && !elementFound) {
            console.log(` Reverting delete: Attempting to re-insert element ${elementId}`);
            if (change.old_content) {
                const deletedElementInfo = change.old_content as DeletedElementInfo;
                const targetSectionId = deletedElementInfo.originalSectionId;

                if (targetSectionId) {
                    const targetSection = revertedTemplate.sections.find(sec => sec.id === targetSectionId);
                    if (targetSection) {
                        // Remove temporary originalSectionId and reinsert element
                        const elementToInsert = { ...deletedElementInfo };
                        delete elementToInsert.originalSectionId;

                        console.log(`  Re-inserting ${elementId} into section ${targetSectionId}`);
                        targetSection.elements.push(elementToInsert as EmailElement);
                        sectionFound = true;
                    } else {
                        console.warn(` Cannot revert delete for ${elementId}: Original section ${targetSectionId} not found.`);
                    }
                } else {
                    console.warn(` Cannot revert delete for ${elementId}: originalSectionId missing in old_content.`);
                }
            } else {
                console.warn(` Cannot revert delete for ${elementId}: old_content is missing.`);
            }
        }
        
        // Log warning if expected element/section not found
        if (!sectionFound && change.change_type !== 'add') {
            console.warn(` Could not find element or section context for reverting ${change.change_type} on element ${elementId}`);
        }
    }

    return revertedTemplate;
}

// --- Main Server Handler ---

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

    let requestData: { projectId: string; action: 'accept' | 'reject' } | null = null;
    let supabase: SupabaseClient;

    try {
        // 1. Parse and validate request data
        requestData = await req.json();
        if (!requestData || !requestData.projectId || !requestData.action) {
            throw new Error("Missing required fields: projectId and action ('accept' or 'reject').");
        }
        const { projectId, action } = requestData;

        // 2. Initialize Supabase client with environment variables
        // Note: Deno.env is only available in Deno runtime
        // @ts-ignore - Deno types are not available in TypeScript
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        // @ts-ignore - Deno types are not available in TypeScript
        const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
        if (!supabaseUrl || !supabaseAnonKey) throw new Error("Supabase connection details are not configured.");

        supabase = createClient(supabaseUrl!, supabaseAnonKey!, {
            global: { headers: { Authorization: req.headers.get('Authorization')! } }
        });

        // 3. Fetch current project state and version
        console.log(`Fetching project data for ID: ${projectId}`);
        const { data: projectData, error: projectError } = await supabase
            .from('projects')
            .select('id, semantic_email, version')
            .eq('id', projectId)
            .single();

        if (projectError) throw new Error(`Failed to fetch project: ${projectError.message}`);
        if (!projectData) throw new Error(`Project with ID ${projectId} not found.`);

        const currentSemanticEmail = projectData.semantic_email as EmailTemplate;
        const currentVersion = projectData.version as number;

        // 4. Fetch pending changes for the project
        console.log(`Fetching pending changes for project ID: ${projectId}`);
        const { data: pendingChangesData, error: changesError } = await supabase
            .from('pending_changes')
            .select('*')
            .eq('project_id', projectId)
            .eq('status', 'pending')
            .order('created_at', { ascending: true }); // Important for correct revert order

        if (changesError) {
            throw new Error(`Failed to fetch pending changes: ${changesError.message}`);
        }
        const pendingChanges = pendingChangesData as PendingChange[] || [];

        // 5. Handle case where no pending changes exist
        if (pendingChanges.length === 0) {
            return new Response(JSON.stringify({ message: "No pending changes found." }), {
                headers: { ...corsHeadersFactory(req.headers.get('origin')), 'Content-Type': 'application/json' },
                status: 200,
            });
        }

        // 6. Process the requested action (accept or reject)
        if (action === 'accept') {
            // 6a. Accept changes flow
            console.log(`Processing ACCEPT action for project ${projectId}`);
            
            // Update pending changes status to accepted
            const pendingChangeIds = pendingChanges.map(c => c.id);
            console.log(`Updating status to 'accepted' for ${pendingChangeIds.length} changes.`);
            const { error: updateStatusError } = await supabase
                .from('pending_changes')
                .update({ status: 'accepted' })
                .in('id', pendingChangeIds);

            if (updateStatusError) {
                throw new Error(`Failed to update pending change status: ${updateStatusError.message}`);
            }

            // Create new version snapshot
            const nextVersionNumber = currentVersion + 1;
            console.log(`Creating version snapshot ${nextVersionNumber} for project ${projectId}`);
            const { error: saveVersionError } = await supabase
                .from('email_versions')
                .insert({
                    project_id: projectId,
                    version_number: nextVersionNumber,
                    content: currentSemanticEmail,
                    created_at: new Date().toISOString()
                });

            if (saveVersionError) {
                console.error("Failed to save email version snapshot:", saveVersionError);
                // Continue execution as this is not critical
            }

            // Update project version number
            const { error: updateProjectVersionError } = await supabase
                .from('projects')
                .update({ version: nextVersionNumber, last_edited_at: new Date().toISOString() })
                .eq('id', projectId);
                 
            if (updateProjectVersionError) {
                console.error("Failed to update project version number:", updateProjectVersionError);
                // Continue execution as this is not critical
            }

            return new Response(JSON.stringify({ message: `Accepted ${pendingChanges.length} changes. Project version updated to ${nextVersionNumber}.` }), {
                headers: { ...corsHeadersFactory(req.headers.get('origin')), 'Content-Type': 'application/json' },
                status: 200,
            });

        } else if (action === 'reject') {
            // 6b. Reject changes flow
            console.log(`Processing REJECT action for project ${projectId}`);
            
            // Revert semantic email in memory
            console.log("Calculating reverted semantic email...");
            const revertedSemanticEmail = applyRevert(currentSemanticEmail, pendingChanges);
            console.log("Reverted semantic email calculated.");

            // Regenerate HTML from reverted state using V2 generator
            console.log("Regenerating HTML from reverted state...");
            const htmlGenerator = new HtmlGeneratorCore();
            const revertedHtml = htmlGenerator.generate(revertedSemanticEmail);
            console.log("Regenerated HTML from reverted state using V2 generator.");

            // Perform atomic database update via RPC
            const pendingChangeIds = pendingChanges.map(c => c.id);
            console.log(`Calling manage_reject_transaction RPC for project ${projectId} and ${pendingChangeIds.length} changes.`);

            const { error: rpcError } = await supabase.rpc('manage_reject_transaction', {
                _project_id: projectId,
                _reverted_semantic_email: revertedSemanticEmail,
                _reverted_html: revertedHtml,
                _change_ids: pendingChangeIds
            });

            if (rpcError) {
                console.error("Error calling manage_reject_transaction RPC:", rpcError);
                throw new Error(`Failed to reject changes via RPC: ${rpcError.message}`);
            }

            console.log("RPC call successful. Project reverted and changes marked as rejected.");

            return new Response(JSON.stringify({ message: `Rejected ${pendingChanges.length} changes. Project reverted.` }), {
                headers: { ...corsHeadersFactory(req.headers.get('origin')), 'Content-Type': 'application/json' },
                status: 200,
            });

        } else {
            // Handle invalid action
            throw new Error(`Invalid action specified: ${action}`);
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