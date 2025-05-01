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
import { diffSemanticEmails } from '../_shared/diff-utils.ts'; // Import from shared file

// Type alias for diff result
type DiffResult = Omit<PendingChangeInput, 'project_id' | 'status'>;

// Get environment variables
const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

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
    
    // Use the mode directly from requestData
    const currentMode = mode; 

    // --- Prepare AI Request based on Mode --- 
    let systemPrompt = '';
    let userPrompt = `User Request: ${prompt}\n\n`; 
    let expectJsonResponse = false;
    let expectHtmlResponse = false;
    const baseSystemPrompt = `You are an AI assistant helping modify email templates. Respond ONLY with the requested format. Do not include explanations or apologies.`;
    
    if (!oldSemanticEmail) {
      console.error(`Critical Error: oldSemanticEmail is null for project ${projectId}. This should not happen.`);
      throw new Error(`Internal state error: Project ${projectId} structure is missing unexpectedly.`);
    }
    
    const formatInstructions = `\nStructure Definitions:\ntype EmailTemplate = { id: string; name: string; version: number; sections: EmailSection[]; styles?: Record<string, any>; };\ntype EmailSection = { id: string; styles?: Record<string, any>; elements: EmailElement[]; };\ntype EmailElement = { id: string; type: 'header' | 'text' | 'button' | 'image' | 'divider' | 'spacer' | string; content?: string; styles?: Record<string, any>; };\n\nExisting Template Structure (JSON):\n\`\`\`json\n${JSON.stringify(oldSemanticEmail, null, 2)}\n\`\`\`\n    `;

    // Define the base request body structure
    const apiRequestBody: { 
      model: string; 
      messages: { role: string; content: string }[]; 
      temperature: number; 
      response_format?: { type: string }; // Optional response_format
    } = {
         model: 'gpt-4o', 
         messages: [], // Will be populated below
         temperature: 0.5,
     };

    if (currentMode === 'edit') {
        console.log("Mode: Edit - Expecting JSON response (JSON mode enabled).");
        expectJsonResponse = true;
        systemPrompt = `${baseSystemPrompt}\nYou will be given the current email structure as JSON and a user request.\nModify the JSON structure according to the user request.\n**CRITICAL**: Maintain the existing 'id' for elements that are modified. Generate new UUIDs ONLY for newly added elements.\nReturn ONLY the complete, updated EmailTemplate JSON object.\n**You MUST output a single, valid JSON object and nothing else.**\n${formatInstructions}\n`;
         userPrompt += `Based on the existing template structure provided in the system prompt, modify it according to the request and return the complete, valid JSON object.`;
         apiRequestBody.response_format = { type: "json_object" }; // Enable JSON mode
    } else { // mode === 'major'
        console.log("Mode: Major Edit - Expecting HTML response.");
        expectHtmlResponse = true;
        systemPrompt = `${baseSystemPrompt}\nYou will be given the current email structure as JSON (which might be empty for the first request) and a user request.\nGenerate the complete, new HTML code for the email based *only* on the user request, using the provided JSON structure only as context for the request.\nReturn ONLY the raw HTML code, starting with <!DOCTYPE html>. Do not include markdown formatting like \`\`\`html.\n${formatInstructions}`; 
        userPrompt += `Based on the user request (and using the provided JSON structure only as context), generate the complete new HTML for the email. Return ONLY raw HTML.`;
        // No JSON mode needed for HTML
    }

    // Assign messages to the request body AFTER defining system/user prompts
    apiRequestBody.messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
    ];

    // --- Call OpenAI --- 
    console.log("Sending request to OpenAI with body:", JSON.stringify(apiRequestBody)); // Log the final request body
    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openAIApiKey}`,
        },
        body: JSON.stringify(apiRequestBody), // Use the fully constructed request body
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

    if (expectJsonResponse) {
        console.log("Processing JSON response (JSON mode enabled)...");
        try {
            console.log("--- Raw AI Content Start (JSON mode) ---");
            console.log(aiContent); // Should be valid JSON now
            console.log("--- Raw AI Content End (JSON mode) ---");

            // Directly parse the content, assuming API enforces valid JSON
            newSemanticEmail = JSON.parse(aiContent);
            console.log("Direct JSON parse successful (JSON mode).");

            // Semantic validation (check for sections array)
            if (!newSemanticEmail || !Array.isArray(newSemanticEmail.sections)) {
                console.error("Parsed JSON object is missing the required 'sections' array.");
                throw new Error("AI returned JSON object missing sections array.");
            }
            
            newHtml = await generateHtmlFromSemantic(newSemanticEmail);
            console.log("Generated HTML from new semantic structure.");

        } catch (error) {
            console.error('Error processing JSON response (JSON mode):', error);
            console.error('Raw AI content received:', aiContent);
            const errorMessage = `Failed to parse or process AI JSON response: ${error.message}`;
            // Return raw content in case of unexpected parse error even with JSON mode
            const errorPayload = { message: errorMessage, problematicContent: aiContent }; 
            throw new Error(JSON.stringify(errorPayload)); 
        }
    } else { // expectHtmlResponse (Major Edit)
        console.log("Processing HTML response...");
        try {
             newHtml = aiContent; 
             console.log("--- Raw AI HTML Content Start (First 1000 chars) ---");
             console.log(newHtml?.substring(0, 1000) + (newHtml?.length > 1000 ? "..." : ""));
             console.log("--- Raw AI HTML Content End ---");

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
