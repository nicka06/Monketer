// @ts-ignore: Deno-specific URL import
import "https://deno.land/x/xhr@0.1.0/mod.ts";
// @ts-ignore: Deno-specific URL import
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore: Deno-specific URL import
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// @ts-ignore: Correct path will be resolved by Deno
import { corsHeadersFactory } from '../_shared/lib/constants.ts';
// @ts-ignore: Correct path will be resolved by Deno
import { generateId } from '../_shared/lib/uuid.ts';
// @ts-ignore: Correct path will be resolved by Deno
import { logStep } from '../_shared/services/agentLogger.ts';
// @ts-ignore: Correct path will be resolved by Deno
import { clarifyIntent } from './steps/1-clarify-intent.ts';
// @ts-ignore: Correct path will be resolved by Deno
import { planChanges } from './steps/2-plan-changes.ts';
// @ts-ignore: Correct path will be resolved by Deno
import { executePlan } from './steps/3-execute-plan.ts';
// @ts-ignore: Correct path will be resolved by Deno
import { generateDiff } from './steps/4-generate-diff.ts';
// @ts-ignore: Correct path will be resolved by Deno
import type { Database } from '../../../../integrations/supabase/types.ts';

// Environment variables
// @ts-ignore: Deno global is available at runtime
const supabaseUrl = Deno.env.get('SUPABASE_URL');
// @ts-ignore: Deno global is available at runtime
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

// Supabase client
const supabaseAdmin = createClient<Database>(supabaseUrl!, supabaseServiceRoleKey!);

interface GenerateEmailChangesPayload {
  projectId: string;
  prompt: string;
}

serve(async (req) => {
  const corsHeaders = corsHeadersFactory(req.headers.get("Origin"));

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const run_id = 'run_' + generateId();

  try {
    const { projectId, prompt } = await req.json() as GenerateEmailChangesPayload;

    if (!projectId || !prompt) {
      return new Response(JSON.stringify({ error: "projectId and prompt are required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // 1. Fetch the current project state
    const { data: project, error: fetchError } = await supabaseAdmin
      .from('projects')
      .select('email_content_structured')
      .eq('id', projectId)
      .single();

    if (fetchError || !project) {
      throw new Error(`Failed to fetch project ${projectId}: ${fetchError?.message}`);
    }

    const originalEmail = project.email_content_structured as any; // Cast for now

    // --- Agentic Process ---

    // Step 1: Clarify Intent
    const intent = await clarifyIntent(prompt, originalEmail);
    await logStep({ run_id, project_id: projectId, step_name: 'clarify-intent', input_data: { prompt, originalEmail }, output_data: { intent }, status: 'success' });

    // Step 2: Plan Changes
    const plan = await planChanges(intent, originalEmail);
    await logStep({ run_id, project_id: projectId, step_name: 'plan-changes', input_data: { intent, originalEmail }, output_data: { plan }, status: 'success' });
    
    // Step 3: Execute Plan
    const modifiedEmail = await executePlan(plan, originalEmail);
    await logStep({ run_id, project_id: projectId, step_name: 'execute-plan', input_data: { plan, originalEmail }, output_data: { modifiedEmail }, status: 'success' });
    
    // Step 4: Generate Diff for Frontend
    const diffResult = await generateDiff(originalEmail, modifiedEmail);
    await logStep({ run_id, project_id: projectId, step_name: 'generate-diff', input_data: { originalEmail, modifiedEmail }, output_data: { diffResult }, status: 'success' });

    // --- End Agentic Process ---

    // Final Step: Update the database with the new email structure
    const { error: updateError } = await supabaseAdmin
      .from('projects')
      .update({ email_content_structured: modifiedEmail })
      .eq('id', projectId);

    if (updateError) {
      throw new Error(`Failed to update project ${projectId}: ${updateError.message}`);
    }

    // Return the diff result to the client
    return new Response(JSON.stringify({
      message: "Changes generated successfully",
      diff: diffResult,
      newEmailTemplate: modifiedEmail
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error(`[Agent Runner] Error during run ${run_id}:`, error.message);
    // Log the error to the database
    const payload = await req.json().catch(() => ({})); // Avoid crashing if req body is already read or invalid
    await logStep({
      run_id,
      project_id: payload.projectId || 'unknown', 
      step_name: 'error',
      input_data: { originalRequest: { headers: Object.fromEntries(req.headers), body: payload } },
      error_message: error.message,
      status: 'failure',
    }).catch(e => console.error("Failed to even log the error:", e)); // Log logging failure

    return new Response(JSON.stringify({ error: "An internal error occurred." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
