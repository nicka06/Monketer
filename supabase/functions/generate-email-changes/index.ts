import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
// Import shared types
import {
    EmailTemplate,
    EmailSection, // Needed by diff logic
    EmailElement,
    InteractionMode,
    PendingChangeInput,
    corsHeaders
} from '../_shared/types.ts';
import { generateHtmlFromSemantic, parseHtmlToSemantic } from '../_shared/html-utils.ts'; // Need both generation and parsing

// Type for the object returned by the diff function (matches structure needed for insertion)
// We'll call this DiffResult to distinguish from PendingChangeInput which includes project_id/status
type DiffResult = Omit<PendingChangeInput, 'project_id' | 'status'>;

// Get the OpenAI API key from environment variables
const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

// Helper function to clean JSON string by removing comments and trailing commas
function cleanJsonString(jsonStr: string): string {
  // Remove comments and trailing commas first
  let cleaned = jsonStr
    .replace(/\/\/.*$/gm, '') // Remove single-line comments
    .replace(/\/\*[\s\S]*?\*\//g, '') // Remove multi-line comments
    .replace(/,(\s*[\]}])/g, '$1'); // Remove trailing commas

  // Fix unescaped newlines within string literals
  cleaned = cleaned.replace(/(\"((?:\\\\\"|[^\"\\n])*?)(\\n)(.*?)\")/g, (match, p1) => {
      const fixedContent = p1.replace(/\\n/g, '\\\\n');
      return fixedContent;
  });

  // Fix unescaped tabs within string literals
  cleaned = cleaned.replace(/(\"((?:\\\\\"|[^\"\\t])*?)(\\t)(.*?)\")/g, (match, p1) => {
      const fixedContent = p1.replace(/\\t/g, '\\\\t');
      return fixedContent;
  });

  return cleaned;
}

// --- Diffing Logic --- 

// Helper function for deep comparison of style objects
function areStylesEqual(style1?: Record<string, any>, style2?: Record<string, any>): boolean {
  if (!style1 && !style2) return true;
  if (!style1 || !style2) return false;
  const keys1 = Object.keys(style1);
  const keys2 = Object.keys(style2);
  if (keys1.length !== keys2.length) return false;
  for (const key of keys1) {
    if (!style2.hasOwnProperty(key) || style1[key] !== style2[key]) {
      return false;
    }
  }
  return true;
}

// Diff function to compare old and new templates and generate diff results
// Updated return type to DiffResult[]
function diffSemanticEmails(
    oldSemantic: EmailTemplate | null,
    newSemantic: EmailTemplate
): Array<DiffResult> {
  // --- Add Logging Here --- 
  console.log("--- diffSemanticEmails: oldSemantic Start ---");
  console.log(JSON.stringify(oldSemantic, null, 2));
  console.log("--- diffSemanticEmails: oldSemantic End ---");
  console.log("--- diffSemanticEmails: newSemantic Start ---");
  console.log(JSON.stringify(newSemantic, null, 2));
  console.log("--- diffSemanticEmails: newSemantic End ---");
  // --- End Logging ---
  
  const changes: Array<DiffResult> = [];

  // 1. Handle Null oldSemantic (shouldn't happen with new logic but keep for safety)
  if (!oldSemantic) {
    console.warn("Diff: oldSemantic was null, treating all as additions.");
    newSemantic.sections.forEach(section => {
      section.elements.forEach(element => {
        changes.push({
          element_id: element.id,
          change_type: 'add',
          old_content: null,
          new_content: { ...element, targetSectionId: section.id } // Include target section for adds
        });
      });
    });
    return changes;
  }

  // 2. Map Old Elements for quick lookup & Store Section ID
  const oldElementsMap = new Map<string, { element: EmailElement, sectionId: string }>();
  oldSemantic.sections.forEach(section => {
    if (!section || !Array.isArray(section.elements)) {
        console.warn(`[diffSemanticEmails] Skipping old section ${section?.id} because elements array is missing or invalid.`);
        return;
    }
    section.elements.forEach(element => {
      oldElementsMap.set(element.id, { element: element, sectionId: section.id });
    });
  });

  // 3. Iterate New Elements to find additions and edits
  const newElementIds = new Set<string>();
  newSemantic.sections.forEach(section => {
    if (!section || !Array.isArray(section.elements)) {
        console.warn(`[diffSemanticEmails] Skipping new section ${section?.id} because elements array is missing or invalid.`);
        return;
    }
    section.elements.forEach(newElement => {
      newElementIds.add(newElement.id);
      const oldElementData = oldElementsMap.get(newElement.id);

      if (!oldElementData) {
        // 4a. Element is new (Add)
        console.log(`Diff: Element ${newElement.id} is ADDED to section ${section.id}.`);
        changes.push({
          element_id: newElement.id,
          change_type: 'add',
          old_content: null,
          new_content: { ...newElement, targetSectionId: section.id }
        });
      } else {
        const oldElement = oldElementData.element;
        // 4b. Element exists, check for modifications (Edit)
        const contentChanged = newElement.content !== oldElement.content;
        const stylesChanged = !areStylesEqual(newElement.styles, oldElement.styles);
        const typeChanged = newElement.type !== oldElement.type;

        if (contentChanged || stylesChanged || typeChanged) {
          console.log(`Diff: Element ${oldElement.id} is EDITED.`);
          changes.push({
            element_id: oldElement.id,
            change_type: 'edit',
            old_content: { content: oldElement.content, styles: oldElement.styles, type: oldElement.type },
            new_content: { content: newElement.content, styles: newElement.styles, type: newElement.type }
          });
        }
      }
    });
  });

  // 5. Iterate Old Elements Map to find deletions
  oldElementsMap.forEach((oldElementData, elementId) => {
    if (!newElementIds.has(elementId)) {
      console.log(`Diff: Element ${elementId} is DELETED from section ${oldElementData.sectionId}.`);
      changes.push({
        element_id: elementId,
        change_type: 'delete',
        old_content: { ...oldElementData.element, originalSectionId: oldElementData.sectionId }, // Store old element + original section ID
        new_content: null
      });
    }
  });

  console.log(`Diff: Found ${changes.length} changes.`);
  return changes;
}

