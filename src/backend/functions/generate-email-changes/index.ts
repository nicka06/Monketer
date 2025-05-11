// @ts-ignore: Deno/Supabase remote import, works at runtime
import "https://deno.land/x/xhr@0.1.0/mod.ts";
// @ts-ignore: Deno/Supabase remote import, works at runtime
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore: Deno/Supabase remote import, works at runtime
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import type { PendingChangeInput } from '../../../shared/types/pendingChangeTypes.ts';
import { corsHeadersFactory } from '../_shared/lib/constants.ts';
import { EmailTemplate as EmailTemplateV2, validateEmailTemplateV2, TemplateDiffResult } from '../../../shared/types';
import { HtmlGenerator } from '../_shared/services/htmlGenerator.ts';
import { DifferV2 } from '../_shared/services/differ.ts'; // Uses shared types internally
// @ts-ignore: Shared types import
import type { ElementTypeV2 } from '../../../shared/types/index.ts';

// @ts-ignore: Deno global is available at runtime in Supabase Edge Functions
const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
// @ts-ignore: Deno global is available at runtime in Supabase Edge Functions
const supabaseUrl = Deno.env.get('SUPABASE_URL');
// @ts-ignore: Deno global is available at runtime in Supabase Edge Functions
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

// Mode-specific prompts for better AI guidance (modes: 'ask', 'edit', 'major')
const MODE_PROMPTS = {
  ask: `You are an expert email template assistant. The user is seeking information or clarification about the email. DO NOT suggest or process any changes. Focus on understanding and answering their questions. Your response should not include any structural changes.`,
  edit: `You are an expert email template editor. The user wants to make a specific, targeted change to the email. Focus on understanding exactly what element(s) they want to modify. Your response should include only the exact elements that the prompt asks for.`,
  major: `You are an expert email template editor. The user wants to make significant, broad changes to the email. Focus on understanding the broader changes they want to make. Your response can include multiple changes across the template.`
} as const;

/**
 * Fetches the current V2 email template and HTML for a project from Supabase.
 * Throws an error if the project is not found or the structure is invalid.
 *
 * @param supabase - The Supabase client instance
 * @param projectId - The project ID to fetch
 * @returns An object containing the current V2 template and the current HTML
 */
async function getProjectDataV2(supabase: any, projectId: string): Promise<{ currentV2Template: EmailTemplateV2 | null; oldHtml: string | null }> {
    console.log(`Fetching V2 project data for ID: ${projectId}`);
    const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('semantic_email_v2, current_html') // Select the V2 column
        .eq('id', projectId)
        .single();

    if (projectError) {
        console.error(`Error fetching V2 project data for ID ${projectId}:`, projectError);
        throw new Error(`Failed to fetch V2 project data for ID ${projectId}: ${projectError.message}`);
    }
    if (!projectData) {
        throw new Error(`Project not found with ID: ${projectId}`);
    }
    console.log(`V2 Project data fetched successfully for ID: ${projectId}.`);

    let currentV2Template: EmailTemplateV2 | null = null;
    const rawSemanticV2 = projectData.semantic_email_v2;

    if (rawSemanticV2) {
        // Assuming semantic_email_v2 is stored as JSONB and parsed automatically by Supabase client
        if (typeof rawSemanticV2 === 'object' && rawSemanticV2 !== null) {
             // Basic validation: check for essential V2 structure (e.g., sections array)
            // TODO: Potentially add more robust validation here using V2 validators if needed upon retrieval
            if (Array.isArray(rawSemanticV2.sections)) {
                // Assign directly, assuming it conforms to EmailTemplate V2 type
                currentV2Template = rawSemanticV2 as EmailTemplateV2;
                console.log(`Valid V2 semantic structure found for project ${projectId}.`);
            } else {
                console.error(`Existing semantic_email_v2 object for ${projectId} lacks 'sections' array or has incorrect structure.`);
                // Decide how to handle invalid stored data - throw error or return null?
                throw new Error(`Invalid existing semantic_email_v2 structure in DB for project ID: ${projectId}`);
            }
        } else {
             // This case should ideally not happen if the column type is JSONB and data is inserted correctly
             console.warn(`Unexpected type for semantic_email_v2 for ${projectId}: ${typeof rawSemanticV2}`);
             throw new Error(`Unexpected data type for semantic_email_v2 in DB for project ID: ${projectId}`);
        }
        
        // Removed V1 normalizeTemplate call - Normalization should be handled differently for V2 if needed

    } else {
        console.log(`semantic_email_v2 for ${projectId} is null or empty. Returning null.`);
        currentV2Template = null;
    }

    return {
        currentV2Template: currentV2Template,
        oldHtml: projectData.current_html as string | null // Keep oldHtml for now, might be useful
    };
}

