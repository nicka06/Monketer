// Import from shared types
import type {
    EmailTemplate,
    EmailSection,
    EmailElement,
    EmailElementLayout,
    EmailSectionStyles,
    EmailGlobalStyles,
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

/**
 * ARCHITECTURE OVERVIEW:
 * 
 * This codebase implements the Adapter Pattern for HTML email generation:
 * 
 * 1. IHtmlGenerator - Interface defining common HTML generation operations
 * 2. HtmlGeneratorCore - Core implementation with shared functionality
 * 3. Environment-specific adapters:
 *    - Frontend: HtmlGeneratorV2 in src/features/services/htmlGenerator.ts
 *      (adds placeholder handling and edit-mode data attributes)
 *    - Backend: HtmlGenerator in src/backend/functions/_shared/services/htmlGenerator.ts
 *      (simple adapter that extends core without modifications)
 *
 * This architecture eliminates code duplication while allowing environment-specific
 * customizations. The protected methods enable adapters to override specific
 * behaviors while maintaining the core template generation process.
 */

/**
 * Interface defining the HTML generation operations
 */
export interface IHtmlGenerator {
  /**
   * Generates the full HTML document for an email template.
   * @param template The EmailTemplate object.
   * @returns The complete HTML string.
   */
  generate(template: EmailTemplate): string;
}

/**
 * Core implementation of the HTML generator for email templates.
 * This class contains the shared logic for generating HTML from email templates.
 * Environment-specific adapters extend this class to provide platform-specific functionality.
 * 
 * Protected methods allow adapters to override specific behaviors while inheriting
 * the main generation process.
 */
export class HtmlGeneratorCore implements IHtmlGenerator {
  /**
   * Generates the full HTML document for an email template.
   * @param template The V2 EmailTemplate object.
   * @returns The complete HTML string.
   */
  public generate(template: EmailTemplate): string {
    const globalStyles = template.globalStyles || {};
    const bodyStyles = this.generateGlobalBodyStyle(globalStyles);
    const contentWidth = globalStyles.contentWidth || '600px';

    // Enhanced head content with more resets and compatibility meta tags
    const headContent = `
      <head>
        <meta charset="UTF-8">
        <meta http-equiv="X-UA-Compatible" content="IE=edge"> <!-- Force IE standards mode -->
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${template.name || 'Your Email'}</title>
        <!--[if mso]>
        <noscript>
        <xml>
        <o:OfficeDocumentSettings>
          <o:AllowPNG/>
          <o:PixelsPerInch>96</o:PixelsPerInch>
        </o:OfficeDocumentSettings>
        </xml>
        </noscript>
        <![endif]-->
        <style>
          /* More Robust Resets */
          body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
          table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
          img { -ms-interpolation-mode: bicubic; display: block; border: 0; outline: none; text-decoration: none; }
          body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; }
          a[x-apple-data-detectors] { color: inherit !important; text-decoration: none !important; font-size: inherit !important; font-family: inherit !important; font-weight: inherit !important; line-height: inherit !important; }
          /* Fix for Gmail blue links */
          u + #body a { color: inherit; text-decoration: none; font-size: inherit; font-family: inherit; font-weight: inherit; line-height: inherit; }
          /* Fix for older Outlook */
          table { border-collapse: collapse !important; }
          /* Add more global styles or resets here */

          /* Responsive Styles */
          @media screen and (max-width: ${contentWidth}) {
            /* Allow table cells to stack */
            .stack-column {
              display: block !important;
              width: 100% !important;
              max-width: 100% !important;
              direction: ltr !important;
            }
            /* Example: Make images full width */
            .responsive-image img {
              width: 100% !important;
              height: auto !important;
            }
            /* Example: Adjust text size (use sparingly) */
            .mobile-text-large {
                font-size: 18px !important;
                line-height: 1.4 !important;
            }
            /* Add more mobile-specific styles here using classes */
          }

          /* Additional client fixes */
          /* ... (Fixes for Gmail blue links, etc.) ... */
        </style>
      </head>`;
      
    const sectionsHtml = template.sections
      .map(section => this.generateSectionHtml(section))
      .join('\n');
      
    // Added id="body" for Gmail blue link fix
    const bodyContent = `
      <body id="body" style="margin:0; padding:0; word-spacing:normal; ${bodyStyles}">
        <table role="presentation" style="width:100%; border-collapse:collapse; border:0; border-spacing:0;">
          <tr>
            <td align="center" style="padding:0;">
              <!--[if mso | IE]>
              <table role="presentation" align="center" border="0" cellspacing="0" cellpadding="0" style="width:${contentWidth};">
              <tr>
              <td>
              <![endif]-->
              <table role="presentation" class="email-container" style="width:100%; max-width:${contentWidth}; border-collapse:collapse; border:0; border-spacing:0; text-align:left; background:${globalStyles.bodyBackgroundColor || '#ffffff'};">
                ${sectionsHtml}
              </table>
              <!--[if mso | IE]>
              </td>
              </tr>
              </table>
              <![endif]-->
            </td>
          </tr>
        </table>
      </body>`;

    // Added HTML attributes for Outlook namespace
    return `<!DOCTYPE html>
      <html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
      ${headContent}
      ${bodyContent}
      </html>`;
  }

  /**
   * Generates HTML for a single section.
   * @param section The V2 EmailSection object.
   * @returns The HTML string for the section (typically a <tr>).
   */
  protected generateSectionHtml(section: EmailSection): string {
    const sectionStyles = this.generateSectionStyle(section.styles);
    
    // Generate HTML for all elements within the section
    const elementsHtml = section.elements
      .map(element => this.generateElementHtml(element))
      .join('\n');
      
    // Wrap elements in an inner table for structure within the section cell
    const innerTable = `
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="width:100%;">
        ${elementsHtml}
      </table>`;
      
    // Return the outer table row for the section
    return `
      <tr>
        <td id="section-${section.id}" data-section-id="${section.id}" style="${sectionStyles}">
          ${innerTable}
        </td>
      </tr>`;
  }

  /**
   * Generates HTML for a single element.
   * @param element The V2 EmailElement object.
   * @returns The HTML string for the element (typically a <tr> containing the element).
   */
  protected generateElementHtml(element: EmailElement): string {
    const layoutStyles = this.generateLayoutStyle(element.layout);
    let elementContent = '';

    switch (element.type) {
      case 'header':
        const headerProps = element.properties as HeaderElementProperties;
        const headerStyles = this.generateTypographyStyle(headerProps.typography);
        elementContent = `<${headerProps.level || 'h2'} style="margin:0; ${headerStyles}">${element.content}</${headerProps.level || 'h2'}>`;
        break;

      case 'text':
        const textProps = element.properties as TextElementProperties;
        const textStyles = this.generateTypographyStyle(textProps.typography);
        elementContent = `<p data-element-id="${element.id}" style="margin:0; ${textStyles}">${element.content}</p>`;
        break;

      case 'button':
        const btnProps = element.properties as ButtonElementProperties;
        // Use optional chaining directly on btnProps.button for accessing nested properties
        // Provide defaults for everything

        // Defaults
        const defaultText = 'Button';
        const defaultHref = '#';
        const defaultTarget = '_blank';
        const defaultTextColor = '#ffffff';
        const defaultBgColor = '#007bff';
        const defaultBorderRadius = '0px';
        const defaultPadding = { top: '10px', right: '25px', bottom: '10px', left: '25px' };
        const defaultBorder = undefined; // Or specific default like 'none'

        // Style for the <a> tag itself
        const buttonStyle = `display:inline-block; 
          ${this.generateBorderStyle(btnProps.button?.border ?? defaultBorder)} 
          padding:${element.layout?.padding?.top ?? defaultPadding.top} ${element.layout?.padding?.right ?? defaultPadding.right} ${element.layout?.padding?.bottom ?? defaultPadding.bottom} ${element.layout?.padding?.left ?? defaultPadding.left}; 
          color:${btnProps.button?.textColor ?? defaultTextColor}; 
          background-color:${btnProps.button?.backgroundColor ?? defaultBgColor}; 
          text-decoration:none; 
          border-radius:${btnProps.button?.borderRadius ?? defaultBorderRadius};
          ${this.generateTypographyStyle(btnProps.typography)}`;

        const buttonText = element.content || defaultText; // Button text doesn't rely on btnProps.button
        const buttonHref = btnProps.button?.href ?? defaultHref;
        const buttonTarget = btnProps.button?.target ?? defaultTarget;

        const buttonHtml = `<a data-element-id="${element.id}" href="${buttonHref}" target="${buttonTarget}" style="${buttonStyle}">${buttonText}</a>`;

        const finalAlign = element.layout?.align || 'left';
        console.log(`[HtmlGeneratorCore] Button (ID: ${element.id}): element.layout.align is '${element.layout?.align}', finalAlign for inner TD is '${finalAlign}'.`);

        elementContent = `
          <table border="0" cellspacing="0" cellpadding="0" role="presentation" style="display: inline-table;">
            <tr>
              <td align="${finalAlign}" bgcolor="${btnProps.button?.backgroundColor ?? defaultBgColor}">
                ${buttonHtml}
              </td>
            </tr>
          </table>`;
        break; // End case 'button'

      case 'image':
        const imageProps = element.properties as ImageElementProperties;
        const img = imageProps.image || { src: '#', alt: '' }; // Ensure alt is also defaulted if img is empty
        const imgBorder = this.generateBorderStyle(imageProps.border);
        
        // Enforce pixel dimensions, defaulting if necessary
        const defaultImageWidth = '150px';
        const defaultImageHeight = '150px';

        const imageWidth = (typeof img.width === 'string' && img.width.endsWith('px')) ? img.width : defaultImageWidth;
        const imageHeight = (typeof img.height === 'string' && img.height.endsWith('px')) ? img.height : defaultImageHeight;

        const imgTag = `<img src="${img.src}" alt="${img.alt || ''}" width="${imageWidth.replace('px','')}" height="${imageHeight.replace('px','')}" style="display:block; max-width:100%; height:auto; ${imgBorder}" />`;
        // Note: style="...height:auto;" allows responsive scaling within the pixel-defined container if max-width is hit.
        // The width and height attributes ensure the space is reserved.

        if (img.linkHref) {
          elementContent = `<a href="${img.linkHref}" target="${img.linkTarget || '_blank'}">${imgTag}</a>`;
        } else {
          elementContent = imgTag;
        }
        break;

      case 'divider':
        const dividerProps = element.properties as DividerElementProperties;
        const div = dividerProps.divider || {};
        elementContent = `<hr style="border:none; border-top:${div.height || '1px'} solid ${div.color || '#cccccc'}; margin: 10px 0; width:${div.width || '100%'};" />`;
        break;

      case 'spacer':
        const spacerProps = element.properties as SpacerElementProperties;
        const sp = spacerProps.spacer || { height: '20px' };
        // Use a table for robust spacing in emails
        elementContent = `<table role="presentation" border="0" cellpadding="0" cellspacing="0" style="width:100%;"><tr><td style="height:${sp.height}; line-height:${sp.height}; font-size:${sp.height};">&nbsp;</td></tr></table>`;
        break;

      // Add cases for ALL types to satisfy exhaustiveness
      case 'subtext':
        const subtextProps = element.properties as SubtextElementProperties;
        const subtextStyles = this.generateTypographyStyle(subtextProps.typography, { color: '#6c757d', fontSize: '14px' });
        elementContent = `<p style="margin:0; ${subtextStyles}">${element.content}</p>`; // Use element.content for subtext
        break;

      case 'quote':
        const quoteProps = element.properties as QuoteElementProperties;
        const quoteStyles = this.generateTypographyStyle(quoteProps.typography, { fontStyle: 'italic' });
        const quoteBorderStyles = this.generateBorderStyle(quoteProps.border, { width: '4px', style: 'solid', color: '#eeeeee' });
        const quoteBg = quoteProps.backgroundColor ? `background-color:${quoteProps.backgroundColor};` : '';
        // Ensure border-left is only applied if there are border styles
        const quoteTableStyle = `width:100%; ${quoteBg} ${quoteBorderStyles ? `border-left:${quoteBorderStyles};` : ''}`.trim();
        elementContent = `
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="${quoteTableStyle}">
            <tr>
              <td style="padding:10px 20px;">
                <p style="margin:0; ${quoteStyles}">${element.content}</p> <!-- Use element.content for quote text -->
                ${quoteProps.citation ? `<p style="margin:5px 0 0 0; text-align:right; font-size:14px; color:#6c757d;">- ${quoteProps.citation}</p>` : ''}
              </td>
            </tr>
          </table>`;
        break;

      case 'code':
        const codeProps = element.properties as CodeElementProperties;
        const codeStyles = this.generateTypographyStyle(codeProps.typography, { fontFamily: 'monospace', fontSize: '14px' });
        const codeBg = codeProps.backgroundColor ? `background-color:${codeProps.backgroundColor};` : 'background-color:#f8f9fa;';
        const codePadding = codeProps.padding || '10px';
        const codeRadius = codeProps.borderRadius || '4px';
        elementContent = `<div style="${codeBg} border-radius:${codeRadius}; padding:${codePadding}; overflow:auto;"><pre style="margin:0; white-space:pre-wrap; word-wrap:break-word;"><code style="${codeStyles}">${element.content}</code></pre></div>`; // Use element.content for code
        break;
        
      case 'list':
        const listProps = element.properties as ListElementProperties;
        const listTag = listProps.listType === 'ordered' ? 'ol' : 'ul';
        const listItemStyles = this.generateTypographyStyle(listProps.typography);
        const listItemsHtml = listProps.items?.map(item => `<li style="${listItemStyles}">${item}</li>`).join('\n') || ''; 
        elementContent = `<${listTag} style="margin:0; padding-left:25px; ${listProps.markerStyle?.color ? `color:${listProps.markerStyle.color};` : ''}">
          ${listItemsHtml}
        </${listTag}>`;
        break;

      case 'icon':
        const iconProps = element.properties as IconElementProperties;
        const ico = iconProps.icon || { src: '#' };
        const iconStyles = `width:${ico.width || '24px'}; height:${ico.height || 'auto'}; display:inline-block; vertical-align:middle;`;
        const iconTag = `<img src="${ico.src}" alt="${ico.alt || ''}" style="${iconStyles}" width="${ico.width || '24'}" ${ico.height ? `height="${ico.height}"` : ''}/>`;
        if (ico.linkHref) {
          elementContent = `<a href="${ico.linkHref}" target="${ico.linkTarget || '_blank'}" style="text-decoration:none; line-height:1;">${iconTag}</a>`;
        } else {
          elementContent = iconTag;
        }
        break;

      case 'nav':
        const navProps = element.properties as NavElementProperties;
        const defaultLinkStyle = this.generateTypographyStyle(navProps.typography);
        const linksHtml = navProps.links?.map(link => {
          const linkStyle = this.generateTypographyStyle(link.typography, navProps.typography); // Merge specific with default
          return `<a href="${link.href}" target="${link.target || '_blank'}" style="text-decoration:none; ${linkStyle} ${navProps.layout?.spacing ? `padding: 0 ${navProps.layout.spacing};` : 'padding: 0 10px;'}">${link.text}</a>`;
        }).join('') || '';
        elementContent = `<p style="margin:0; ${defaultLinkStyle}">${linksHtml}</p>`;
        break;

      case 'social':
        const socialProps = element.properties as SocialElementProperties;
        const iconsHtml = socialProps.links?.map(link => {
          const iconSrc = link.iconSrc || `#${link.platform}-icon`; 
          const iconAlt = link.alt || `${link.platform} link`;
          const iconWidth = socialProps.iconStyle?.width || '32px';
          const iconHeight = socialProps.iconStyle?.height || 'auto';
          const iconRadius = socialProps.iconStyle?.borderRadius || '0';
          const iconTag = `<img src="${iconSrc}" alt="${iconAlt}" width="${iconWidth.replace('px','')}" style="display:block; width:${iconWidth}; height:${iconHeight}; border-radius:${iconRadius};" />`;
          return `<a href="${link.href}" target="_blank" style="text-decoration:none; display:inline-block; ${socialProps.layout?.spacing ? `padding: 0 ${socialProps.layout.spacing};` : 'padding: 0 5px;'}">${iconTag}</a>`;
        }).join('') || '';
        elementContent = `<p style="margin:0;">${iconsHtml}</p>`;
        break;

      case 'appStoreBadge':
        const badgeProps = element.properties as AppStoreBadgeElementProperties;
        const bdg = badgeProps.badge;
        const badgeSrc = `#${bdg.platform}-badge`; 
        const badgeAlt = bdg.alt || `${bdg.platform} badge`;
        const badgeWidth = bdg.width || '135px'; 
        const badgeHeight = bdg.height || 'auto';
        const badgeTag = `<img src="${badgeSrc}" alt="${badgeAlt}" width="${badgeWidth.replace('px','')}" style="display:inline-block; width:${badgeWidth}; height:${badgeHeight};"/>`;
        elementContent = `<a href="${bdg.href}" target="_blank">${badgeTag}</a>`;
        break;

      case 'unsubscribe':
        const unsubProps = element.properties as UnsubscribeElementProperties;
        const unsubLinkStyle = this.generateTypographyStyle(unsubProps.typography, { fontSize: '12px', color: '#6c757d' });
        const unsubLink = unsubProps.link || { text: 'Unsubscribe', href: '#' };
        elementContent = `<p style="margin:0; ${unsubLinkStyle}"><a href="${unsubLink.href}" target="${unsubLink.target || '_blank'}" style="color:inherit;">${unsubLink.text}</a></p>`;
        break;

      case 'preferences':
        const prefProps = element.properties as PreferencesElementProperties;
        const prefLinkStyle = this.generateTypographyStyle(prefProps.typography, { fontSize: '12px', color: '#6c757d' });
        const prefLink = prefProps.link || { text: 'Preferences', href: '#' };
        elementContent = `<p style="margin:0; ${prefLinkStyle}"><a href="${prefLink.href}" target="${prefLink.target || '_blank'}" style="color:inherit;">${prefLink.text}</a></p>`;
        break;

      case 'previewText':
        const previewProps = element.properties as PreviewTextElementProperties;
        elementContent = `<div style="display:none; max-height:0; overflow:hidden; mso-hide:all;">
                            ${previewProps.text}
                            ${'&zwnj;&nbsp;'.repeat(100)}
                          </div>`;
        break;

      case 'container':
      case 'box':
        elementContent = `<!-- ${element.type} Element (ID: ${element.id}) -->`;
        break;

      case 'footer':
        const footerProps = element.properties as FooterElementProperties;
        const footerStyles = this.generateTypographyStyle(footerProps.typography, {
          fontSize: '12px',
          color: '#000000',
          textAlign: 'center',
          lineHeight: '1.5'
        });
        elementContent = `<p style="margin:0; ${footerStyles}">${element.content}</p>`;
        break;

      default:
        console.error('[HtmlGeneratorCore] Unhandled element type encountered:', element);
        elementContent = `<!-- Unhandled Element Type: ${(element as any).type} -->`;
    }

    // Wrap element content in a table row/cell structure
    return `
      <tr>
        <td id="element-${element.id}" style="${layoutStyles}">
          ${elementContent}
        </td>
      </tr>`;
  }

  /**
   * Helper to generate inline style strings from style objects.
   * @param styles An object containing CSS style properties.
   * @returns An inline style string.
   */
  protected generateStyleString(styles: Record<string, any> | undefined): string {
    if (!styles) return '';
    
    let styleString = '';
    for (const key in styles) {
      const value = styles[key];
      if (value !== undefined && value !== null) {
        if (typeof value === 'object') {
          // Handle nested objects like margin, padding
          for (const subKey in value) {
            const subValue = value[subKey];
            if (subValue !== undefined && subValue !== null) {
              styleString += `${this.camelToKebab(key)}-${this.camelToKebab(subKey)}: ${subValue}; `;
            }
          }
        } else {
          styleString += `${this.camelToKebab(key)}: ${value}; `;
        }
      }
    }
    return styleString.trim();
  }
  
  /**
   * Helper to generate layout style strings.
   * Correctly maps semantic alignment properties to the 'text-align' CSS property.
   * @param layout Element layout properties.
   * @returns An inline style string for layout.
   */
  protected generateLayoutStyle(layout: EmailElementLayout | undefined): string {
    console.log("[HtmlGeneratorCore] generateLayoutStyle input:", JSON.stringify(layout));
    if (!layout) return '';
    
    // Create a mutable copy of the layout styles
    const styles: Record<string, any> = { ...layout };

    // Check if 'align' property exists and map it to 'text-align'
    if (styles.align) {
      console.log(`[HtmlGeneratorCore] Mapping layout.align ('${styles.align}') to textAlign.`);
      styles.textAlign = styles.align; // Map to correct CSS property
      delete styles.align;             // Remove the original invalid property
    }
    
    // Generate the style string using the corrected styles object
    const styleString = this.generateStyleString(styles);
    console.log("[HtmlGeneratorCore] generateLayoutStyle output:", styleString);
    return styleString;
  }
  
  /**
   * Helper to generate typography style strings.
   * @param typography Typography properties.
   * @param defaults Default typography values.
   * @returns An inline style string for typography.
   */
  protected generateTypographyStyle(typography: any, defaults: Record<string, any> = {}): string {
    const styles = { ...defaults, ...(typography || {}) };
    return this.generateStyleString(styles);
  }
  
  /**
   * Helper to generate border style strings.
   * @param border Border properties.
   * @param defaults Default border values.
   * @returns An inline style string for borders.
   */
  protected generateBorderStyle(border: any, defaults: Record<string, any> = {}): string {
    if (!border && !Object.keys(defaults).length) return '';
    const styles = { ...defaults, ...(border || {}) };
    let borderString = '';
    if (styles.width || styles.style || styles.color) {
      borderString = `border:${styles.width || '1px'} ${styles.style || 'solid'} ${styles.color || '#000000'};`;
    }
    const radiusString = styles.radius ? `border-radius:${styles.radius};` : '';
    return `${borderString} ${radiusString}`.trim();
  }

  /**
   * Helper to generate section style strings.
   * @param styles Section style properties.
   * @returns An inline style string for sections.
   */
  protected generateSectionStyle(styles: EmailSectionStyles | undefined): string {
    if (!styles) return '';
    
    let styleObj = { ...styles }; // Copy to potentially modify
    if (styleObj.padding) {
      Object.assign(styleObj, {
        paddingTop: styleObj.padding.top,
        paddingRight: styleObj.padding.right,
        paddingBottom: styleObj.padding.bottom,
        paddingLeft: styleObj.padding.left,
      });
      delete styleObj.padding;
    }
    if (styleObj.border) {
       Object.assign(styleObj, {
        borderWidth: styleObj.border.width,
        borderStyle: styleObj.border.style,
        borderColor: styleObj.border.color,
      });
      delete styleObj.border;
    }
    
    return this.generateStyleString(styleObj);
  }

  /**
   * Helper to generate global body style strings.
   * @param styles Global style properties.
   * @returns An inline style string for body.
   */
  protected generateGlobalBodyStyle(styles: EmailGlobalStyles | undefined): string {
      if (!styles) return '';
      const bodySpecificStyles = {
          fontFamily: styles.bodyFontFamily,
          color: styles.bodyTextColor
          // Removed backgroundColor from body styles
      };
      return this.generateStyleString(bodySpecificStyles);
  }

  /**
   * Helper to convert camelCase to kebab-case for CSS properties.
   * @param str String in camelCase.
   * @returns String in kebab-case.
   */
  protected camelToKebab(str: string): string {
    return str.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
  }
}
