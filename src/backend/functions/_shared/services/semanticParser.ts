/**
 * BACKEND SEMANTIC PARSER
 * 
 * This module provides the backend-specific implementation of the email HTML parser
 * that converts HTML into our structured EmailTemplate model. It follows the adapter
 * pattern to maintain consistency with the frontend implementation while avoiding
 * code duplication.
 * 
 * KEY RESPONSIBILITIES:
 * 1. Implement the core parsing logic for the backend/serverless environment
 * 2. Use JSDOM for DOM parsing in Node.js/Deno environment
 * 3. Provide backend-specific optimizations if needed
 * 
 * ADAPTER PATTERN IMPLEMENTATION:
 * This is the backend-specific adapter in our adapter pattern. It extends
 * the core implementation to provide environment-specific DOM parsing using JSDOM.
 * Most of the parsing logic is inherited from the shared core implementation.
 * 
 * USAGE:
 * ```
 * const parser = new SemanticParser();
 * const template = parser.parse(htmlString);
 * ```
 */

import { JSDOM } from 'jsdom';
import { 
  EmailTemplate,
  EmailSection,
  EmailElement,
  ElementType
} from '@shared/types';
import { generateId } from '@shared/lib/uuid';
import { SemanticParserCore } from '@shared/services/semanticParser';

/**
 * Backend-specific implementation of the semantic HTML parser.
 * This class extends the core implementation for the backend/Deno environment.
 * 
 * ADAPTER PATTERN IMPLEMENTATION:
 * This is the backend-specific adapter in our adapter pattern implementation.
 * It extends the core implementation to add backend-specific functionality
 * like JSDOM integration for server-side parsing.
 */
export class SemanticParser extends SemanticParserCore {
  /**
   * Parses an HTML string into an EmailTemplate object using JSDOM.
   * This implements the abstract method from the core parser.
   * 
   * The parsing process:
   * 1. Use JSDOM to convert the HTML string to a DOM structure
   * 2. Extract global styles from the document
   * 3. Parse sections from the template structure
   * 4. Return the complete EmailTemplate object
   * 
   * @param html The HTML string to parse.
   * @returns The parsed EmailTemplate object.
   */
  public parse(html: string): EmailTemplate {
    // Use JSDOM to create a DOM from the HTML string
    const dom = new JSDOM(html);
    const document = dom.window.document;

    // Create the basic template structure
    const template: EmailTemplate = {
      id: generateId(), 
      name: document.title || 'Untitled Email',
      version: 2,
      sections: [],
      globalStyles: this.extractGlobalStyles(document)
    };

    // Parse sections from the document
    template.sections = this.parseSections(document);

    console.log("Parsing HTML completed.");
    return template;
  }

