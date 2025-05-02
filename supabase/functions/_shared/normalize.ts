import { EmailTemplate, EmailElement } from './types.ts';

// Define styles directly in this file to avoid import issues
const DEFAULT_STYLE_BY_TYPE: Record<string, Record<string, any>> = {
  text: {
    fontFamily: 'Arial',
    fontSize: 14,
    color: '#000000',
    padding: '0px',
    textAlign: 'left',
  },
  header: {
    fontFamily: 'Arial Black',
    fontSize: 20,
    color: '#333333',
    padding: '10px 0',
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#007BFF',
    color: '#ffffff',
    fontSize: 14,
    padding: '12px 24px',
    textAlign: 'center',
    borderRadius: '4px',
  },
  image: {
    width: '100%',
    height: 'auto',
    padding: '0px',
  },
  divider: {
    height: '1px',
    backgroundColor: '#cccccc',
    margin: '16px 0',
  },
};

export function normalizeElement(element: Partial<EmailElement>): EmailElement {
  if (!element.id || !element.type) {
    console.error(`Missing required 'id' or 'type':`, element);
    throw new Error(`Element normalization failed.`);
  }

  const defaultStyles = DEFAULT_STYLE_BY_TYPE[element.type] || {};

  return {
    id: element.id,
    type: element.type,
    content: element.content ?? '',
    styles: {
      ...defaultStyles,
      ...(element.styles || {}), // user-defined overrides
    },
  };
}

export function normalizeTemplate(template: EmailTemplate): EmailTemplate {
  if (!template || !template.sections) {
    console.error('Cannot normalize invalid template:', template);
    throw new Error('Invalid template structure provided for normalization');
  }
  
  return {
    ...template,
    sections: template.sections.map(section => ({
      ...section,
      elements: Array.isArray(section.elements) 
        ? section.elements.map(normalizeElement)
        : []
    })),
  };
}
