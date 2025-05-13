/**
 * UUID Generation Module
 * 
 * CANONICAL IMPLEMENTATION: This is the official source of truth for UUID generation
 * across the entire application (both frontend and backend). All other UUID generation
 * functions should proxy to this implementation.
 * 
 * Provides standardized UUID generation functionality throughout the application.
 * Uses the industry-standard uuid package to ensure high-quality, collision-resistant
 * unique identifiers.
 * 
 * This module uses UUID v4 (random-based) which provides:
 * - Cryptographically strong random values
 * - Extremely low collision probability (2^122 unique values)
 * - Cross-platform consistency
 * - Server and browser compatibility
 * 
 * Part of the shared code reorganization initiative to reduce duplication
 * between frontend and backend code.
 */

// Use uuid package via esm.sh for Deno/browser compatibility
// @deno-types="https://deno.land/x/uuid/mod.ts"
// @ts-ignore: Linter error for URL import, but types are resolved at runtime
import { v4 as uuidv4 } from 'https://esm.sh/uuid';

/**
 * Generate Unique ID
 * 
 * Creates a new UUID v4 for use as an identifier throughout the application.
 * Provides a standardized way to generate IDs for new entities.
 * 
 * Use Cases:
 * - Creating new database records
 * - Generating keys for React components
 * - Creating unique identifiers for new email elements
 * - Temporary IDs for unsaved entities
 * 
 * @example
 * // Generate a new ID for a project
 * const newProjectId = generateId();
 * // → "123e4567-e89b-12d3-a456-426614174000"
 * 
 * @returns {string} A new UUID v4 string
 */
export const generateId = () => uuidv4(); 