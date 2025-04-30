
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Get the OpenAI API key from environment variables
const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

// CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse the request body
    const { prompt, currentTemplate, chatHistory } = await req.json();
    
    console.log("Received prompt:", prompt);
    console.log("Processing request with template version:", currentTemplate.version);

    // Format chat history for context
    const formattedChatHistory = chatHistory.map((msg: any) => ({
      role: msg.role || 'user',
      content: msg.content
    }));

    // Create system prompt
    const systemPrompt = `You are an AI assistant that helps users create and modify email templates.
Your job is to interpret the user's instructions and modify the current email template accordingly.
You should return both an explanation of what you did and an updated version of the template.

The template is a JSON object with the following structure:
- id: a unique identifier for the template
- name: the name of the template
- sections: an array of sections, each with elements
- styles: global styles for the template
- version: the version number of the template

Each section can contain multiple elements, which can be:
- header: a heading element
- text: a paragraph of text
- button: a call-to-action button
- image: an image
- divider: a horizontal divider

When adding or modifying elements, mark them with "pending: true" and "pendingType" as one of:
- "add": for new elements
- "edit": for modified elements
- "delete": for elements to be removed

DO NOT modify elements without marking them as pending.`;

    // Create messages array with system prompt, chat history, and current user prompt
    const messages = [
      { role: "system", content: systemPrompt },
      ...formattedChatHistory,
      { role: "user", content: `Current template: ${JSON.stringify(currentTemplate)}\n\nInstruction: ${prompt}` }
    ];

    console.log("Sending request to OpenAI...");
    
    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: messages,
        temperature: 0.7,
        max_tokens: 2500,
      }),
    });

    // Check for API errors
    if (!response.ok) {
      const errorData = await response.json();
      console.error("OpenAI API error:", errorData);
      throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    // Parse the response
    const data = await response.json();
    console.log("Received response from OpenAI");

    // Extract the content from OpenAI's response
    const aiResponse = data.choices[0].message.content;
    console.log("AI Response:", aiResponse);

    // Try to extract JSON and explanation from the response
    let updatedTemplate = currentTemplate;
    let explanation = "I've processed your request.";

    try {
      // Look for JSON in the response
      const jsonMatch = aiResponse.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch && jsonMatch[1]) {
        // Parse the JSON template
        updatedTemplate = JSON.parse(jsonMatch[1]);
        
        // Extract explanation (text before or after the JSON)
        const parts = aiResponse.split(/```json\n[\s\S]*?\n```/);
        explanation = parts.join(' ').trim();
      } else {
        // If no JSON block is found, use a simpler extraction method
        // This assumes the AI might return just an explanation without JSON
        // In a real app, you'd want more robust parsing
        explanation = aiResponse;
        console.log("No JSON found in response, using explanation only");
      }
    } catch (error) {
      console.error("Error parsing AI response:", error);
      explanation = "I processed your request but had trouble formatting the response. Here's what I understood: " + aiResponse;
    }

    // Return the processed response
    return new Response(
      JSON.stringify({
        explanation,
        updatedTemplate
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in generate-email-changes function:', error);
    
    return new Response(
      JSON.stringify({
        error: error.message || 'An unexpected error occurred',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
