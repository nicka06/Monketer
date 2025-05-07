import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { ElementType, EmailTemplate, EmailElement, validateEmailTemplateV2, EmailSection } from '../_shared/types/v2/index.ts';
import { elementDefaults, createNewElement } from '../_shared/types/config/elementDefaults.ts';
import { HtmlGeneratorV2 } from '../_shared/services/v2/htmlGenerator.ts';

console.log('generate-email-v2 function booting up');

// Get environment variables
const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseAnonKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'); // Use service role for backend updates
 
// Define AISkeletonElement as an intersection type
type AISkeletonElement = EmailElement & {
  instructions?: string;
};

interface AIProcessedElement {
    id: string; // ID of the element processed (must match one from input)
    type: ElementType;
    content?: string; // AI generated/updated content
    properties?: any; // AI generated/updated properties, should conform to ElementType properties
    // AI should NOT change layout or add new elements not requested explicitly in elementsToProcess
}

interface GenerateEmailV2Payload {
  perfectPrompt: string;
  elementsToProcess: Array<{
    elementType: ElementType;
    id?: string; // ID if modifying an existing element
    targetSectionId?: string; // Optional: To specify which section to add to/modify in
    instructions?: string; // Specific hints from Clarification AI for this element
    [key: string]: any; // Allow other passthrough like content for buttons etc.
  }>;
  currentSemanticEmailV2?: EmailTemplate | null;
  projectId: string;
  newTemplateName?: string; // Optional: if a new name is suggested by clarification
}

// Define a more specific response type later, for now, it will be the new EmailTemplateV2
type GenerateEmailV2Response = EmailTemplate;

