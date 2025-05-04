import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
// Import shared types using relative path
import {
    // EmailTemplate, // Removed V1 import
    EmailSection, // Needed by V1 diff logic initially, now likely removable
    EmailElement, // Needed by V1 diff logic initially, now likely removable
    InteractionMode,
    PendingChangeInput,
    corsHeaders
} from '../_shared/types.ts'; // V1 shared types

// Import V2 types from _shared DIRECTLY
// import { EmailTemplate as EmailTemplateV2 } from '../_shared/types/v2/index.ts'; // Old import via barrel file
import { EmailTemplate as EmailTemplateV2 } from '../_shared/types/v2/template.ts'; // Direct import
import { validateEmailTemplate } from '../_shared/types/v2/validators.ts'; // Already direct, keep
import { TemplateDiffResult, SectionDiff, ElementDiff } from '../_shared/types/v2/diffs.ts'; // Already direct, keep

// Import V2 Services from _shared
import { HtmlGeneratorV2 } from '../_shared/services/v2/htmlGenerator.ts';
import { DifferV2 } from '../_shared/services/v2/differ.ts';

// Import V1 Utilities (TODO: Remove these and use V2 services)
/*
import { generateHtmlFromSemantic, parseHtmlToSemantic } from '../_shared/html-utils.ts'; // Need both generation and parsing
import { diffSemanticEmails } from '../_shared/diff-utils.ts'; // Import from shared file
import { normalizeTemplate } from '../_shared/normalize.ts'; // Import new normalizeTemplate
*/

// Type alias for V1 diff result (what savePendingChanges expects)
type DiffResult = Omit<PendingChangeInput, 'project_id' | 'status'>;

// Get environment variables
const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

// --- Database Interaction Helpers ---

// Fetches project data, focusing on the V2 semantic structure
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

// Updates the V2 semantic structure and generated HTML in the database
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

// V1 update function - REMOVED
/*
async function updateProject(supabase: any, projectId: string, newSemanticEmail: EmailTemplate, newHtml: string): Promise<void> {
    console.log(`Updating project ${projectId} with new semantic and HTML...`);
    const { error: updateError } = await supabase
        .from('projects')
        .update({
            semantic_email: newSemanticEmail, 
            current_html: newHtml,
            last_edited_at: new Date().toISOString(),
        })
        .eq('id', projectId);

    if (updateError) {
        console.error('Error updating project:', updateError);
        throw new Error(`Failed to update project: ${updateError.message}`);
    }
    console.log(`Project ${projectId} updated successfully.`);
}
*/

async function savePendingChanges(supabase: any, projectId: string, changes: DiffResult[]): Promise<PendingChangeInput[]> {
    if (changes.length === 0) {
        console.log("No pending changes to save.");
        return [];
    }
    console.log(`Saving ${changes.length} pending changes for project ${projectId}...`);

    // Clear existing pending changes for this project first
    const { error: deleteError } = await supabase
        .from('pending_changes')
        .delete()
        .eq('project_id', projectId);

    if (deleteError) {
        console.error('Error clearing previous pending changes:', deleteError);
        throw new Error(`Failed to clear previous pending changes: ${deleteError.message}`);
    }
     console.log(`Previous pending changes cleared for project ${projectId}.`);

    const changesToInsert: PendingChangeInput[] = changes.map(change => ({
        ...change,
        project_id: projectId,
        status: 'pending' 
    }));

    const { error: insertError } = await supabase
        .from('pending_changes')
        .insert(changesToInsert);

    if (insertError) {
        console.error('Error saving pending changes:', insertError);
        throw new Error(`Failed to save pending changes: ${insertError.message}`);
    }
    console.log("Pending changes saved successfully.");
    return changesToInsert;
}

