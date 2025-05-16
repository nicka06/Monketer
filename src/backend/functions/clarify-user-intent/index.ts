/**
 * Clarify User Intent - Edge Function
 * 
 * This edge function acts as an AI-powered conversation middleware that either:
 * 1. Asks clarifying questions when user intent is ambiguous, or
 * 2. Returns structured data when user intent is clear
 * 
 * It serves as a bridge between the user's natural language input and the 
 * structured data needed for email generation.
 */
// @ts-ignore: Deno/Supabase remote import, works at runtime
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeadersFactory } from '../_shared/lib/constants.ts';

// @ts-ignore: Shared types import
import type { EmailTemplate as EmailTemplateV2, ElementType as ElementTypeV2 } from '../../../shared/types/index.ts'; // Assuming index.ts re-exports them
// @ts-ignore: Shared types import
import type { ChatMessage } from '../../../shared/types/editor.ts'; // Corrected path

/**
 * Input payload for the clarify-user-intent function
 * Contains all context needed to understand the user's request
 */
interface ClarifyUserIntentPayload {
  userMessage: string;                              // Current message from the user
  mainChatHistory: ChatMessage[];                   // Previous conversation history
  currentSemanticEmailV2: EmailTemplateV2 | null;   // Current email being edited (if any)
  ongoingClarificationContext?: any;                // Context from previous clarification turns
  projectId: string | null;                         // Project ID for database operations
  mode: string;                                     // Current mode of operation ('ask', 'edit', or 'major')
}

/**
 * Response when further clarification is needed
 * Contains a question to ask the user and context for the next interaction
 */
interface QuestionResponse {
  status: 'requires_clarification';
  question: {
    id: string;                                     // Unique identifier for the question
    text: string;                                   // Question text to display to user
    suggestions?: Array<{ text: string; value: string }>; // Optional clickable suggestions
  };
  aiSummaryForNextTurn: string;                     // Context to be passed to the *AI* in the next interaction
  updatedClarificationContext: ClarificationContext; // Context (with incremented count) to be passed back to the *frontend* for the next interaction
}

/**
 * Response when user intent is fully understood
 * Contains structured data ready for email generation
 */
interface CompleteResponse {
  status: 'complete';
  perfectPrompt: string;                            // Clear summary of user's request
  elementsToProcess: Array<{
    type: ElementTypeV2;                            // Type of email element
    action: 'add' | 'modify' | 'delete';            // Action to perform
    userPreferences: Record<string, any>;           // User-specified properties and styles
    targetId?: string;                              // ID of element to modify/delete (if applicable)
    placeholderId?: string;                         // Temporary ID for new elements
  }>;
  finalSummary: string;                             // Human-readable summary of changes
}

// Token limits to prevent overloading the AI model
const MAX_CHAT_HISTORY_TOKENS = 2000;               // Limit for chat history context
const MAX_EMAIL_CONTEXT_TOKENS = 1500;              // Limit for email structure context

// Define the maximum number of clarification questions allowed
const MAX_CLARIFICATION_QUESTIONS = 8;

/**
 * Structure for the context passed between clarification turns.
 */
interface ClarificationContext {
  summary: string;
  questionCount: number;
}

/**
 * Helper function to roughly estimate token count for AI models
 * A simple approximation (1 token ≈ 4 characters)
 * 
 * @param text - Text to estimate token count for
 * @returns Estimated number of tokens
 */
function estimateTokens(text: string): number {
  // A simple approximation (1 token ≈ 4 characters) may not be accurate for all models.
  // Consider using a more sophisticated tokenizer library if precision is critical.
  return Math.ceil(text.length / 4);
}

// Add mode-specific prompts
const MODE_PROMPTS = {
  ask: `
When in 'ask' mode:
- The user is seeking information or clarification about the email
- DO NOT suggest or process any changes to the email
- Focus on understanding and answering their questions
- Your perfectPrompt should be a clear summary of their question
- elementsToProcess should be empty
- finalSummary should explain what information was provided
`,
  edit: `
When in 'edit' mode:
- The user wants to make specific, targeted changes to the email
- Focus on understanding exactly what element(s) they want to modify
- Your perfectPrompt should be a clear instruction for a specific change
- elementsToProcess should contain exactly one element with action: 'modify'
- finalSummary should describe the specific change being made
`,
  major: `
When in 'major' mode:
- The user wants to make significant changes to the email
- Focus on understanding the broader changes they want to make
- Your perfectPrompt should be a clear instruction for multiple changes
- elementsToProcess can contain multiple elements with various actions
- finalSummary should describe the overall transformation being made
`
};

