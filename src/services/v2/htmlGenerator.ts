import { EmailTemplate, EmailSection, EmailElement, EmailElementLayout, HeaderElementProperties, TextElementProperties, ButtonElementProperties, ImageElementProperties, DividerElementProperties, SpacerElementProperties, EmailSectionStyles, EmailGlobalStyles, SubtextElementProperties, QuoteElementProperties, CodeElementProperties, ListElementProperties, IconElementProperties, NavElementProperties, SocialElementProperties, AppStoreBadgeElementProperties, UnsubscribeElementProperties, PreferencesElementProperties, PreviewTextElementProperties, ContainerElementProperties, BoxElementProperties } from '../../types/v2';

// (+) Exported utility function to check for placeholder values
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
 * Generates email-compatible HTML from the V2 semantic structure.
 */
export class HtmlGeneratorV2 {
  
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
  private generateSectionHtml(section: EmailSection): string {
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
   * Generates HTML for a single element.
   * @param element The V2 EmailElement object.
   * @returns The HTML string for the element (typically a <tr> containing the element).
   */
  private generateElementHtml(element: EmailElement): string {
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
        elementContent = `<p style="margin:0; ${textStyles}">${element.content}</p>`;
        break;

      case 'button':
        const buttonProps = element.properties as ButtonElementProperties;
        const btn = buttonProps.button || { href: '#' }; // Default href
        const btnTypography = this.generateTypographyStyle(buttonProps.typography);
        const btnStyles = `display:inline-block; color:${btn.textColor || '#ffffff'}; background-color:${btn.backgroundColor || '#007bff'}; border-radius:${btn.borderRadius || '5px'}; padding:12px 25px; text-decoration:none; ${btn.border ? `border:${btn.border};` : 'border:none;'} ${btnTypography}`;
        // (+) Add data attributes if href is a placeholder (using the utility function)
        const isButtonLinkPlaceholder = isPlaceholder(btn.href);
        const buttonDataAttrs = isButtonLinkPlaceholder
            ? `data-element-id="${element.id}" data-property-path="button.href" data-placeholder="true" data-placeholder-type="link"` 
            : '';
        const finalButtonHref = isButtonLinkPlaceholder ? '#' : btn.href;

        // (+) Render a non-clickable span if the link is a placeholder
        if (isButtonLinkPlaceholder) {
            // Add data-placeholder="true" ONLY if href is placeholder
            const placeholderButtonAttrs = `data-element-id="${element.id}" data-property-path="button.href" data-placeholder="true" data-placeholder-type="link"`;
            elementContent = `<span style="${btnStyles} cursor:default;" ${placeholderButtonAttrs}>${element.content} (Link Required)</span>`;
        } else {
            elementContent = `<a href="${finalButtonHref}" target="${btn.target || '_blank'}" style="${btnStyles}" ${buttonDataAttrs}>${element.content}</a>`; // buttonDataAttrs is empty here, which is correct
        }
        break;

      case 'image':
        const imageProps = element.properties as ImageElementProperties;
        const imgLayout = element.layout || {};
        const img = imageProps.image || { src: '#', alt: '', width: undefined, height: undefined, objectFit: 'cover' }; 
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
        let imgStyles = `display:block; width:100%; height:100%; border:0; outline:none; text-decoration:none; -ms-interpolation-mode:bicubic; object-fit:${img.objectFit || 'cover'};`;
        
        // Attributes for IMG tag (Outlook compatibility)
        let imgWidthAttr = ` width="${targetWidthPx}"`;
        let imgHeightAttr = ` height="${targetHeightPx}"`;
        
        const link = img.videoHref || img.linkHref;
        const isPlaceholderLink = isPlaceholder(link);
        const finalLink = isPlaceholderLink ? '#' : link;

        // --- Element ID and Data Attributes --- 
        const elementIdAttr = `id="${element.id}"`; // Plain ID for getElementById
        const baseDataAttrs = `data-element-id="${element.id}"`; // Keep data-element-id as well

        let finalImageDataAttrs = `${baseDataAttrs} data-property-path="image.src" data-placeholder-type="image"`;
        if (isPlaceholderSrc) {
            finalImageDataAttrs += ` data-placeholder="true"`;
        }

        const linkPropertyPath = img.videoHref ? 'image.videoHref' : 'image.linkHref';
        let imageLinkDataAttrs = `${baseDataAttrs} data-property-path="${linkPropertyPath}" data-placeholder-type="link"`;
        if (isPlaceholderLink) {
            imageLinkDataAttrs += ` data-placeholder="true"`;
        }
        
        // Construct the inner image tag
        // Avoid duplicate base data attrs if linked
        const imgDataAttrs = finalImageDataAttrs.replace(baseDataAttrs, '').trim();
        const imgTag = `<img src="${finalSrc}" alt="${img.alt || ''}" style="${imgStyles}"${imgWidthAttr}${imgHeightAttr} ${imgDataAttrs} />`; 

        // Construct the wrapper div (always present now for fixed sizing/overflow)
        const finalWrapperDiv = `<div style="${wrapperStyles}">${imgTag}</div>`;

        // Decide final content and add the plain ID attribute
        if (link && !isPlaceholderLink) {
            // Link wraps the sized div
            elementContent = `<a ${elementIdAttr} href="${finalLink}" target="${img.linkTarget || '_blank'}" style="text-decoration:none; line-height:1; display:inline-block; width:${targetWidthPx}px; height:${targetHeightPx}px;" ${imageLinkDataAttrs}>${finalWrapperDiv}</a>`;
        } else if (link && isPlaceholderLink) {
            // Placeholder link wraps the sized div
            elementContent = `<span ${elementIdAttr} style="text-decoration:none; line-height:1; display:inline-block; cursor:default; width:${targetWidthPx}px; height:${targetHeightPx}px;" ${imageLinkDataAttrs}>${finalWrapperDiv}</span>`;
        } else {
            // No link, add ID and base data attrs to the wrapper itself
            const wrapperWithId = `<div ${elementIdAttr} style="${wrapperStyles}" ${baseDataAttrs}>${imgTag}</div>`;
            elementContent = wrapperWithId;
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
        elementContent = `<table role="presentation" border="0" cellpadding="0" cellspacing="0" style="width:100%;"><tr><td style="height:${sp.height}; line-height:${sp.height}; font-size:${sp.height};">&nbsp;</td></tr></table>`;
        break;

      case 'subtext':
        const subtextProps = element.properties as SubtextElementProperties;
        const subtextStyles = this.generateTypographyStyle(subtextProps.typography, { color: '#6c757d', fontSize: '14px' });
        elementContent = `<p style="margin:0; ${subtextStyles}">${subtextProps.text}</p>`;
        break;

      case 'quote':
        const quoteProps = element.properties as QuoteElementProperties;
        const quoteStyles = this.generateTypographyStyle(quoteProps.typography, { fontStyle: 'italic' });
        const quoteBorder = this.generateBorderStyle(quoteProps.border, { width: '4px', style: 'solid', color: '#eeeeee' });
        const quoteBg = quoteProps.backgroundColor ? `background-color:${quoteProps.backgroundColor};` : '';
        elementContent = `
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="width:100%; ${quoteBorder ? `border-left:${quoteBorder};` : ''} ${quoteBg}">
            <tr>
              <td style="padding:10px 20px;">
                <p style="margin:0; ${quoteStyles}">${quoteProps.text}</p>
                ${quoteProps.citation ? `<p style="margin:5px 0 0 0; text-align:right; font-size:14px; color:#6c757d;">- ${quoteProps.citation}</p>` : ''}
              </td>
            </tr>
          </table>`;
        break;

      case 'code':
        const codeProps = element.properties as CodeElementProperties;
        const codeStyles = this.generateTypographyStyle(codeProps.typography, { fontFamily: 'monospace', fontSize: '14px' });
        const codeBg = codeProps.backgroundColor ? `background-color:${codeProps.backgroundColor};` : '#f8f9fa';
        const codePadding = codeProps.padding || '10px';
        const codeRadius = codeProps.borderRadius || '4px';
        elementContent = `<div style="${codeBg}; border-radius:${codeRadius}; padding:${codePadding}; overflow:auto;"><pre style="margin:0; white-space:pre-wrap; word-wrap:break-word;"><code style="${codeStyles}">${codeProps.code}</code></pre></div>`;
        break;

      case 'list':
        const listProps = element.properties as ListElementProperties;
        const listTag = listProps.listType === 'ordered' ? 'ol' : 'ul';
        const listItemsHtml = listProps.items.map(item => `<li style="${this.generateTypographyStyle(listProps.typography)}">${item}</li>`).join('\n');
        elementContent = `<${listTag} style="margin:0; padding-left:25px; ${listProps.markerStyle?.color ? `color:${listProps.markerStyle.color};` : ''}">
          ${listItemsHtml}
        </${listTag}>`;
        break;

      // (+) New Types Start
      case 'icon':
        const iconProps = element.properties as IconElementProperties;
        const ico = iconProps.icon || { src: '#' };
        const iconStyles = `width:${ico.width || '24px'}; height:${ico.height || 'auto'}; display:inline-block; vertical-align:middle;`;
        // (+) Add data attributes if src is placeholder
        const iconDataAttrs = ico.src === '@@PLACEHOLDER_IMAGE@@' 
            ? `data-element-id="${element.id}" data-property-path="icon.src" data-placeholder-type="image"` 
            : '';
        const iconTag = `<img src="${ico.src}" alt="${ico.alt || ''}" style="${iconStyles}" width="${ico.width || '24'}" ${ico.height ? `height="${ico.height}"` : ''} ${iconDataAttrs}/>`;
        // (+) Add data attributes if linkHref is placeholder
        const iconLinkDataAttrs = ico.linkHref === '@@PLACEHOLDER_LINK@@' 
            ? `data-element-id="${element.id}" data-property-path="icon.linkHref" data-placeholder-type="link"` 
            : '';
        if (ico.linkHref) {
          elementContent = `<a href="${ico.linkHref}" target="${ico.linkTarget || '_blank'}" style="text-decoration:none; line-height:1;" ${iconLinkDataAttrs}>${iconTag}</a>`;
        } else {
          elementContent = iconTag;
        }
        break;
      case 'nav':
        const navProps = element.properties as NavElementProperties;
        const defaultLinkStyle = this.generateTypographyStyle(navProps.typography);
        const linksHtml = navProps.links.map((link, index) => {
          const linkStyle = this.generateTypographyStyle(link.typography, navProps.typography); // Merge specific with default
          // (+) Add data attributes if href is placeholder
          const navLinkDataAttrs = link.href === '@@PLACEHOLDER_LINK@@' 
              ? `data-element-id="${element.id}" data-property-path="links.${index}.href" data-placeholder-type="link"` 
              : '';
          return `<a href="${link.href}" target="${link.target || '_blank'}" style="text-decoration:none; ${linkStyle} ${navProps.layout?.spacing ? `padding: 0 ${navProps.layout.spacing};` : 'padding: 0 10px;'}" ${navLinkDataAttrs}>${link.text}</a>`;
        }).join(''); // Join directly for inline display
        // Use a simple paragraph for alignment control via parent TD
        elementContent = `<p style="margin:0; ${defaultLinkStyle}">${linksHtml}</p>`;
        break;
      case 'social':
        const socialProps = element.properties as SocialElementProperties;
        const iconsHtml = socialProps.links.map((link, index) => {
          // Basic src determination (needs actual icons based on platform later)
          const iconSrc = link.iconSrc || `#${link.platform}-icon`; // Placeholder src
          const iconAlt = link.alt || `${link.platform} link`;
          const iconWidth = socialProps.iconStyle?.width || '32px';
          const iconHeight = socialProps.iconStyle?.height || 'auto';
          const iconRadius = socialProps.iconStyle?.borderRadius || '0';
          // (+) Add data attributes to image if src is placeholder (less common for social?)
          const socialIconDataAttrs = iconSrc === '@@PLACEHOLDER_IMAGE@@' 
              ? `data-element-id="${element.id}" data-property-path="links.${index}.iconSrc" data-placeholder-type="image"` 
              : '';
          const iconTag = `<img src="${iconSrc}" alt="${iconAlt}" width="${iconWidth.replace('px','')}" style="display:block; width:${iconWidth}; height:${iconHeight}; border-radius:${iconRadius};" ${socialIconDataAttrs} />`;
          // (+) Add data attributes to link if href is placeholder
          const socialLinkDataAttrs = link.href === '@@PLACEHOLDER_LINK@@' 
              ? `data-element-id="${element.id}" data-property-path="links.${index}.href" data-placeholder-type="link"` 
              : '';
          return `<a href="${link.href}" target="_blank" style="text-decoration:none; display:inline-block; ${socialProps.layout?.spacing ? `padding: 0 ${socialProps.layout.spacing};` : 'padding: 0 5px;'}" ${socialLinkDataAttrs}>${iconTag}</a>`;
        }).join('');
        // Use paragraph for alignment control via parent TD
        elementContent = `<p style="margin:0;">${iconsHtml}</p>`;
        break;
      case 'appStoreBadge':
        const badgeProps = element.properties as AppStoreBadgeElementProperties;
        const bdg = badgeProps.badge;
        // Basic src determination (needs actual badge images later)
        const badgeSrc = `#${bdg.platform}-badge`; // Placeholder src - Assuming generator finds real src normally
        const badgeAlt = bdg.alt || `${bdg.platform} badge`;
        const badgeWidth = bdg.width || '135px'; // Example default
        const badgeHeight = bdg.height || 'auto';
        // (+) Add data attributes to image if src is placeholder (unlikely for badges?)
        const badgeImageDataAttrs = badgeSrc === '@@PLACEHOLDER_IMAGE@@' 
            ? `data-element-id="${element.id}" data-property-path="badge.src" data-placeholder-type="image"` 
            : '';
        const badgeTag = `<img src="${badgeSrc}" alt="${badgeAlt}" width="${badgeWidth.replace('px','')}" style="display:inline-block; width:${badgeWidth}; height:${badgeHeight};" ${badgeImageDataAttrs}/>`;
        // (+) Add data attributes to link if href is placeholder
        const badgeLinkDataAttrs = bdg.href === '@@PLACEHOLDER_LINK@@' 
            ? `data-element-id="${element.id}" data-property-path="badge.href" data-placeholder-type="link"` 
            : '';
        elementContent = `<a href="${bdg.href}" target="_blank" ${badgeLinkDataAttrs}>${badgeTag}</a>`;
        break;
      case 'unsubscribe':
        const unsubProps = element.properties as UnsubscribeElementProperties;
        const unsubLinkStyle = this.generateTypographyStyle(unsubProps.typography, { fontSize: '12px', color: '#6c757d' });
        const unsubLink = unsubProps.link || { text: 'Unsubscribe', href: '#' };
        // (+) Add data attributes if href is placeholder
        const unsubLinkDataAttrs = unsubLink.href === '@@PLACEHOLDER_LINK@@' 
            ? `data-element-id="${element.id}" data-property-path="link.href" data-placeholder-type="link"` 
            : '';
        elementContent = `<p style="margin:0; ${unsubLinkStyle}"><a href="${unsubLink.href}" target="${unsubLink.target || '_blank'}" style="color:inherit;" ${unsubLinkDataAttrs}>${unsubLink.text}</a></p>`;
        break;
      case 'preferences':
        const prefProps = element.properties as PreferencesElementProperties;
        const prefLinkStyle = this.generateTypographyStyle(prefProps.typography, { fontSize: '12px', color: '#6c757d' });
        const prefLink = prefProps.link || { text: 'Preferences', href: '#' };
        // (+) Add data attributes if href is placeholder
        const prefLinkDataAttrs = prefLink.href === '@@PLACEHOLDER_LINK@@' 
            ? `data-element-id="${element.id}" data-property-path="link.href" data-placeholder-type="link"` 
            : '';
        elementContent = `<p style="margin:0; ${prefLinkStyle}"><a href="${prefLink.href}" target="${prefLink.target || '_blank'}" style="color:inherit;" ${prefLinkDataAttrs}>${prefLink.text}</a></p>`;
        break;
      case 'previewText':
        const previewProps = element.properties as PreviewTextElementProperties;
        elementContent = `<div style="display:none; max-height:0; overflow:hidden; mso-hide:all;">
                            ${previewProps.text}
                            ${/* Add zero-width non-joiner characters for padding if needed */ '&zwnj;&nbsp;'.repeat(100)}
                          </div>`;
        break;
      case 'container':
        const containerProps = element.properties as ContainerElementProperties;
        const containerStyle = this.generateStyleString(containerProps.styles);
        elementContent = `<!-- Container Element (ID: ${element.id}) - Content follows -->`;
        break;
      case 'box':
        const boxProps = element.properties as BoxElementProperties;
        const boxStyle = this.generateStyleString(boxProps.styles);
        elementContent = `<!-- Box Element (ID: ${element.id}) - Content follows -->`;
        break;
      // (+) New Types End

      default:
        // This should now only catch truly unexpected cases or if a type is missed above
        const _exhaustiveCheck: never = element;
        console.error('Unhandled element type in default:', _exhaustiveCheck);
        elementContent = `<!-- Unhandled Type -->`;
    }

    // Wrap the content in a table row/cell structure with layout styles
    const elementHtml = `
      <tr>
        <td id="element-${element.id}" style="${layoutStyles}">
          ${elementContent}
        </td>
      </tr>`;

    return elementHtml;
  }

  /**
   * Helper to generate inline style strings from style objects.
   * @param styles An object containing CSS style properties.
   * @returns An inline style string.
   */
  private generateStyleString(styles: Record<string, any> | undefined): string {
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
  
  private generateLayoutStyle(layout: EmailElementLayout | undefined): string {
    return this.generateStyleString(layout);
  }
  
  private generateTypographyStyle(typography: any, defaults: Record<string, any> = {}): string {
    const styles = { ...defaults, ...(typography || {}) };
    // Add specific typography properties
    return this.generateStyleString(styles);
  }
  
  private generateBorderStyle(border: any, defaults: Record<string, any> = {}): string {
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
  private generateSectionStyle(styles: EmailSectionStyles | undefined): string {
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
  private generateGlobalBodyStyle(styles: EmailGlobalStyles | undefined): string {
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
  private camelToKebab(str: string): string {
    return str.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
  }
} 