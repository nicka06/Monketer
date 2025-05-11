/**
 * FRONTEND SEMANTIC PARSER
 * 
 * This module provides the frontend-specific implementation of the email HTML parser
 * that converts HTML into our structured EmailTemplate model. It follows the adapter
 * pattern to maintain consistency with the backend implementation while avoiding
 * code duplication.
 * 
 * KEY RESPONSIBILITIES:
 * 1. Implement the core parsing logic for the frontend environment
 * 2. Use JSDOM for DOM parsing in the browser environment
 * 3. Add support for enhanced element types used primarily in the frontend
 * 4. Provide frontend-specific optimizations and validations
 * 
 * ADAPTER PATTERN IMPLEMENTATION:
 * This is the frontend-specific adapter in our adapter pattern. It extends
 * the core implementation to provide environment-specific DOM parsing using JSDOM
 * and adds support for additional element types needed in the frontend.
 * 
 * EXTENDED ELEMENT TYPES:
 * The frontend parser recognizes more element types than the core implementation:
 * - subtext: Smaller text elements with secondary importance
 * - quote: Formatted quotation blocks with optional citation
 * - code: Code blocks with syntax highlighting
 * - list: Ordered or unordered lists with items
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
 * Frontend-specific implementation of the semantic HTML parser.
 * This class extends the core implementation for the frontend environment.
 * 
 * ADAPTER PATTERN IMPLEMENTATION:
 * This is the frontend-specific adapter in our adapter pattern implementation.
 * It extends the core implementation to add frontend-specific functionality.
 */
export class SemanticParser extends SemanticParserCore {
  /**
   * Parses an HTML string into an EmailTemplate object using JSDOM in the frontend environment.
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
   * Extracts global styles from the document head.
   * This frontend implementation extracts more style details:
   * - Background color from the body
   * - Font family and text color from the body
   * - Content width from the email container
   * 
   * @param document The DOM document.
   * @returns An EmailGlobalStyles object with detailed style information.
   */
  protected extractGlobalStyles(document: Document): any {
    const bodyStyles = document.body.getAttribute('style');
    const styleObj = this.parseStyleObject(document.body);
    
    return {
      bodyBackgroundColor: styleObj.backgroundColor || '#FFFFFF',
      bodyFontFamily: styleObj.fontFamily,
      bodyTextColor: styleObj.color,
      contentWidth: this.extractContentWidth(document) || '600px'
    };
  }

