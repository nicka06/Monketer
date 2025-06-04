// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Ensure your Supabase URL and Service Role Key are set as environment variables
// when deploying the function. For local development, you might use a .env file
// (though Deno deploy often directly uses environment variables set in the Supabase dashboard).

// @ts-ignore
const supabaseUrl = Deno.env.get('SUPABASE_URL');
// @ts-ignore
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (!supabaseUrl) {
  throw new Error("SUPABASE_URL is not set in environment variables.");
}

if (!supabaseServiceRoleKey) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set in environment variables.");
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    // It's common to disable auto-refreshing session tokens for server-side admin clients
    // as they typically use the service_role key which doesn't expire.
    autoRefreshToken: false,
    persistSession: false,
    // detectSessionInUrl: false, // Deprecated, not needed for admin client
  },
}); 