import type {
    EmailTemplate,
    EmailSection,
    EmailElement,
    EmailElementLayout,
    HeaderElementProperties,
    TextElementProperties,
    ButtonElementProperties,
    ImageElementProperties,
    DividerElementProperties,
    SpacerElementProperties,
    EmailSectionStyles,
    EmailGlobalStyles,
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
    BoxElementProperties
} from '@shared/types';

import { HtmlGeneratorCore } from '../../shared/services/htmlGenerator';

/**
 * Utility function to check for placeholder values in the frontend implementation
 */
export function isPlaceholder(value: string | undefined | null): boolean {
  if (!value || value === '#') {
    return true;
  }
  if (value === '@@PLACEHOLDER_IMAGE@@' || value === '@@PLACEHOLDER_LINK@@') {
    return true;
  }
  if (value.startsWith('https://via.placeholder.com')) {
      return true;
  }
  return false;
}

/**
 * Frontend-specific implementation of the HTML generator.
 * Extends the core implementation with frontend-specific functionality
 * like placeholder handling and data attributes for edit mode.
 * 
 * ADAPTER PATTERN:
 * This is the frontend-specific adapter in our adapter pattern implementation.
 * It extends the core HtmlGeneratorCore but adds frontend-specific features:
 * 
 * 1. Placeholder detection and handling for images and links
 * 2. Data attributes for the visual editor to identify editable elements
 * 3. Special rendering behaviors for the editor UI
 * 
 * By using the adapter pattern:
 * - We maintain a consistent HTML generation API across environments
 * - We avoid duplicating the core HTML generation logic
 * - We can add frontend-specific features without affecting the backend
 * - Both implementations share the same core while allowing for customization
 */