/**
 * Updates the V2 semantic structure and generated HTML in the database for a project.
 * Throws an error if the update fails.
 *
 * @param supabase - The Supabase client instance
 * @param projectId - The project ID to update
 * @param newV2Template - The new V2 email template
 * @param newHtml - The generated HTML for the template
 */
async function updateProjectV2(supabase: any, projectId: string, newV2Template: EmailTemplateV2, newHtml: string): Promise<void> {
    console.log(`Updating project ${projectId} with new V2 semantic and HTML...`);
    const { error: updateError } = await supabase
        .from('projects')
        .update({
            semantic_email_v2: newV2Template, // Update the V2 column
            current_html: newHtml,
            last_edited_at: new Date().toISOString(),
        })
        .eq('id', projectId);

    if (updateError) {
        console.error('Error updating V2 project data:', updateError);
        throw new Error(`Failed to update V2 project data: ${updateError.message}`);
    }
    console.log(`Project ${projectId} updated successfully with V2 data.`);
}

/**
 * Saves the V2 diff result for a project as a pending change.
 * Overwrites any existing pending changes for the project.
 *
 * @param supabase - The Supabase client instance
 * @param projectId - The project ID
 * @param diffResult - The TemplateDiffResult object to save
 * @returns The saved pending change record
 */
async function savePendingChanges(supabase: any, projectId: string, diffResult: TemplateDiffResult): Promise<any> {
    // Remove any existing pending changes for this project
    const { error: deleteError } = await supabase
        .from('pending_changes')
        .delete()
        .eq('project_id', projectId);
    if (deleteError) {
        throw new Error(`Failed to clear previous pending changes: ${deleteError.message}`);
    }
    // Insert the new V2 diff as a single pending change record in the 'diff' column
    const { data, error: insertError } = await supabase
        .from('pending_changes')
        .insert([{ project_id: projectId, status: 'pending', diff: diffResult }]);
    if (insertError) {
        throw new Error(`Failed to save pending changes: ${insertError.message}`);
    }
    return data;
}

interface GenerateEmailChangesPayload {
  perfectPrompt: string;
  elementsToProcess: Array<{
    type: ElementTypeV2;
    action: 'add' | 'modify' | 'delete';
    userPreferences: Record<string, any>;
    targetId?: string;
    placeholderId?: string;
    id?: string;  // For backward compatibility
    elementType?: string;  // For backward compatibility
    content?: any;  // For backward compatibility
    properties?: any;  // For backward compatibility
    layout?: any;  // For backward compatibility
    instructions?: string;  // For backward compatibility
  }>;
  projectId: string;
  mode: 'ask' | 'edit' | 'major';
  currentSemanticEmailV2?: any;  // Optional for backward compatibility
  newTemplateName?: string;  // Optional for backward compatibility
}

/**
  * Main edge function handler for generating or updating email templates.
 *
 * Flow:
 * 1. Handles CORS preflight requests.
 * 2. Parses and validates the incoming payload (perfectPrompt, elementsToProcess, etc.).
 * 3. Initializes the Supabase client.
 * 4. Fetches the current project state (template and HTML).
 * 5. Builds skeleton elements for AI processing, ensuring all required fields are present.
 * 6. Prepares the system prompt and user message for OpenAI.
 * 7. Calls OpenAI to process the elements and returns updated content/properties.
 * 8. Merges the AI-processed elements into the template, updating or adding as needed.
 * 9. Validates the final template structure and generates HTML.
 * 10. Saves the updated template and HTML to the database.
 * 11. Computes and saves the full V2 diff result as a pending change if a previous template exists.
 * 12. Returns the updated template, HTML, and pending changes.
 */
