import { EmailTemplate, EmailSection, EmailElement, ElementType, EmailGlobalStyles, EmailSectionStyles, EmailElementLayout, EmailElementProperties, HeaderElementProperties, TextElementProperties, ButtonElementProperties, ImageElementProperties, DividerElementProperties, SpacerElementProperties } from '../../types/v2';
import { SubtextElementProperties, QuoteElementProperties, CodeElementProperties, ListElementProperties } from '../../types/v2';
import { IconElementProperties, NavElementProperties, SocialElementProperties, AppStoreBadgeElementProperties, UnsubscribeElementProperties, PreferencesElementProperties, PreviewTextElementProperties, ContainerElementProperties, BoxElementProperties } from '../../types/v2';
import { JSDOM } from 'jsdom'; // We'll need a DOM parser library

// Helper function to generate IDs (replace with your actual implementation)
const generateId = () => Math.random().toString(36).substring(2, 15);

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
   * Determines the ElementType based on the primary content element within the wrapper.
   * @param contentElement The main DOM element representing the content (e.g., p, h1, img, table).
   * @returns The determined ElementType.
   */
  private determineElementType(contentElement: Element | null): ElementType {
    if (!contentElement) return 'text'; // Default or throw error?

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
        // (+) TODO: Need better way to distinguish text vs subtext (e.g., check styles?)
        // For now, assume basic text. Subtext might need specific class or style.
        return 'text'; // Or potentially 'subtext' based on styles?
      case 'a': // Buttons are often links styled as blocks
        if (contentElement.querySelector('img')) return 'image'; // Image link
        // Basic check for button styling (can be improved)
        const styles = parseStyleString(contentElement.getAttribute('style'));
        if (styles.display?.includes('inline-block') || styles.backgroundColor) {
            return 'button';
        }
        return 'text'; // Could be a simple text link
      case 'img':
        return 'image';
      case 'hr':
        return 'divider';
      case 'table':
        // Check if it's a spacer table
        if (contentElement.querySelector('td[style*="height:"]')) {
          return 'spacer';
        }
        // (+) Check if it looks like a quote table
        if (parseStyleString(contentElement.getAttribute('style')).borderLeft) {
          return 'quote';
        }
        // Could be other tables (layout, nav, etc.) - needs more checks
        // For now, fallback or add specific checks
        break;
      // (+) Add cases for new types based on common structures
      case 'div':
        // Check if it contains code structure
        if (contentElement.querySelector('pre > code')) {
          return 'code';
        }
        // Could be a container/box? Needs specific checks.
        break;
      case 'ol':
      case 'ul':
        return 'list';
    }

    // (+) Check for specific structures for other types
    if (tagName === 'div' && (contentElement as HTMLElement).style.display === 'none') {
        return 'previewText';
    }
    // Check for nav structure (p > a + a...)
    if (tagName === 'p' && contentElement.querySelectorAll('a').length > 1) {
        // Distinguish between nav and social? Check if links contain images?
        const firstLinkContent = contentElement.querySelector('a')?.innerHTML;
        if (firstLinkContent?.includes('<img')) {
            return 'social'; // Assuming social links contain images
        } else {
            return 'nav'; // Assuming nav links contain text
        }
    }
    // Check for single link paragraph (unsubscribe/preferences)
    if (tagName === 'p' && contentElement.querySelectorAll('a').length === 1) {
         const linkText = contentElement.querySelector('a')?.textContent?.toLowerCase();
         if (linkText?.includes('unsubscribe')) return 'unsubscribe';
         if (linkText?.includes('preference')) return 'preferences';
         // Could still be other single links - might need better classification
    }

    // (+) Icon / AppBadge (img or a > img)
    if ((tagName === 'img' || tagName === 'a') && contentElement.querySelector('img')) {
        const imgElement = tagName === 'img' ? contentElement : contentElement.querySelector('img');
        // Simple check: if width is small, assume icon?
        const width = parseInt(imgElement?.getAttribute('width') || '50');
        if (width <= 48) { // Arbitrary threshold for icon size
            return 'icon';
        }
        // TODO: Better check for AppStoreBadge? Look at src/alt?
        if (imgElement?.getAttribute('src')?.includes('-badge')) { // Check placeholder src
            return 'appStoreBadge';
        }
        // Falls back to 'image' if not icon/badge
        return 'image';
    }

     // (+) Container/Box are currently tricky to identify from content element alone
     // They might be identified by the wrapper TD styles or lack of other content?
     // Placeholder comments might be parsed if needed.

    console.warn(`[SemanticParserV2] Could not determine element type for tag: ${tagName}. Defaulting to 'text'. Element:`, contentElement.outerHTML);
    return 'text'; // Fallback type
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
    * Extracts and validates properties specific to an element type.
    * @param contentElement The primary content DOM element (e.g., p, img, a).
    * @param type The determined ElementType.
    * @returns A properties object or null if invalid.
    */
   private extractAndValidateElementProperties(contentElement: Element | null, type: ElementType): EmailElementProperties | null {
       if (!contentElement) return {}; // Return empty for safety, or null?
       const styles = parseStyleString(contentElement.getAttribute('style'));
       let properties: EmailElementProperties | null = {};

       switch (type) {
         case 'header':
           const headerProps: HeaderElementProperties = {
               level: contentElement.tagName.toLowerCase() as any, // Cast needed
               text: contentElement.textContent || '',
               typography: this.extractTypographyStyles(styles)
           };
           if (!headerProps.level || !['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(headerProps.level)) {
                throw new Error('Invalid or missing header level');
           }
           properties = headerProps;
           break;
         case 'text':
           const textProps: TextElementProperties = {
               text: contentElement.textContent || '',
               typography: this.extractTypographyStyles(styles)
           };
           properties = textProps;
           break;
         case 'button':
           const buttonLink = contentElement as HTMLAnchorElement;
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
           const imgProps: ImageElementProperties = { image: { src: '' } }; // Initialize
           imgProps.image.src = contentElement.getAttribute('src') || '';
           imgProps.image.alt = contentElement.getAttribute('alt') || undefined;
           imgProps.image.width = contentElement.getAttribute('width') || undefined;
           imgProps.image.height = contentElement.getAttribute('height') || undefined;
           const imgStyles = parseStyleString(contentElement.getAttribute('style'));
           imgProps.border = {
               width: imgStyles.borderWidth,
               style: safeCast(imgStyles.borderStyle, ['solid', 'dashed', 'dotted']),
               color: imgStyles.borderColor,
               radius: imgStyles.borderRadius
           };
            if (!imgProps.border?.width && !imgProps.border?.style && !imgProps.border?.color && !imgProps.border?.radius) delete imgProps.border;
           
           // (+) Check for parent link (for regular links or video poster links)
           const parentLink = contentElement.closest('a');
           if (parentLink) {
               imgProps.image.linkHref = parentLink.getAttribute('href') || undefined;
               imgProps.image.linkTarget = safeCast(parentLink.getAttribute('target'), ['_blank', '_self']);
               // TODO: How to differentiate between linkHref and videoHref during parse?
               // For now, linkHref holds the value. Generator prioritizes videoHref if present.
               // We could add a data-attribute during generation if needed: data-is-video="true"
           }
           properties = imgProps;
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
            const spacerStyles = parseStyleString(spacerCell?.getAttribute('style'));
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

        // (+) Add cases for new types
        case 'subtext':
           const subtextProps: SubtextElementProperties = { text: contentElement.textContent || '' };
           subtextProps.typography = this.extractTypographyStyles(styles);
           properties = subtextProps;
           break;
        
        case 'quote':
            const quoteProps: QuoteElementProperties = { text: '' }; // Initialize
            const quoteTableStyles = parseStyleString(contentElement.getAttribute('style'));
            // Extract border/bg from table element
            quoteProps.border = { 
                width: quoteTableStyles.borderLeftWidth, 
                style: safeCast(quoteTableStyles.borderLeftStyle, ['solid', 'dashed', 'dotted']),
                color: quoteTableStyles.borderLeftColor,
            };
            if (!quoteProps.border?.width && !quoteProps.border?.style && !quoteProps.border?.color) delete quoteProps.border;
            quoteProps.backgroundColor = quoteTableStyles.backgroundColor;
            // Extract text/styles from inner p tags
            const textP = contentElement.querySelector('td > p:first-child');
            if (textP) {
                quoteProps.text = textP.textContent || '';
                quoteProps.typography = this.extractTypographyStyles(parseStyleString(textP.getAttribute('style')));
            }
            const citationP = contentElement.querySelector('td > p:last-child'); // Assumes citation is last p
            if (citationP && citationP !== textP) {
                quoteProps.citation = citationP.textContent?.replace(/^\-\s*/, '').trim() || undefined;
            }
            properties = quoteProps;
            break;
            
        case 'code':
            const codeProps: CodeElementProperties = { code: '' };
            const codeBlockStyles = parseStyleString(contentElement.getAttribute('style')); // Styles from the outer div
            codeProps.backgroundColor = codeBlockStyles.backgroundColor;
            codeProps.borderRadius = codeBlockStyles.borderRadius;
            codeProps.padding = codeBlockStyles.padding;
            const codeTag = contentElement.querySelector('pre > code');
            if (codeTag) {
                codeProps.code = codeTag.textContent || '';
                codeProps.typography = this.extractTypographyStyles(parseStyleString(codeTag.getAttribute('style')));
                // Language hint might be stored in a class, e.g., class="language-javascript"
                const preTag = codeTag.closest('pre');
                const langClass = preTag?.className.match(/language-(\S+)/);
                if (langClass && langClass[1]) {
                    codeProps.language = langClass[1];
                }
            }
            properties = codeProps;
            break;
        
        case 'list':
            const listProps: ListElementProperties = { items: [], listType: 'unordered' };
            listProps.listType = contentElement.tagName.toLowerCase() === 'ol' ? 'ordered' : 'unordered';
            const listItems = contentElement.querySelectorAll('li');
            if (listItems.length > 0) {
                listProps.items = Array.from(listItems).map(li => li.textContent || '');
                // Extract typography from the first list item as representative (or could check list tag itself)
                listProps.typography = this.extractTypographyStyles(parseStyleString(listItems[0].getAttribute('style')));
                 // Extract marker style (basic color example)
                 const listStyles = parseStyleString(contentElement.getAttribute('style'));
                 if(listStyles.color) {
                     listProps.markerStyle = { color: listStyles.color };
                 }
            }
            properties = listProps;
            break;

        // (+) Add cases for MORE new types
        case 'icon':
            const iconProps: IconElementProperties = { icon: { src: '' } };
            let iconImgElement: HTMLImageElement | null = null;
            let iconLinkElement: HTMLAnchorElement | null = null;

            if (contentElement.tagName === 'IMG') {
                iconImgElement = contentElement as HTMLImageElement;
            } else if (contentElement.tagName === 'A') {
                iconLinkElement = contentElement as HTMLAnchorElement;
                iconImgElement = contentElement.querySelector('img');
            }

            if (!iconImgElement) throw new Error('Icon img tag not found');

            iconProps.icon.src = iconImgElement.getAttribute('src') || '';
            iconProps.icon.alt = iconImgElement.getAttribute('alt') || undefined;
            iconProps.icon.width = iconImgElement.getAttribute('width') || undefined;
            iconProps.icon.height = iconImgElement.getAttribute('height') || undefined;

            if (iconLinkElement) {
                iconProps.icon.linkHref = iconLinkElement.getAttribute('href') || undefined;
                iconProps.icon.linkTarget = safeCast(iconLinkElement.getAttribute('target'), ['_blank', '_self']);
            }
            properties = iconProps;
            break;

        case 'nav':
            const navProps: NavElementProperties = { links: [] };
            const navLinks = contentElement.querySelectorAll('a');
            navProps.links = Array.from(navLinks).map(link => {
                const linkStyles = parseStyleString(link.getAttribute('style'));
                return {
                    text: link.textContent || '',
                    href: link.getAttribute('href') || '#',
                    target: safeCast(link.getAttribute('target'), ['_blank', '_self']),
                    typography: this.extractTypographyStyles(linkStyles)
                };
            });
            // Extract layout (spacing, align from parent p?) and default typography from parent <p>
            navProps.typography = this.extractTypographyStyles(styles); // Styles from the <p>
            // TODO: Extract spacing/align from layout of the <p> or its styles?
            properties = navProps;
            break;

        case 'social':
            const socialProps: SocialElementProperties = { links: [] };
            const socialLinks = contentElement.querySelectorAll('a');
            socialProps.links = Array.from(socialLinks).map(link => {
                const img = link.querySelector('img');
                const imgSrc = img?.getAttribute('src') || '';
                // Infer platform from placeholder src or alt text (basic)
                let platform = 'custom';
                const platformMatch = imgSrc.match(/#([a-zA-Z]+)-icon/);
                if (platformMatch && platformMatch[1]) {
                    platform = platformMatch[1];
                }
                return {
                    platform: platform as any, // Cast needed
                    href: link.getAttribute('href') || '#',
                    iconSrc: imgSrc !== `#${platform}-icon` ? imgSrc : undefined, // Only store if non-default
                    alt: img?.getAttribute('alt') || undefined
                };
            });
             // Extract layout (spacing, align from parent p?) and iconStyle from first icon?
             const firstIconImg = contentElement.querySelector('a > img');
             if(firstIconImg) {
                 const iconStyles = parseStyleString(firstIconImg.getAttribute('style'));
                 socialProps.iconStyle = {
                     width: iconStyles.width,
                     height: iconStyles.height,
                     borderRadius: iconStyles.borderRadius
                 }
             }
             // TODO: Extract spacing/align
            properties = socialProps;
            break;

        case 'appStoreBadge':
            const badgeProps: AppStoreBadgeElementProperties = { badge: { platform: 'apple-app-store', href: '' } }; // Default platform needed
            const badgeLink = contentElement as HTMLAnchorElement;
            const badgeImg = contentElement.querySelector('img');

            if (!badgeLink || !badgeImg) throw new Error('AppStoreBadge structure invalid (<a><img> missing)');

            badgeProps.badge.href = badgeLink.getAttribute('href') || '#';
            badgeProps.badge.alt = badgeImg.getAttribute('alt') || undefined;
            badgeProps.badge.width = badgeImg.getAttribute('width') || undefined;
            badgeProps.badge.height = badgeImg.getAttribute('height') || undefined;

            // Infer platform from placeholder src or alt text (basic)
            const badgeSrc = badgeImg.getAttribute('src') || '';
            if (badgeSrc.includes('google-play') || badgeProps.badge.alt?.toLowerCase().includes('google play')) {
                badgeProps.badge.platform = 'google-play-store';
            } else if (badgeSrc.includes('app-store') || badgeProps.badge.alt?.toLowerCase().includes('app store')) {
                 badgeProps.badge.platform = 'apple-app-store';
            }
            // TODO: Extract language?
            properties = badgeProps;
            break;

        case 'unsubscribe':
            const unsubProps: UnsubscribeElementProperties = { link: { text: '', href: '' } };
            const unsubLinkElement = contentElement.querySelector('a');
            if (!unsubLinkElement) throw new Error('Unsubscribe link not found');
            unsubProps.link.text = unsubLinkElement.textContent || 'Unsubscribe';
            unsubProps.link.href = unsubLinkElement.getAttribute('href') || '#';
            unsubProps.link.target = safeCast(unsubLinkElement.getAttribute('target'), ['_blank', '_self']);
            // Typography from parent <p>
            unsubProps.typography = this.extractTypographyStyles(styles);
            properties = unsubProps;
            break;

        case 'preferences':
             const prefProps: PreferencesElementProperties = { link: { text: '', href: '' } };
            const prefLinkElement = contentElement.querySelector('a');
            if (!prefLinkElement) throw new Error('Preferences link not found');
            prefProps.link.text = prefLinkElement.textContent || 'Preferences';
            prefProps.link.href = prefLinkElement.getAttribute('href') || '#';
            prefProps.link.target = safeCast(prefLinkElement.getAttribute('target'), ['_blank', '_self']);
            // Typography from parent <p>
            prefProps.typography = this.extractTypographyStyles(styles);
            properties = prefProps;
            break;

        case 'previewText':
            const previewProps: PreviewTextElementProperties = { text: '' };
            // Extract text content, remove padding characters
            let previewTextContent = contentElement.textContent || '';
            previewTextContent = previewTextContent.replace(/(&zwnj;|&nbsp;)+$/, '').trim();
            previewProps.text = previewTextContent;
            properties = previewProps;
            break;

        case 'container': // These currently have no unique content element
        case 'box':
             // Properties are mainly styles applied to the wrapper TD (layoutStyles)
             // Or potentially read from the placeholder comment if we added attributes there
             // For now, return empty properties object, assuming styles handled by layout.
             console.warn(`Parsing basic properties for ${type}. Advanced styles may need layout parsing.`);
             properties = {};
             break;

         default:
           // Should be handled by determineElementType, but as fallback:
           console.warn("Attempting to extract properties for unknown or unhandled type:", type);
           properties = {}; // Empty object
       }

       return properties;
   }
   
   /**
    * Helper to extract typography-related styles from a style object.
    * @param styles Parsed style object.
    * @returns Typography properties object.
    */
   private extractTypographyStyles(styles: Record<string, string>): any {
       const typography: any = {
           fontFamily: styles.fontFamily,
           fontSize: styles.fontSize,
           fontWeight: styles.fontWeight,
           fontStyle: styles.fontStyle,
           color: styles.color,
           textAlign: safeCast(styles.textAlign, ['left', 'center', 'right']),
           lineHeight: styles.lineHeight,
       };
       // Remove undefined properties
       Object.keys(typography).forEach(key => typography[key] === undefined && delete typography[key]);
       return Object.keys(typography).length > 0 ? typography : undefined;
   }

  /**
   * Extracts the primary textual content of an element based on its type.
   * @param contentElement The primary content DOM element.
   * @param type The determined ElementType.
   * @param wrapperElement The wrapping element (td).
   * @returns The textual content string.
   */
   private extractElementContent(contentElement: Element | null, type: ElementType, wrapperElement: Element): string {
     if (!contentElement) return '';

     switch (type) {
       case 'header':
       case 'text':
       case 'button': // Use textContent for button link as well
       case 'subtext':
         return contentElement.textContent || '';
       case 'image':
         return contentElement.getAttribute('alt') || ''; // Use Alt text as content
       case 'divider':
       case 'spacer':
       case 'list': // List items are in properties
       case 'code': // Code content is in properties
         return ''; // No direct text content
       case 'quote': // Extract main quote text, not citation
         return contentElement.querySelector('td > p:first-child')?.textContent || '';
       case 'icon':
       case 'social':
       case 'appStoreBadge':
         return contentElement.querySelector('img')?.getAttribute('alt') || '';
       case 'nav': // Maybe concatenate link text? Or leave empty?
         return Array.from(contentElement.querySelectorAll('a')).map(a => a.textContent).join(', '); // Example concatenation
       case 'unsubscribe':
       case 'preferences':
         return contentElement.querySelector('a')?.textContent || '';
       case 'previewText':
       case 'container':
       case 'box':
         return ''; // No visible text content
       default:
         // Fallback for potentially unhandled types
         console.warn(`Extracting content with fallback for type: ${type}`);
         return contentElement.textContent || '';
     }
   }
} 