// --- Database Interaction Helpers ---

async function getProjectData(supabase: any, projectId: string): Promise<{ oldSemanticEmail: EmailTemplate | null; oldHtml: string | null }> {
    console.log(`Fetching project data for ID: ${projectId}`);
    const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('semantic_email, current_html')
        .eq('id', projectId)
        .single();

    if (projectError) {
        console.error(`Error fetching project data for ID ${projectId}:`, projectError);
        throw new Error(`Failed to fetch project data for ID ${projectId}: ${projectError.message}`); // Include projectId
    }
    if (!projectData) {
        throw new Error(`Project not found with ID: ${projectId}`);
    }
    console.log(`Project data fetched successfully for ID: ${projectId}.`);

    let oldSemanticEmail: EmailTemplate | null = null;
    const rawSemantic = projectData.semantic_email;

    if (rawSemantic) { // Check if there's anything to parse
        if (typeof rawSemantic === 'object') {
            console.log(`semantic_email for ${projectId} is already an object. Assuming valid.`);
            // Basic validation: check for sections array
            if (rawSemantic && Array.isArray(rawSemantic.sections)) {
                oldSemanticEmail = rawSemantic as EmailTemplate;
            } else {
                console.error(`Existing semantic_email object for ${projectId} lacks 'sections' array.`);
                throw new Error(`Invalid existing semantic_email object structure for project ID: ${projectId}`);
            }
        } else if (typeof rawSemantic === 'string') {
            console.log(`Attempting to parse semantic_email string for ${projectId}:`);
            console.log(`Raw string: ${rawSemantic}`); // Log the raw string
            try {
                oldSemanticEmail = JSON.parse(rawSemantic);
                 // Basic validation after parse: check for sections array
                if (!oldSemanticEmail || !Array.isArray(oldSemanticEmail.sections)) {
                    console.error(`Parsed semantic_email for ${projectId} lacks 'sections' array or is null.`);
                    throw new Error(`Invalid parsed semantic_email structure for project ID: ${projectId}`);
                }
                console.log(`Successfully parsed semantic_email for ${projectId}.`);
            } catch (parseError) {
                console.error(`Failed to parse existing semantic_email JSON for ${projectId}:`, parseError);
                // Throw a more specific error
                throw new Error(`Failed to parse existing semantic_email JSON for project ID: ${projectId}. Error: ${parseError.message}`);
            }
        } else {
            // Handle unexpected types
             console.warn(`Unexpected type for semantic_email for ${projectId}: ${typeof rawSemantic}`);
             throw new Error(`Unexpected data type for semantic_email for project ID: ${projectId}`);
        }
    } else {
        console.log(`semantic_email for ${projectId} is null or empty. Proceeding with null.`);
        // It's okay for it to be null if it's a brand new project, 
        // but the main handler should ideally create a default one.
        oldSemanticEmail = null; 
    }

    return {
        oldSemanticEmail: oldSemanticEmail,
        oldHtml: projectData.current_html as string | null
    };
}

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

