/**
 * UUID Generation Module - BACKEND IMPLEMENTATION
 * 
 * @deprecated This module is deprecated and will be removed in a future version.
 * Please import from 'src/shared/lib/uuid.ts' instead.
 * 
 * TECHNICAL LIMITATION: This duplicate implementation exists because of path resolution
 * challenges in the Deno/Supabase Edge Function environment. Ideally, this would 
 * import directly from the shared implementation.
 * 
 * NOTE: We need to keep this direct implementation for now as imports from 
 * shared paths are challenging in the Deno/Supabase Edge Function environment.
 * Once the import path resolution is addressed, this file will be updated
 * to directly import from the shared location.
 * 
 * Implementation Status:p
 * - This implementation is functionally identical to shared/lib/uuid.ts
 * - Any changes to the shared implementation should be mirrored here
 * - The long-term goal is to resolve the path issues and use a single implementation
 * 
 * Part of the shared code reorganization initiative to reduce duplication
 * between frontend and backend code.
 */

// Use uuid package to get server-compatible uuid generation
import { v4 as uuidv4 } from 'uuid';

/**
 * Generate Unique ID - Backend Implementation
 * 
 * Creates a new UUID v4 for use as an identifier throughout the backend.
 * Mirrors the functionality in shared/lib/uuid.ts.
 * 
 * @deprecated Use the version from shared/lib/uuid.ts instead when possible
 * @returns {string} A new UUID v4 string
 */
export const generateId = () => uuidv4();