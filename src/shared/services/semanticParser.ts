/**
 * SEMANTIC PARSER CORE IMPLEMENTATION
 * 
 * This module provides the core implementation of the Semantic Parser, which converts
 * HTML email content into our structured EmailTemplate model. The parser uses a DOM-based
 * approach to extract email elements, sections, and styles from HTML.
 * 
 * ARCHITECTURE OVERVIEW:
 * 
 * This codebase implements the Adapter Pattern for HTML parsing to semantic models:
 * 
 * 1. ISemanticParser - Interface defining common parsing operations
 * 2. SemanticParserCore - Core implementation with shared functionality (this file)
 * 3. Environment-specific adapters:
 *    - Frontend: SemanticParser in src/features/services/semanticParser.ts
 *    - Backend: SemanticParser in src/backend/functions/_shared/services/semanticParser.ts
 *
 * This architecture eliminates code duplication while allowing environment-specific
 * customizations. The protected methods enable adapters to override specific
 * behaviors while maintaining the core parsing process.
 * 
 * PARSING PROCESS:
 * 1. Parse HTML into DOM structure
 * 2. Extract global styles from document
 * 3. Find and parse sections from the main container
 * 4. For each section, parse contained elements
 * 5. For each element, determine its type and extract properties
 * 6. Return a complete EmailTemplate object
 * 
 * EXTENSIBILITY:
 * - Environment-specific adapters can override any protected method
 * - Methods are structured to allow incremental enhancement
 * - The core focuses on basic parsing logic shared across environments
 */

import type {
  EmailTemplate,
  EmailSection,
  EmailElement,
  ElementType,
  EmailGlobalStyles,
  EmailSectionStyles,
  EmailElementLayout,
  EmailElementProperties,
  HeaderElementProperties,
  TextElementProperties,
  ButtonElementProperties,
  ImageElementProperties,
  DividerElementProperties,
  SpacerElementProperties,
  SubtextElementProperties,
  QuoteElementProperties,
  CodeElementProperties,
  ListElementProperties,
  IconElementProperties,
  NavElementProperties,
  SocialElementProperties,
  AppStoreBadgeElementProperties,
  UnsubscribeElementProperties,
  PreferencesElementProperties,
  PreviewTextElementProperties,
  ContainerElementProperties,
  BoxElementProperties,
  FooterElementProperties
} from '@shared/types';

import { generateId } from '@shared/lib/uuid';

/**
 * Interface defining the semantic parsing operations.
 * This ensures that all parser implementations provide the required functionality.
 */
export interface ISemanticParser {
  /**
   * Parses an HTML string into an EmailTemplate object.
   * @param html The HTML string to parse.
   * @returns The parsed EmailTemplate object.
   */
  parse(html: string): EmailTemplate;
}

/**
 * Core implementation of the semantic HTML parser.
 * This class contains the shared logic for parsing HTML into email templates.
 * Environment-specific adapters extend this class to provide platform-specific functionality.
 * 
 * Protected methods allow adapters to override specific behaviors while inheriting
 * the main parsing process.
 */
export class SemanticParserCore implements ISemanticParser {
  /**
   * Parses an HTML string into an EmailTemplate object.
   * This is an abstract method that must be implemented by adapters.
   * Each environment needs its own DOM parsing approach.
   * 
   * @param html The HTML string to parse.
   * @returns The parsed EmailTemplate object.
   */
  public parse(html: string): EmailTemplate {
    throw new Error('parse() method must be implemented by an environment-specific adapter');
  }

  /**
   * Extracts global styles from the document head.
   * This provides a basic implementation that adapters can enhance.
   * 
   * @param document The DOM document.
   * @returns An EmailGlobalStyles object with basic defaults.
   */
  protected extractGlobalStyles(document: Document): EmailGlobalStyles {
    // Basic implementation to be extended by adapters
    return {
      bodyBackgroundColor: '#FFFFFF',
      contentWidth: '600px'
    };
  }

