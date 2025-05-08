/**
 * UUID Utilities Module
 * 
 * Specialized utility functions for handling and sanitizing UUIDs
 * throughout the application. Particularly useful for processing
 * IDs that may come from AI-generated content or external sources.
 */

/**
 * Clean UUID Utility
 * 
 * A defensive utility function that sanitizes potentially malformed UUIDs.
 * Handles common issues like trailing spaces, comments, or digits that
 * might be appended by AI or external services.
 * 
 * Use Cases:
 * - Processing IDs from AI-generated content
 * - Sanitizing user-provided IDs
 * - Handling UUIDs from external APIs or imports
 * - Pre-processing IDs before database operations
 * 
 * Behavior:
 * - Removes trailing spaces and digits
 * - Trims whitespace
 * - Validates against standard UUID format
 * - Returns the cleaned UUID if valid format
 * - Falls back to trimmed original if not UUID-like
 * 
 * @example
 * // Clean a valid UUID with extra spaces
 * cleanUuid(" 123e4567-e89b-12d3-a456-426614174000 ")
 * // → "123e4567-e89b-12d3-a456-426614174000"
 * 
 * @example
 * // Clean a UUID with trailing digits or comments
 * cleanUuid("123e4567-e89b-12d3-a456-426614174000 123")
 * // → "123e4567-e89b-12d3-a456-426614174000"
 * 
 * @param {string} id - The UUID to clean
 * @returns {string} - The cleaned UUID or empty string if invalid input
 */
export function cleanUuid(id: string): string {
  if (!id || typeof id !== 'string') return ''; // Add type check
  
  // Remove any trailing digits or spaces
  const cleaned = id.replace(/\s+\d*$/, '').trim();
  
  // If it looks like a UUID, return it; otherwise return as is
  // Consider if non-UUIDs should be allowed or generate a new one?
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidPattern.test(cleaned)) {
    return cleaned;
  }
  
  // If it doesn't look like a UUID, maybe log a warning or return original trimmed?
  // console.warn(`[cleanUuid] Input ID "${id}" doesn't look like a valid UUID after cleaning.`);
  // Avoid console logs in generic lib functions unless specifically for debugging
  return id.trim(); // Return original trimmed ID if not UUID-like
}

// Add other UUID related utilities here if needed in the future 