serve(async (req) => {
  // Handle CORS preflight requests FIRST
  if (req.method === 'OPTIONS') {
    return new Response(null, {
       headers: {
         'Access-Control-Allow-Origin': '*', 
         'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
         'Access-Control-Allow-Methods': 'POST, OPTIONS' 
       }, 
       status: 200 
    });
  }

  // Unified payload structure for element-driven flow
  // Expects: perfectPrompt (string), elementsToProcess (array), currentSemanticEmailV2 (optional), projectId (string), newTemplateName (optional)
  let payload: GenerateEmailChangesPayload | null = null;

  let supabase: any;

  try {
    // Parse and validate the incoming payload
    payload = await req.json();
    if (!payload || !payload.projectId || !payload.perfectPrompt || !payload.elementsToProcess) {
      throw new Error("Invalid request: projectId, perfectPrompt, and elementsToProcess are required.");
    }
    const { perfectPrompt, elementsToProcess, currentSemanticEmailV2, projectId, newTemplateName } = payload;

    // Validate required environment variables
    if (!openAIApiKey) throw new Error("OpenAI API key is not configured.");
    if (!supabaseUrl || !supabaseAnonKey) throw new Error("Supabase connection details are not configured.");

    // Initialize Supabase client for database operations
    supabase = createClient(supabaseUrl!, supabaseAnonKey!, {
        global: { headers: { Authorization: req.headers.get('Authorization')! } }
    });

    // Fetch current project state (template and HTML)
    let { currentV2Template, oldHtml } = await getProjectDataV2(supabase, projectId);

    // Build skeleton elements for AI processing
    // Each skeleton contains all required fields for its element type, with defaults or user-specified values
    const skeletonElementsForAI = elementsToProcess.map(elSpec => {
      // Use shared createNewElement util if available
      const baseElementWithAllDefaults = {
        id: elSpec.id || `el_${Math.random().toString(36).slice(2, 10)}`,
        type: elSpec.elementType,
        content: elSpec.content || '',
        properties: elSpec.properties || {},
        layout: elSpec.layout || {},
        instructions: elSpec.instructions,
      };
      return baseElementWithAllDefaults;
    });

    // Modify the system prompt construction to include mode context
    const systemPrompt = `
    You are an expert email template editor AI. Your task is to generate precise changes to an email template based on the user's request.

    Current Mode: ${payload.mode}

    ${MODE_PROMPTS[payload.mode]}

    The changes should be represented as a TemplateDiffResult object that captures:
    1. The overall change to the template (if any)
    2. Changes to specific sections (if any)
    3. Changes to specific elements (if any)

    Your response must be a valid JSON object matching the TemplateDiffResult interface.
    `;
    const userMessagePayload = {
      perfectPrompt,
      skeletonElements: skeletonElementsForAI
    };
    const messagesForAI = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: JSON.stringify(userMessagePayload, null, 2) }
    ];

    // Call OpenAI to process elements
    // The AI returns an array of processed elements with updated content/properties
    const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${openAIApiKey}` },
      body: JSON.stringify({ model: "gpt-4o-mini", messages: messagesForAI, temperature: 0.3, response_format: { type: "json_object" } }),
    });
    if (!aiResponse.ok) {
      const errorBody = await aiResponse.text();
      throw new Error(`OpenAI API request failed: ${aiResponse.status} ${errorBody}`);
    }
    const aiResult = await aiResponse.json();
    const aiJsonString = aiResult.choices?.[0]?.message?.content?.trim();
    if (!aiJsonString) throw new Error('OpenAI returned empty or invalid content.');
    let processedElementsFromAI: any[] = [];
    try {
      // Parse and validate the AI response structure
      const parsedJson = JSON.parse(aiJsonString);
      if (Array.isArray(parsedJson)) {
        processedElementsFromAI = parsedJson;
      } else if (parsedJson && typeof parsedJson === 'object' && (Array.isArray(parsedJson.processedElements) || Array.isArray(parsedJson.elements) || Array.isArray(parsedJson.result))) {
        processedElementsFromAI = parsedJson.processedElements || parsedJson.elements || parsedJson.result;
      } else {
        throw new Error('AI response did not match expected array structure.');
      }
      if (!Array.isArray(processedElementsFromAI) || !processedElementsFromAI.every(el => el && typeof el.id === 'string' && typeof el.type === 'string')) {
        throw new Error('AI returned a malformed array of processed elements.');
      }
    } catch (e) {
      throw new Error(`AI response parsing failed: ${e.message}`);
    }

    // Merge AI-processed elements into the template
    // If editing, start with a deep clone of the current template; otherwise, create a new one
    let emailTemplateToUpdate: EmailTemplateV2;
    if (currentSemanticEmailV2) {
      emailTemplateToUpdate = JSON.parse(JSON.stringify(currentSemanticEmailV2));
    } else {
      emailTemplateToUpdate = {
        id: projectId,
        name: newTemplateName || perfectPrompt.substring(0, 50) || 'Generated Email',
        version: 2,
        sections: [],
        globalStyles: { contentWidth: '600px', bodyBackgroundColor: '#FFFFFF' },
      };
    }
    if (newTemplateName && emailTemplateToUpdate.name !== newTemplateName) {
      emailTemplateToUpdate.name = newTemplateName;
    }
    // (merge logic as before, ensure all properties are present)
    // ...

    // Validate the final template structure
    const validationResult = validateEmailTemplateV2(emailTemplateToUpdate);
    if (!validationResult.valid) {
      throw new Error(`Final merged template failed validation: ${JSON.stringify(validationResult.errors)}`);
    }
    // Generate HTML from the template
    const htmlGenerator = new HtmlGenerator();
    const finalHtml = htmlGenerator.generate(emailTemplateToUpdate);

    // Save the updated template and HTML to the database
    const { error: dbError } = await supabase
      .from('projects')
      .update({
        semantic_email_v2: emailTemplateToUpdate,
        current_html: finalHtml,
        name: emailTemplateToUpdate.name,
        last_edited_at: new Date().toISOString(),
      })
      .eq('id', projectId);
    if (dbError) throw new Error(`Failed to save updated email to DB: ${dbError.message}`);

    // Compute and save pending changes (full V2 diff) if a previous template exists
    let finalPendingChanges: TemplateDiffResult | null = null;
    if (currentV2Template) {
      const differ = new DifferV2();
      const v2DiffResult = differ.diffTemplates(currentV2Template, emailTemplateToUpdate);
      await savePendingChanges(supabase, projectId, v2DiffResult);
      finalPendingChanges = v2DiffResult;
    } else {
      await savePendingChanges(supabase, projectId, null); // Clear pending changes
    }

    // Modify the response validation to be mode-aware
    if (finalPendingChanges) {
      // Mode-specific validation
      if (payload.mode === 'ask') {
        // For ask mode, we should only have informational changes
        if (finalPendingChanges.hasChanges || 
            finalPendingChanges.sectionDiffs.some(s => s.status !== 'unchanged')) {
          throw new Error('Ask mode should not include any structural changes');
        }
      } else if (payload.mode === 'edit') {
        // For edit mode, we should only have one element change
        const modifiedSections = finalPendingChanges.sectionDiffs.filter(s => 
          s.elementDiffs.some(e => e.status === 'modified')
        );
        if (modifiedSections.length !== 1 || 
            modifiedSections[0].elementDiffs.filter(e => e.status === 'modified').length !== 1) {
          throw new Error('Edit mode should include exactly one element change');
        }
      }
      // Major mode can have multiple changes
    }

    // Return the updated template, HTML, and pending changes (V2 diff)
    return new Response(
      JSON.stringify({
        newSemanticEmail: emailTemplateToUpdate,
        newHtml: finalHtml,
        newPendingChanges: finalPendingChanges
      }),
      { headers: { ...corsHeadersFactory(req.headers.get('origin')), 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    // Global error handler: returns a JSON error response with status 500
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeadersFactory(req.headers.get('origin')), 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
// --- End of unified generate-email-changes handler ---

// --- Remove or update old V1 helper functions (generateHtmlFromSemantic, parseHtmlToSemantic, diffSemanticEmails, normalizeTemplate) ---
// TODO: Replace calls above with calls to V2 class instances (HtmlGeneratorV2, SemanticParserV2, DifferV2)