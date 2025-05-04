import { EmailElement, EmailSection, EmailTemplate, ElementType } from "./"; // Assuming index.ts exports all types

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

// Add more validators for other types or specific properties as needed 