serve(async (req: Request) => {
  // Handle OPTIONS request for CORS preflight
  if (req.method === 'OPTIONS') {
    console.log('OPTIONS request received for generate-email-v2');
    return new Response('ok', { headers: corsHeaders });
  }

  if (!openAIApiKey || !supabaseUrl || !supabaseAnonKey) {
    console.error('Missing environment variables');
    return new Response(JSON.stringify({ error: 'Server configuration error.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }

  try {
    const payload: GenerateEmailV2Payload = await req.json();
    console.log('[generate-email-v2] Received payload:', JSON.stringify(payload, null, 2));

    const supabase = createClient(supabaseUrl!, supabaseAnonKey!, {
        auth: { persistSession: false }
    });
    
    // TODO: Proper user authentication if needed for specific logic beyond project authorization
    // For now, projectId in payload is used to scope database operations.

    let emailTemplateToUpdate: EmailTemplate;
    if (payload.currentSemanticEmailV2) {
      emailTemplateToUpdate = JSON.parse(JSON.stringify(payload.currentSemanticEmailV2));
      console.log('[generate-email-v2] Starting with existing EmailTemplateV2.');
    } else {
      emailTemplateToUpdate = {
        id: payload.projectId,
        name: payload.newTemplateName || payload.perfectPrompt.substring(0, 50) || 'Generated Email',
        version: 2,
        sections: [],
        globalStyles: {
            contentWidth: '600px',
            bodyBackgroundColor: '#FFFFFF'
        },
      };
      console.log('[generate-email-v2] Creating new EmailTemplateV2 as none was provided.');
    }
    if (payload.newTemplateName && emailTemplateToUpdate.name !== payload.newTemplateName) {
        emailTemplateToUpdate.name = payload.newTemplateName;
    }

    const skeletonElementsForAI: AISkeletonElement[] = payload.elementsToProcess.map(elSpec => {
        // elSpec.type is the 'type', elSpec.properties contains the userPreferences for this element
        const baseElementWithAllDefaults = createNewElement(elSpec.type);
        
        // Merge userPreferences (elSpec.properties) onto the full default structure.
        // Also, other fields like id, content, instructions from elSpec should be used.
        const skeleton: AISkeletonElement = {
            ...baseElementWithAllDefaults, // Start with full defaults
            id: elSpec.id || baseElementWithAllDefaults.id, // Use provided ID or new one from default
            type: elSpec.type, // Changed from elSpec.elementType - This is crucial, it's from the input
            // Merge specific properties from elSpec (userPreferences) onto the default properties
            properties: {
                ...baseElementWithAllDefaults.properties,
                ...(elSpec.properties || {}), 
            },
            // Use content from elSpec if provided, otherwise from default (which createNewElement might set based on type)
            content: elSpec.content !== undefined ? elSpec.content : baseElementWithAllDefaults.content,
            instructions: elSpec.instructions,
        };
        return skeleton;
    });

    if (skeletonElementsForAI.length === 0) {
      console.warn('[generate-email-v2] No elements to process. Returning current template.');
      const finalHtmlNoElements = new HtmlGeneratorV2().generate(emailTemplateToUpdate);
      await supabase.from('projects').update({ semantic_email_v2: emailTemplateToUpdate, current_html: finalHtmlNoElements, name: emailTemplateToUpdate.name }).eq('id', payload.projectId);
      return new Response(JSON.stringify(emailTemplateToUpdate), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
    }

    const systemPrompt = `You are an AI Email Element Generator. Your primary task is to process an array of \"element skeletons\" based on an overall \"perfectPrompt\" (user\'s goal) and specific \\\`instructions\\\` for each element. You MUST return a JSON array of \"processed elements\".\nEach object in your output array MUST be an \\\`AIProcessedElement\\\` and correspond to an element in the input skeleton array, using the exact same \\\`id\\\`.\n\n**IMPORTANT: You are receiving \"skeletonElements\" that are ALREADY FULLY STRUCTURED. Each skeleton already contains ALL possible property keys for its element type, populated with default values or user-specified values. Your main job is to intelligently UPDATE the values of these properties based on the perfectPrompt and instructions, and to ensure your output for each element MAINTAINS this complete structure.**\n\n**IMPORTANT DEFAULT BEHAVIOR: Unless the perfectPrompt or specific element instructions explicitly state a different alignment (e.g., \"align left\", \"make this text right-aligned\"), you MUST ensure all elements are center-aligned. This means setting the appropriate layout properties for centering (e.g., \\\`layout.align = \'center\'\\\` for block elements, or using table-based centering for email compatibility where necessary if you have control over raw HTML structure, though you primarily control JSON properties). If an element type inherently doesn\'t support direct centering via a simple \\\`layout.align\\\` (like an image without a wrapping container), aim for a visually centered appearance within its given space.**\n\nFor each element skeleton, you will populate or update its \\\`content\\\` and \\\`properties\\\` fields. \nStrictly adhere to the V2 EmailElement type definitions (implicitly provided by the structure of the skeleton).\n\n**CRITICAL OUTPUT REQUIREMENT FOR PROPERTIES: For every element you process and include in your output array, its \\\`properties\\\` object MUST contain ALL keys that were present in the input skeleton you received for that element. You are updating values, not adding or removing keys from the properties object or any nested objects within properties (like typography, button, image etc.).\\n- If a specific value for a property is determined by the \`perfectPrompt\` or \`instructions\`, use that value.\\n- If a property is part of a sub-object (e.g., \`typography.fontSize\`), ensure the parent object (e.g., \`typography\`) is also present, itself containing all its defined keys, using null or appropriate defaults for unspecified sub-keys (as per the input skeleton structure you received).\\n- For any property key where a specific value is NOT determined or applicable from the user\'s request, you MUST still include the key in the \`properties\` object. For such keys, assign a value of \`null\` IF AND ONLY IF the original skeleton had \`null\` or if \`null\` is the semantically correct update. Otherwise, RETAIN THE DEFAULT VALUE from the skeleton you received if no update is needed. Do NOT arbitrarily change defaults to null if no instruction implies it.**\\n\nExamples of properties to focus on (always ensuring full structure as per above):\n- For \\\`type: \'header\'\\\`, fill \\\`properties.text\\\` (the header text itself) and potentially \\\`properties.level\\\` (e.g., \'h1\', \'h2\'). The \\\`content\\\` field should mirror \\\`properties.text\\\`.\n- For \\\`type: \'text\'\\\`, fill \\\`properties.text\\\` (the paragraph content). The \\\`content\\\` field should mirror \\\`properties.text\\\`.\n- For \\\`type: \'button\'\\\`, fill \\\`properties.button.text\\\` (button label) and \\\`properties.button.href\\\`. The \\\`content\\\` field should mirror \\\`properties.button.text\\\`. If no URL is implied by prompt/instructions, use \'#\' for \`href\`. Ensure the entire \`button\` object within properties is present with all its keys.\n- For \\\`type: \'image\'\\\`, if \\\`properties.image.src\\\` is missing, a placeholder, or a new image is implied, set \\\`properties.image.src\\\` to \"@@PLACEHOLDER_IMAGE@@\". Always ensure \\\`properties.image.width\\\` and \\\`properties.image.height\\\` are set. The \\\`content\\\` field can be alt text or a brief description. Ensure the entire \`image\` object within properties is present with all its keys.\n- For other types like \\\`spacer\\\`, \\\`divider\\\`, only update properties if explicitly instructed or strongly implied by the perfectPrompt for that element type, but still ensure all their defined property keys are present with values from the input skeleton (or null if appropriate) if not specified.\n
Your entire response MUST be ONLY a single, valid JSON array of these processed AIProcessedElement objects: \\\`Array<AIProcessedElement>\\\`, where each object is \\\`{ id: string, type: ElementType, content?: string, properties?: any }\\\`. **Even if you process only one element, it MUST be enclosed in square brackets as a single-element array, like this: [ { \\\"id\\\": \\\"...\\\": ... } ].**\nDo NOT include any explanations, markdown, or any characters outside this JSON array. Make sure string values within the JSON are properly escaped.`;

    const userMessagePayload = {
        perfectPrompt: payload.perfectPrompt,
        skeletonElements: skeletonElementsForAI
    };

    const messagesForAI = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: JSON.stringify(userMessagePayload, null, 2) } // Send structured payload as user message
    ];
    
    console.log('[generate-email-v2] Sending to OpenAI. Number of elements to process:', skeletonElementsForAI.length);
    // console.log('[generate-email-v2] AI Request Messages:', JSON.stringify(messagesForAI, null, 2));

    const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${openAIApiKey}` },
        body: JSON.stringify({ model: "gpt-4o-mini", messages: messagesForAI, temperature: 0.3, response_format: { type: "json_object" } }),
    });

    if (!aiResponse.ok) {
        const errorBody = await aiResponse.text();
        console.error('[generate-email-v2] OpenAI API Error:', aiResponse.status, errorBody);
        throw new Error(`OpenAI API request failed: ${aiResponse.status} ${errorBody}`);
    }

    const aiResult = await aiResponse.json();
    const aiJsonString = aiResult.choices?.[0]?.message?.content?.trim();
    if (!aiJsonString) {
        console.error('[generate-email-v2] OpenAI returned empty or invalid content object:', aiResult.choices?.[0]?.message);
        throw new Error('OpenAI returned empty or invalid content.');
    }
    
    let processedElementsFromAI: AIProcessedElement[] = [];

    if (skeletonElementsForAI.length > 0) {
        console.log('[generate-email-v2] Raw AI JSON string:', aiJsonString);

        try {
            const parsedJson = JSON.parse(aiJsonString);
            if (Array.isArray(parsedJson)) {
                processedElementsFromAI = parsedJson;
            } else if (parsedJson && typeof parsedJson === 'object' && (Array.isArray(parsedJson.processedElements) || Array.isArray(parsedJson.elements) || Array.isArray(parsedJson.result))) {
                // Handle cases where AI might wrap the array in an object like { "processedElements": [...] }
                processedElementsFromAI = parsedJson.processedElements || parsedJson.elements || parsedJson.result;
            } else {
                console.error('[generate-email-v2] AI response was not a JSON array or a known wrapped array structure. Received:', parsedJson);
                throw new Error('AI response did not match expected array structure.');
            }
            // Basic validation of the processed elements array
            if (!Array.isArray(processedElementsFromAI) || !processedElementsFromAI.every(el => el && typeof el.id === 'string' && typeof el.type === 'string')) {
                console.error('[generate-email-v2] Parsed AI element array is invalid or contains malformed elements.', processedElementsFromAI);
                throw new Error('AI returned a malformed array of processed elements.');
            }
        } catch (e) {
            console.error("[generate-email-v2] Failed to parse AI JSON response or structure invalid:", e, "Raw string was:", aiJsonString);
            throw new Error(`AI response parsing failed: ${e.message}`);
        }
        console.log('[generate-email-v2] Successfully parsed processed elements from AI:', processedElementsFromAI.length);
    } else {
        console.log('[generate-email-v2] No skeleton elements to process. Skipping AI call.');
    }

    // ----- SAFETY NET POST-PROCESSING & MERGE ----- 
    const finalProcessedElements: EmailElement[] = [];

    for (const aiProcessedEl of processedElementsFromAI) {
        if (!aiProcessedEl.id || !aiProcessedEl.type) {
            console.warn('[generate-email-v2] Skipping an AI processed element due to missing id or type:', aiProcessedEl);
            continue;
        }

        // 1. Get a fresh, complete default scaffold for this element type.
        const defaultScaffold = createNewElement(aiProcessedEl.type);

        // 2. Create the properties object, ensuring all keys from the default scaffold are present.
        // Start with the default scaffold's properties, then merge AI properties onto it.
        const finalProperties: any = {
            ...defaultScaffold.properties,
            ...(aiProcessedEl.properties || {}),
        };
        
        // For nested properties (like typography, button, image), ensure all their sub-keys are also preserved.
        // This requires a slightly more careful merge if the AI might return partial nested objects.
        // Cast defaultScaffold.properties to any for these checks to avoid TS union type errors.
        const defaultPropsAny = defaultScaffold.properties as any;
        const aiPropsAny = aiProcessedEl.properties as any || {};

        // Example for a common nested property: typography
        if (defaultPropsAny.typography && typeof defaultPropsAny.typography === 'object') {
            finalProperties.typography = {
                ...defaultPropsAny.typography,
                ...(aiPropsAny.typography || {}),
            };
        }
        // Example for button properties
        if (defaultPropsAny.button && typeof defaultPropsAny.button === 'object') {
            finalProperties.button = {
                ...defaultPropsAny.button,
                ...(aiPropsAny.button || {}),
            };
        }
        // Example for image properties
        if (defaultPropsAny.image && typeof defaultPropsAny.image === 'object') {
            finalProperties.image = {
                ...defaultPropsAny.image,
                ...(aiPropsAny.image || {}),
            };
        }
        // Add more for other known nested structures if necessary (e.g., divider.divider, spacer.spacer, icon.icon, etc.)
        // A generic deep merge utility would be more robust here if nested structures are many or complex.
        // For now, explicitly handling common ones.
        const commonNestedKeys = ['divider', 'spacer', 'icon', 'link', 'badge']; // from elementDefaults
        for (const key of commonNestedKeys) {
            if (defaultPropsAny[key] && typeof defaultPropsAny[key] === 'object') {
                 finalProperties[key] = {
                    ...(defaultPropsAny[key] as object),
                    ...(aiPropsAny[key] || {}),
                };
            }
        }


        // 3. Determine content. Use AI content if provided, otherwise fallback to default.
        // createNewElement populates a sensible .content based on type and default properties.
        const finalContent = aiProcessedEl.content !== undefined ? aiProcessedEl.content : defaultScaffold.content;

        // 4. Find the original skeleton to get layout and other non-AI-modified fields.
        const originalSkeleton = skeletonElementsForAI.find(sk => sk.id === aiProcessedEl.id);

        finalProcessedElements.push({
            id: aiProcessedEl.id,
            type: aiProcessedEl.type,
            content: finalContent,
            properties: finalProperties,
            layout: originalSkeleton?.layout || defaultScaffold.layout || {}, // Fallback to skeleton, then default, then empty
        } as unknown as EmailElement); // More forceful cast
    }
    // ----- END SAFETY NET POST-PROCESSING & MERGE -----

    // Merge AI processed elements back into emailTemplateToUpdate
    // NOW USE finalProcessedElements instead of processedElementsFromAI
    for (const finalEl of finalProcessedElements) {
      let elementUpdated = false;
      // Ensure finalEl.id exists (already checked, but good practice)
      if (!finalEl.id) {
          console.warn('[generate-email-v2] Skipping a final processed element because it lacks an ID:', finalEl);
          continue;
      }
      for (const section of emailTemplateToUpdate.sections) {
        const elIndex = section.elements.findIndex(e => e.id === finalEl.id);
        if (elIndex !== -1) {
          const originalElement = section.elements[elIndex]; // This is what's currently in the template
          section.elements[elIndex] = {
            ...originalElement, // Keep original fields not explicitly set below
            type: finalEl.type, 
            content: finalEl.content,
            properties: finalEl.properties // These are now guaranteed to be complete
            // layout is part of originalElement or set from finalEl if it was a new element through skeleton
          } as unknown as EmailElement; // More forceful cast
          elementUpdated = true;
          console.log(`[generate-email-v2] Updated existing element ID: ${finalEl.id} with fully scaffolded properties.`);
          break;
        }
      }
      if (!elementUpdated) {
        // This element was in elementsToProcess but not found in current sections; treat as new.
        // Its data (id, type, content, properties, layout) is already fully prepared in finalEl.
        const originalInputSpec = payload.elementsToProcess.find(ep => ep.id === finalEl.id || (ep.elementType === finalEl.type && !ep.id)); // Match by id or by type for truly new elements
        let targetSectionId = originalInputSpec?.targetSectionId;
        let targetSection = emailTemplateToUpdate.sections.find(s => s.id === targetSectionId);

        if (!targetSection) {
            if (emailTemplateToUpdate.sections.length > 0) {
                targetSection = emailTemplateToUpdate.sections[0]; // Default to first section
            } else {
                const newSectionId = `sec_${crypto.randomUUID().substring(0,8)}`;
                const newSection: EmailSection = { id: newSectionId, elements: [], styles: { padding: { top: '10px', bottom: '10px' } } };
                emailTemplateToUpdate.sections.push(newSection);
                targetSection = newSection;
            }
        }
        if (targetSection) { 
            targetSection.elements.push(finalEl as unknown as EmailElement); // More forceful cast
            console.log(`[generate-email-v2] Added new element ID: ${finalEl.id} to section ID: ${targetSection.id} with fully scaffolded properties.`);
        } else {
             console.warn(`[generate-email-v2] Could not determine target section for new element ID: ${finalEl.id}`);
        }
      }
    }

    const validationResult = validateEmailTemplateV2(emailTemplateToUpdate);
    if (!validationResult.valid) {
        console.warn('[generate-email-v2] Final merged template failed validation after AI processing:', validationResult.errors);
        // Depending on severity, could throw error or try to return pre-AI template if preferred.
    }

    const htmlGenerator = new HtmlGeneratorV2();
    const finalHtml = htmlGenerator.generate(emailTemplateToUpdate);

    console.log("[generate-email-v2] Attempting to save to DB. Project ID:", payload.projectId);
    const { error: dbError } = await supabase
      .from('projects')
      .update({
        semantic_email_v2: emailTemplateToUpdate,
        current_html: finalHtml,
        name: emailTemplateToUpdate.name,
        last_edited_at: new Date().toISOString(),
      })
      .eq('id', payload.projectId);

    if (dbError) {
      console.error("[generate-email-v2] DB Error:", dbError);
      throw new Error(`Failed to save updated email to DB: ${dbError.message}`);
    }

    console.log('[generate-email-v2] Successfully processed and saved email template.');
    return new Response(JSON.stringify(emailTemplateToUpdate), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('[generate-email-v2] CatchAll Error:', error.message, error.stack);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
}); 