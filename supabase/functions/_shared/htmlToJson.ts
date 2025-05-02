import { EmailElement, EmailTemplate } from './types';
import { normalizeElement, normalizeTemplate, normalizeHtmlContent } from './normalize';

export function htmlToJson(html: string): EmailTemplate {
  // First normalize the HTML content
  const normalizedHtml = normalizeHtmlContent(html);
  
  // Create a temporary container to parse the HTML
  const container = document.createElement('div');
  container.innerHTML = normalizedHtml;

  // Process each section
  const sections = Array.from(container.children).map((section, index) => {
    const elements: EmailElement[] = Array.from(section.children).map((element, elementIndex) => {
      const elementType = getElementType(element);
      const normalizedElement = normalizeElement({
        id: `element-${index}-${elementIndex}`,
        type: elementType,
        content: element.textContent || '',
        styles: getElementStyles(element),
      });
      return normalizedElement;
    });

    return {
      id: `section-${index}`,
      elements,
    };
  });

  // Create and normalize the template
  const template: EmailTemplate = {
    id: 'template-' + Date.now(),
    version: 1,
    sections,
  };

  return normalizeTemplate(template);
}

function getElementType(element: Element): string {
  if (element.tagName === 'H1' || element.tagName === 'H2' || element.tagName === 'H3') {
    return 'header';
  }
  if (element.tagName === 'BUTTON') {
    return 'button';
  }
  if (element.tagName === 'IMG') {
    return 'image';
  }
  if (element.tagName === 'HR') {
    return 'divider';
  }
  return 'text';
}

function getElementStyles(element: Element): Record<string, any> {
  const styles: Record<string, any> = {};
  
  // Get computed styles
  const computedStyle = window.getComputedStyle(element);
  
  // Map relevant CSS properties
  const styleProperties = [
    'fontFamily',
    'fontSize',
    'color',
    'backgroundColor',
    'padding',
    'margin',
    'textAlign',
    'width',
    'height',
    'borderRadius',
  ];

  styleProperties.forEach(prop => {
    const value = computedStyle.getPropertyValue(prop);
    if (value) {
      styles[prop] = value;
    }
  });

  return styles;
} 