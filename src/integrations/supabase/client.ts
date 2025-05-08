/**
 * Supabase Client Configuration
 * 
 * This module initializes and exports the Supabase client instance used throughout the application.
 * It handles configuration validation, environment setup, and provides utility functions for 
 * Supabase interactions.
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Supabase connection configuration
 * Values are loaded from environment variables set in .env files
 */
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * Validate Supabase URL
 * Ensures the application has access to the Supabase project URL
 * Critical for all Supabase service connections
 */
if (!supabaseUrl) {
  const errorMessage = "Supabase URL is missing. Make sure VITE_SUPABASE_URL is set in your .env file.";
  console.error(`CRITICAL ERROR: ${errorMessage}`);
  throw new Error(errorMessage); 
}

/**
 * Validate Supabase Anonymous Key
 * Ensures the application has proper authentication credentials
 * Required for public access to Supabase services
 */
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

/**
 * Global Supabase Client Instance
 * 
 * The main entry point for all Supabase service interactions:
 * - Authentication (auth)
 * - Database (from)
 * - Storage (storage)
 * - Edge Functions (functions)
 * - Realtime subscriptions
 * 
 * This instance is used throughout the application for all Supabase operations.
 */
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey);

/**
 * JSON Parsing Utility
 * 
 * Safely converts string representations to JSON objects with enhanced error handling.
 * Handles edge cases like comments in JSON and malformed inputs.
 * 
 * @param obj - Object or string to convert to JSON
 * @returns Parsed JSON object or original object if parsing fails
 */
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

/**
 * Supabase Error Handler
 * 
 * Standardized error logging for Supabase operations
 * Provides detailed error information for debugging
 * 
 * @param error - Error object from Supabase operation
 */
export function handleSupabaseError(error: any): void {
  console.error('Supabase error:', error);
  // Log the full error object for debugging
  console.error(JSON.stringify(error, null, 2));
}
