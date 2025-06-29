// @ts-ignore: Deno-specific URL import, works at runtime
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
// @ts-ignore: Deno-specific path import, works at runtime
import type { Database } from '../../../../integrations/supabase/types.ts';

// This assumes that the Supabase URL and service role key are available as environment variables.
// In a Supabase Edge Function context, these are typically set in the project's settings.
// @ts-ignore: Deno global is available at runtime
const supabaseUrl = Deno.env.get('SUPABASE_URL');
// @ts-ignore: Deno global is available at runtime
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error("Supabase environment variables (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) are not set.");
}

// Create a single, reusable Supabase client instance for this module.
const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceRoleKey);

/**
 * Interface for the data required to log a single step in an agent's process.
 */
export interface AgentLogStep {
  run_id: string;
  project_id: string;
  step_name: 'clarify-intent' | 'plan-changes' | 'execute-plan' | 'generate-diff' | 'error';
  input_data: Record<string, any>;
  output_data?: Record<string, any>;
  status: 'success' | 'failure';
  error_message?: string;
}

/**
 * Logs a single step of an AI agent's process to the database.
 * 
 * @param {AgentLogStep} logData - The data for the step to be logged.
 * @returns {Promise<void>} A promise that resolves when the log has been inserted.
 * @throws {Error} Throws an error if the database insertion fails.
 */
export async function logStep(logData: AgentLogStep): Promise<void> {
  const { error } = await supabaseAdmin
    .from('ai_process_logs')
    .insert({
      run_id: logData.run_id,
      project_id: logData.project_id,
      step_name: logData.step_name,
      input_data: logData.input_data,
      output_data: logData.output_data,
      status: logData.status,
      error_message: logData.error_message,
    });

  if (error) {
    console.error(`[agentLogger] Failed to log step "${logData.step_name}" for run_id ${logData.run_id}:`, error);
    // Depending on the desired behavior, you might want to throw the error
    // to halt execution, or just log it and continue.
    // For now, we'll throw to make failures explicit.
    throw new Error(`Failed to log agent step: ${error.message}`);
  }

  console.log(`[agentLogger] Successfully logged step "${logData.step_name}" for run_id ${logData.run_id}`);
} 