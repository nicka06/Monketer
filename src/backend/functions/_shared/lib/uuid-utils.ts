/**
 * Backend UUID Utilities
 * 
 * This file is a proxy implementation of the shared utility in src/shared/lib/uuid-utils.ts
 * Maintained for backward compatibility with existing imports.
 * 
 * @deprecated For new code, import directly from the shared implementation.
 */

// -----------------------------------------------------------------------
// Direct implementation instead of re-export to avoid TypeScript path issues
// The canonical implementation is in src/shared/lib/uuid-utils.ts
// Keep this in sync with the shared implementation
// -----------------------------------------------------------------------

/**
 * Clean UUID Utility
 * 
 * A defensive utility function that sanitizes potentially malformed UUIDs.
 */
export function cleanUuid(id: string): string {
  if (!id || typeof id !== 'string') return '';
  
  // Remove any trailing digits or spaces
  const cleaned = id.replace(/\s+\d*$/, '').trim();
  
  // If it looks like a UUID, return it; otherwise return as is
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidPattern.test(cleaned)) {
    return cleaned;
  }
  
  return id.trim(); // Return original trimmed ID if not UUID-like
}

/**
 * Validate if a string is a properly formatted UUID
 */
export function isValidUuid(id: string): boolean {
  if (!id || typeof id !== 'string') return false;
  
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidPattern.test(id.trim());
}