  /**
   * Parses the main email content to find and parse sections.
   * Sections in our email model correspond to rows (TR) in the main table.
   * 
   * @param document The DOM document.
   * @returns An array of EmailSection objects.
   */
  protected parseSections(document: Document): EmailSection[] {
    // Find the main container for the email content
    const mainContainer = this.findMainContainer(document);
    if (!mainContainer) {
      console.error("[SemanticParser] Could not find main email container table.");
      return [];
    }

    const sections: EmailSection[] = [];
    const rows = mainContainer.querySelector('tbody')?.children;
    
    // Process each row as a potential section
    if (rows) {
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (row.tagName === 'TR') {
          try {
            const section = this.parseSection(row);
            if (section) {
              sections.push(section);
            } else {
              console.warn(`[SemanticParser] Failed to parse section at row index ${i}. Skipping.`);
            }
          } catch (error) {
            console.error(`[SemanticParser] Error parsing section row at index ${i}:`, error);
          }
        }
      }
    }
    return sections;
  }
  
  /**
   * Finds the main email container table in the document.
   * Uses multiple strategies to locate the container:
   * 1. Look for a table with class 'email-container'
   * 2. Try finding the table using a common email template structure
   * 3. Fall back to a more general selector if needed
   * 
   * @param document The DOM document.
   * @returns The main container table element or null if not found.
   */
  protected findMainContainer(document: Document): Element | null {
    // First, try finding by class added by our generator
    let container = document.querySelector('table.email-container');
    if (container) return container;
    
    // Fallback: Look for a common structure (body > table > tr > td > table)
    try {
      container = document.body.children[0]?.children[0]?.children[0]?.children[1];
      if (container?.tagName === 'TABLE') return container;
    } catch (e) { /* Ignore errors during fallback */ }
    
    console.warn("Using less specific fallback for main container.");
    // Wider fallback: first table within the first cell of the first row of the first table in body
    container = document.querySelector('body > table > tbody > tr > td > table');
    return container;
  }

  /**
   * Parses a section element (typically a TR) into an EmailSection object.
   * Each section contains multiple elements arranged vertically.
   * 
   * @param sectionElement The DOM element representing the section (TR).
   * @returns An EmailSection object or null if invalid.
   */
  protected parseSection(sectionElement: Element): EmailSection | null {
    // A section must have a cell (TD) containing the content
    const sectionCell = sectionElement.querySelector('td');
    if (!sectionCell) return null;
    
    // Extract the section ID or generate a new one
    const sectionId = sectionCell.id?.replace('section-', '') || generateId();
    const sectionStyles = this.extractSectionStyles(sectionCell);
    
    // Find the inner table containing the elements
    const innerTable = sectionCell.querySelector('table');
    const elements = innerTable ? this.parseElements(innerTable) : [];

    console.log(`Parsed section ${sectionId} with ${elements.length} elements.`);
    return {
      id: sectionId,
      elements: elements,
      styles: sectionStyles
    };
  }

  /**
   * Parses elements within a section container.
   * Elements in our email model correspond to rows in the section's inner table.
   * 
   * @param sectionContainer The DOM element containing elements (inner table).
   * @returns An array of EmailElement objects.
   */
  protected parseElements(sectionContainer: Element): EmailElement[] {
    const elements: EmailElement[] = [];
    const elementRows = sectionContainer.querySelector('tbody')?.children;
    
    // Process each row as a potential element
    if (elementRows) {
      for (let i = 0; i < elementRows.length; i++) {
        const row = elementRows[i];
        if (row.tagName === 'TR') {
          try {
            const element = this.parseElement(row);
            if (element) {
              elements.push(element);
            } else {
              console.warn(`[SemanticParser] Failed to parse element at row index ${i} within its section. Skipping.`);
            }
          } catch(error) {
            console.error(`[SemanticParser] Error parsing element row at index ${i} within its section:`, error);
          }
        }
      }
    }
    return elements;
  }

  /**
   * Parses a DOM element row (TR) into an EmailElement object.
   * Each element has a type, content, layout, and type-specific properties.
   * 
   * The parsing process:
   * 1. Find the element wrapper (TD) and extract layout styles
   * 2. Determine the element type from the content
   * 3. Extract content and type-specific properties
   * 4. Construct the complete EmailElement object
   * 
   * @param elementRow The TR element representing the element.
   * @returns An EmailElement object or null if invalid.
   */
  protected parseElement(elementRow: Element): EmailElement | null {
    // An element must have a cell (TD) containing the content
    const elementWrapper = elementRow.querySelector('td');
    if (!elementWrapper) return null; 

    // Extract the element ID or generate a new one
    const elementId = elementWrapper.id?.replace('element-', '') || generateId();
    const layoutStyles = this.extractLayoutStyles(elementWrapper);
    
    // Get the first child element which contains the actual content
    const contentElement = elementWrapper.firstElementChild;
    
    // Determine the element type and get the actual content element
    let elementType: ElementType;
    let actualContentElement: Element | null = contentElement;
    
    // Special case for spacer elements (implemented as tables with 100% width)
    const contentHtmlElement = contentElement as HTMLElement | null;
    if (contentHtmlElement?.tagName === 'TABLE' && contentHtmlElement?.style.width === '100%') {
      elementType = 'spacer';
    } else {
      // Determine the element type from the content
      elementType = this.determineElementType(contentElement);
      
      // Special case for images inside links
      if (elementType === 'image' && contentElement?.parentElement?.tagName === 'A') {
        actualContentElement = contentElement.parentElement;
      }
    } 

    // Extract content and properties based on the element type
    const elementContent = this.extractElementContent(actualContentElement, elementType, elementWrapper);
    const elementProperties = this.extractAndValidateElementProperties(actualContentElement, elementType);

    // If property extraction/validation failed, skip this element
    if (elementProperties === null) {
      console.warn(`[SemanticParser] Skipping element ${elementId} due to invalid/missing properties for type ${elementType}.`);
      return null;
    }

    // Construct the base element with common properties
    const baseElement = {
      id: elementId,
      content: elementContent,
      layout: layoutStyles,
    };

    // Return the completed element with type and properties
    return {
      ...baseElement,
      type: elementType,
      properties: elementProperties
    } as EmailElement;
  }

  /**
   * Extracts type-specific properties AND performs basic validation.
   * This implementation uses the core implementation.
   * 
   * @param contentElement The core element (p, h2, img, a etc.)
   * @param type The determined ElementType.
   * @returns EmailElementProperties object if valid, otherwise null.
   */
  protected extractAndValidateElementProperties(contentElement: Element | null, type: ElementType): any {
    // Use the implementation from the core parser
    return super.extractAndValidateElementProperties(contentElement, type);
  }

  /**
   * Parse the style attribute of an element into a style object.
   * Convenience method that calls parseStyleString on the element's style attribute.
   * 
   * @param element The DOM element to extract styles from.
   * @returns Record<string, string> of style properties.
   */
  protected parseStyleObject(element: Element | null): Record<string, string> {
    if (!element) return {};
    const styleString = element.getAttribute('style');
    const styles: Record<string, string> = {};
    if (!styleString) return styles;
    
    styleString.split(';').forEach(style => {
      const [key, value] = style.split(':');
      if (key && value) {
        styles[key.trim().replace(/-([a-z])/g, (g) => g[1].toUpperCase())] = value.trim();
      }
    });
    return styles;
  }

  /**
   * Helper to safely cast style values to specific types.
   * Used for values that must be from a predefined set.
   * 
   * @param value The string value to check.
   * @param allowedValues Array of allowed values for the property.
   * @returns The value if it's in the allowed list, otherwise undefined.
   */
  protected safeCastStyle<T>(value: string | undefined, allowedValues: T[]): T | undefined {
    return allowedValues.includes(value as T) ? value as T : undefined;
  }

  /**
   * Extract typography styles from a style object.
   * Creates a consistent typography object for text-based elements.
   * 
   * @param styles Record of style properties.
   * @returns Typography object with font properties.
   */
  protected extractTypographyStyles(styles: Record<string, string>): any {
    const typography: any = {
      fontFamily: styles.fontFamily,
      fontSize: styles.fontSize,
      fontWeight: styles.fontWeight,
      fontStyle: styles.fontStyle,
      color: styles.color,
      textAlign: this.safeCastStyle(styles.textAlign, ['left', 'center', 'right']),
      lineHeight: styles.lineHeight,
    };
    
    // Remove undefined properties for cleaner objects
    Object.keys(typography).forEach(key => {
      if (typography[key] === undefined) delete typography[key];
    });
    
    // Only return the typography object if it has properties
    return Object.keys(typography).length > 0 ? typography : undefined;
  }
} 