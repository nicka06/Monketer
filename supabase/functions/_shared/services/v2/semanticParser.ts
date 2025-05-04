import { JSDOM } from 'jsdom';
import {
  EmailTemplate,
  EmailSection,
  EmailElement,
  ElementType,
  EmailGlobalStyles,
  EmailSectionStyles,
  EmailElementLayout,
  HeaderElementProperties,
  TextElementProperties,
  ButtonElementProperties,
  ImageElementProperties,
  DividerElementProperties,
  SpacerElementProperties,
} from 'shared/types/v2/index.ts';
import { generateId } from 'shared/lib/uuid.ts';

// Helper function to parse inline style strings into an object
function parseStyleString(styleString: string | null): Record<string, string> {
  const styles: Record<string, string> = {};
  if (!styleString) return styles;
  styleString.split(';').forEach(style => {
    const [key, value] = style.split(':');
    if (key && value) {
      styles[key.trim().replace(/-([a-z])/g, (g) => g[1].toUpperCase())] = value.trim(); // Convert kebab-case to camelCase
    }
  });
  return styles;
}

// Helper to safely cast style values to specific types
function safeCast<T>(value: string | undefined, allowedValues: T[]): T | undefined {
    return allowedValues.includes(value as T) ? value as T : undefined;
}

/**
 * Parses email HTML into the V2 semantic structure.
 */
export class SemanticParserV2 {

  /**
   * Parses an HTML string into an EmailTemplate V2 object.
   * @param html The HTML string to parse.
   * @returns The parsed EmailTemplate V2 object.
   */
  public parse(html: string): EmailTemplate {
    const dom = new JSDOM(html);
    const document = dom.window.document;

    const template: EmailTemplate = {
      id: generateId(), // Or extract from somewhere if possible
      name: document.title || 'Untitled Email',
      version: 2,
      sections: [],
      globalStyles: this.extractGlobalStyles(document)
    };

    template.sections = this.parseSections(document);

    console.log("Parsing HTML completed.");
    return template;
  }

  /**
   * Extracts global styles from the document head.
   * @param document The DOM document.
   * @returns An EmailGlobalStyles object.
   */
  private extractGlobalStyles(document: Document): EmailGlobalStyles {
    // TODO: Implement style extraction (e.g., from <style> tags or body styles)
    console.log("Extracting global styles...");
    return {}; // Placeholder
  }