export class HtmlGeneratorV2 extends HtmlGeneratorCore {
  
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
          body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; ${bodyStyles} }
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
        <table role="presentation" style="width:100%; border-collapse:collapse; border:0; border-spacing:0; background:${globalStyles.bodyBackgroundColor || '#ffffff'};">
          <tr>
            <td align="center" style="padding:0;">
              <!--[if mso | IE]>
              <table role="presentation" align="center" border="0" cellspacing="0" cellpadding="0" style="width:${contentWidth};">
              <tr>
              <td>
              <![endif]-->
              <table role="presentation" class="email-container" style="width:100%; max-width:${contentWidth}; border-collapse:collapse; border:0; border-spacing:0; text-align:left;">
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
        <td id="section-${section.id}" style="${sectionStyles}">
          ${innerTable}
        </td>
      </tr>`;
  }

  /**
   * Overrides the element HTML generation to add frontend-specific features
   * like placeholder handling and data attributes for edit mode.
   */
  protected override generateElementHtml(element: EmailElement): string {
    // Special handling for elements with placeholders in edit mode
    if (element.type === 'button') {
      return this.generateButtonElementHtml(element);
    }
    
    if (element.type === 'image') {
      return this.generateImageElementHtml(element);
    }
    
    // For all other element types, use the core implementation
    return super.generateElementHtml(element);
  }
  
  /**
   * Generate HTML for button elements with placeholder support
   */
  protected generateButtonElementHtml(element: EmailElement): string {
    const layoutStyles = this.generateLayoutStyle(element.layout);
    const buttonProps = element.properties as ButtonElementProperties;
    const btn = buttonProps.button || { href: '#' }; // Default href
    const btnTypography = this.generateTypographyStyle(buttonProps.typography);
    const btnStyles = `display:inline-block; color:${btn.textColor || '#ffffff'}; background-color:${btn.backgroundColor || '#007bff'}; border-radius:${btn.borderRadius || '5px'}; padding:12px 25px; text-decoration:none; ${btn.border ? `border:${btn.border};` : 'border:none;'} ${btnTypography}`;
    
    // Add data attributes if href is a placeholder
    const isButtonLinkPlaceholder = isPlaceholder(btn.href);
    const buttonDataAttrs = isButtonLinkPlaceholder
        ? `data-element-id="${element.id}" data-property-path="button.href" data-placeholder="true" data-placeholder-type="link"` 
        : '';
    const finalButtonHref = isButtonLinkPlaceholder ? '#' : btn.href;

    // Render a non-clickable span if the link is a placeholder
    let elementContent;
    if (isButtonLinkPlaceholder) {
        // Add data-placeholder="true" ONLY if href is placeholder
        const placeholderButtonAttrs = `data-element-id="${element.id}" data-property-path="button.href" data-placeholder="true" data-placeholder-type="link"`;
        elementContent = `<span style="${btnStyles} cursor:default;" ${placeholderButtonAttrs}>${element.content} (Link Required)</span>`;
    } else {
        elementContent = `<a href="${finalButtonHref}" target="${btn.target || '_blank'}" style="${btnStyles}" ${buttonDataAttrs}>${element.content}</a>`;
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
   * Generate HTML for image elements with placeholder support
   */
  protected generateImageElementHtml(element: EmailElement): string {
    const layoutStyles = this.generateLayoutStyle(element.layout);
    const imageProps = element.properties as ImageElementProperties;
    const imgLayout = element.layout || {};
    const img = imageProps.image || { src: '#', alt: '' }; 
    const imgBorder = this.generateBorderStyle(imageProps.border);

    const isPlaceholderSrc = isPlaceholder(img.src);
    const finalSrc = isPlaceholderSrc ? '@@PLACEHOLDER_IMAGE@@' : img.src;

    // --- Sizing Logic: Enforce Pixels --- 
    const defaultWidthPx = 300;
    const defaultHeightPx = 200;
    let targetWidthPx = defaultWidthPx;
    let targetHeightPx = defaultHeightPx;

    // Helper to parse pixel values
    const parsePixels = (value: string | undefined): number | null => {
      if (value && typeof value === 'string' && value.endsWith('px')) {
        const num = parseInt(value, 10);
        return !isNaN(num) && num > 0 ? num : null;
      }
      return null;
    };

    // Try image properties first, then layout, then default
    targetWidthPx = parsePixels(img.width) ?? parsePixels(imgLayout.width) ?? defaultWidthPx;
    targetHeightPx = parsePixels(img.height) ?? parsePixels(imgLayout.height) ?? defaultHeightPx;

    // Log warnings if defaults were used
    if (targetWidthPx === defaultWidthPx && !parsePixels(img.width) && !parsePixels(imgLayout.width)) {
         console.warn(`[HtmlGeneratorV2] Image ID ${element.id}: No valid pixel width found in image.width or layout.width. Falling back to ${defaultWidthPx}px.`);
    }
    if (targetHeightPx === defaultHeightPx && !parsePixels(img.height) && !parsePixels(imgLayout.height)) {
         console.warn(`[HtmlGeneratorV2] Image ID ${element.id}: No valid pixel height found in image.height or layout.height. Falling back to ${defaultHeightPx}px.`);
    }

    // Styles for the WRAPPER div (fixed dimensions)
    let wrapperStyles = `display:inline-block; width:${targetWidthPx}px; height:${targetHeightPx}px; overflow:hidden; line-height:1; ${imgBorder}`; 

    // Styles for the inner IMG tag (fills wrapper, object-fit)
    const objectFit = img.objectFit || 'cover';
    let imgStyles = `display:block; width:100%; height:100%; border:0; outline:none; text-decoration:none; -ms-interpolation-mode:bicubic; object-fit:${objectFit};`;
    
    // Attributes for IMG tag (Outlook compatibility)
    let imgWidthAttr = ` width="${targetWidthPx}"`;
    let imgHeightAttr = ` height="${targetHeightPx}"`;
    
    const link = img.linkHref;
    const isPlaceholderLink = isPlaceholder(link);
    const finalLink = isPlaceholderLink ? '#' : link;

    // --- Element ID and Data Attributes --- 
    const elementIdAttr = `id="${element.id}"`; // Plain ID for getElementById
    const baseDataAttrs = `data-element-id="${element.id}"`; // Keep data-element-id as well
    
    // --- Image Source Data Attribute ---
    const srcDataAttr = isPlaceholderSrc 
        ? `data-placeholder="true" data-placeholder-type="image" data-property-path="image.src"` 
        : '';
        
    // --- Link Data Attribute (only if link exists) ---
    const linkDataAttr = link 
        ? `data-has-link="true" ${isPlaceholderLink ? 'data-placeholder-link="true" data-property-path="image.linkHref"' : ''}` 
        : '';
        
    // --- Element Content Generation ---
    let imgTagWithAttrs = `<img src="${finalSrc}" alt="${img.alt || ''}"${imgWidthAttr}${imgHeightAttr} style="${imgStyles}" ${baseDataAttrs} ${srcDataAttr} />`;
    
    // Wrapper DIV for styling that works across email clients
    let wrappedImgTag = `<div style="${wrapperStyles}" ${elementIdAttr}>${imgTagWithAttrs}</div>`;
    
    // If the image has a link and it's not a placeholder link, wrap in an A tag
    let elementContent;
    if (link && !isPlaceholderLink) {
        elementContent = `<a href="${finalLink}" target="${img.linkTarget || '_blank'}" style="text-decoration:none; display:block;">${wrappedImgTag}</a>`;
    } 
    // Otherwise just use the wrapped image
    else {
        elementContent = wrappedImgTag;
    }
    
    // Add placeholders for edit mode
    if (isPlaceholderSrc) {
        // Add placeholder overlay with "Add Image" prompt
        const placeholderOverlay = `
        <div style="position:absolute; top:0; left:0; width:100%; height:100%; display:flex; align-items:center; justify-content:center; background-color:rgba(0,0,0,0.1); color:#333; text-align:center;">
            <div style="padding:10px; font-size:14px; font-weight:bold;">Add Image</div>
        </div>`;
        elementContent = `<div style="position:relative;">${elementContent}${placeholderOverlay}</div>`;
    }
    
    // Wrap element content in a table row/cell structure
    return `
      <tr>
        <td style="${layoutStyles}">
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
  
  protected generateLayoutStyle(layout: EmailElementLayout | undefined): string {
    return this.generateStyleString(layout);
  }
  
  protected generateTypographyStyle(typography: any, defaults: Record<string, any> = {}): string {
    const styles = { ...defaults, ...(typography || {}) };
    // Add specific typography properties
    return this.generateStyleString(styles);
  }
  
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
   * Helper to generate inline style strings specifically for section styles.
   * @param styles An EmailSectionStyles object.
   * @returns An inline style string.
   */
  protected generateSectionStyle(styles: EmailSectionStyles | undefined): string {
    if (!styles) return '';
    
    let styleObj = { ...styles }; // Copy to potentially modify
    // Convert nested padding/border objects into direct properties for generateStyleString
    if (styleObj.padding) {
      Object.assign(styleObj, {
        paddingTop: styleObj.padding.top,
        paddingRight: styleObj.padding.right,
        paddingBottom: styleObj.padding.bottom,
        paddingLeft: styleObj.padding.left,
      });
      delete styleObj.padding; // Remove the nested object
    }
    if (styleObj.border) {
       Object.assign(styleObj, {
        borderWidth: styleObj.border.width,
        borderStyle: styleObj.border.style,
        borderColor: styleObj.border.color,
      });
      delete styleObj.border; // Remove the nested object
    }
    
    return this.generateStyleString(styleObj);
  }

  /**
   * Helper to generate inline style strings specifically for global body styles.
   * @param styles An EmailGlobalStyles object.
   * @returns An inline style string for the body tag.
   */
  protected generateGlobalBodyStyle(styles: EmailGlobalStyles | undefined): string {
      if (!styles) return '';
      // Only include styles meant for the body tag itself
      const bodySpecificStyles = {
          backgroundColor: styles.bodyBackgroundColor,
          fontFamily: styles.bodyFontFamily,
          color: styles.bodyTextColor
      };
      return this.generateStyleString(bodySpecificStyles);
  }

  // Helper to convert camelCase to kebab-case for CSS properties
  protected camelToKebab(str: string): string {
    return str.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
  }
}

// Convenience function for common use case
export function generateHtml(template: EmailTemplate): string {
  const generator = new HtmlGeneratorV2();
  return generator.generate(template);
} 