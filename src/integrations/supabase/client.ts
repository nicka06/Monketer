import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check for Supabase URL
if (!supabaseUrl) {
  const errorMessage = "Supabase URL is missing. Make sure VITE_SUPABASE_URL is set in your .env file.";
  console.error(`CRITICAL ERROR: ${errorMessage}`);
  throw new Error(errorMessage); 
}

// Check for Supabase Anon Key
if (!supabaseKey) {
  const errorMessage = "Supabase Anon Key is missing. Make sure VITE_SUPABASE_ANON_KEY is set in your .env file.";
  console.error(`CRITICAL ERROR: ${errorMessage}`);
  throw new Error(errorMessage);
}

// If we've reached this point, the URL and Key were found.
console.log('Supabase configuration successful:', {
  url: supabaseUrl,
  keyAvailable: true 
});

// Initialize and export the Supabase client.
// It's guaranteed that supabaseUrl and supabaseKey are strings here due to the checks above.
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey);

// Improved toJson helper function that handles potentially malformed inputs
export function toJson(obj: any): any {
  try {
    // If obj is already an object (not a string), just return it
    if (typeof obj !== 'string') {
      return obj;
    }
    
    // If obj is a string, try to parse it after removing any comments
    // This regex removes both single-line and multi-line comments
    const jsonString = obj
      .replace(/\/\/.*$/gm, '') // Remove single line comments
      .replace(/\/\*[\s\S]*?\*\//g, ''); // Remove multi-line comments
      
    return JSON.parse(jsonString);
  } catch (e) {
    console.error('Error in toJson helper:', e);
    
    // Try to process JSON with comments by manual clean-up if regular parsing fails
    if (typeof obj === 'string') {
      try {
        // More aggressive approach to handle JSON with comments
        const cleanedJson = obj
          .replace(/\/\/.*$/gm, '')
          .replace(/\/\*[\s\S]*?\*\//g, '')
          .replace(/,(\s*[\]}])/g, '$1'); // Remove trailing commas
          
        return JSON.parse(cleanedJson);
      } catch (innerError) {
        console.error('Failed second attempt to parse JSON:', innerError);
        // If both attempts fail, try to return the original object
        return obj;
      }
    }
    
    // Return empty object if all parsing fails
    return {};
  }
}

// Improved error handler for Supabase
export function handleSupabaseError(error: any): void {
  console.error('Supabase error:', error);
  // Log the full error object for debugging
  console.error(JSON.stringify(error, null, 2));
}
