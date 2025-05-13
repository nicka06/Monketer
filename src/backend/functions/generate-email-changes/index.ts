// @ts-ignore: Deno/Supabase remote import, works at runtime
import "https://deno.land/x/xhr@0.1.0/mod.ts";
// @ts-ignore: Deno/Supabase remote import, works at runtime
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore: Deno/Supabase remote import, works at runtime
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import type { PendingChangeInput } from '@shared/types/pendingChangeTypes.ts';
import { corsHeadersFactory } from '../_shared/lib/constants.ts';
import { EmailTemplate as EmailTemplateV2, validateEmailTemplateV2, TemplateDiffResult, EmailElement, ElementType as ElementTypeV2 } from '@shared/types/index.ts';
import { HtmlGenerator } from '../_shared/services/htmlGenerator.ts';
import { DifferV2 } from '../_shared/services/differ.ts'; // Uses shared types internally
// @ts-ignore: Shared types import
// import type { ElementTypeV2 } from '@shared/types/index.ts'; // Redundant if imported from shared/types
import { elementDefaults } from '@shared/types/config/elementDefaults.ts';
import { generateId } from '@shared/lib/uuid.ts';

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

    // Conditionally define the system prompt
    let systemPrompt = "";
    const modePromptSegment = MODE_PROMPTS[payload.mode] || MODE_PROMPTS['edit']; // Default to 'edit'
    // Define the schema rules as a separate string for clarity
    const schemaRules = "\nImportant Schema Rules:\n\n" +
                        "1. Every element MUST have a top-level `content` field. Ensure this field contains appropriate text (e.g., button text, alt text for images/icons, paragraph text) or an empty string '' if no specific text is generated or applicable.\n\n" +
                        "2. For optional string fields (like image `height`, `linkHref`, `videoHref`, or border properties like `width`, `style`, `color`, `radius`), if a value is not applicable or unknown, OMIT the field entirely from the JSON instead of setting it to `null`. The schema expects `string | undefined`, not `string | null`.\n";
    if (currentV2Template) {
        // Editing an existing template
        systemPrompt = "You are an expert email template editor AI.\n" +
                       `Current Mode: ${payload.mode}\n` +
                       `${modePromptSegment}\n\n` +
                       "Your task is to modify the provided \"currentEmailTemplate\" based on the user's \"perfectPrompt\" and \"elementsToProcess\".\n" +
                       "Your response MUST be a valid JSON object representing the *complete, modified EmailTemplateV2 structure*.\n" +
                       "Do not return only the changed parts; return the entire template with modifications applied.\n" +
                       "Ensure your response strictly adheres to the EmailTemplateV2 interface.\n" +
                       schemaRules;
    } else {
        // Creating a new template
        // Define the example structure as a separate string
        const exampleStructure = "Example of the expected EmailTemplateV2 structure (ensure all elements have complete properties and follow the rules above):\n" +
                               "{\n" +
                               `  \"id\": \"${projectId}\",\n` + // Use projectId here
                               "  \"name\": \"New Email Template\",\n" +
                               "  \"version\": 2,\n" +
                               "  \"globalStyles\": { \"bodyBackgroundColor\": \"#FFFFFF\", \"contentWidth\": \"600px\" },\n" +
                               "  \"sections\": [\n" +
                               "    {\n" +
                               "      \"id\": \"sec_unique_id_1\",\n" +
                               "      \"styles\": { \"padding\": {\"top\": \"10px\", \"bottom\": \"10px\"} },\n" +
                               "      \"elements\": [\n" +
                               "        {\n" +
                               "          \"id\": \"el_unique_id_1\",\n" +
                               "          \"type\": \"text\",\n" +
                               "          \"content\": \"Element content here...\", // MUST exist, even if ''\n" +
                               "          \"layout\": { \"align\": \"center\", \"padding\": {\"top\": \"5px\", \"bottom\": \"5px\"} },\n" +
                               "          \"properties\": {\n" +
                               "            \"text\": \"Full text for text-based elements\",\n" +
                               "            \"typography\": {\n" +
                               "                \"fontFamily\": \"Arial, sans-serif\",\n" +
                               "                \"fontSize\": \"16px\",\n" +
                               "                \"fontWeight\": \"normal\",\n" +
                               "                \"fontStyle\": \"normal\",\n" +
                               "                \"color\": \"#000000\",\n" +
                               "                \"textAlign\": \"left\",\n" +
                               "                \"lineHeight\": \"1.5\"\n" +
                               "            }\n" +
                               "          }\n" +
                               "        }\n" +
                               "      ]\n" +
                               "    }\n" +
                               "  ]\n" +
                               "}\n";

        systemPrompt = "You are an expert email template generator AI.\n" +
                       `Current Mode: ${payload.mode} - Treat this as a request to generate a new email from scratch.\n` +
                       `${modePromptSegment}\n\n` +
                       "Your task is to create a brand new email template based on the user's \"perfectPrompt\" and \"elementsToProcess\".\n" +
                       "Your response MUST be a valid JSON object representing the *complete EmailTemplateV2 structure*.\n" +
                       "All element properties, including typography, layout, and specific style attributes (like colors, fonts, padding, alignment), MUST be fully defined according to the EmailTemplateV2 interface and elementDefaults. Do not omit any required fields unless explicitly allowed by the schema (see rules below).\n" +
                       schemaRules + "\n\n" + // Add newline after rules
                       exampleStructure + "\n\n" + // Add newline after example
                       "Ensure your response strictly adheres to this EmailTemplateV2 interface and the schema rules, filling in all required fields for each element based on its type (referencing elementDefaults for guidance on required properties).\n";
                       // Note: The last part of the prompt including the projectId was part of the exampleStructure string now.
    }

    const userMessagePayload: any = {
      perfectPrompt: payload.perfectPrompt,
      elementsToProcess: skeletonElementsForAI,
    };

    if (currentV2Template) {
        userMessagePayload.currentEmailTemplate = currentV2Template;
    }
    // END OF NEW PROMPT LOGIC

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
    
    let parsedJson: any; // Declare parsedJson here to ensure it is in scope
    try {
      parsedJson = JSON.parse(aiJsonString); // Assign here
    } catch (e) {
      console.error("Raw AI response string:", aiJsonString); // Log raw string on parse error
      throw new Error(`AI response JSON parsing failed: ${e.message}`);
    }

    // ** Define a simple deep merge utility (ensure it's defined before use) **
    function simpleDeepMerge(target: any, source: any): any {
      const output = { ...target };
      if (isObject(target) && isObject(source)) {
        Object.keys(source).forEach(key => {
          if (isObject(source[key])) {
            if (!(key in target)) {
              Object.assign(output, { [key]: source[key] });
            } else {
              output[key] = simpleDeepMerge(target[key], source[key]);
            }
          } else {
            Object.assign(output, { [key]: source[key] });
          }
        });
      }
      return output;
    }
    function isObject(item: any): boolean {
      return (item && typeof item === 'object' && !Array.isArray(item));
    }

    // ** START: MERGE AI RESPONSE WITH DEFAULTS **
    let templateToProcess: EmailTemplateV2;

    if (parsedJson && parsedJson.sections && Array.isArray(parsedJson.sections)) {
      // AI returned something that looks like a full template structure
      templateToProcess = parsedJson as EmailTemplateV2;
      console.log("AI returned a potential full template structure. Merging elements with defaults...");
    } else if (currentSemanticEmailV2 && Array.isArray(parsedJson)) {
      // AI returned an array of elements, and we have an existing template to merge into.
      // This assumes `parsedJson` is `processedElementsFromAI` in this scenario.
      console.warn("AI returned an array of elements. Attempting to merge into existing template.");
      templateToProcess = JSON.parse(JSON.stringify(currentSemanticEmailV2)); // Deep clone existing
      const aiProcessedElements = parsedJson as any[];

      // Simplistic merge: find section (e.g., first one) and replace/add elements
      // More sophisticated logic would be needed to handle target sections/positions based on AI instructions
      if (templateToProcess.sections.length === 0) { 
        templateToProcess.sections.push({ id: `sec_${generateId()}`, elements: [], styles: {} });
      }
      const targetSection = templateToProcess.sections[0]; // Example: merge into the first section
      
      aiProcessedElements.forEach(aiEl => {
        const existingElIndex = targetSection.elements.findIndex(e => e.id === aiEl.id);
        if (existingElIndex > -1) {
          targetSection.elements[existingElIndex] = aiEl; // Replace existing
        } else {
          targetSection.elements.push(aiEl); // Add as new
        }
      });
    } else {
      console.error("AI response was not a full template nor an array of elements to merge with an existing template.", parsedJson);
      throw new Error("AI response structure is not processable for merging defaults.");
    }

    // Now merge elements within templateToProcess with defaults
    templateToProcess.sections.forEach(section => {
      if(Array.isArray(section.elements)) {
          section.elements = section.elements.map((aiElement: any) => {
              const elementType = aiElement.type as ElementTypeV2 | undefined;
              if (!elementType || !(elementType in elementDefaults)) {
                  console.warn(`Skipping element merge: Unknown or missing type for element ID ${aiElement.id}. Type: ${elementType}`);
                  return aiElement; // Return unmodified if type is invalid
              }
              
              const defaultElementConfig = JSON.parse(JSON.stringify(elementDefaults[elementType]));
              let mergedElement = { ...defaultElementConfig }; // Start with defaults

              // Merge layout first
              mergedElement.layout = simpleDeepMerge(defaultElementConfig.layout || {}, aiElement.layout || {});
              
              // Merge properties
              mergedElement.properties = simpleDeepMerge(defaultElementConfig.properties || {}, aiElement.properties || {});

              // Ensure required top-level fields are present from AI or defaults
              mergedElement.id = aiElement.id || generateId(); // Use shared generateId
              mergedElement.type = elementType;

              // *** START: Ensure top-level 'content' field is set ***
              // Based on logic from createNewElement
              if (aiElement.content !== undefined && aiElement.content !== null) {
                // If AI provided a top-level content, use it (might be legacy or error)
                mergedElement.content = aiElement.content;
              } else {
                // AI did not provide top-level content, generate default
                switch (elementType) {
                  case 'header':
                  case 'text':
                  case 'subtext':
                  case 'quote':
                  case 'previewText':
                    mergedElement.content = mergedElement.properties.text || ''; // Use property text or empty string
                    break;
                  case 'button':
                    mergedElement.content = 'Click Me'; // Default button text
                    break;
                  case 'image':
                    mergedElement.content = mergedElement.properties.image?.alt || ''; // Use alt text or empty
                    break;
                  case 'icon':
                    mergedElement.content = mergedElement.properties.icon?.alt || ''; // Use alt text or empty
                    break;
                  case 'code':
                    mergedElement.content = mergedElement.properties.code || ''; // Use code property or empty
                    break;
                  case 'unsubscribe':
                    mergedElement.content = mergedElement.properties.link?.text || 'Unsubscribe';
                    break;
                  case 'preferences':
                    mergedElement.content = mergedElement.properties.link?.text || 'Manage Preferences';
                    break;
                  case 'list':
                    mergedElement.content = mergedElement.properties.items?.join(', ') || ''; // Join items or empty
                    break;
                  // For types without inherent text content, use empty string
                  default:
                    mergedElement.content = '';
                }
              }
              // Ensure content is never null or undefined (use empty string instead)
              if (mergedElement.content === null || mergedElement.content === undefined) {
                  mergedElement.content = '';
              }
              // *** END: Ensure top-level 'content' field is set ***

              // *** START: Convert nulls to undefined for optional string properties ***
              // Required to pass Zod validation which expects string | undefined, not string | null
              if (mergedElement.properties) {
                  // Example for image properties
                  if (mergedElement.properties.image) {
                      if (mergedElement.properties.image.height === null) mergedElement.properties.image.height = undefined;
                      if (mergedElement.properties.image.linkHref === null) mergedElement.properties.image.linkHref = undefined;
                      if (mergedElement.properties.image.videoHref === null) mergedElement.properties.image.videoHref = undefined;
                      // Check nested border properties if they exist
                      if (mergedElement.properties.border) {
                        if (mergedElement.properties.border.width === null) mergedElement.properties.border.width = undefined;
                        if (mergedElement.properties.border.style === null) mergedElement.properties.border.style = undefined;
                        if (mergedElement.properties.border.color === null) mergedElement.properties.border.color = undefined;
                        if (mergedElement.properties.border.radius === null) mergedElement.properties.border.radius = undefined;
                      }
                  }
                  // Add checks for other properties that might receive null from AI if needed
              }
              // *** END: Convert nulls to undefined ***

              // Original attempt to map aiElement.content (KEEP this for backward compatibility/edge cases?)
              if (aiElement.content && typeof aiElement.content === 'string' && !mergedElement.properties.text) {
                  if (elementType === 'header' || elementType === 'text' || elementType === 'subtext') {
                      mergedElement.properties.text = aiElement.content;
                  }
              }
              
              return mergedElement as EmailElement;
          });
      }
    });
    // ** END: MERGE AI RESPONSE WITH DEFAULTS **

    // Determine the final template to update
    let emailTemplateToUpdate: EmailTemplateV2 = templateToProcess;
    
    // If a newTemplateName is provided, update the template name
    if (newTemplateName && emailTemplateToUpdate.name !== newTemplateName) {
      emailTemplateToUpdate.name = newTemplateName;
    }
    // The original logic for creating a new template if currentSemanticEmailV2 is null
    // should effectively be handled by `templateToProcess` initialization if AI sends full structure.
    // If AI sends partial, and `currentSemanticEmailV2` is null, the above logic for `templateToProcess` would throw.
    // This might need refinement: if `currentSemanticEmailV2` is null AND AI sends partial, we might need to construct a base template.
    // For now, we rely on `templateToProcess` being correctly formed or an error being thrown.

    // Validate the final template structure
    // console.log("Validating final merged template:", JSON.stringify(emailTemplateToUpdate, null, 2)); // Debugging log
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