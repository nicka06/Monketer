import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
// import {
//     EmailTemplate, // V1 - likely removable
//     EmailSection, // V1 - Needed for applying changes, ensure V2 logic uses V2 types
//     EmailElement, // V1 - Needed for applying changes, ensure V2 logic uses V2 types
//     PendingChangeInput,
//     corsHeaders,
//     // EmailVersion // Might need later for snapshotting
//     PendingChange
// } from '../_shared/types.ts'; // V1 shared types - INCORRECT PATH CAUSING DEPLOY ERROR

import type { PendingChangeInput, PendingChange } from '../_shared/types/pendingChangeTypes.ts';
import { corsHeaders } from '../_shared/cors.ts';
// TODO: If EmailTemplate, EmailSection, EmailElement are still needed for V1 logic within this function,
// they need to be correctly typed or imported from their V1 source, or the logic updated to V2.
// For now, assuming the core logic has transitioned or will transition to V2 types for these.

// Placeholder V1 types to allow compilation - TODO: Refactor to V2 or remove V1 logic
type EmailTemplate = any;
type EmailSection = any;
type EmailElement = any;

// Import shared HTML generator
// import { generateHtmlFromSemantic } from '../_shared/html-utils.ts'; // Commented out as file not found

// Type definition for the structure expected in old_content for 'delete' changes
// This might already be defined in types.ts - if so, remove this definition
// and ensure it's imported correctly above.
interface DeletedElementInfo extends EmailElement {
    originalSectionId?: string; // Ensure this is populated by the diff function
}

