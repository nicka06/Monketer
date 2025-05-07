import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

// Import actual types
import type { EmailTemplate as EmailTemplateV2, ElementType as ElementTypeV2 } from '../_shared/types/v2/index.ts'; // Assuming index.ts re-exports them
import type { ChatMessage } from '../_shared/types/editor.ts'; // Corrected path

interface ClarifyUserIntentPayload {
  userMessage: string;
  mainChatHistory: ChatMessage[];
  currentSemanticEmailV2: EmailTemplateV2 | null;
  ongoingClarificationContext?: any;
  projectId: string | null;
}

interface QuestionResponse {
  status: 'requires_clarification';
  question: {
    id: string;
    text: string;
    suggestions?: Array<{ text: string; value: string }>;
  };
  aiSummaryForNextTurn: string;
}

interface CompleteResponse {
  status: 'complete';
  perfectPrompt: string;
  elementsToProcess: Array<{
    type: ElementTypeV2;
    action: 'add' | 'modify' | 'delete';
    userPreferences: Record<string, any>;
    targetId?: string;
    placeholderId?: string;
  }>;
  finalSummary: string;
}

const MAX_CHAT_HISTORY_TOKENS = 2000; // Example limit, adjust as needed
const MAX_EMAIL_CONTEXT_TOKENS = 1500; // Example limit

// --- Simulation Variables (Defaults) ---
const SIMULATION_MODE = false; // Set to true to bypass OpenAI and use simulatedResponse
const SIMULATION_FALLBACK = '{\"status\":\"requires_clarification\",\"question\":{\"id\":\"fallback_empty_ai_response\",\"text\":\"The AI assistant did not provide a response. Please try again.\",\"suggestions\":[]},\"aiSummaryForNextTurn\":\"AI response was empty or fallback.\"}';
const simulatedResponse = '{\"status\":\"requires_clarification\",\"question\":{\"id\":\"sim_q_123\",\"text\":\"(Simulated) What is the primary goal of this email?\"},\"aiSummaryForNextTurn\":\"User wants a new email, asking for goal.\"}';

// Helper to roughly estimate token count (very basic, for more accuracy use a proper tokenizer library)
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