// --- Helper Function: Map V2 Diff Result to V1 Pending Changes Format ---
function mapV2DiffToV1PendingChanges(v2Diff: TemplateDiffResult): DiffResult[] {
    const pendingChanges: DiffResult[] = [];

    // Ignore template-level changes (name, global styles) for V1 format

    v2Diff.sectionDiffs.forEach((sectionDiff) => {
        // Determine overall change type for elements based on section status
        let sectionChangeTypeOverride: 'add' | 'delete' | null = null;
        if (sectionDiff.status === 'added') {
            sectionChangeTypeOverride = 'add';
        } else if (sectionDiff.status === 'removed') {
            sectionChangeTypeOverride = 'delete';
        }

        sectionDiff.elementDiffs.forEach((elementDiff) => {
            let changeType: 'add' | 'edit' | 'delete' | null = null;
            let oldContent: any = null;
            let newContent: any = null;

            const effectiveStatus = sectionChangeTypeOverride ?? elementDiff.status;

            switch (effectiveStatus) {
                case 'added':
                    changeType = 'add';
                    oldContent = null;
                    newContent = elementDiff.newValue; // Store the whole new element
                    break;
                case 'removed':
                    changeType = 'delete';
                    oldContent = elementDiff.oldValue; // Store the whole old element
                    newContent = null;
                    break;
                case 'modified':
                    changeType = 'edit';
                    oldContent = elementDiff.oldValue; // Store the whole old element
                    newContent = elementDiff.newValue; // Store the whole new element
                    break;
                case 'unchanged':
                    // Skip unchanged elements
                    break;
            }

            // If a change type was determined, create the PendingChangeInput object
            if (changeType && elementDiff.elementId) {
                pendingChanges.push({
                    element_id: elementDiff.elementId,
                    change_type: changeType,
                    old_content: oldContent,
                    new_content: newContent,
                });
            } else if (changeType && !elementDiff.elementId) {
                 console.warn("Skipping pending change generation for element without ID:", elementDiff);
            }
        });
    });

    console.log(`Mapped V2 diff to ${pendingChanges.length} V1 pending changes.`);
    return pendingChanges;
}