  /**
   * Parses the main email content to find and parse sections.
   * @param document The DOM document.
   * @returns An array of EmailSection objects.
   */
  private parseSections(document: Document): EmailSection[] {
    const mainContainer = this.findMainContainer(document);
    if (!mainContainer) {
      console.error("[SemanticParserV2] Could not find main email container table.");
      return [];
    }

    const sections: EmailSection[] = [];
    const rows = mainContainer.querySelector('tbody')?.children;
    if (rows) {
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (row.tagName === 'TR') {
          try {
            const section = this.parseSection(row);
            if (section) {
              sections.push(section);
            } else {
               console.warn(`[SemanticParserV2] Failed to parse section at row index ${i}. Skipping.`);
            }
          } catch (error) {
             console.error(`[SemanticParserV2] Error parsing section row at index ${i}:`, error);
             // Optionally log row.outerHTML here for debugging, but be mindful of log size
          }
        }
      }
    }
    return sections;
  }
  
  /**
   * Finds the main email container table.
   * Looks for a table with class 'email-container' or a common structure.
   * @param document The DOM document.
   * @returns The main container table element or null.
   */
  private findMainContainer(document: Document): Element | null {
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
   * Parses a section element (likely a <tr>) into an EmailSection object.
   * @param sectionElement The DOM element representing the section (TR).
   * @returns An EmailSection object or null if invalid.
   */
  private parseSection(sectionElement: Element): EmailSection | null {
    const sectionCell = sectionElement.querySelector('td');
    if (!sectionCell) return null; // Section row must have a cell
    
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
   * Extracts styles for a section from its primary cell (td).
   * @param cellElement The TD element of the section row.
   * @returns EmailSectionStyles
   */
   private extractSectionStyles(cellElement: Element | null): EmailSectionStyles {
       if (!cellElement) return {};
       const styles = parseStyleString(cellElement.getAttribute('style'));
       
       // Reconstruct nested objects if needed (e.g., from padding-top etc.)
       const sectionStyles: EmailSectionStyles = {
           backgroundColor: styles.backgroundColor,
           // Reconstruct padding object
           padding: {
               top: styles.paddingTop,
               right: styles.paddingRight,
               bottom: styles.paddingBottom,
               left: styles.paddingLeft,
           },
           // Reconstruct border object
           border: {
               width: styles.borderWidth,
               style: styles.borderStyle as any, // Cast needed, refine later
               color: styles.borderColor,
           }
       };
       // Basic cleanup of undefined properties
       if (!sectionStyles.padding?.top && !sectionStyles.padding?.right && !sectionStyles.padding?.bottom && !sectionStyles.padding?.left) delete sectionStyles.padding;
       if (!sectionStyles.border?.width && !sectionStyles.border?.style && !sectionStyles.border?.color) delete sectionStyles.border;
       
       return sectionStyles;
   }

  /**
   * Parses elements within a section container.
   * @param sectionContainer The DOM element containing elements (likely an inner table).
   * @returns An array of EmailElement objects.
   */
  private parseElements(sectionContainer: Element): EmailElement[] {
    const elements: EmailElement[] = [];
    const elementRows = sectionContainer.querySelector('tbody')?.children;
    if (elementRows) {
      for (let i = 0; i < elementRows.length; i++) {
         const row = elementRows[i];
        if (row.tagName === 'TR') {
           try {
               const element = this.parseElement(row);
               if (element) {
                 elements.push(element);
               } else {
                  console.warn(`[SemanticParserV2] Failed to parse element at row index ${i} within its section. Skipping.`);
               }
           } catch(error) {
               console.error(`[SemanticParserV2] Error parsing element row at index ${i} within its section:`, error);
               // Optionally log row.outerHTML here for debugging
           }
        }
      }
    }
    return elements;
  }

  /**
   * Parses a DOM element row (<tr>) into an EmailElement object.
   * Includes validation of extracted properties.
   * @param elementRow The TR element representing the element.
   * @returns An EmailElement object or null if invalid or validation fails.
   */
  private parseElement(elementRow: Element): EmailElement | null {
    const elementWrapper = elementRow.querySelector('td');
    if (!elementWrapper) return null; 

    const elementId = elementWrapper.id?.replace('element-', '') || generateId();
    const layoutStyles = this.extractLayoutStyles(elementWrapper);
    
    const contentElement = elementWrapper.firstElementChild;
    
    let elementType: ElementType;
    let actualContentElement: Element | null = contentElement;
    
    const contentHtmlElement = contentElement as HTMLElement | null;
    if (contentHtmlElement?.tagName === 'TABLE' && contentHtmlElement?.style.width === '100%') {
        elementType = 'spacer';
    } else {
        elementType = this.determineElementType(contentElement);
        if (elementType === 'image' && contentElement?.parentElement?.tagName === 'A') {
             actualContentElement = contentElement.parentElement;
        }
    } 

    const elementContent = this.extractElementContent(actualContentElement, elementType, elementWrapper);
    // Extract and validate properties
    const elementProperties = this.extractAndValidateElementProperties(actualContentElement, elementType);

    // If property extraction/validation failed, return null
    if (elementProperties === null) {
        console.warn(`[SemanticParserV2] Skipping element ${elementId} due to invalid/missing properties for type ${elementType}.`);
        return null;
    }

    const baseElement = {
        id: elementId,
        content: elementContent,
        layout: layoutStyles,
    };

    // Construct final element - types are now reasonably validated by extractAndValidateElementProperties
    switch (elementType) {
      case 'header': return { ...baseElement, type: 'header', properties: elementProperties as HeaderElementProperties };
      case 'text': return { ...baseElement, type: 'text', properties: elementProperties as TextElementProperties };
      case 'button': return { ...baseElement, type: 'button', properties: elementProperties as ButtonElementProperties };
      case 'image': return { ...baseElement, type: 'image', properties: elementProperties as ImageElementProperties };
      case 'divider': return { ...baseElement, type: 'divider', properties: elementProperties as DividerElementProperties };
      case 'spacer': return { ...baseElement, type: 'spacer', properties: elementProperties as SpacerElementProperties };
      default:
          // Should be unreachable if validation is correct
          console.error(`[SemanticParserV2] Constructing element failed unexpectedly for type: ${elementType}`);
          return null;
    }
  }
  
  // --- Type Guards for Properties (Example) ---
  private isHeaderProperties(props: any): props is HeaderElementProperties {
      return typeof props?.level === 'string';
  }
  private isTextProperties(props: any): props is TextElementProperties {
      // Text has mostly optional typography, so check if it's an object
      return typeof props === 'object'; 
  }
  private isButtonProperties(props: any): props is ButtonElementProperties {
       return typeof props?.button?.href === 'string';
  }
  private isImageProperties(props: any): props is ImageElementProperties {
      return typeof props?.image?.src === 'string';
  }
   private isDividerProperties(props: any): props is DividerElementProperties {
       return typeof props?.divider === 'object';
  }
  private isSpacerProperties(props: any): props is SpacerElementProperties {
      return typeof props?.spacer?.height === 'string';
  }

  /**
   * Determines the ElementType based on the content of a cell.
   * Corrected logic for links containing images.
   * @param contentElement The core element within the cell (e.g., p, h2, img, a)
   * @returns The determined ElementType or a default.
   */
  private determineElementType(contentElement: Element | null): ElementType {
      if (!contentElement) return 'text';
      
      const tagName = contentElement.tagName;
      switch(tagName) {
          case 'H1': case 'H2': case 'H3': case 'H4': case 'H5': case 'H6': return 'header';
          case 'P': return 'text';
          case 'A': 
              // It's an Anchor tag. Check if its ONLY child is an IMG
              const firstChild = contentElement.firstElementChild;
              if (contentElement.children.length === 1 && firstChild?.tagName === 'IMG') {
                  return 'image'; // Treat as image if link only contains an image
              }
              return 'button'; // Otherwise, treat as button
          case 'IMG': return 'image';
          case 'HR': return 'divider';
          case 'TABLE': 
              console.warn('Found unexpected TABLE element type during determination (might be spacer, handled earlier).')
              return 'text';
          default: return 'text';
      }
  }
  
  /**
   * Extracts layout styles from a wrapper element (td).
   * @param wrapperElement The TD element.
   * @returns EmailElementLayout
   */
   private extractLayoutStyles(wrapperElement: Element): EmailElementLayout {
       const styles = parseStyleString(wrapperElement.getAttribute('style'));
       const layout: EmailElementLayout = {
           width: styles.width,
           height: styles.height,
           maxWidth: styles.maxWidth,
           align: styles.textAlign as any, // textAlign on cell often controls element alignment
           valign: styles.verticalAlign as any,
           padding: {
               top: styles.paddingTop,
               right: styles.paddingRight,
               bottom: styles.paddingBottom,
               left: styles.paddingLeft,
           },
           margin: { // Margins are tricky on TDs, usually controlled by section padding or spacers
               // Attempt to parse if present, but often unreliable
               top: styles.marginTop,
               right: styles.marginRight,
               bottom: styles.marginBottom,
               left: styles.marginLeft,
           }
       };
       // Basic cleanup
       if (!layout.padding?.top && !layout.padding?.right && !layout.padding?.bottom && !layout.padding?.left) delete layout.padding;
       if (!layout.margin?.top && !layout.margin?.right && !layout.margin?.bottom && !layout.margin?.left) delete layout.margin;
       return layout;
   }
   
   /**
    * Extracts type-specific properties AND performs basic validation.
    * @param contentElement The core element (p, h2, img, a etc.)
    * @param type The determined ElementType.
    * @returns EmailElementProperties object if valid, otherwise null.
    */
   private extractAndValidateElementProperties(contentElement: Element | null, type: ElementType): EmailElementProperties | null {
       if (!contentElement && type !== 'spacer') { // Spacer might be an empty cell
           console.warn(`[SemanticParserV2] Content element is null for non-spacer type ${type}.`);
           return null;
       }
       
       let properties: EmailElementProperties | null = null;
       try {
            const styles = parseStyleString(contentElement?.getAttribute('style') ?? null);
            const textContent = contentElement?.textContent || ''; // Extract text content once

            switch(type) {
                case 'header':
                    const headerProps: HeaderElementProperties = {
                        level: contentElement!.tagName.toLowerCase() as any, // ! safe due to check above
                        text: textContent, // Populate the text property
                        typography: {
                            fontFamily: styles.fontFamily,
                            fontSize: styles.fontSize,
                            fontWeight: styles.fontWeight,
                            fontStyle: safeCast(styles.fontStyle, ['italic', 'normal']),
                            color: styles.color,
                            textAlign: styles.textAlign as any,
                            lineHeight: styles.lineHeight
                        }
                    };
                    if (!headerProps.level || !['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(headerProps.level)) {
                         throw new Error('Invalid or missing header level');
                    }
                    properties = headerProps;
                    break;
                case 'text':
                    const textProps: TextElementProperties = { 
                        text: textContent, // Populate the text property
                         typography: {
                             fontFamily: styles.fontFamily,
                             fontSize: styles.fontSize,
                             fontWeight: styles.fontWeight,
                             fontStyle: safeCast(styles.fontStyle, ['italic', 'normal']),
                             color: styles.color,
                             textAlign: styles.textAlign as any,
                             lineHeight: styles.lineHeight
                         }
                    };
                    // Add any text-specific validation if needed (e.g., font size format)
                    properties = textProps;
                    break;
                case 'button':
                    const buttonLink = contentElement as HTMLAnchorElement;
                    const buttonContent = buttonLink.textContent || ''; // Get button text
                    const buttonStyles = parseStyleString(buttonLink.getAttribute('style'));
                    const buttonProps: ButtonElementProperties = {
                        button: {
                            href: buttonLink.getAttribute('href') || '',
                            target: safeCast(buttonLink.getAttribute('target') || '_blank', ['_blank', '_self']),
                            backgroundColor: buttonStyles.backgroundColor,
                            textColor: buttonStyles.color,
                            borderRadius: buttonStyles.borderRadius,
                            border: buttonStyles.border,
                        },
                        typography: {
                            fontFamily: buttonStyles.fontFamily,
                            fontSize: buttonStyles.fontSize,
                            fontWeight: buttonStyles.fontWeight
                        }
                    };
                    if (!buttonProps.button.href) {
                        throw new Error('Button href is missing or empty');
                    }
                    // Add basic URL format check (example)
                    if (!buttonProps.button.href.startsWith('http') && !buttonProps.button.href.startsWith('mailto:') && buttonProps.button.href !== '#') {
                        console.warn(`[SemanticParserV2] Button href "${buttonProps.button.href}" might be invalid.`);
                    }
                    properties = buttonProps;
                    break;
                case 'image':
                    // ... (logic to find imgElement, linkHref, linkTarget) ...
                    let imgElement: HTMLImageElement | null = null;
                    if (contentElement?.tagName === 'A') imgElement = contentElement.querySelector('img');
                    else if (contentElement?.tagName === 'IMG') imgElement = contentElement as HTMLImageElement;
                    
                    if (!imgElement) throw new Error('Image tag not found for image element');

                    const imgStyles = parseStyleString(imgElement.getAttribute('style'));
                    const imageProps: ImageElementProperties = {
                         image: {
                             src: imgElement.getAttribute('src') || '',
                             alt: imgElement.getAttribute('alt') || '',
                             width: imgStyles.width || imgElement.getAttribute('width') || undefined,
                             height: imgStyles.height || imgElement.getAttribute('height') || undefined,
                         },
                         border: {
                             width: imgStyles.borderWidth,
                             style: safeCast(imgStyles.borderStyle, ['solid', 'dashed', 'dotted']),
                             color: imgStyles.borderColor,
                             radius: imgStyles.borderRadius
                         }
                    };
                     if (!imageProps.image.src) {
                         throw new Error('Image src is missing or empty');
                     }
                     if (!imageProps.border?.width && !imageProps.border?.style && !imageProps.border?.color && !imageProps.border?.radius) delete imageProps.border;
                     properties = imageProps;
                    break;
                case 'divider':
                    const dividerProps: DividerElementProperties = {
                        divider: {
                            color: styles.borderTopColor, // hr styles often use border-top
                            height: styles.borderTopWidth,
                            width: styles.width
                        }
                    };
                    properties = dividerProps;
                    break;
                case 'spacer':
                     // Spacer is handled differently as contentElement might be the table itself
                     const spacerTable = contentElement as HTMLTableElement | null;
                     const spacerCell = spacerTable?.querySelector('td');
                     const spacerStyles = parseStyleString(spacerCell?.getAttribute('style') ?? null);
                     const spacerHeight = spacerStyles?.height;
                     if (!spacerHeight) {
                         throw new Error('Spacer height could not be determined from cell style');
                     }
                     // Basic validation: check if it ends with 'px' (could be more robust)
                     if (!spacerHeight.endsWith('px')) {
                         console.warn(`[SemanticParserV2] Spacer height "${spacerHeight}" might be invalid format.`);
                     }
                     properties = { spacer: { height: spacerHeight } };
                    break;
                default:
                     const _exhaustiveCheck: never = type; // Ensure all types handled
                     throw new Error(`Unhandled element type in property extraction: ${_exhaustiveCheck}`);
           }
       } catch (error) {
           console.error(`[SemanticParserV2] Validation failed for type ${type}:`, error);
           return null; // Return null on validation failure
       }
       
       // Final check using type guards if needed, though switch logic should cover it
       // if (!this.isValidPropertiesForType(properties, type)) return null;
       
       return properties;
   }
   
   /**
    * Extracts the primary content string from the core element.
    * @param contentElement The core element (p, h2, img, a etc.)
    * @param type The determined ElementType.
    * @param wrapperElement The TD wrapper element (used for spacer fallback).
    * @returns The content string.
    */
   private extractElementContent(contentElement: Element | null, type: ElementType, wrapperElement: Element): string {
       if (!contentElement) return '';

       switch(type) {
           case 'header':
           case 'text':
           case 'button':
               return contentElement.textContent || '';
           case 'image':
                let imgElement = contentElement as HTMLImageElement;
                // Handle image inside link case
                if (contentElement.tagName !== 'IMG') {
                    imgElement = contentElement.querySelector('img') as HTMLImageElement;
                }
               return imgElement?.getAttribute('alt') || ''; // Use alt text as primary 'content' for image?
           case 'divider':
           case 'spacer':
               return ''; // No text content for these
           default:
                return contentElement.textContent || '';
       }
   }
} 