serve(async (req) => {
  // Handle OPTIONS request for CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Ensure it's a POST request
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const payload: ClarifyUserIntentPayload = await req.json();

    // --- 1. Authentication (Placeholder) ---
    // TODO: Add Supabase client initialization and user authentication if needed
    // const authHeader = req.headers.get('Authorization');
    // const user = await getUserByCookie(req) or similar
    // if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    console.log('Received payload:', payload);

    // --- 2. Select Clarification AI Model (Placeholder) ---
    const aiModel = 'gpt-4o-mini'; // Or your preferred model

    // --- 3. Construct System Prompt (Detailed system prompt will be complex) ---
    let baseSystemPrompt = `
Your Role: You are an expert email design assistant. Your primary goal is to deeply and accurately understand the user's request for creating or modifying an email. If their request is ambiguous or lacks critical details, you MUST ask concise, targeted clarifying questions. Once all necessary information is gathered and the user's intent is clear, you will summarize the complete request into a "perfect prompt" and a structured list of "elements to process" that will be used by a separate Email Generation AI.

Your Inputs for Analysis:
1.  \`userMessage\`: The most recent message from the user.
2.  \`mainChatHistory\`: The preceding conversation history (if any).
3.  \`currentSemanticEmailV2\`: The JSON structure of the current email being edited (if any).
4.  \`ongoingClarificationContext\`: A summary of our previous clarification interaction if this is a follow-up to a question you asked.

IMPORTANT CONTEXT HANDLING:
- When users mention background colors, this refers to the email's global background (bodyBackgroundColor in globalStyles).
- Always maintain style preferences (like colors, fonts, alignment) throughout the clarification flow.
- Your aiSummaryForNextTurn MUST include ALL style preferences mentioned so far, even when asking about other details.

ELEMENT TYPES AND DEFAULTS:
The following are the available element types and their default properties. You MUST use these exact types and property structures:

header: {
  layout: { align: 'center', padding: { top: '10px', bottom: '10px' } },
  properties: { 
    level: 'h1', 
    text: string,
    typography: { 
      fontFamily: string | null,
      fontSize: string | null,
      fontWeight: string | null,
      fontStyle: string | null,
      color: string | null,
      textAlign: 'center',
      lineHeight: string | null
    }
  }
}

text: {
  layout: { align: 'center', padding: { top: '5px', bottom: '5px' } },
  properties: { 
    text: string,
    typography: { 
      fontFamily: string | null,
      fontSize: string | null,
      fontWeight: string | null,
      fontStyle: string | null,
      color: string | null,
      textAlign: 'center',
      lineHeight: '1.5'
    }
  }
}

button: {
  layout: { align: 'center', padding: { top: '10px', bottom: '10px' } },
  properties: {
    button: {
      href: string,
      target: '_blank' | '_self',
      backgroundColor: string | null,
      textColor: string | null,
      borderRadius: string | null,
      border: string | null
    },
    typography: {
      fontFamily: string | null,
      fontSize: string | null,
      fontWeight: 'bold'
    }
  }
}

image: {
  layout: { align: 'center', padding: { top: '10px', bottom: '10px' } },
  properties: {
    image: {
      src: string,
      alt: string,
      width: string | null,
      height: string | null,
      linkHref: string | null,
      linkTarget: '_blank' | '_self' | null
    }
  }
}

divider: {
  layout: { padding: { top: '10px', bottom: '10px' } },
  properties: {
    divider: {
      color: string | null,
      height: string | null,
      width: string | null
    }
  }
}

spacer: {
  layout: {},
  properties: {
    spacer: {
      height: string
    }
  }
}

Your Response MUST be one of two JSON object structures described below. Do NOT add any explanatory text outside of the JSON structure.

// ---- RESPONSE OPTION 1: CLARIFICATION IS NEEDED ---- //
If the user's request is unclear, ambiguous, or missing information essential for generating or modifying email elements, you MUST ask for clarification.

Key Instructions for Clarification:
- Ask only ONE concise question at a time.
- Your question should aim to resolve the most critical ambiguity first.
- Ensure your question is a logical continuation based on the \`ongoingClarificationContext\` and the user's most recent answer. 
  **Do not repeat a question if the \`ongoingClarificationContext\` shows it was already answered.**
- For each question, if appropriate, provide 2-3 short, clickable \`suggestions\` (as \`{text: string, value: string}\` objects) that represent likely or common answers. The \`value\` should be what is sent back if the user clicks it.

Required JSON Structure for Clarification Response:
\`\`\`json
{
  "status": "requires_clarification",
  "question": {
    "id": "q_unique_identifier_for_this_question",
    "text": "Your concise clarifying question here?",
    "suggestions": [
      {"text": "Suggested Answer A", "value": "value_for_a"},
      {"text": "Suggested Answer B", "value": "value_for_b"}
    ]
  },
  "aiSummaryForNextTurn": "A brief summary reflecting your NEW understanding AFTER processing the user's current answer. Critically, this summary MUST incorporate ALL style preferences and design choices mentioned so far, including colors, fonts, alignments, etc. Then state what specific information is STILL missing or what the NEXT most critical ambiguity is that your NEW question (above) aims to resolve. This summary will be provided back to you as ongoingClarificationContext in the next interaction. If the user's answer fully resolves your previous point of confusion, this summary must reflect that, and your next question should move to a new topic of ambiguity."
}
\`\`\`

// ---- RESPONSE OPTION 2: CLARIFICATION COMPLETE / REQUEST IS CLEAR ---- //
If you are confident that you have all the necessary details from the \`userMessage\` (potentially augmented by \`mainChatHistory\`, \`currentSemanticEmailV2\`, or previous clarification turns via \`ongoingClarificationContext\`) and the user's intent is clear, respond with a completion object:

Required JSON Structure for Completion Response:
\`\`\`json
{
  "status": "complete",
  "perfectPrompt": "A concise, clear summary of the user's complete request",
  "elementsToProcess": [
    {
      "type": "header" | "text" | "button" | "image" | "divider" | "spacer",
      "action": "add" | "modify" | "delete",
      "userPreferences": {
        // Must match the exact structure from ELEMENT TYPES AND DEFAULTS above
        // Example for a header:
        "layout": { "align": "center", "padding": { "top": "10px", "bottom": "10px" } },
        "properties": {
          "level": "h1",
          "text": "Example Header",
          "typography": {
            "fontFamily": null,
            "fontSize": null,
            "fontWeight": null,
            "fontStyle": null,
            "color": null,
            "textAlign": "center",
            "lineHeight": null
          }
        }
      },
      "targetId": "optional-target-id",
      "placeholderId": "optional-placeholder-id"
    }
  ],
  "finalSummary": "A summary of all the changes to be made"
}
\`\`\`
`;

    // Append V2 Type Definitions and key user preferences hints
    const V2TypesInfo = `

--- Reference: Available Element Types (ElementTypeV2) and Key User Preferences ---
header: User preferences might include: text, level (h1-h6), typography (fontFamily, fontSize, fontWeight, fontStyle, color, textAlign, lineHeight), align (overall alignment).
text: User preferences might include: text, typography, align.
button: User preferences might include: buttonText (for the visible text on button), href (URL), target (_blank, _self), buttonColor (background), textColor (for text on button), borderRadius, border, typography (for text on button), align.
image: User preferences might include: src (URL, or imply placeholder if missing), altText, linkHref (if image is linked), linkTarget, videoHref (if image is a poster for a video), width, height, align, border (radius, width, style, color).
divider: User preferences might include: color, height (thickness), width (e.g., 50%, 100%).
spacer: User preferences might include: height (e.g., 20px).
subtext: User preferences might include: text, typography (typically smaller/lighter), align.
quote: User preferences might include: text, citation, typography (often italic), border (e.g., left border style), backgroundColor, align.
code: User preferences might include: code (the code string), language (e.g., javascript), typography (typically monospace), backgroundColor, borderRadius, padding (inner padding).
list: User preferences might include: items (array of strings), listType (ordered, unordered), typography, markerStyle.
icon: User preferences might include: src (URL or placeholder), altText, linkHref, linkTarget, width, height, align.
nav: User preferences might include: links (array of {text, href, target, typography_per_link}), layout_align (for the group of links), spacing_between_links, typography_default_for_all_links.
social: User preferences might include: links (array of {platform (facebook, twitter, etc., or custom), href, iconSrc_if_custom}), layout_align, spacing_between_icons, iconStyle (width, height, borderRadius).
appStoreBadge: User preferences might include: platform (apple-app-store, google-play-store), href (link to store), language, altText, width, height, align.
unsubscribe: User preferences might include: linkText, href (placeholder if not given), typography, align.
preferences: User preferences might include: linkText, href (placeholder if not given), typography, align.
previewText: User preferences: text (the hidden preview text for email clients).
container: User preferences might include: styles (backgroundColor, border, borderRadius, padding for the container itself).
box: User preferences might include: styles (backgroundColor, border, borderRadius, padding for the box content area, boxShadow - note poor support).
Adhere strictly to these ElementTypeV2 values when specifying the 'type' in elementsToProcess.
`;
    const systemPrompt = baseSystemPrompt + V2TypesInfo;

    // --- Construct Messages for AI ---
    const messagesForAI: Array<{role: 'system' | 'user' | 'assistant'; content: string}> = [
      { role: 'system', content: systemPrompt }
    ];

    // Add mainChatHistory, truncated if too long
    let currentTokenCount = estimateTokens(systemPrompt);
    if (payload.mainChatHistory) {
      for (let i = payload.mainChatHistory.length - 1; i >= 0; i--) {
        const msg = payload.mainChatHistory[i];
        const msgTokenCount = estimateTokens(msg.content);
        if (currentTokenCount + msgTokenCount < MAX_CHAT_HISTORY_TOKENS) {
          messagesForAI.splice(1, 0, { role: msg.role as 'user' | 'assistant', content: msg.content }); // Add to start after system prompt
          currentTokenCount += msgTokenCount;
        } else {
          console.log('Chat history truncated due to token limits.');
          break;
        }
      }
    }

    // Add ongoingClarificationContext if it exists
    if (payload.ongoingClarificationContext) {
      let contextText = '';
      try {
        contextText = typeof payload.ongoingClarificationContext === 'string' ? payload.ongoingClarificationContext : JSON.stringify(payload.ongoingClarificationContext);
      } catch (e) { contextText = 'Could not stringify previous context.'; }
      messagesForAI.push({ role: 'assistant', content: `Assistant summary from previous turn: ${contextText}` });
    }

    // Add current user message
    messagesForAI.push({ role: 'user', content: payload.userMessage });

    // Add currentSemanticEmailV2 context (summarized/stringified)
    if (payload.currentSemanticEmailV2) {
      try {
        const emailContextString = JSON.stringify(payload.currentSemanticEmailV2);
        const emailTokenCount = estimateTokens(emailContextString);
        let emailContextForPrompt = 'For context, here is the current email structure (JSON): \n';
        if (currentTokenCount + emailTokenCount < MAX_EMAIL_CONTEXT_TOKENS) { // Check against a combined limit or a specific one for email context
          emailContextForPrompt += emailContextString;
        } else {
          // Basic summarization: just take first N elements or sections if too long
          const summary = { ...payload.currentSemanticEmailV2, sections: payload.currentSemanticEmailV2.sections.slice(0, 2).map(s => ({...s, elements: s.elements.slice(0,3)})) };
          emailContextForPrompt += JSON.stringify(summary) + ' (summarized due to length)';
          console.log('Email context summarized due to token limits.');
        }
        // Insert it after system prompt, before chat history perhaps, or before last user message
        messagesForAI.splice(1, 0, {role: 'system', content: emailContextForPrompt}); 
      } catch (e) {
        console.warn('Could not stringify or summarize currentSemanticEmailV2 for prompt:', e);
      }
    }
    
    console.log('Final messagesForAI being sent (first few shown if long):', messagesForAI.slice(0,5).map(m => ({role: m.role, content: m.content.substring(0,100) + '...' })));

    // --- Make API Call to Clarification AI ---
    let rawAIOutputFromOpenAI: string | undefined;
    if (SIMULATION_MODE) {
      console.log("SIMULATION_MODE: Skipping OpenAI call, using predefined simulatedResponse.");
      rawAIOutputFromOpenAI = simulatedResponse;
    } else {
      try {
        const apiKey = Deno.env.get('OPENAI_API_KEY');
        if (!apiKey) {
          throw new Error('OPENAI_API_KEY environment variable is not set.');
        }
        console.log('Calling OpenAI API...');
        const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json', },
          body: JSON.stringify({ model: aiModel, messages: messagesForAI, temperature: 0.5, response_format: { type: "json_object" } }),
        });
        if (!openaiResponse.ok) {
          const errorBodyText = await openaiResponse.text();
          console.error("OpenAI API Error:", openaiResponse.status, errorBodyText);
          throw new Error(`OpenAI API error (${openaiResponse.status}): ${errorBodyText}`);
        }
        const responseData = await openaiResponse.json();
        rawAIOutputFromOpenAI = responseData.choices?.[0]?.message?.content?.trim();
        console.log('Raw AI Response Text from OpenAI:', rawAIOutputFromOpenAI);
        if (!rawAIOutputFromOpenAI || rawAIOutputFromOpenAI.length === 0) {
            console.warn("OpenAI returned empty or undefined content. Will use SIMULATION_FALLBACK.");
            rawAIOutputFromOpenAI = SIMULATION_FALLBACK; // Ensure it has a value for next steps
        }
      } catch (apiError) {
        console.error('Error calling AI API or processing its response initially:', apiError);
        rawAIOutputFromOpenAI = SIMULATION_FALLBACK; // Fallback on any API error
      }
    }

    // --- Process & Validate AI Response --- 
    let aiApiResponse: QuestionResponse | CompleteResponse;
    let jsonToParse = rawAIOutputFromOpenAI; // Start with the direct (or simulated) output

    // Strip markdown if not in SIMULATION_MODE (simulatedResponse should be clean JSON already)
    if (!SIMULATION_MODE && jsonToParse) { // only strip if not simulating and there's content
        const markdownJsonRegex = /^```json\s*([\s\S]*?)\s*```$/m;
        const markdownGenericRegex = /^```\s*([\s\S]*?)\s*```$/m;
        let match = markdownJsonRegex.exec(jsonToParse);
        if (match && match[1]) {
            jsonToParse = match[1].trim();
            console.log("Stripped ```json markdown. JSON to parse now:", jsonToParse);
        } else {
            match = markdownGenericRegex.exec(jsonToParse);
            if (match && match[1]) {
                jsonToParse = match[1].trim();
                console.log("Stripped ``` markdown. JSON to parse now:", jsonToParse);
            } else {
                 jsonToParse = jsonToParse.trim(); // Ensure it's trimmed even if no fences
            }
        }
        // If stripping results in an empty string, or if it was already SIMULATION_FALLBACK
        if (jsonToParse.length === 0 || jsonToParse === SIMULATION_FALLBACK) {
            console.warn("After potential stripping, content is empty or is the SIMULATION_FALLBACK string. Using defined SIMULATION_FALLBACK for parsing.");
            jsonToParse = SIMULATION_FALLBACK; 
        }
    } else if (!jsonToParse) { // Handles case where rawAIOutputFromOpenAI was undefined/empty initially
        console.warn("rawAIOutputFromOpenAI was initially empty/undefined. Using SIMULATION_FALLBACK.");
        jsonToParse = SIMULATION_FALLBACK;
    }

    try {
      console.log("Attempting to JSON.parse the following string:", jsonToParse);
      aiApiResponse = JSON.parse(jsonToParse);
      console.log("Successfully parsed AI JSON response:", JSON.stringify(aiApiResponse, null, 2));
    } catch (e) {
      console.error("Failed to parse final jsonToParse. Error:", e);
      console.error("Original raw output from OpenAI was:", rawAIOutputFromOpenAI);
      console.error("String attempted for parse was:", jsonToParse);
      // Construct a user-facing error if parsing fails definitively
      aiApiResponse = JSON.parse(SIMULATION_FALLBACK); // Parse the fallback as a last resort for structure
      // Update text to indicate parsing failure to the user
      if (aiApiResponse.status === 'requires_clarification' && aiApiResponse.question) {
          aiApiResponse.question.text = "I encountered an issue parsing the AI assistant's response. Could you please try rephrasing your request?";
          aiApiResponse.question.id = 'error_json_parse_final';
          aiApiResponse.aiSummaryForNextTurn = "Internal error: AI response parsing failed after stripping.";
      }
       return new Response(JSON.stringify(aiApiResponse), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
    }

    // Validate the structure of the successfully parsed aiApiResponse
    if (aiApiResponse.status === 'requires_clarification') {
      if (!aiApiResponse.question || typeof aiApiResponse.question.id !== 'string' || typeof aiApiResponse.question.text !== 'string' || typeof aiApiResponse.aiSummaryForNextTurn !== 'string') {
        throw new Error('Invalid "requires_clarification" structure from AI after parsing.');
      }
      if (aiApiResponse.question.suggestions && !Array.isArray(aiApiResponse.question.suggestions)) {
        throw new Error('Invalid suggestions format in "requires_clarification": not an array.');
      }
      if (aiApiResponse.question.suggestions) {
        for (const sug of aiApiResponse.question.suggestions) {
          if (typeof sug.text !== 'string' || typeof sug.value !== 'string') {
            throw new Error('Invalid suggestion item format in "requires_clarification".');
          }
        }
      }
      console.log('Successfully validated: requires_clarification');
    } else if (aiApiResponse.status === 'complete') {
      if (typeof aiApiResponse.perfectPrompt !== 'string' || !Array.isArray(aiApiResponse.elementsToProcess) || typeof aiApiResponse.finalSummary !== 'string') {
        throw new Error('Invalid "complete" structure from AI after parsing.');
      }
      // TODO: Could add deeper validation for elementsToProcess items if needed
      console.log('Successfully validated: complete');
    } else {
      throw new Error(`Unknown status from AI after parsing: ${(aiApiResponse as any).status}`);
    }

    // --- 6. Return AI's Validated JSON Response ---
    return new Response(JSON.stringify(aiApiResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error in clarify-user-intent function:', error);
    return new Response(JSON.stringify({ error: error.message || 'Internal Server Error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
}); 