// Main Edge Function handler
serve(async (req) => {
  // Handle OPTIONS request for CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeadersFactory(req.headers.get('origin')) });
  }

  try {
    // Ensure it's a POST request
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeadersFactory(req.headers.get('origin')), 'Content-Type': 'application/json' },
      });
    }

    // Parse request payload
    const payload: ClarifyUserIntentPayload = await req.json();

    // --- 1. Authentication (Placeholder) ---
    // TODO: Add Supabase client initialization and user authentication if needed
    // const authHeader = req.headers.get('Authorization');
    // const user = await getUserByCookie(req) or similar
    // if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeadersFactory(req.headers.get('origin')), 'Content-Type': 'application/json' } });

    console.log('Received payload:', payload);

    // --- 2. Select Clarification AI Model (Placeholder) ---
    const aiModel = 'gpt-4o-mini';                 // Define which AI model to use

    // --- 3. Construct System Prompt (Detailed system prompt will be complex) ---
    // The system prompt defines the AI's role, available element types, and expected response formats
    let baseSystemPrompt = `\nYour Role: You are an expert email design assistant. Your primary goal is to deeply and accurately understand the user\\\'s request for creating or modifying an email. If their request is ambiguous or lacks critical details, you MUST ask concise, targeted clarifying questions. Once all necessary information is gathered and the user\\\'s intent is clear, you will summarize the complete request into a \\\"perfect prompt\\\" and a structured list of \\\"elements to process\\\" that will be used by a separate Email Generation AI.\n\nYour Inputs for Analysis:\n1.  \\\`userMessage\\\`: The most recent message from the user.\n2.  \\\`mainChatHistory\\\`: The preceding conversation history (if any).\n3.  \\\`currentSemanticEmailV2\\\`: The JSON structure of the current email being edited (if any).\n4.  \\\`ongoingClarificationContext\\\`: A structured object containing \\\`summary\\\` from the previous turn and \\\`questionCount\\\`.\n5.  \\\`mode\\\`: The current mode of operation (\\\'ask\\\', \\\'edit\\\', or \\\'major\\\').\n\n${MODE_PROMPTS[payload.mode]}\n\nIMPORTANT CONTEXT HANDLING:\n- When users mention background colors, this refers to the email\\\'s global background (bodyBackgroundColor in globalStyles).\n- Always maintain style preferences (like colors, fonts, alignment) throughout the clarification flow.\n- Your aiSummaryForNextTurn MUST include ALL style preferences mentioned so far, even when asking about other details.\n\n**QUESTION STRATEGY:**\n- **Prioritize Broad Questions:** Start by asking broad questions about the overall goal, target audience, or main call to action. Only ask about specific details like fonts or exact padding *after* the main structure is clear, unless the user initiates the detail.\n- **Limit:** Aim to resolve ambiguity within a maximum of ${MAX_CLARIFICATION_QUESTIONS} clarification questions. Check the \\\`questionCount\\\` in the ongoing context. If you have reached the limit, you MUST provide a 'complete' response.\n\nELEMENT TYPES AND DEFAULTS:\nThe following are the available element types and their default properties. You MUST use these exact types and property structures:\n\nheader: {\n  layout: { align: 'center', padding: { top: '10px', bottom: '10px' } },
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
}\ntext: {\n  layout: { align: 'center', padding: { top: '5px', bottom: '5px' } },
  properties: { 
    text: string,
    typography: { 
      fontFamily: string | null,
      fontSize: string | null,
      fontWeight: string | null,
      fontStyle: string | null,
      color: string | null,
      lineHeight: '1.5'
    }
  }
}\nbutton: {\n  layout: { align: 'center', padding: { top: '10px', bottom: '10px' } },
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
}\nimage: {\n  layout: { align: 'center', padding: { top: '10px', bottom: '10px' } },
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
}\ndivider: {\n  layout: { padding: { top: '10px', bottom: '10px' } },
  properties: {
    divider: {
      color: string | null,
      height: string | null,
      width: string | null
    }
  }
}\nspacer: {\n  layout: {},
  properties: {
    spacer: {
      height: string
    }
  }
}\n\nYour Response MUST be one of two JSON object structures described below. Do NOT add any explanatory text outside of the JSON structure.\n\n// ---- RESPONSE OPTION 1: CLARIFICATION IS NEEDED ---- //\nIf the user's request is unclear, ambiguous, or missing information essential for generating or modifying email elements, you MUST ask for clarification.\n\nKey Instructions for Clarification:\n- Ask only ONE concise question at a time.\n- Your question should aim to resolve the most critical ambiguity first, following the **QUESTION STRATEGY** above.\n- Ensure your question is a logical continuation based on the \\\`ongoingClarificationContext.summary\\\` and the user\\\'s most recent answer.\n  **Do not repeat a question if the context shows it was already answered.**\n- For each question, if appropriate, provide 2-3 short, clickable \\\`suggestions\\\` (as \\\`{text: string, value: string}\\\` objects) that represent likely or common answers. The \\\`value\\\` should be what is sent back if the user clicks it.\n\nRequired JSON Structure for Clarification Response:\n\\\`\\\`\\\`json\n{\n  \\\"status\\\": \\\"requires_clarification\\\",\n  \\\"question\\\": {\n    \\\"id\\\": \\\"q_unique_identifier_for_this_question\\\",\n    \\\"text\\\": \\\"Your concise clarifying question here?\\\",\n    \\\"suggestions\\\": [\n      {\\\"text\\\": \\\"Suggested Answer A\\\", \\\"value\\\": \\\"value_for_a\\\"},\n      {\\\"text\\\": \\\"Suggested Answer B\\\", \\\"value\\\": \\\"value_for_b\\\"}\n    ]\n  },\n  \\\"aiSummaryForNextTurn\\\": \\\"A brief summary reflecting your NEW understanding AFTER processing the user\'s current answer. \\\nCritically, this summary MUST incorporate ALL style preferences and design choices mentioned so far, \\\nincluding colors, fonts, alignments, etc. Then state what specific information is STILL missing or \\\nwhat the NEXT most critical ambiguity is that your NEW question (above) aims to resolve. \\\nThis summary will be provided back to you as the \'summary\' part of ongoingClarificationContext \\\nin the next interaction. If the user\'s answer fully resolves your previous point of confusion, \\\nthis summary must reflect that, and your next question should move to a new topic of ambiguity.\\\"\n}\n\\\`\\\`\\\`\n\n// ---- RESPONSE OPTION 2: CLARIFICATION COMPLETE / REQUEST IS CLEAR ---- //\nIf you are confident that you have all the necessary details from the \\\`userMessage\\\` (potentially augmented by \\\`mainChatHistory\\\`, \\\`currentSemanticEmailV2\\\`, or previous clarification turns via \\\`ongoingClarificationContext\\\`) and the user's intent is clear, respond with a completion object:\n\nRequired JSON Structure for Completion Response:\n\`\`\`json\n{\n  \"status\": \"complete\",\n  \"perfectPrompt\": \"A concise, clear summary of the user\'s complete request\",\n  \"elementsToProcess\": [\n    {\n      \"type\": \"header\" | \"text\" | \"button\" | \"image\" | \"divider\" | \"spacer\",\n      \"action\": \"add\" | \"modify\" | \"delete\",\n      \"userPreferences\": {\n        // Must match the exact structure from ELEMENT TYPES AND DEFAULTS above\n        // Example for a header:\n        \"layout\": { \"align\": \"center\", \"padding\": { \"top\": \"10px\", \"bottom\": \"10px\" } },\n        \"properties\": {\n          \"level\": \"h1\",\n          \"text\": \"Example Header\",\n          \"typography\": {\n            \"fontFamily\": null,\n            \"fontSize\": null,\n            \"fontWeight\": null,\n            \"fontStyle\": null,\n            \"color\": null,\n            \"textAlign\": \"center\",\n            \"lineHeight\": null\n          }\n        }\n      },\n      \"targetId\": \"optional-target-id\",\n      \"placeholderId\": \"optional-placeholder-id\"\n    }\n    // ... more elements if needed ...\n  ],\n  \"finalSummary\": \"A summary of all the changes to be made\"\n}\n\`\`\`\n`;

    // Append V2 Type Definitions and key user preferences hints
    // This section provides additional guidance about element types and properties
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
    const systemPrompt = baseSystemPrompt + V2TypesInfo;  // Combine both prompt sections

    // --- 4. Construct Messages for AI ---
    // Build the conversation context for the AI model
    const messagesForAI: Array<{role: 'system' | 'user' | 'assistant'; content: string}> = [
      { role: 'system', content: systemPrompt }  // Start with system instructions
    ];

    // --- 5. Add Chat History Context ---
    // Include previous conversation, truncated if too long
    let currentTokenCount = estimateTokens(systemPrompt);
    if (payload.mainChatHistory) {
      for (let i = payload.mainChatHistory.length - 1; i >= 0; i--) {
        const msg = payload.mainChatHistory[i];
        const msgTokenCount = estimateTokens(msg.content);
        // Check if adding this message would exceed our token limit
        if (currentTokenCount + msgTokenCount < MAX_CHAT_HISTORY_TOKENS) {
          // Add to start of messages (after system prompt)
          messagesForAI.splice(1, 0, { role: msg.role as 'user' | 'assistant', content: msg.content });
          currentTokenCount += msgTokenCount;
        } else {
          console.log('Chat history truncated due to token limits.');
          break;
        }
      }
    }

    // --- 6. Process Clarification Context & Question Count ---
    let currentQuestionCount = 0;
    let previousSummary = 'No previous clarification context.';

    if (payload.ongoingClarificationContext) {
      try {
        let parsedContext: Partial<ClarificationContext> = {};
        if (typeof payload.ongoingClarificationContext === 'string') {
          // Attempt to parse if it's a JSON string
          parsedContext = JSON.parse(payload.ongoingClarificationContext);
        } else if (typeof payload.ongoingClarificationContext === 'object' && payload.ongoingClarificationContext !== null) {
          // Use directly if it's already an object
          parsedContext = payload.ongoingClarificationContext;
        }
        
        if (parsedContext.summary && typeof parsedContext.summary === 'string') {
            previousSummary = parsedContext.summary;
        }
        if (parsedContext.questionCount && typeof parsedContext.questionCount === 'number') {
            currentQuestionCount = parsedContext.questionCount;
        }
        console.log(`[Context] Extracted question count: ${currentQuestionCount}, Previous summary: ${previousSummary.substring(0, 50)}...`);

      } catch (e) {
        console.warn('Could not parse ongoingClarificationContext, treating as simple string or resetting count.', e);
        // Fallback: Treat the whole context as the summary string if parsing fails
        previousSummary = typeof payload.ongoingClarificationContext === 'string' 
            ? payload.ongoingClarificationContext 
            : 'Could not interpret previous context.';
        currentQuestionCount = 0; // Reset count if context is unparseable
      }
       // Add parsed previous summary as an assistant message
       messagesForAI.push({ role: 'assistant', content: `Assistant summary from previous turn: ${previousSummary}` });
       // Add current question count for AI awareness (as system message for emphasis)
       messagesForAI.push({ role: 'system', content: `Internal Note: Current question count is ${currentQuestionCount} (max ${MAX_CLARIFICATION_QUESTIONS}).` });
    } else {
        messagesForAI.push({ role: 'system', content: `Internal Note: Current question count is 0 (max ${MAX_CLARIFICATION_QUESTIONS}). No previous clarification context provided.` });
    }

    // --- 7. Add Current User Message ---
    messagesForAI.push({ role: 'user', content: payload.userMessage });

    // --- 8. Add Current Email Context ---
    // If editing an existing email, include its structure for context
    if (payload.currentSemanticEmailV2) {
      try {
        const emailContextString = JSON.stringify(payload.currentSemanticEmailV2);
        const emailTokenCount = estimateTokens(emailContextString);
        let emailContextForPrompt = 'For context, here is the current email structure (JSON): \n';
        
        // Check if full email context would exceed token limits
        if (currentTokenCount + emailTokenCount < MAX_EMAIL_CONTEXT_TOKENS) {
          emailContextForPrompt += emailContextString;
        } else {
          // Create a summarized version of the email structure if too large
          const summary = { 
            ...payload.currentSemanticEmailV2, 
            sections: payload.currentSemanticEmailV2.sections.slice(0, 2).map(s => ({
              ...s, 
              elements: s.elements.slice(0,3)
            }))
          };
          emailContextForPrompt += JSON.stringify(summary) + ' (summarized due to length)';
          console.log('Email context summarized due to token limits.');
        }
        
        // Insert email context after system prompt
        messagesForAI.splice(1, 0, {role: 'system', content: emailContextForPrompt}); 
      } catch (e) {
        console.warn('Could not stringify or summarize currentSemanticEmailV2 for prompt:', e);
      }
    }
    
    // Log the messages being sent to the AI (truncated for readability)
    console.log('Final messagesForAI being sent (first few shown if long):', 
      messagesForAI.slice(0,5).map(m => ({
        role: m.role, 
        content: m.content.substring(0,100) + '...' 
      }))
    );

    // --- 8.5. Enforce Question Limit (Before API Call) ---
    if (currentQuestionCount >= MAX_CLARIFICATION_QUESTIONS) {
      console.log(`[Limit] Question limit (${MAX_CLARIFICATION_QUESTIONS}) reached. Forcing 'complete' response.`);
      // Add a strong directive to the AI to provide a complete response
      messagesForAI.push({ 
        role: 'system', 
        content: `You have reached the maximum question limit (${MAX_CLARIFICATION_QUESTIONS}). You MUST now provide a 'complete' response based on the information gathered so far, making reasonable assumptions where necessary. Do NOT ask another question.`
      });
      // Optionally, could modify the main system prompt here specifically for this call too
    }

    // --- 9. Make API Call to Clarification AI ---
    // @ts-ignore: Deno global is available at runtime in Supabase Edge Functions
    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not set.');
    }
    
    console.log('Calling OpenAI API...');
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        model: aiModel, 
        messages: messagesForAI, 
        temperature: 0.5,
        response_format: { type: "json_object" }
      }),
    });
    
    if (!openaiResponse.ok) {
      const errorBodyText = await openaiResponse.text();
      console.error("OpenAI API Error:", openaiResponse.status, errorBodyText);
      throw new Error(`OpenAI API error (${openaiResponse.status}): ${errorBodyText}`);
    }
    
    const responseData = await openaiResponse.json();
    const rawAIOutput = responseData.choices?.[0]?.message?.content?.trim();
    
    if (!rawAIOutput) {
      throw new Error('OpenAI returned empty response');
    }

    // --- 10. Process & Validate AI Response --- 
    let aiApiResponse: QuestionResponse | CompleteResponse;
    let jsonToParse = rawAIOutput;

    // Strip markdown if present
    const markdownJsonRegex = /^```json\s*([\s\S]*?)\s*```$/m;
    const markdownGenericRegex = /^```\s*([\s\S]*?)\s*```$/m;
    
    let match = markdownJsonRegex.exec(jsonToParse);
    if (match && match[1]) {
      jsonToParse = match[1].trim();
    } else {
      match = markdownGenericRegex.exec(jsonToParse);
      if (match && match[1]) {
        jsonToParse = match[1].trim();
      }
    }

    try {
      aiApiResponse = JSON.parse(jsonToParse);
    } catch (e) {
      console.error("Failed to parse AI response:", e);
      throw new Error('Failed to parse AI response. Please try again.');
    }

    // --- 11. Validate Response Structure ---
    // Ensure the AI response matches our expected interface structure
    if (aiApiResponse.status === 'requires_clarification') {
      // Validate clarification question structure
      if (!aiApiResponse.question || 
          typeof aiApiResponse.question.id !== 'string' || 
          typeof aiApiResponse.question.text !== 'string' || 
          typeof aiApiResponse.aiSummaryForNextTurn !== 'string') {
        throw new Error('Invalid clarification response structure from AI');
      }
      
      if (aiApiResponse.question.suggestions) {
        if (!Array.isArray(aiApiResponse.question.suggestions)) {
          throw new Error('Invalid suggestions format');
        }
        
        for (const sug of aiApiResponse.question.suggestions) {
          if (typeof sug.text !== 'string' || typeof sug.value !== 'string') {
            throw new Error('Invalid suggestion item format');
          }
        }
      }

      // *** Add the updated context for the frontend ***
      aiApiResponse.updatedClarificationContext = {
        summary: aiApiResponse.aiSummaryForNextTurn,
        questionCount: currentQuestionCount + 1 // Increment the count
      };

    } else if (aiApiResponse.status === 'complete') {
      if (typeof aiApiResponse.perfectPrompt !== 'string' || 
          !Array.isArray(aiApiResponse.elementsToProcess) || 
          typeof aiApiResponse.finalSummary !== 'string') {
        throw new Error('Invalid completion response structure');
      }

      // Mode-specific validation
      if (payload.mode === 'ask') {
        if (aiApiResponse.elementsToProcess.length > 0) {
          throw new Error('Ask mode should not include any elements to process');
        }
      } else if (payload.mode === 'edit') {
        if (aiApiResponse.elementsToProcess.length !== 1 ||
            (aiApiResponse.elementsToProcess[0].action !== 'modify' && aiApiResponse.elementsToProcess[0].action !== 'add')) {
          throw new Error('Edit mode should include exactly one modify or add action');
        }
      }
    } else {
      throw new Error(`Unknown response status: ${(aiApiResponse as any).status}`);
    }

    // --- 12. Return AI's Validated JSON Response ---
    return new Response(JSON.stringify(aiApiResponse), {
      headers: { ...corsHeadersFactory(req.headers.get('origin')), 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error in clarify-user-intent function:', error);
    return new Response(JSON.stringify({ 
      error: 'An error occurred while processing your request. Please try again.' 
    }), {
      headers: { ...corsHeadersFactory(req.headers.get('origin')), 'Content-Type': 'application/json' },
      status: 500,
    });
  }
}); 