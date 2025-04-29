
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { Configuration, OpenAIApi } from "https://esm.sh/openai@3.2.1"
import "https://deno.land/x/xhr@0.1.0/mod.ts"

// Get OpenAI API key from environment variable
const openAiKey = Deno.env.get('OPENAI_API_KEY')

// CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Initialize OpenAI API client
const configuration = new Configuration({
  apiKey: openAiKey,
})
const openai = new OpenAIApi(configuration)

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Parse request body
    const { prompt, currentTemplate, chatHistory } = await req.json()

    // If there's no API key, return an error
    if (!openAiKey) {
      return new Response(
        JSON.stringify({ 
          error: 'OpenAI API key not configured' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Prepare the system prompt
    const systemPrompt = `
      You are an email design assistant that helps users create and modify marketing emails.
      
      I will give you a JSON representation of an email template with the following structure:
      
      {
        "id": string,
        "name": string,
        "sections": [
          {
            "id": string,
            "elements": [
              {
                "id": string,
                "type": "header" | "text" | "button" | "image" | "divider",
                "content": string,
                "styles": { [key: string]: string }
              }
            ],
            "styles": { [key: string]: string }
          }
        ],
        "styles": { [key: string]: string },
        "version": number
      }
      
      When I ask you to make changes, you should return:
      1. A natural language explanation of what you changed
      2. An updated version of the JSON with the requested modifications
      
      Rules:
      - Add the property "pending": true and "pendingType": "add" | "edit" | "delete" to any elements you add, modify, or mark for deletion
      - Always preserve the IDs of existing elements and sections
      - Generate new unique IDs for new elements or sections
      - Ensure all styling properties use valid CSS values
      - Don't modify any parts of the template that weren't mentioned in my request
      - Make sure to retain the overall structure of the JSON
    `

    // Format chat history for context
    const formattedChatHistory = chatHistory && chatHistory.length > 0 
      ? chatHistory.map((msg: any) => ({
          role: msg.role || (msg.id % 2 === 0 ? "assistant" : "user"),
          content: msg.content
        }))
      : []

    // Create message array for OpenAI API
    const messages = [
      { role: "system", content: systemPrompt },
      // Add a message with the current template
      { 
        role: "system", 
        content: `Current email template JSON: ${JSON.stringify(currentTemplate, null, 2)}` 
      },
      // Add chat history for context
      ...formattedChatHistory,
      // Add the user's prompt
      { role: "user", content: prompt }
    ]

    // Make request to OpenAI
    const response = await openai.createChatCompletion({
      model: "gpt-4o", // Using GPT-4o for best results
      messages: messages,
      temperature: 0.7,
      max_tokens: 2500,
    })

    const aiResponse = response.data.choices[0].message?.content || ''

    // Extract JSON and explanation from AI response
    let updatedTemplate
    let explanation

    try {
      // Attempt to parse the JSON from the response
      const jsonMatch = aiResponse.match(/```json\n([\s\S]*?)\n```/)
      const jsonString = jsonMatch ? jsonMatch[1] : null

      if (jsonString) {
        updatedTemplate = JSON.parse(jsonString)
        
        // Extract explanation (text before or after JSON block)
        const parts = aiResponse.split(/```json\n[\s\S]*?\n```/)
        explanation = parts.join(' ').trim()
      } else {
        // If no JSON block is found, try to parse the whole response as JSON
        try {
          updatedTemplate = JSON.parse(aiResponse)
          explanation = "Template updated based on your request."
        } catch {
          // If that fails too, return an error
          throw new Error("Failed to parse AI response as JSON")
        }
      }
    } catch (error) {
      console.error("Error parsing AI response:", error)
      console.log("AI response:", aiResponse)
      
      return new Response(
        JSON.stringify({ 
          error: "Failed to parse AI response", 
          details: error.message 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Return the parsed JSON and explanation
    return new Response(
      JSON.stringify({
        explanation,
        updatedTemplate,
        rawAiResponse: aiResponse, // For debugging
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  } catch (error) {
    console.error("Error in generate-email-changes:", error)
    
    return new Response(
      JSON.stringify({ 
        error: error.message || "An error occurred processing your request" 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
