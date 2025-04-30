
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error('VITE_SUPABASE_URL is not defined in the environment variables.');
}

if (!supabaseKey) {
  throw new Error('VITE_SUPABASE_ANON_KEY is not defined in the environment variables.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// Improved toJson helper function that handles potentially malformed inputs
export function toJson(obj: any): any {
  try {
    // If obj is already stringified, this will throw an error
    const stringified = JSON.stringify(obj);
    return obj;
  } catch (e) {
    console.error('Error in toJson helper:', e);
    // Return empty object if stringification fails
    return {};
  }
}

// Helper function to clean UUIDs that might have spaces or comments
export function cleanUuid(id: string): string {
  if (!id) return '';
  
  // Remove any trailing digits or spaces, common in AI outputs like "id123" or "id "
  const cleaned = id.replace(/\s+\d*$/, '').trim();
  
  // If it looks like a UUID, return it; otherwise return as is
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidPattern.test(cleaned)) {
    return cleaned;
  }
  
  return id.trim();
}

// Improved error handler for Supabase
export function handleSupabaseError(error: any): void {
  console.error('Supabase error:', error);
  // Log the full error object for debugging
  console.error(JSON.stringify(error, null, 2));
}