async function savePendingChanges(supabase: any, projectId: string, changes: DiffResult[]): Promise<void> {
    if (changes.length === 0) {
        console.log("No pending changes to save.");
        return;
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

    const changesToInsert = changes.map(change => ({
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
    const { prompt, chatHistory, mode, projectId } = requestData;

    // Validate keys
    if (!openAIApiKey) throw new Error("OpenAI API key is not configured.");
    if (!supabaseUrl || !supabaseAnonKey) throw new Error("Supabase connection details are not configured.");

    // Instantiate Supabase client
    supabase = createClient(supabaseUrl!, supabaseAnonKey!, {
        global: { headers: { Authorization: req.headers.get('Authorization')! } }
    });

    // --- Fetch Current Project State --- (Essential for the new logic)
    let { oldSemanticEmail, oldHtml } = await getProjectData(supabase, projectId);
    
    // --- Handle Initial Project State (semantic_email is null) ---
    let isFirstInteraction = false;
    // --- IMPORTANT: Make `mode` mutable --- 
    let currentMode = mode; // Create a mutable variable for mode
    if (!oldSemanticEmail) {
        console.warn(`oldSemanticEmail for project ${projectId} is null. Assuming first interaction.`);
        isFirstInteraction = true;
        // Create a default empty template structure
        oldSemanticEmail = {
            id: projectId, // Use project ID for template ID consistency?
            name: 'Untitled', // Or fetch project name?
            version: 0,
            sections: [],
            styles: {}
        };
        console.log("Using default empty template as oldSemanticEmail.");

        // Force mode to 'major' for the first interaction, regardless of user selection
        if (currentMode === 'edit') { // Check mutable mode
            console.log("Overriding mode from 'edit' to 'major' for initial content generation.");
            currentMode = 'major'; // Update mutable mode
        }
    }

    // --- Prepare AI Request based on Mode (now using potentially overridden currentMode) --- 
    // --- Declare and initialize prompt variables AFTER potential mode override --- 
    let systemPrompt = '';
    let userPrompt = `User Request: ${prompt}\n\n`; // Base user prompt
    let expectJsonResponse = false;
    let expectHtmlResponse = false;

    const baseSystemPrompt = `You are an AI assistant helping modify email templates. Respond ONLY with the requested format. Do not include explanations or apologies.`;
    const formatInstructions = `\nStructure Definitions:\ntype EmailTemplate = { id: string; name: string; version: number; sections: EmailSection[]; styles?: Record<string, any>; };\ntype EmailSection = { id: string; styles?: Record<string, any>; elements: EmailElement[]; };\ntype EmailElement = { id: string; type: 'header' | 'text' | 'button' | 'image' | 'divider' | 'spacer' | string; content?: string; styles?: Record<string, any>; };\n\nExisting Template Structure (JSON):\n\`\`\`json\n${JSON.stringify(oldSemanticEmail, null, 2)}\n\`\`\`\n    `;

    // --- Assign prompts based on the final currentMode ---
    if (currentMode === 'edit') {
        console.log("Mode: Edit - Expecting JSON response.");
        expectJsonResponse = true;
        systemPrompt = `${baseSystemPrompt}\nYou will be given the current email structure as JSON and a user request.\nModify the JSON structure according to the user request.\n**CRITICAL**: Maintain the existing 'id' for elements that are modified. Generate new UUIDs ONLY for newly added elements.\nReturn ONLY the complete, updated EmailTemplate JSON object, ensuring it is **perfectly valid RFC 8259 JSON**.\n\n**ABSOLUTELY ESSENTIAL**: All string values within the JSON *must* be properly escaped. Pay close attention to:\n  - Double quotes: \" must be escaped as \\\". Example: { \"content\": \"He said \\\"Hello!\\\"\" }\n  - Backslashes: \\ must be escaped as \\\\. Example: { \"path\": \"C:\\\\Users\\\\Name\" }\n  - Newlines: A literal newline must be escaped as \\\\n. Example: { \"text\": \"First line.\\\\nSecond line.\" }\n  - Tabs: A literal tab must be escaped as \\\\t. Example: { \"data\": \"Column1\\\\tColumn2\" }\n  - Other control characters (like carriage return \\r, backspace \\b, form feed \\f) must also be escaped if they appear in strings.\n\nDouble-check your entire JSON output for syntax errors like missing commas, trailing commas, or unescaped characters before responding.\n${formatInstructions}\n`;
         userPrompt += `Based on the existing template structure provided in the system prompt, modify it according to the request and return the complete, strictly valid, updated JSON object.`;

    } else { // mode === 'major'
        console.log("Mode: Major Edit - Expecting HTML response.");
        expectHtmlResponse = true;
        systemPrompt = `${baseSystemPrompt}\nYou will be given the current email structure as JSON (which might be empty for the first request) and a user request.\nGenerate the complete, new HTML code for the email based *only* on the user request, using the provided JSON structure only as context for the request.\nReturn ONLY the raw HTML code, starting with <!DOCTYPE html>. Do not include markdown formatting like \`\`\`html.\n${formatInstructions}`; // Include structure for context
        userPrompt += `Based on the user request (and using the provided JSON structure only as context), generate the complete new HTML for the email. Return ONLY raw HTML.`;
    }

    // --- Call OpenAI --- 
    console.log("Sending request to OpenAI...");
    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
          'Authorization': `Bearer ${openAIApiKey}`,
        },
        body: JSON.stringify({
            model: 'gpt-4o', 
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            temperature: 0.5,
        }),
      });

    if (!aiResponse.ok) {
        const errorBody = await aiResponse.text();
        console.error("OpenAI API Error:", aiResponse.status, errorBody);
        throw new Error(`OpenAI API request failed: ${aiResponse.statusText}`);
    }

    const aiResult = await aiResponse.json();
    const aiContent = aiResult.choices[0]?.message?.content?.trim();

    if (!aiContent) {
        throw new Error('OpenAI returned an empty response.');
    }
    console.log("Received response from OpenAI.");

    // --- Process AI Response --- 
    let newSemanticEmail: EmailTemplate;
    let newHtml: string;
    let cleanedJson = ''; // Define cleanedJson here to be accessible in catch block

    if (expectJsonResponse) {
        console.log("Processing JSON response...");
        try {
            console.log("--- Raw AI Content Start ---");
            console.log(aiContent);
            console.log("--- Raw AI Content End ---");

            cleanedJson = cleanJsonString(aiContent);

            console.log("--- Cleaned AI Content (before parsing attempts) Start ---");
            console.log(cleanedJson);
            console.log("--- Cleaned AI Content (before parsing attempts) End ---");

            // --- Attempt to parse JSON --- 
            let parsedSuccessfully = false;
            try {
                // Attempt 1: Parse the cleaned content directly
                console.log("Attempting direct JSON parse...");
                newSemanticEmail = JSON.parse(cleanedJson);
                parsedSuccessfully = true;
                console.log("Direct JSON parse successful.");
            } catch (directParseError) {
                console.warn("Direct JSON parse failed. Trying extraction from markdown...");
                // Attempt 2: Extract from ```json ... ``` block
                const jsonMatch = cleanedJson.match(/```json\n([\s\S]*?)\n```/);
        if (jsonMatch && jsonMatch[1]) {
                    const extractedJson = jsonMatch[1];
                    console.log("--- Extracted JSON String Start ---");
                    console.log(extractedJson);
                    console.log("--- Extracted JSON String End ---");
                    try {
                        newSemanticEmail = JSON.parse(extractedJson);
                        parsedSuccessfully = true;
                        console.log("JSON parse from markdown block successful.");
                    } catch (markdownParseError) {
                        console.error("Failed to parse JSON extracted from markdown block:", markdownParseError);
                        // Keep the original directParseError as the primary cause
                        throw directParseError; // Re-throw the more likely original error
                    }
                } else {
                    // If no markdown block found and direct parse failed, throw original error
                    console.error("No JSON markdown block found after direct parse failed.");
                    throw directParseError; 
                }
            }
            
            if (!parsedSuccessfully) {
                // This should technically be unreachable if the logic above is correct
                 throw new Error("Failed to parse JSON using direct or markdown extraction methods.");
            }

            // If parsing succeeded one way or another:
            // --- Add Validation for Parsed Structure ---
            if (!newSemanticEmail || !Array.isArray(newSemanticEmail.sections)) {
                console.error("Parsed JSON is missing sections array:", newSemanticEmail);
                throw new Error("AI returned invalid structure: EmailTemplate must have a sections array.");
            }
            // --- End Validation ---
            
            newHtml = await generateHtmlFromSemantic(newSemanticEmail);
            console.log("Generated HTML from new semantic structure.");

        } catch (error) {
            console.error('Error processing JSON response:', error);
            console.error('Original AI content:', aiContent);
            // --- Add Backend Logging for Problematic JSON ---
            console.error("--- Problematic Cleaned JSON (Backend Log) Start ---");
            console.error(cleanedJson);
            console.error("--- Problematic Cleaned JSON (Backend Log) End ---");
            // --- End Logging ---
            const errorMessage = `Failed to parse or process AI JSON response: ${error.message}`;
            const errorPayload = {
                 message: errorMessage,
                 // Ensure key matches what the outer catch block expects
                 problematicContent: cleanedJson 
            };
            throw new Error(JSON.stringify(errorPayload)); 
        }
    } else { // expectHtmlResponse (Major Edit)
        console.log("Processing HTML response...");
        try {
             newHtml = aiContent; 
             // --- Add Logging for Raw AI HTML (Truncated) ---
             console.log("--- Raw AI HTML Content Start (First 1000 chars) ---");
             console.log(newHtml?.substring(0, 1000) + (newHtml?.length > 1000 ? "..." : ""));
             console.log("--- Raw AI HTML Content End ---");
             // --- End Logging ---
             newSemanticEmail = parseHtmlToSemantic(newHtml); 
             console.log("Parsed HTML into semantic structure.");

             newHtml = await generateHtmlFromSemantic(newSemanticEmail);
             console.log("Regenerated canonical HTML from parsed structure.");

      } catch (error) {
            console.error('Error processing HTML response:', error);
            console.error('Original AI content:', aiContent);
            throw new Error(`Failed to parse or process AI HTML response: ${error.message}`);
        }
    }

    // --- Update Database and Generate Diffs ---
    await updateProject(supabase, projectId, newSemanticEmail, newHtml);
    
    // --- Add Validation for oldSemanticEmail before diffing ---
    if (!oldSemanticEmail || !Array.isArray(oldSemanticEmail.sections)) {
        console.error("Validation Failed: oldSemanticEmail is missing or its sections property is not an array before calling diff.", oldSemanticEmail);
        throw new Error("Internal Error: Could not validate existing email structure before diffing.");
    }
    // --- End Validation ---
    
    const semanticChanges = diffSemanticEmails(oldSemanticEmail, newSemanticEmail);
    await savePendingChanges(supabase, projectId, semanticChanges);

    // --- Return Response --- 
    console.log("Change generation successful. Returning new state.");
      return new Response(
        JSON.stringify({
            message: "Email updated successfully.",
            newSemanticEmail: newSemanticEmail,
            newHtml: newHtml
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        }
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

// --- Helper function generateHtmlFromSemantic IS NOW IMPORTED --- 
// Remove duplicate placeholder definition
/* 
async function generateHtmlFromSemantic(semanticEmail: EmailTemplate): Promise<string> {
     console.warn("generateHtmlFromSemantic not fully implemented - returning basic placeholder");
     // TODO: Build actual HTML generation logic here based on sections and elements
     let html = `<html><head><style>${''}</style></head><body>`; 
      semanticEmail?.sections?.forEach(section => {
          html += `<div id="${section.id}" style="${Object.entries(section.styles || {}).map(([k, v]) => `${k}:${v};`).join('')}">`;
          section.elements?.forEach(element => {
             // Ensure elements have IDs in HTML for frontend matching
              let styleString = Object.entries(element.styles || {}).map(([k, v]) => `${k}:${v};`).join('');
              html += `<div id="${element.id}" style="position:relative;">`; // Add relative pos for potential overlays
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
