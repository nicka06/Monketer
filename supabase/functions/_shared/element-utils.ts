import { EmailElement } from './types.ts';

/**
 * Ensures an EmailElement object has all standard fields defined (id, type, content, styles),
 * assigning default values ('' for content, {} for styles) if they are missing.
 */
export function normalizeElement(element: Partial<EmailElement>): EmailElement {
    // Ensure required fields (id, type) are present. 
    // Throw an error if they are truly missing, as they are fundamental.
    if (!element.id || !element.type) {
         console.error(`Element is missing required 'id' or 'type' during normalization:`, element);
         // Decide on error handling: throw, return null, or try to proceed? Throwing is safest.
         throw new Error(`Element normalization failed: Missing required 'id' (${element.id}) or 'type' (${element.type}).`);
    }
    
    return {
        id: element.id, // Keep original ID
        type: element.type, // Keep original type
        content: element.content ?? '', // Default to empty string if null or undefined
        styles: element.styles ?? {}, // Default to empty object if null or undefined
        // Add defaults for any other optional top-level fields defined in EmailElement type here if needed
    };
} 