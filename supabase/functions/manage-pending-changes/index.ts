import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
    EmailTemplate,
    EmailSection, // Needed for applying changes
    EmailElement, // Needed for applying changes
    PendingChangeInput,
    corsHeaders,
    // EmailVersion // Might need later for snapshotting
    PendingChange
} from '../_shared/types.ts';
// Import shared HTML generator
import { generateHtmlFromSemantic } from '../_shared/html-utils.ts';

// Type definition for the structure expected in old_content for 'delete' changes
// This might already be defined in types.ts - if so, remove this definition
// and ensure it's imported correctly above.
interface DeletedElementInfo extends EmailElement {
    originalSectionId?: string; // Ensure this is populated by the diff function
}

// --- Placeholder HTML Generator (Copy from generate-email-changes for now) --- 
// Ideally, this lives in a shared utils file later
/* REMOVED Placeholder - Now using shared function
async function generateHtmlFromSemantic(semanticEmail: EmailTemplate): Promise<string> {
    console.warn("[manage-pending-changes] generateHtmlFromSemantic not fully implemented - returning basic placeholder");
    let html = `<html><head><style>${''}</style></head><body>`;
    semanticEmail?.sections?.forEach(section => {
        html += `<div id="${section.id}" style="${Object.entries(section.styles || {}).map(([k, v]) => `${k}:${v};`).join('')}">`;
        section.elements?.forEach(element => {
            let styleString = Object.entries(element.styles || {}).map(([k, v]) => `${k}:${v};`).join('');
            html += `<div id="${element.id}" style="position:relative;">`;
            switch(element.type) {
                case 'header': html += `<h2 style="${styleString}">${element.content}</h2>`; break;
                case 'text': html += `<p style="${styleString}">${element.content}</p>`; break;
                case 'button': html += `<button style="${styleString}">${element.content}</button>`; break;
                case 'image': html += `<img src="${element.content}" style="${styleString}" />`; break;
                case 'divider': html += `<hr style="${styleString}" />`; break;
                default: html += `<div>Unsupported element type: ${element.type}</div>`;
            }
            html += `</div>`;
        });
        html += `</div>`;
    });
    html += `</body></html>`;
    return html;
}
*/