// --- Main Server Logic --- 
serve(async (req) => {
  // --- MOVE OPTIONS CHECK TO THE VERY TOP ---
  // Handle CORS preflight requests FIRST
  if (req.method === 'OPTIONS') {
    console.log("Handling OPTIONS preflight request (Top of handler)..."); 
    // Temporarily hardcode essential headers for diagnostics
    return new Response(null, {
       headers: {
         'Access-Control-Allow-Origin': '*', 
         'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
         'Access-Control-Allow-Methods': 'POST, OPTIONS' 
       }, 
       status: 200 
    });
  }

  let requestData: { 
    prompt: string; 
    chatHistory: any[]; 
    mode: InteractionMode; 
    projectId?: string; 
  } | null = null;

  let supabase: any;
  let response: Response | null = null; // For error handling access

  try {
    requestData = await req.json();
    console.log("Received request data:", requestData); 

    if (!requestData || !requestData.projectId || !requestData.mode || !['edit', 'major'].includes(requestData.mode)) {
        throw new Error("Invalid request: ProjectId and mode ('edit' or 'major') are required.");
    }
    const { prompt, chatHistory = [], mode, projectId } = requestData;

    // Validate keys
    if (!openAIApiKey) throw new Error("OpenAI API key is not configured.");
    if (!supabaseUrl || !supabaseAnonKey) throw new Error("Supabase connection details are not configured.");

    // Instantiate Supabase client
    supabase = createClient(supabaseUrl!, supabaseAnonKey!, {
        global: { headers: { Authorization: req.headers.get('Authorization')! } }
    });

    // --- Fetch Current Project State --- (Essential for the new logic)
    let { currentV2Template, oldHtml } = await getProjectDataV2(supabase, projectId);
    
    // Use the mode directly from requestData
    const currentMode = mode;
    const userMessage = prompt;
    let aiModel = "gpt-4o-mini";

    // --- Define Expected AI Response Structure --- 
    const expectedResponseFormat = `{
  "newTemplate": EmailTemplateV2, // The complete V2 EmailTemplate JSON object
  "explanation": string // A concise, user-friendly explanation of the changes made or the email created.
}`; 

    // --- Condensed V2 Type Definitions for Prompt ---
    // NOTE: Keep this reasonably concise for the prompt context length
    const v2TypeDefs = `
// --- V2 Type Definitions (Condensed) ---
type ElementType = 'header' | 'text' | 'button' | 'image' | 'divider' | 'spacer';
interface EmailGlobalStyles { bodyBackgroundColor?: string; bodyFontFamily?: string; bodyTextColor?: string; contentWidth?: string; }
interface EmailSectionStyles { backgroundColor?: string; padding?: { top?: string; right?: string; bottom?: string; left?: string; }; border?: { width?: string; style?: 'solid' | 'dashed' | 'dotted'; color?: string; }; }
interface EmailElementLayout { width?: string; height?: string; maxWidth?: string; margin?: { top?: string; right?: string; bottom?: string; left?: string; }; padding?: { top?: string; right?: string; bottom?: string; left?: string; }; align?: 'left' | 'center' | 'right'; valign?: 'top' | 'middle' | 'bottom'; }
interface BaseTypography { fontFamily?: string; fontSize?: string; fontWeight?: string; fontStyle?: 'italic' | 'normal'; color?: string; textAlign?: 'left' | 'center' | 'right'; lineHeight?: string; }
interface HeaderElementProperties { level: 'h1'|'h2'|'h3'|'h4'|'h5'|'h6'; text: string; typography?: BaseTypography; }
interface TextElementProperties { text: string; typography?: BaseTypography; }
interface ButtonElementProperties { button: { href: string; target?: '_blank' | '_self'; backgroundColor?: string; textColor?: string; borderRadius?: string; border?: string; }; typography?: { fontFamily?: string; fontSize?: string; fontWeight?: string; }; }
interface ImageElementProperties { image: { src: string; alt?: string; width?: string; height?: string; linkHref?: string; linkTarget?: '_blank' | '_self'; }; border?: { radius?: string; width?: string; style?: 'solid'|'dashed'|'dotted'; color?: string; }; }
interface DividerElementProperties { divider: { color?: string; height?: string; width?: string; }; }
interface SpacerElementProperties { spacer: { height: string; }; }
interface EmailElement { id: string; type: ElementType; content: string; layout: EmailElementLayout; properties: HeaderElementProperties | TextElementProperties | ButtonElementProperties | ImageElementProperties | DividerElementProperties | SpacerElementProperties; }
interface EmailSection { id: string; elements: EmailElement[]; styles: EmailSectionStyles; }
interface EmailTemplateV2 { id: string; name: string; version: number; sections: EmailSection[]; globalStyles: EmailGlobalStyles; }
// --- End V2 Type Definitions ---
`;

    // --- Minimal Valid V2 Example for Prompt ---
    const v2Example = `
// --- Minimal Valid V2 Example ---
{
  "newTemplate": {
    "id": "proj_abc123",
    "name": "Example Template",
    "version": 2,
    "globalStyles": {
      "bodyBackgroundColor": "#FFFFFF",
      "contentWidth": "600px"
    },
    "sections": [
      {
        "id": "sec_intro",
        "styles": { "padding": { "top": "20px", "bottom": "20px" } },
        "elements": [
          {
            "id": "el_header",
            "type": "header",
            "content": "Welcome!",
            "layout": { "align": "center" },
            "properties": {
              "level": "h1",
              "text": "Welcome!",
              "typography": { "fontSize": "24px", "color": "#333333" }
            }
          },
          {
            "id": "el_spacer",
            "type": "spacer",
            "content": "",
            "layout": {},
            "properties": {
              "spacer": { "height": "10px" }
            }
          },
          {
            "id": "el_text",
            "type": "text",
            "content": "This is an example email.",
            "layout": {},
            "properties": {
              "text": "This is an example email.",
              "typography": { "fontSize": "16px" }
            }
          }
        ]
      }
    ]
  },
  "explanation": "Generated a basic welcome email template with a header, spacer, and text."
}
// --- End Example ---
`;


    // --- Construct the V2 System Prompt --- 
    const baseV2SystemPrompt = `You are an AI assistant specialized in constructing and modifying email templates.
Your SOLE task is to generate a valid JSON object containing the updated email structure and an explanation.
You MUST respond ONLY with a single, valid JSON object. Do not include any text, markdown, apologies, or explanations outside the 'explanation' field of the JSON response.
The JSON object MUST STRICTLY follow the format: ${expectedResponseFormat}

Adhere rigidly to the V2 Type Definitions provided below. DO NOT invent fields. DO NOT omit required fields.
All element 'id' fields MUST be unique strings (you can generate random strings like 'el_abc123').
The 'content' field in each element should contain the relevant text (e.g., header text, paragraph text, button label, image alt text).
The 'properties' field MUST contain an object matching the specific interface for that element's 'type' (e.g., HeaderElementProperties for type 'header').

--- V2 Type Definitions ---
${v2TypeDefs}
--- End V2 Type Definitions ---

--- Example of Expected JSON Output Format ---
${v2Example}
--- End Example ---

Existing Template Structure (V2 JSON - ignore if mode is 'major' unless specifically asked to reference):
\\\`\\\`\\\`json
${JSON.stringify(currentV2Template, null, 2) || 'null'}
\\\`\\\`\\\`
`;

    let systemPrompt: string;
    let specificInstructions = '';
    if (currentMode === 'major') {
        console.log("Mode: Major Edit - Expecting V2 JSON response with explanation.");
        specificInstructions = `--- TASK: MAJOR EDIT ---\nBased ONLY on the User Request below, generate the **complete new V2 EmailTemplate JSON structure** according to the definitions and format specified above. Provide a user-friendly explanation in the 'explanation' field.\n**Creative Freedom:** Use the User Request as the primary goal, but add, remove, or modify elements to create a complete, well-structured, and effective email. Ignore the 'Existing Template Structure' and build a new one from scratch. Ensure all elements in the new structure have unique IDs.`;
    } else { // mode === 'edit'
        console.log("Mode: Edit - Expecting V2 JSON response with explanation.");
        specificInstructions = `--- TASK: EDIT ---\nBased on the User Request below AND the 'Existing Template Structure' provided above, generate the **complete MODIFIED V2 EmailTemplate JSON structure** reflecting ONLY the requested changes. Provide a user-friendly explanation in the 'explanation' field.\n**Strictly adhere to the User Request.** Modify ONLY the elements mentioned or implied. Preserve the existing structure and element IDs wherever possible. Do NOT add extra elements or make changes not requested. Only generate new IDs for newly added elements.`;
    }

    systemPrompt = `${baseV2SystemPrompt}\n${specificInstructions}`;

    // --- Prepare messages for OpenAI, including recent chat history --- 
    const historyMessages = chatHistory
        .slice(-3) // Get the last 3 messages
        .map((msg: any) => ({ // Map to OpenAI format
            role: msg.role === 'user' ? 'user' : 'assistant', // Ensure correct roles
            content: msg.content
        }))
        // Filter out any potential errors or non-user/assistant messages from history
        .filter((msg: any) => msg.role === 'user' || msg.role === 'assistant');

    console.log(`Adding ${historyMessages.length} messages from history to AI context.`);

    const messagesForAI = [
        { role: 'system', content: systemPrompt },
        ...historyMessages, // Add history messages before the latest user request
        { role: 'user', content: `User Request: ${userMessage}` }
    ];

    console.log("Sending request to OpenAI with model:", aiModel);
    // console.log("Full messages being sent:", JSON.stringify(messagesForAI, null, 2)); // DEBUG: Log full payload if needed

    // --- Call OpenAI --- 
    const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
        headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openAIApiKey}`,
        },
        body: JSON.stringify({
          model: aiModel, 
          messages: messagesForAI, // Use the array with history
          temperature: 0.6, 
          response_format: { type: "json_object" } // Request JSON output
        }),
      });

    if (!aiResponse.ok) {
        const errorBody = await aiResponse.text();
        console.error("OpenAI API Error:", aiResponse.status, errorBody);
        throw new Error(`OpenAI API request failed: ${aiResponse.statusText}`);
    }

    const aiResult = await aiResponse.json();
    // Ensure content exists and is accessed safely
    const aiJsonString = aiResult.choices?.[0]?.message?.content?.trim();

    if (!aiJsonString) {
        throw new Error('OpenAI returned an empty or invalid response content.');
    }
    console.log("Received JSON response from OpenAI.");
    // console.log("Raw AI JSON String:", aiJsonString); // DEBUG

    // --- Process AI JSON Response ---
    let parsedAiResponse: { newTemplate: any; explanation: string }; // Use 'any' initially for parsing
    try {
        parsedAiResponse = JSON.parse(aiJsonString);
    } catch (error) {
        console.error('Failed to parse AI JSON response:', error);
        console.error('Raw AI content received:', aiJsonString);
        throw new Error(`AI response was not valid JSON: ${error.message}`);
    }

    // --- Validate the AI's V2 Template Structure ---
    const validationResult = validateEmailTemplate(parsedAiResponse.newTemplate);
    if (!validationResult.valid) {
        console.error('AI-generated V2 template failed validation:', validationResult.errors);
        console.error('Invalid Template Structure Received:', JSON.stringify(parsedAiResponse.newTemplate, null, 2)); // Log the invalid structure
        // Optionally include errors in the thrown message for better debugging
        throw new Error(`AI response validation failed: ${JSON.stringify(validationResult.errors)}`);
    }

    // Validation passed, now we can safely type the template
    // TODO: Ensure EmailTemplate here refers to the V2 type definition eventually
    let newSemanticEmail: EmailTemplateV2 = parsedAiResponse.newTemplate;
    const explanation = parsedAiResponse.explanation;
    let newHtml: string;
    let finalPendingChanges: PendingChangeInput[] = [];

    try {
        // Normalize the template structure received from AI
        // NOTE: Ensure normalizeTemplate handles the V2 structure correctly!
        // TODO: Replace normalizeTemplate with V2 equivalent if necessary
        // newSemanticEmail = normalizeTemplate(newSemanticEmail); // Removed V1 normalization
        // console.log("Normalized AI-generated template V2.");

        // Generate HTML from the final V2 semantic structure
        console.log("Instantiating HtmlGeneratorV2...");
        const htmlGenerator = new HtmlGeneratorV2();
        console.log("Generating HTML from V2 template...");
        newHtml = htmlGenerator.generate(newSemanticEmail); // Use V2 generator
        console.log("Generated HTML from V2 semantic structure successfully.");

        // --- Update Database and Handle Diffs (based on mode) --- 
        // Uses updateProjectV2 which targets semantic_email_v2
        await updateProjectV2(supabase, projectId, newSemanticEmail, newHtml);

        if (currentMode === 'edit') {
            if (!currentV2Template) {
                 console.warn("Cannot perform diff for edit mode: currentV2Template is null.");
                 // Decide if this should be an error or just skip diff - For now, skip.
                 finalPendingChanges = []; // Ensure it's empty if diff skipped
            } else {
                // Diff the V2 templates
                console.log("Instantiating DifferV2...");
                const differ = new DifferV2();
                console.log("Performing V2 diff...");
                const v2DiffResult = differ.diffTemplates(currentV2Template, newSemanticEmail);
                console.log("V2 Diff completed.");

                // Map the V2 diff result to the V1 format needed by savePendingChanges
                const mappedChanges = mapV2DiffToV1PendingChanges(v2DiffResult);

                finalPendingChanges = await savePendingChanges(supabase, projectId, mappedChanges);
          }
        } else {
             // Major Edit: Clear pending changes
             finalPendingChanges = [];
             await savePendingChanges(supabase, projectId, []); // Explicitly clear
             console.log("Cleared pending changes for Major Edit mode.");
        }

    } catch (error) {
        console.error('Error during normalization, HTML generation, or DB update:', error);
        throw new Error(`Processing failed after AI response: ${error.message}`);
    }

    // --- Return Success Response --- 
    console.log("Operation successful. Returning new state with explanation.");
      return new Response(
        JSON.stringify({
            message: explanation, // Use AI explanation as the primary message
            aiExplanation: explanation, // Keep separate field if needed by UI
            newSemanticEmail: newSemanticEmail, // The V2 Template
            newHtml: newHtml,
            newPendingChanges: finalPendingChanges 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );

  } catch (error) {
    console.error('Error in generate-email-changes function:', error);
    let finalErrorPayload = { error: error.message, problematicJson: null };
    try {
        const parsedError = JSON.parse(error.message);
        if (parsedError && typeof parsedError === 'object') {
            // Use the structured error message if available
            finalErrorPayload.error = parsedError.message || error.message;
            // Ensure key matches the key used when throwing the error
            finalErrorPayload.problematicJson = parsedError.problematicContent || null; 
        } else {
             finalErrorPayload.error = error.message; 
        }
    } catch (e) {
         finalErrorPayload.error = error.message;
    }
    
    return new Response(
        JSON.stringify(finalErrorPayload),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: finalErrorPayload.error.includes("Invalid request") || finalErrorPayload.error.includes("not found") ? 400 : 500,
      }
    );
  }
});

// --- Remove or update old V1 helper functions (generateHtmlFromSemantic, parseHtmlToSemantic, diffSemanticEmails, normalizeTemplate) ---
// TODO: Replace calls above with calls to V2 class instances (HtmlGeneratorV2, SemanticParserV2, DifferV2)
