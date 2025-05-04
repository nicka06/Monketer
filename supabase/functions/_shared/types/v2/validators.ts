import { EmailElement, ElementType } from "./elements.ts"; 
import { EmailSection } from "./sections.ts";
import { EmailTemplate } from "./template.ts";

// --- Type Guards ---

export function isEmailElement(obj: any): obj is EmailElement {
  if (!obj || typeof obj !== 'object') return false;
  
  return (
    typeof obj.id === 'string' &&
    typeof obj.type === 'string' && // Basic check, could be stricter with ElementType
    typeof obj.content === 'string' &&
    typeof obj.layout === 'object' && // Could add deeper checks for layout props
    typeof obj.properties === 'object'
    // Add more specific checks based on 'type' if needed later
  );
}

export function isEmailSection(obj: any): obj is EmailSection {
  if (!obj || typeof obj !== 'object') return false;
  
  return (
    typeof obj.id === 'string' &&
    Array.isArray(obj.elements) &&
    obj.elements.every(isEmailElement) && // Check each element
    typeof obj.styles === 'object' // Could add deeper checks for style props
  );
}

export function isEmailTemplate(obj: any): obj is EmailTemplate {
  if (!obj || typeof obj !== 'object') return false;
  
  return (
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.version === 'number' &&
    Array.isArray(obj.sections) &&
    obj.sections.every(isEmailSection) && // Check each section
    typeof obj.globalStyles === 'object' // Could add deeper checks for global style props
  );
}

// --- More Specific Validators (Example) ---

export function validateButtonElement(element: EmailElement): boolean {
  if (element.type !== 'button') return false;
  // Check for required button properties
  return (
    typeof element.properties?.button?.href === 'string' && 
    element.properties.button.href.length > 0
  );
  // Add more checks as needed (e.g., valid URL format)
}

// --- Main V2 Template Validator ---

interface ValidationResult {
    valid: boolean;
    errors: string[];
}

export function validateEmailTemplate(template: any): ValidationResult {
    const errors: string[] = [];

    if (!template || typeof template !== 'object') {
        return { valid: false, errors: ['Template is not an object.'] };
    }

    if (typeof template.id !== 'string' || template.id === '') errors.push('Template ID is missing or invalid.');
    if (typeof template.name !== 'string') errors.push('Template name is missing or invalid.');
    if (typeof template.version !== 'number') errors.push('Template version is missing or invalid.');
    if (typeof template.globalStyles !== 'object') errors.push('Template globalStyles is missing or invalid.');

    if (!Array.isArray(template.sections)) {
        errors.push('Template sections must be an array.');
    } else {
        template.sections.forEach((section: any, index: number) => {
            if (!section || typeof section !== 'object') {
                errors.push(`Section at index ${index} is not an object.`);
                return; // Skip further checks for this invalid section
            }
            if (typeof section.id !== 'string' || section.id === '') errors.push(`Section ${index}: ID is missing or invalid.`);
            if (typeof section.styles !== 'object') errors.push(`Section ${index} (ID: ${section.id}): styles is missing or invalid.`);
            if (!Array.isArray(section.elements)) {
                errors.push(`Section ${index} (ID: ${section.id}): elements must be an array.`);
            } else {
                section.elements.forEach((element: any, elIndex: number) => {
                    if (!element || typeof element !== 'object') {
                        errors.push(`Section ${index} (ID: ${section.id}), Element ${elIndex}: Element is not an object.`);
                        return; // Skip further checks for this invalid element
                    }
                    if (typeof element.id !== 'string' || element.id === '') errors.push(`Section ${index}, Element ${elIndex}: ID is missing or invalid.`);
                    if (typeof element.type !== 'string' || element.type === '') errors.push(`Section ${index}, Element ${elIndex} (ID: ${element.id}): type is missing or invalid.`);
                    if (typeof element.content === 'undefined') errors.push(`Section ${index}, Element ${elIndex} (ID: ${element.id}): content is missing.`); // Check for undefined, allow empty string
                    if (typeof element.layout !== 'object') errors.push(`Section ${index}, Element ${elIndex} (ID: ${element.id}): layout is missing or invalid.`);
                    if (typeof element.properties !== 'object') errors.push(`Section ${index}, Element ${elIndex} (ID: ${element.id}): properties is missing or invalid.`);
                    // TODO: Add more specific property validation based on element.type
                });
            }
        });
    }

    return {
        valid: errors.length === 0,
        errors: errors,
    };
}

// Add more validators for other types or specific properties as needed 