// Import from shared types
import type {
    EmailTemplate,
    EmailSection,
    EmailElement,
    Row,
    Column,
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

  protected generateSectionHtml(section: EmailSection): string {
    const sectionStyles = this.generateSectionStyle(section.styles);
    const rowsHtml = section.rows.map(row => this.generateRowHtml(row)).join('');

    return `
      <tr>
        <td id="section-${section.id}" data-section-id="${section.id}" style="${sectionStyles}">
          ${rowsHtml}
        </td>
      </tr>`;
  }

  protected generateRowHtml(row: Row): string {
    const columnsHtml = row.columns.map(column => this.generateColumnHtml(column)).join('');
    return `
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="width: 100%; border-spacing: 0;">
        <tr>
          ${columnsHtml}
        </tr>
      </table>`;
  }

  protected generateColumnHtml(column: Column): string {
    const elementsHtml = column.elements.map(element => this.generateElementHtml(element)).join('');
    const columnWidth = `${(100 / 12) * column.styles.gridSpan}%`;
    const columnStyles = this.generateColumnStyle(column.styles);

    return `
      <td class="stack-column" valign="top" style="width: ${columnWidth}; ${columnStyles}">
        ${elementsHtml}
      </td>`;
  }

  protected generateElementHtml(element: EmailElement): string {
    let elementContent = '';

    switch (element.type) {
      case 'header':
        const headerProps = element.properties;
        const headerStyles = this.generateTypographyStyle(headerProps.typography);
        elementContent = `<${headerProps.level || 'h2'} style="margin:0; ${headerStyles}">${headerProps.text}</${headerProps.level || 'h2'}>`;
        break;

      case 'text':
        const textProps = element.properties;
        const textStyles = this.generateTypographyStyle(textProps.typography);
        elementContent = `<p style="margin:0; ${textStyles}">${textProps.text}</p>`;
        break;

      case 'button':
        const btnProps = element.properties;
        const buttonStyle = `display:inline-block;
          padding: 10px 25px;
          color:${btnProps.textColor || '#ffffff'};
          background-color:${btnProps.backgroundColor || '#007bff'};
          text-decoration:none;
          border-radius:${btnProps.borderRadius || '0px'};
          ${this.generateTypographyStyle(btnProps.typography)}`;

        elementContent = `<a href="${btnProps.href}" target="${btnProps.target || '_blank'}" style="${buttonStyle}">${btnProps.text}</a>`;
        break;

      case 'image':
        const imgProps = element.properties;
        const imgTag = `<img src="${imgProps.src}" alt="${imgProps.alt || ''}" width="${imgProps.width || '100%'}" style="display:block; height:auto; border:0; max-width:100%;">`;
        elementContent = imgProps.linkHref ? `<a href="${imgProps.linkHref}" target="${imgProps.linkTarget || '_blank'}">${imgTag}</a>` : imgTag;
        break;

      case 'divider':
        const divProps = element.properties;
        elementContent = `<hr style="border:none; border-top:${divProps.height || '1px'} solid ${divProps.color || '#cccccc'}; margin: 10px 0; width:${divProps.width || '100%'};" />`;
        break;

      case 'spacer':
        const spacerProps = element.properties;
        elementContent = `<div style="height:${spacerProps.height}; line-height:${spacerProps.height}; font-size:1px;">&nbsp;</div>`;
        break;

      // Other cases would be filled in here following the same pattern...
      case 'subtext':
        const subtextProps = element.properties;
        const subtextStyles = this.generateTypographyStyle(subtextProps.typography, { color: '#6c757d', fontSize: '12px' });
        elementContent = `<p style="margin:0; ${subtextStyles}">${subtextProps.text}</p>`;
        break;

      case 'quote':
        const quoteProps = element.properties;
        const quoteStyles = this.generateTypographyStyle(quoteProps.typography);
        elementContent = `<blockquote style="margin:0; padding-left: 10px; border-left: 3px solid ${quoteProps.border?.color || '#ccc'}; ${quoteStyles}">${quoteProps.text}</blockquote>`;
        break;

      case 'code':
        const codeProps = element.properties;
        const codeStyles = this.generateTypographyStyle(codeProps.typography, { fontFamily: 'monospace' });
        elementContent = `<pre style="background:${codeProps.backgroundColor || '#f4f4f4'}; border-radius:${codeProps.borderRadius || '4px'}; padding:${codeProps.padding || '10px'};"><code style="${codeStyles}">${codeProps.code}</code></pre>`;
        break;

      case 'list':
        const listProps = element.properties;
        const listItemsHtml = listProps.items.map(item => `<li>${item}</li>`).join('');
        const listTag = listProps.listType === 'ordered' ? 'ol' : 'ul';
        const listStyles = this.generateTypographyStyle(listProps.typography);
        elementContent = `<${listTag} style="${listStyles}">${listItemsHtml}</${listTag}>`;
        break;

      case 'icon':
        const iconProps = element.properties;
        elementContent = `<img src="${iconProps.src}" alt="${iconProps.alt || ''}" width="${iconProps.width || '24'}" height="${iconProps.height || '24'}" style="display:block;">`;
        break;
      
      case 'nav':
        const navProps = element.properties;
        const linkStyle = this.generateTypographyStyle(navProps.typography, { color: '#007bff', textDecoration: 'none' });
        const linksHtml = navProps.links.map(link => {
          return `<a href="${link.href}" target="${link.target || '_blank'}" style="text-decoration:none; ${linkStyle} padding: 0 10px;">${link.text}</a>`;
        }).join('');
        elementContent = `<p style="margin:0; text-align:center;">${linksHtml}</p>`;
        break;

      case 'social':
        const socialProps = element.properties;
        const socialLinksHtml = socialProps.links.map(link => {
          const iconTag = `<img src="${link.iconSrc || '#'}" width="24" height="24" alt="${link.alt || link.platform}" style="display: block;">`;
          return `<a href="${link.href}" target="_blank" style="text-decoration:none; display:inline-block; padding: 0 5px;">${iconTag}</a>`;
        }).join('');
        elementContent = `<p style="margin:0; text-align:center;">${socialLinksHtml}</p>`;
        break;

      case 'appStoreBadge':
        const badgeProps = element.properties;
        const badgeUrl = badgeProps.href;
        const badgeImg = badgeProps.platform === 'apple-app-store'
          ? 'https://developer.apple.com/assets/elements/badges/download-on-the-app-store.svg'
          : 'https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png';
        elementContent = `<a href="${badgeUrl}" target="_blank"><img src="${badgeImg}" alt="${badgeProps.alt || 'Download'}" width="${badgeProps.width || '135'}" style="display:inline-block;"></a>`;
        break;

      case 'unsubscribe':
        const unsubProps = element.properties;
        const unsubStyles = this.generateTypographyStyle(unsubProps.typography, { fontSize: '12px', color: '#6c757d' });
        elementContent = `<a href="${unsubProps.link.href || '#[UNSUB_LINK]'}" target="${unsubProps.link.target || '_blank'}" style="${unsubStyles}">${unsubProps.link.text || 'Unsubscribe'}</a>`;
        break;

      case 'preferences':
        const prefProps = element.properties;
        const prefStyles = this.generateTypographyStyle(prefProps.typography, { fontSize: '12px', color: '#6c757d' });
        elementContent = `<a href="${prefProps.link.href || '#[PREFERENCES_LINK]'}" target="${prefProps.link.target || '_blank'}" style="${prefStyles}">${prefProps.link.text || 'Manage Preferences'}</a>`;
        break;

      case 'previewText':
        const previewProps = element.properties;
        elementContent = `<div style="display:none; max-height:0; overflow:hidden;">${previewProps.text}</div>`;
        break;

      case 'footer':
        const footerProps = element.properties;
        const footerStyles = this.generateTypographyStyle(footerProps.typography, { fontSize: '12px', color: '#6c757d', textAlign: 'center' });
        elementContent = `<div style="margin:0; ${footerStyles}">${footerProps.text}</div>`;
        break;

      default:
        const _exhaustiveCheck: never = element;
        elementContent = `<!-- Unsupported element type -->`;
        break;
    }

    return `<div data-element-id="${element.id}">${elementContent}</div>`;
  }

  protected generateStyleString(styles: Record<string, any> | undefined): string {
    if (!styles) return '';
    return Object.entries(styles)
      .filter(([, value]) => value !== undefined && value !== null)
      .map(([key, value]) => `${this.camelToKebab(key)}:${value};`)
      .join(' ');
  }

  protected generateTypographyStyle(typography: any, defaults: Record<string, any> = {}): string {
    const styles = { ...defaults, ...(typography || {}) };
    return this.generateStyleString(styles);
  }
  
  protected generateColumnStyle(styles: Column['styles']): string {
    const styleObj: Record<string, any> = {};
    if (styles.backgroundColor) styleObj.backgroundColor = styles.backgroundColor;
    if (styles.textAlign) styleObj.textAlign = styles.textAlign;
    if (styles.padding) {
      styleObj.padding = `${styles.padding.top || '0'} ${styles.padding.right || '0'} ${styles.padding.bottom || '0'} ${styles.padding.left || '0'}`;
    }
    return this.generateStyleString(styleObj);
  }

  protected generateSectionStyle(styles: EmailSectionStyles | undefined): string {
    const styleObj: Record<string, any> = { ...styles };
    if (styleObj.padding) {
      styleObj.padding = `${styleObj.padding.top || '0'} ${styleObj.padding.right || '0'} ${styleObj.padding.bottom || '0'} ${styleObj.padding.left || '0'}`;
    }
    if (styleObj.border) {
        const border = styleObj.border as { width?: string; style?: string; color?: string };
        styleObj['border'] = `${border.width || '1px'} ${border.style || 'solid'} ${border.color || '#000000'}`;
    }
    return this.generateStyleString(styleObj);
  }

  protected generateGlobalBodyStyle(styles: EmailGlobalStyles | undefined): string {
    if (!styles) return '';
    const styleObj = {
      'font-family': styles.bodyFontFamily,
      'color': styles.bodyTextColor,
      'background-color': styles.bodyBackgroundColor,
    };
    return this.generateStyleString(styleObj);
  }

  protected camelToKebab(str: string): string {
    return str.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase();
  }
}