  /**
   * Extracts styles for a section from its primary cell (td).
   * Parses inline styles and reconstructs nested style objects.
   * 
   * @param cellElement The TD element of the section row.
   * @returns EmailSectionStyles with background, padding and border information.
   */
  protected extractSectionStyles(cellElement: Element | null): EmailSectionStyles {
    if (!cellElement) return {};
    const styles = this.parseStyleString(cellElement.getAttribute('style'));
    
    // Reconstruct nested objects from flattened CSS properties
    const sectionStyles: EmailSectionStyles = {
        backgroundColor: styles.backgroundColor,
        // Reconstruct padding object from individual properties
        padding: {
            top: styles.paddingTop,
            right: styles.paddingRight,
            bottom: styles.paddingBottom,
            left: styles.paddingLeft,
        },
        // Reconstruct border object from individual properties
        border: {
            width: styles.borderWidth,
            style: styles.borderStyle as any, 
            color: styles.borderColor,
        }
    };
    
    // Clean up empty nested objects
    if (!sectionStyles.padding?.top && !sectionStyles.padding?.right && 
        !sectionStyles.padding?.bottom && !sectionStyles.padding?.left) {
      delete sectionStyles.padding;
    }
    if (!sectionStyles.border?.width && !sectionStyles.border?.style && 
        !sectionStyles.border?.color) {
      delete sectionStyles.border;
    }
    
    return sectionStyles;
  }

  /**
   * Extracts layout styles from a wrapper element (td).
   * This captures positioning, sizing and spacing properties.
   * 
   * @param wrapperElement The TD element containing the element.
   * @returns EmailElementLayout with dimension and spacing information.
   */
  protected extractLayoutStyles(wrapperElement: Element): EmailElementLayout {
    const styles = this.parseStyleString(wrapperElement.getAttribute('style'));
    const layout: EmailElementLayout = {
        width: styles.width,
        height: styles.height,
        maxWidth: styles.maxWidth,
        align: styles.textAlign as any, // textAlign on cell often controls element alignment
        valign: styles.verticalAlign as any,
        // Reconstruct padding object from individual properties
        padding: {
            top: styles.paddingTop,
            right: styles.paddingRight,
            bottom: styles.paddingBottom,
            left: styles.paddingLeft,
        },
        // Margins are tricky on TDs, usually controlled by section padding or spacers
        margin: {
            top: styles.marginTop,
            right: styles.marginRight,
            bottom: styles.marginBottom,
            left: styles.marginLeft,
        }
    };
    
    // Clean up empty nested objects
    if (!layout.padding?.top && !layout.padding?.right && 
        !layout.padding?.bottom && !layout.padding?.left) {
      delete layout.padding;
    }
    if (!layout.margin?.top && !layout.margin?.right && 
        !layout.margin?.bottom && !layout.margin?.left) {
      delete layout.margin;
    }
    return layout;
  }
  
  /**
   * Determines the ElementType based on the content of a cell.
   * Uses tag names and element structure to identify element types.
   * 
   * @param contentElement The core element within the cell (e.g., p, h2, img, a)
   * @returns The determined ElementType or a default of 'text'.
   */
  protected determineElementType(contentElement: Element | null): ElementType {
    if (!contentElement) return 'text';
    
    const tagName = contentElement.tagName;
    switch(tagName) {
      case 'H1': case 'H2': case 'H3': case 'H4': case 'H5': case 'H6': 
        return 'header';
        
      case 'P': 
        return 'text';
        
      case 'A': 
        // Special case: link containing only an image is treated as an image element
        const firstChild = contentElement.firstElementChild;
        if (contentElement.children.length === 1 && firstChild?.tagName === 'IMG') {
            return 'image'; // Treat as image if link only contains an image
        }
        return 'button'; // Otherwise, treat as button
        
      case 'IMG': 
        return 'image';
        
      case 'HR': 
        return 'divider';
        
      case 'TABLE': 
        // Tables are often used for spacing in email templates
        return 'spacer';
        
      default: 
        return 'text';
    }
  }

  /**
   * Extracts the primary content string from a DOM element.
   * Content extraction depends on the element type.
   * 
   * @param contentElement The core element (p, h2, img, a etc.)
   * @param type The determined ElementType.
   * @param wrapperElement The TD wrapper element (used for spacer fallback).
   * @returns The content string for the element.
   */
  protected extractElementContent(contentElement: Element | null, type: ElementType, wrapperElement: Element): string {
    if (!contentElement) return '';

    switch(type) {
      case 'header':
      case 'text':
      case 'button':
        // For text-based elements, use the text content
        return contentElement.textContent || '';
        
      case 'image':
        // For images, use the alt text as the content
        let imgElement = contentElement as HTMLImageElement;
        // Handle image inside link case
        if (contentElement.tagName !== 'IMG') {
          imgElement = contentElement.querySelector('img') as HTMLImageElement;
        }
        return imgElement?.getAttribute('alt') || '';
        
      case 'divider':
      case 'spacer':
        // These elements don't have meaningful text content
        return '';
        
      default:
        // Default fallback for any other element types
        return contentElement.textContent || '';
    }
  }