// --- Function to Apply Pending Changes --- 
function applyPendingChanges(currentTemplate: EmailTemplate, changes: PendingChangeInput[]): EmailTemplate {
    // Deep clone the template to avoid modifying the original object directly
    let updatedTemplate = JSON.parse(JSON.stringify(currentTemplate));

    // Create maps for quick access (element ID -> element, section ID -> section)
    const elementMap = new Map<string, EmailElement>();
    const sectionMap = new Map<string, EmailSection>();
    updatedTemplate.sections.forEach((section: EmailSection) => {
        sectionMap.set(section.id, section);
        section.elements.forEach((element: EmailElement) => {
            elementMap.set(element.id, element);
        });
    });

    changes.forEach(change => {
        if (change.status !== 'pending') return; // Only process pending changes

        switch (change.change_type) {
            case 'add':
                // Assumption: new_content contains the full element structure AND the target section ID
                // We need to refine the PendingChangeInput or diff output to include target section info
                // For now, let's assume new_content has { ...element, targetSectionId: '...' }
                const newElementData = change.new_content as (EmailElement & { targetSectionId?: string });
                if (newElementData && newElementData.targetSectionId) {
                    const targetSection = sectionMap.get(newElementData.targetSectionId);
                    if (targetSection) {
                        // Remove temporary targetSectionId before adding
                        const { targetSectionId, ...elementToAdd } = newElementData;
                        targetSection.elements.push(elementToAdd as EmailElement);
                        elementMap.set(elementToAdd.id, elementToAdd as EmailElement); // Update map
                        console.log(`Applied ADD for element ${elementToAdd.id} to section ${targetSectionId}`);
                    } else {
                        console.warn(`Cannot apply ADD: Target section ${newElementData.targetSectionId} not found for element ${newElementData.id}`);
                    }
                } else {
                     console.warn(`Cannot apply ADD: Missing target section info or element data for element ID ${change.element_id}`);
                }
                break;

            case 'edit':
                const elementToEdit = elementMap.get(change.element_id);
                if (elementToEdit && change.new_content) {
                    // new_content contains the changed properties { content?: string, styles?: {}, type?: string }
                    Object.assign(elementToEdit, change.new_content);
                    console.log(`Applied EDIT for element ${change.element_id}`);
                } else {
                    console.warn(`Cannot apply EDIT: Element ${change.element_id} not found or no new content provided.`);
                }
                break;

            case 'delete':
                // Find the section containing the element to delete it
                let elementDeleted = false;
                for (const section of updatedTemplate.sections) {
                    const elementIndex = section.elements.findIndex((el: EmailElement) => el.id === change.element_id);
                    if (elementIndex > -1) {
                        section.elements.splice(elementIndex, 1);
                        elementMap.delete(change.element_id); // Remove from map
                        console.log(`Applied DELETE for element ${change.element_id} from section ${section.id}`);
                        elementDeleted = true;
                        break; // Assume element ID is unique across sections
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

// --- Helper: Apply Revert --- 
// Corrected to use PendingChange type which includes id
function applyRevert(template: EmailTemplate, changes: PendingChange[]): EmailTemplate {
    let revertedTemplate = JSON.parse(JSON.stringify(template)); // Deep copy to avoid modifying original

    // Process changes in reverse order for correct revert
    for (let i = changes.length - 1; i >= 0; i--) {
        const change = changes[i];
        const elementId = change.element_id;

        // Use change.id here as PendingChange has it
        console.log(`Reverting change ${change.id}: Type ${change.change_type} for element ${elementId}`);

        let elementFound = false;
        let sectionFound = false;

        // Iterate through sections and elements to find the target
        for (const section of revertedTemplate.sections) {
            const elementIndex = section.elements.findIndex(el => el.id === elementId);

            if (elementIndex !== -1) {
                elementFound = true;
                sectionFound = true; // Element found, so section exists
                
                if (change.change_type === 'add') {
                    // Revert 'add' -> delete the element
                    console.log(` Reverting add: Removing element ${elementId} from section ${section.id}`);
                    section.elements.splice(elementIndex, 1);
                } else if (change.change_type === 'edit') {
                    // Revert 'edit' -> apply old_content
                    if (change.old_content) {
                         console.log(` Reverting edit: Applying old content to ${elementId}`);
                        // Directly assign old properties back. Assumes old_content structure matches {content, styles, type}
                        Object.assign(section.elements[elementIndex], change.old_content);
                    } else {
                         console.warn(` Cannot revert edit for ${elementId}: old_content is missing.`);
                    }
                }
                // If change_type was 'delete', we handle it below if the element wasn't found 
                // (because it was already deleted in the current state we fetched)
                break; // Element processed, move to next change
            }
        }

        // Handle reverting a 'delete' operation
        if (change.change_type === 'delete' && !elementFound) {
             console.log(` Reverting delete: Attempting to re-insert element ${elementId}`);
            if (change.old_content) {
                // Use the specific interface for deleted element info
                const deletedElementInfo = change.old_content as DeletedElementInfo; 
                const targetSectionId = deletedElementInfo.originalSectionId;

                if (targetSectionId) {
                    const targetSection = revertedTemplate.sections.find(sec => sec.id === targetSectionId);
                    if (targetSection) {
                         // Remove potentially added originalSectionId before inserting
                         const elementToInsert = { ...deletedElementInfo };
                         delete elementToInsert.originalSectionId; // Property might not exist, but safe to call delete

                         console.log(`  Re-inserting ${elementId} into section ${targetSectionId}`);
                        // Simple push might mess up order - need more complex logic 
                        // for exact position revert, but for now, just add it back.
                        targetSection.elements.push(elementToInsert as EmailElement);
                        sectionFound = true; // Mark section as found since we re-inserted
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
        
        if (!sectionFound && change.change_type !== 'add') {
            // Warn if we expected to find an element/section for edit/delete revert but didn't
             console.warn(` Could not find element or section context for reverting ${change.change_type} on element ${elementId}`);
        }
    }

    return revertedTemplate;
}

// --- Main Server Logic --- 
serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    let requestData: { projectId: string; action: 'accept' | 'reject' } | null = null;
    let supabase: SupabaseClient;

    try {
        // 1. Parse Request and Auth
        requestData = await req.json();
        if (!requestData || !requestData.projectId || !requestData.action) {
            throw new Error("Missing required fields: projectId and action ('accept' or 'reject').");
        }
        const { projectId, action } = requestData;

        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
        if (!supabaseUrl || !supabaseAnonKey) throw new Error("Supabase connection details are not configured.");

        supabase = createClient(supabaseUrl!, supabaseAnonKey!, {
            global: { headers: { Authorization: req.headers.get('Authorization')! } }
        });

        // --- Get Current Project State --- 
        console.log(`Fetching project data for ID: ${projectId}`);
        const { data: projectData, error: projectError } = await supabase
            .from('projects')
            .select('id, semantic_email, version') // Fetch current semantic and version
            .eq('id', projectId)
            .single();

        if (projectError) throw new Error(`Failed to fetch project: ${projectError.message}`);
        if (!projectData) throw new Error(`Project with ID ${projectId} not found.`);

        const currentSemanticEmail = projectData.semantic_email as EmailTemplate;
        const currentVersion = projectData.version as number;

        // --- Get Pending Changes --- 
        console.log(`Fetching pending changes for project ID: ${projectId}`);
        const { data: pendingChanges, error: changesError } = await supabase
            .from('pending_changes')
            .select('*') // Select all columns needed for applying changes
            .eq('project_id', projectId)
            .eq('status', 'pending')
            .order('created_at', { ascending: true }); // Process changes in order? Maybe not critical here.

        if (changesError) throw new Error(`Failed to fetch pending changes: ${changesError.message}`);

        const pendingChangeIds = (pendingChanges || []).map(pc => pc.id);
        if (pendingChangeIds.length === 0 && action === 'accept') {
             console.log("No pending changes found to accept.");
             // Return early? Or proceed to update timestamp?
             return new Response(JSON.stringify({ message: "No pending changes to accept." }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
             });
        }

        // --- Perform Action --- 
        let message = "";

        if (action === 'accept') {
            console.log(`Action: ACCEPT for project ${projectId}`);
            if (!pendingChanges || pendingChanges.length === 0) {
                 throw new Error("Cannot accept: No pending changes found (internal check).");
            }

            // 1. Apply changes to semantic structure
            const updatedSemanticEmail = applyPendingChanges(currentSemanticEmail, pendingChanges as PendingChangeInput[]);

            // 2. Generate new HTML
            const newHtml = await generateHtmlFromSemantic(updatedSemanticEmail);
            const newVersion = currentVersion + 1;

            // 3. Create Email Version Snapshot
            console.log(`Creating snapshot for version ${newVersion} of project ${projectId}`);
            const { error: versionError } = await supabase
                .from('email_versions') // Assumes table named 'email_versions' exists
                .insert({
                    project_id: projectId,
                    version_number: newVersion,
                    semantic_snapshot: updatedSemanticEmail, // Save the newly accepted state
                    created_at: new Date().toISOString() // Timestamp the version
                 });
             // Log error but don't necessarily fail the whole process if snapshotting fails
            if (versionError) {
                console.error(`Failed to save email version snapshot (v${newVersion}) for project ${projectId}:`, versionError.message);
            }

            // 4. Update Project Table
            console.log(`Updating project ${projectId} to version ${newVersion}`);
            const { error: updateError } = await supabase
                .from('projects')
                .update({
                    semantic_email: updatedSemanticEmail,
                    current_html: newHtml,
                    version: newVersion,
                    last_edited_at: new Date().toISOString()
                })
                .eq('id', projectId);
            if (updateError) throw new Error(`Failed to update project: ${updateError.message}`);

            // 5. Update Pending Changes Status
            console.log(`Updating status to 'accepted' for ${pendingChangeIds.length} changes.`);
             const { error: statusUpdateError } = await supabase
                .from('pending_changes')
                .update({ status: 'accepted' })
                .in('id', pendingChangeIds);
            if (statusUpdateError) throw new Error(`Failed to update pending changes status: ${statusUpdateError.message}`);

            message = `Successfully accepted ${pendingChangeIds.length} changes. Project updated to version ${newVersion}.`;

        } else if (action === 'reject') {
            console.log(`Action: REJECT for project ${projectId}`);

            // Ensure there are changes to reject before proceeding
            if (!pendingChanges || pendingChanges.length === 0) {
                console.log("No pending changes found to reject.");
                // Optionally update timestamp even if no changes? Decide later.
                return new Response(JSON.stringify({ message: "No pending changes to reject." }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            // 1. Apply revert logic to the current semantic email
            console.log(`Applying revert logic using ${pendingChanges.length} pending changes.`);
            // Ensure we pass PendingChange[], not PendingChangeInput[]
            const revertedSemanticEmail = applyRevert(currentSemanticEmail, pendingChanges as PendingChange[]); 
            console.log("Revert applied, resulting semantic state:", JSON.stringify(revertedSemanticEmail).substring(0, 200) + "..."); // Log reverted state for debugging

            // 2. Regenerate HTML from the *reverted* semantic email
            console.log(`Regenerating HTML from the reverted semantic state.`);
            const revertedHtml = await generateHtmlFromSemantic(revertedSemanticEmail);
            console.log("Regenerated HTML from reverted state:", revertedHtml.substring(0, 200) + "..."); // Log regenerated HTML

            // // Use a database transaction to ensure atomicity --- Reverted for now
            // const txResult = await supabase.rpc('manage_reject_transaction', {
            //   _project_id: projectId,
            //   _reverted_semantic_email: revertedSemanticEmail,
            //   _reverted_html: revertedHtml,
            //   _change_ids: pendingChangeIds
            // });
            // 
            // if (txResult.error) {
            //     console.error("Transaction error during reject:", txResult.error);
            //     throw new Error(`Failed to execute reject transaction: ${txResult.error.message}`);
            // }

            // --- Perform updates (ideally in a transaction, but separate for now) ---
            
            // 3. Update Project Table with reverted state
            console.log(`Updating project ${projectId} with reverted semantic email and HTML.`);
            const { error: updateError } = await supabase
                .from('projects')
                .update({
                    semantic_email: revertedSemanticEmail, // Update semantic state
                    current_html: revertedHtml,          // Update HTML
                    last_edited_at: new Date().toISOString()
                })
                .eq('id', projectId);
            if (updateError) {
                // Log the error but potentially continue to update status?
                // Or throw here? Let's throw for now to indicate failure.
                console.error("Failed to update project with reverted state:", updateError);
                throw new Error(`Failed to update project with reverted state: ${updateError.message}`);
            }

            // 4. Update Pending Changes Status (after successful project update)
            console.log(`Updating status to 'rejected' for ${pendingChangeIds.length} changes.`);
            const { error: statusUpdateError } = await supabase
                .from('pending_changes')
                .update({ status: 'rejected' })
                .in('id', pendingChangeIds);
            if (statusUpdateError) {
                // If this fails, the content is reverted, but overlays might still show?
                // Log the error but don't throw, consider the main action successful.
                console.error(`Failed to update pending changes status to rejected: ${statusUpdateError.message}`);
                message = `Successfully rejected ${pendingChangeIds.length} changes. Project content reverted, but failed to update change status.`;
            } else {
                 message = `Successfully rejected ${pendingChangeIds.length} pending changes. Project content reverted.`;
            }

        } else {
            throw new Error("Invalid action specified.");
        }

        // --- Return Success Response --- 
        return new Response(
            JSON.stringify({ message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        console.error('Error in manage-pending-changes function:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
        return new Response(
            JSON.stringify({ error: errorMessage, message: `Error processing request: ${errorMessage}` }),
            {
                status: errorMessage.includes("Missing required fields") || errorMessage.includes("not found") ? 400 : 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
        );
    }
}); 