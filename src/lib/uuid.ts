/**
 * UUID Generation Module - PROXY IMPLEMENTATION
 * 
 * @deprecated This module is deprecated and will be removed in a future version.
 * Please import from '@/shared/lib/uuid.ts' instead.
 * 
 * IMPORTANT: This file exists only for backward compatibility with existing code.
 * It proxies all calls to the canonical implementation in the shared directory.
 * 
 * Migration Plan:
 * 1. All new code should import directly from '@/shared/lib/uuid'
 * 2. Existing code should gradually be updated to use the shared implementation
 * 3. Once all imports are updated, this proxy will be removed
 * 
 * Part of the shared code reorganization initiative to reduce duplication
 * between frontend and backend code.
 */

// Import from shared implementation
import { generateId as sharedGenerateId } from '@/shared/lib/uuid';

/**
 * Generate Unique ID - Proxy Implementation
 * 
 * @deprecated Use the version from shared/lib/uuid.ts instead
 * @returns {string} A new UUID v4 string
 */
export const generateId = () => sharedGenerateId();