  /**
   * Extracts type-specific properties and validates them.
   * Each element type has its own property structure.
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

      // Extract properties based on element type
      switch(type) {
        case 'header':
          // Headers have level (h1-h6) and typography properties
          return {
            level: contentElement!.tagName.toLowerCase(),
            text: textContent,
            typography: this.extractTypographyStyles(styles)
          };
          
        case 'text':
          // Text elements have simple text content and typography
          return {
            text: textContent,
            typography: this.extractTypographyStyles(styles)
          };
          
        case 'button':
          // Buttons have link properties and button styling
          const buttonLink = contentElement as HTMLAnchorElement;
          return {
            button: {
              href: buttonLink.getAttribute('href') || '',
              target: this.safeCastStyle(buttonLink.getAttribute('target') || '_blank', ['_blank', '_self']),
              backgroundColor: styles.backgroundColor,
              textColor: styles.color,
              borderRadius: styles.borderRadius,
              border: styles.border,
            },
            typography: {
              fontFamily: styles.fontFamily,
              fontSize: styles.fontSize,
              fontWeight: styles.fontWeight
            }
          };
          
        case 'image':
          // Images have source, dimensions and optional border/link properties
          // Handle different image element structures (direct or inside a link)
          let imgElement: HTMLImageElement | null = null;
          if (contentElement?.tagName === 'A') imgElement = contentElement.querySelector('img');
          else if (contentElement?.tagName === 'IMG') imgElement = contentElement as HTMLImageElement;
          
          if (!imgElement) throw new Error('Image tag not found for image element');

          const imgStyles = this.parseStyleObject(imgElement);
          const imageProps: any = {
            image: {
              src: imgElement.getAttribute('src') || '',
              alt: imgElement.getAttribute('alt') || '',
              width: imgStyles.width || imgElement.getAttribute('width') || undefined,
              height: imgStyles.height || imgElement.getAttribute('height') || undefined,
            },
            border: {
              width: imgStyles.borderWidth,
              style: this.safeCastStyle(imgStyles.borderStyle, ['solid', 'dashed', 'dotted']),
              color: imgStyles.borderColor,
              radius: imgStyles.borderRadius
            }
          };
          
          // Handle linked images
          if (contentElement?.tagName === 'A') {
            imageProps.image.linkHref = contentElement.getAttribute('href') || undefined;
            imageProps.image.linkTarget = this.safeCastStyle(contentElement.getAttribute('target'), ['_blank', '_self']);
          }
          
          // Remove empty border object if no properties are set
          if (!imageProps.border?.width && !imageProps.border?.style && 
              !imageProps.border?.color && !imageProps.border?.radius) {
            delete imageProps.border;
          }
          
          return imageProps;
          
        case 'divider':
          // Dividers have color, height and width properties
          return {
            divider: {
              color: styles.borderTopColor, // hr styles often use border-top
              height: styles.borderTopWidth,
              width: styles.width
            }
          };
          
        case 'spacer':
          // Spacers primarily define vertical height
          // They are typically implemented as tables in email HTML
          const spacerTable = contentElement as HTMLTableElement | null;
          const spacerCell = spacerTable?.querySelector('td');
          const spacerStyles = this.parseStyleObject(spacerCell);
          const spacerHeight = spacerStyles?.height;
          if (!spacerHeight) {
            throw new Error('Spacer height could not be determined from cell style');
          }
          return { 
            spacer: { 
              height: spacerHeight 
            } 
          };
          
        default:
          // For unhandled element types, return empty properties
          console.warn(`[SemanticParser] Unhandled element type in property extraction: ${type}`);
          return {}; 
      }
    } catch (error) {
      console.error(`[SemanticParser] Validation failed for type ${type}:`, error);
      return null; // Return null on validation failure
    }
  }

  /**
   * Parse the style attribute of an element into a style object.
   * Convenience method that calls parseStyleString with the element's style attribute.
   * 
   * @param element The DOM element to extract styles from.
   * @returns Record<string, string> of style properties.
   */
  protected parseStyleObject(element: Element | null): Record<string, string> {
    if (!element) return {};
    return this.parseStyleString(element.getAttribute('style'));
  }

  /**
   * Parse a CSS style string into a JavaScript object.
   * Converts kebab-case properties to camelCase.
   * 
   * @param styleString The CSS style string (e.g., "color: red; margin-top: 10px;").
   * @returns Record<string, string> of style properties.
   */
  protected parseStyleString(styleString: string | null): Record<string, string> {
    const styles: Record<string, string> = {};
    if (!styleString) return styles;
    
    styleString.split(';').forEach(style => {
      const [key, value] = style.split(':');
      if (key && value) {
        // Convert kebab-case (CSS) to camelCase (JavaScript)
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
   * Extract typography-related styles from a style object.
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