  /**
   * Extract content width from the email container.
   * Looks for the email-container table and reads its max-width.
   * 
   * @param document The DOM document.
   * @returns The content width value or undefined if not found.
   */
  private extractContentWidth(document: Document): string | undefined {
    const emailContainer = document.querySelector('table.email-container');
    if (emailContainer) {
      const maxWidth = this.parseStyleObject(emailContainer).maxWidth;
      return maxWidth;
    }
    return undefined;
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
   * Extracts type-specific properties and validates them.
   * This implementation extends the core version to support more element types.
   * It handles basic types via the parent implementation, then adds support for:
   * - subtext: Smaller styled text elements
   * - quote: Blockquote elements with optional citation
   * - code: Code blocks with syntax highlighting
   * - list: Ordered or unordered lists with items
   * 
   * @param contentElement The core element (p, h2, img, a etc.)
   * @param type The determined ElementType.
   * @returns EmailElementProperties object if valid, otherwise null.
   */
  protected extractAndValidateElementProperties(contentElement: Element | null, type: ElementType): any {
    if (!contentElement && type !== 'spacer') { // Spacer might be an empty cell
      console.warn(`[SemanticParser] Content element is null for non-spacer type ${type}.`);
      return null;
    }
    
    try {
      const styles = contentElement ? this.parseStyleObject(contentElement) : {};
      const textContent = contentElement?.textContent || '';

      switch(type) {
        // Basic types handled by the core implementation
        case 'header':
        case 'text':
        case 'button':
        case 'image':
        case 'divider':
        case 'spacer':
          return super.extractAndValidateElementProperties(contentElement, type);
          
        // Additional element types supported in the frontend
        case 'subtext':
          // Subtext is simple text with different styling
          return {
            text: textContent,
            typography: this.extractTypographyStyles(styles)
          };
          
        case 'quote':
          // Quote elements have text content, optional citation, and styling
          const quoteTableStyles = this.parseStyleObject(contentElement);
          const quoteProps: any = { text: '' };
          
          // Extract border/bg from table element
          quoteProps.border = { 
            width: quoteTableStyles.borderLeftWidth, 
            style: this.safeCastStyle(quoteTableStyles.borderLeftStyle, ['solid', 'dashed', 'dotted']),
            color: quoteTableStyles.borderLeftColor,
          };
          
          if (!quoteProps.border?.width && !quoteProps.border?.style && !quoteProps.border?.color) {
            delete quoteProps.border;
          }
          
          quoteProps.backgroundColor = quoteTableStyles.backgroundColor;
          
          // Extract text/styles from inner p tags
          const textP = contentElement.querySelector('td > p:first-child');
          if (textP) {
            quoteProps.text = textP.textContent || '';
            quoteProps.typography = this.extractTypographyStyles(this.parseStyleObject(textP));
          }
          
          // Extract citation if present (usually in a separate p tag)
          const citationP = contentElement.querySelector('td > p:last-child'); // Assumes citation is last p
          if (citationP && citationP !== textP) {
            quoteProps.citation = citationP.textContent?.replace(/^\-\s*/, '').trim() || undefined;
          }
          
          return quoteProps;
          
        case 'code':
          // Code elements contain formatted code with optional language
          const codeProps: any = { code: '' };
          const codeBlockStyles = this.parseStyleObject(contentElement);
          
          codeProps.backgroundColor = codeBlockStyles.backgroundColor;
          codeProps.borderRadius = codeBlockStyles.borderRadius;
          codeProps.padding = codeBlockStyles.padding;
          
          // Extract the actual code content and styling
          const codeTag = contentElement.querySelector('pre > code');
          if (codeTag) {
            codeProps.code = codeTag.textContent || '';
            codeProps.typography = this.extractTypographyStyles(this.parseStyleObject(codeTag));
            
            // Extract language hint from class if available
            const preTag = codeTag.closest('pre');
            const langClass = preTag?.className.match(/language-(\S+)/);
            if (langClass && langClass[1]) {
              codeProps.language = langClass[1];
            }
          }
          
          return codeProps;
          
        case 'list':
          // List elements can be ordered or unordered with multiple items
          const listProps: any = { items: [], listType: 'unordered' };
          
          // Determine list type from the element tag
          listProps.listType = contentElement.tagName.toLowerCase() === 'ol' ? 'ordered' : 'unordered';
          const listItems = contentElement.querySelectorAll('li');
          
          if (listItems.length > 0) {
            // Extract text from each list item
            listProps.items = Array.from(listItems).map(li => li.textContent || '');
            
            // Extract typography from the first list item as representative
            listProps.typography = this.extractTypographyStyles(this.parseStyleObject(listItems[0]));
            
            // Extract marker color if available
            const listStyles = this.parseStyleObject(contentElement);
            if (listStyles.color) {
              listProps.markerStyle = { color: listStyles.color };
            }
          }
          
          return listProps;
          
        // Add cases for other element types as needed
          
        default:
          console.warn(`[SemanticParser] Unhandled element type in property extraction: ${type}`);
          return {}; // Basic empty properties for unhandled types
      }
    } catch (error) {
      console.error(`[SemanticParser] Validation failed for type ${type}:`, error);
      return null; // Return null on validation failure
    }
  }

  /**
   * Determines the ElementType based on content with enhanced detection.
   * Expands on the core implementation to support more element types:
   * - Detects subtext based on font size and color
   * - Identifies quotes based on border styling
   * - Recognizes code blocks based on structure
   * - Supports ordered and unordered lists 
   * 
   * @param contentElement The core element within the cell (e.g., p, h2, img, a)
   * @returns The determined ElementType or a default of 'text'.
   */
  protected override determineElementType(contentElement: Element | null): ElementType {
    if (!contentElement) return 'text';
    
    const tagName = contentElement.tagName.toLowerCase();

    switch (tagName) {
      case 'h1':
      case 'h2':
      case 'h3':
      case 'h4':
      case 'h5':
      case 'h6':
        return 'header';
        
      case 'p':
        // Check if this might be a subtext element based on styles
        const styles = this.parseStyleObject(contentElement);
        const fontSize = parseInt(styles.fontSize || '16', 10);
        if (fontSize <= 14 || styles.color?.includes('gray') || styles.color?.includes('#6')) {
          return 'subtext';
        }
        return 'text';
        
      case 'a': 
        if (contentElement.querySelector('img')) return 'image'; // Image link
        const btnStyles = this.parseStyleObject(contentElement);
        if (btnStyles.display?.includes('inline-block') || btnStyles.backgroundColor) {
          return 'button';
        }
        return 'text';
        
      case 'img':
        return 'image';
        
      case 'hr':
        return 'divider';
        
      case 'table':
        // Check if it's a spacer table
        if (contentElement.querySelector('td[style*="height:"]')) {
          return 'spacer';
        }
        // Check if it looks like a quote table
        if (this.parseStyleObject(contentElement).borderLeft) {
          return 'quote';
        }
        return 'spacer'; // Default for tables
        
      case 'div':
        // Check if it contains code structure
        if (contentElement.querySelector('pre > code')) {
          return 'code';
        }
        return 'text';
        
      case 'ol':
      case 'ul':
        return 'list';
        
      default:
        return 'text';
    }
  }

  /**
   * Parse the style attribute of an element into a style object.
   * Converts inline CSS to a JavaScript object with camelCase properties.
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
} 