// --- START NEW LOCAL V1 HTML GENERATOR ---
function generateBasicV1HtmlLocal(semanticEmail: EmailTemplate): string {
    if (!semanticEmail || !Array.isArray(semanticEmail.sections)) {
        console.warn("[generateBasicV1HtmlLocal] Invalid or empty semanticEmail input.");
        return '<html><body>Error: Invalid email data for HTML generation.</body></html>';
    }

    let html = '<html><head><style>';
    // Basic global styles (if any were defined directly on V1 template, though not standard)
    // html += semanticEmail.globalStyles || ''; 
    html += 'body { margin: 0; padding: 0; font-family: sans-serif; } ';
    html += '.section { box-sizing: border-box; width: 100%; } ';
    html += '.element { padding: 5px; margin: 5px 0; } '; // Basic spacing for elements
    html += '</style></head><body>';
    
    html += `<table role="presentation" style="width:100%; border-collapse:collapse; border:0; border-spacing:0; background:#ffffff;">
        <tr>
            <td align="center" style="padding:0;">
                <table role="presentation" class="email-container" style="width:100%; max-width:602px; border-collapse:collapse; border:0; border-spacing:0; text-align:left; background-color:${semanticEmail.globalStyles?.bodyBackgroundColor || '#ffffff'};">`;

    semanticEmail.sections.forEach((section: EmailSection) => {
        let sectionStyles = '';
        if (section.styles && typeof section.styles === 'object') {
            sectionStyles = Object.entries(section.styles)
                .map(([k, v]) => `${k.replace(/([A-Z])/g, '$1').toLowerCase()}:${v};`)
                .join('');
        }
        html += `<div id="${section.id || 'sec_' + crypto.randomUUID().substring(0,8)}" class="section" style="${sectionStyles}">`;
        
        if (Array.isArray(section.elements)) {
            section.elements.forEach((element: EmailElement) => {
                let elementStyles = '';
                if (element.styles && typeof element.styles === 'object') {
                    elementStyles = Object.entries(element.styles)
                        .map(([k, v]) => `${k.replace(/([A-Z])/g, '$1').toLowerCase()}:${v};`)
                        .join('');
                }
                html += `<div id="${element.id || 'el_' + crypto.randomUUID().substring(0,8)}" class="element" style="position:relative; ${elementStyles}">`;
                
                const content = element.content || '';
                switch(element.type) {
                    case 'header': html += `<h2>${content}</h2>`; break;
                    case 'text': html += `<p>${content}</p>`; break;
                    case 'button': html += `<button>${content}</button>`; break;
                    case 'image': html += `<img src="${content}" alt="Image" style="max-width: 100%; height: auto;" />`; break;
                    case 'divider': html += '<hr />'; break;
                    case 'spacer': html += '<div style="height: 20px;"></div>'; break; // Basic spacer
                    default: html += `<div>Unsupported element type: ${element.type} - Content: ${content}</div>`;
                }
                html += '</div>';
            });
        }
        html += '</div>';
    });

    html += '</table></td></tr></table>';
    html += '</body></html>';
    return html;
}
// --- END NEW LOCAL V1 HTML GENERATOR ---

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
        const { data: pendingChangesData, error: changesError } = await supabase
            .from('pending_changes')
            .select('*') // Select all fields needed for revert logic
            .eq('project_id', projectId)
            .eq('status', 'pending')
            .order('created_at', { ascending: true }); // Order is important for applying revert correctly

        if (changesError) {
            throw new Error(`Failed to fetch pending changes: ${changesError.message}`);
        }
        const pendingChanges = pendingChangesData as PendingChange[] || []; // Type assertion

        if (pendingChanges.length === 0) {
            return new Response(JSON.stringify({ message: "No pending changes found." }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            });
        }

        // --- Process Action ---
        if (action === 'accept') {
            console.log(`Processing ACCEPT action for project ${projectId}`);
            // 1. Update Pending Changes Status
            const pendingChangeIds = pendingChanges.map(c => c.id);
            console.log(`Updating status to 'accepted' for ${pendingChangeIds.length} changes.`);
            const { error: updateStatusError } = await supabase
                .from('pending_changes')
                .update({ status: 'accepted' })
                .in('id', pendingChangeIds);

            if (updateStatusError) {
                throw new Error(`Failed to update pending change status: ${updateStatusError.message}`);
            }

            // 2. Create New Version Snapshot
            const nextVersionNumber = currentVersion + 1;
            console.log(`Creating version snapshot ${nextVersionNumber} for project ${projectId}`);
            const { error: saveVersionError } = await supabase
                .from('email_versions')
                .insert({
                    project_id: projectId,
                    version_number: nextVersionNumber,
                    content: currentSemanticEmail, // Snapshot the *current* accepted state
                    created_at: new Date().toISOString()
                });

            if (saveVersionError) {
                // Log error but maybe don't fail the whole operation?
                console.error("Failed to save email version snapshot:", saveVersionError);
                // Decide if this should be a critical failure or just a warning
                // For now, we'll continue but log it.
            }

            // 3. Update Project Version Number (after successful status update and version attempt)
            const { error: updateProjectVersionError } = await supabase
                 .from('projects')
                 .update({ version: nextVersionNumber, last_edited_at: new Date().toISOString() })
                 .eq('id', projectId);
                 
            if (updateProjectVersionError) {
                console.error("Failed to update project version number:", updateProjectVersionError);
                // This is less critical than the version snapshot failing, maybe log and continue
            }

            return new Response(JSON.stringify({ message: `Accepted ${pendingChanges.length} changes. Project version updated to ${nextVersionNumber}.` }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            });

        } else if (action === 'reject') {
            console.log(`Processing REJECT action for project ${projectId}`);
            // 1. Revert Semantic Email in Memory
            console.log("Calculating reverted semantic email...");
            const revertedSemanticEmail = applyRevert(currentSemanticEmail, pendingChanges);
            console.log("Reverted semantic email calculated.");

            // 2. Regenerate HTML from Reverted State
            console.log("Regenerating HTML from reverted state...");
            const revertedHtml = generateBasicV1HtmlLocal(revertedSemanticEmail);
            console.log("Regenerated HTML from reverted state (using local basic V1 generator).");

            // 3. Call the database function to perform updates atomically
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
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            });

        } else {
            // Should not happen based on initial check, but good practice
            throw new Error(`Invalid action specified: ${action}`);
        }

    } catch (error) {
        console.error('Error in manage-pending-changes:', error);
        // Include CORS headers in error responses too
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400, // Or 500 for internal errors
        });
    }
}); 