/**
 * CORS Configuration for Supabase Edge Functions
 * 
 * This file contains the Cross-Origin Resource Sharing (CORS) configuration
 * that determines which domains can interact with our API endpoints.
 * It implements a secure approach by explicitly whitelisting allowed origins.
 */

/**
 * List of authorized domains that can access the API
 * - Production domains: monketer.com and www.monketer.com
 * - Development domains: localhost on common development ports
 */
export const ALLOWED_ORIGINS = [
  'https://monketer.com',
  'https://www.monketer.com',
  'http://localhost:3000',
  'http://localhost:5173', // Vite's default port
];

/**
 * Factory function that generates appropriate CORS headers based on the request origin
 * 
 * @param requestOrigin - The origin of the incoming request (from request headers)
 * @returns Object containing CORS headers customized for the specific origin
 * 
 * @example
 * // In your edge function:
 * import { corsHeadersFactory } from '../_shared/lib/constants';
 * 
 * // For response:
 * return new Response(JSON.stringify(data), {
 *   headers: {
 *     ...corsHeadersFactory(req.headers.get('origin')),
 *     'Content-Type': 'application/json'
 *   }
 * });
 */
export const corsHeadersFactory = (requestOrigin?: string) => {
  const origin = requestOrigin && ALLOWED_ORIGINS.includes(requestOrigin)
    ? requestOrigin
    : ALLOWED_ORIGINS[0]; // Default to production origin

  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Max-Age': '86400', // 24 hours caching of preflight requests
  };
};

/**
 * Legacy CORS headers with wildcard origin
 * @deprecated Use corsHeadersFactory instead for better security
 * Maintained for backward compatibility with existing functions
 */
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Will be deprecated
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}; 