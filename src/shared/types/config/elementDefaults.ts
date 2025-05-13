/**
 * EMAIL ELEMENT DEFAULTS
 * 
 * This module provides default configurations for all email element types.
 * These defaults are used when creating new elements through the editor UI,
 * programmatically via API, or through the AI generation pipeline.
 * 
 * KEY FEATURES:
 * - Defines standard styling, layout, and properties for all element types
 * - Provides a factory function to create new elements with proper defaults
 * - Ensures consistency across all element creation methods
 * 
 * USAGE:
 * ```
 * import { createNewElement } from '@shared/types/config/elementDefaults';
 * 
 * // Create a new header element
 * const header = createNewElement('header', 'Welcome to our newsletter');
 * 
 * // Create a new button element with default text
 * const button = createNewElement('button');
 * ```
 */

import { EmailElement as EmailElementTypeV2, ElementType as ElementTypeV2, SocialPlatform } from '../elements.ts';
import { generateId } from '../../lib/uuid.ts';

/**
 * Standard default configuration for all email element types.
 * Each entry defines a complete template for the given element type,
 * omitting only the properties that must be unique per instance (id, content).
 */
export const elementDefaults: Record<ElementTypeV2, Omit<EmailElementTypeV2, 'id' | 'content' | 'type'> & { type: ElementTypeV2 }> = {
  /**
   * Header element: For section headings and titles.
   * Default: H1 header with centered alignment and bold styling.
   */
  header: {
    type: 'header',
    layout: { align: 'center', padding: { top: '10px', bottom: '10px' } },
    properties: { 
      level: 'h1', 
      text: 'Default Header', 
      typography: { 
        fontFamily: 'Arial, sans-serif',
        fontSize: '24px',
        fontWeight: 'bold',
        fontStyle: 'normal',
        color: '#000000',
        textAlign: 'center',
        lineHeight: '1.4'
      }
    },
  } as Omit<EmailElementTypeV2, 'id' | 'content' | 'type'> & { type: 'header' },
  
  /**
   * Text element: For primary paragraph content.
   * Default: Standard paragraph with readable styling.
   */
  text: {
    type: 'text',
    layout: { align: 'center', padding: { top: '5px', bottom: '5px' } },
    properties: { 
      text: 'Default paragraph text.', 
      typography: { 
        fontFamily: 'Arial, sans-serif',
        fontSize: '16px',
        fontWeight: 'normal',
        fontStyle: 'normal',
        color: '#000000',
        textAlign: 'center',
        lineHeight: '1.5'
      }
    },
  } as Omit<EmailElementTypeV2, 'id' | 'content' | 'type'> & { type: 'text' },
  
  /**
   * Button element: For call-to-action links.
   * Default: Blue button with white text and rounded corners.
   */
  button: {
    type: 'button',
    layout: { align: 'center', padding: { top: '10px', bottom: '10px' } },
    properties: {
      button: { 
        href: '#', 
        target: '_self',
        backgroundColor: '#007bff', 
        textColor: '#ffffff',
        borderRadius: '4px',
        border: 'none'
      },
      typography: { 
        fontFamily: 'Arial, sans-serif',
        fontSize: '16px',
        fontWeight: 'bold'
      } 
    },
  } as Omit<EmailElementTypeV2, 'id' | 'content' | 'type'> & { type: 'button' },
  
  /**
   * Image element: For photos, graphics, and illustrations.
   * Default: Responsive image with placeholder and centered alignment.
   */
  image: {
    type: 'image',
    layout: { align: 'center', padding: { top: '10px', bottom: '10px' }, width: '100%' }, // Container width
    properties: {
      image: { 
        src: '@@PLACEHOLDER_IMAGE@@', // Placeholder marker for editor UI
        alt: 'Placeholder Image', 
        width: '100%',                // Image width (can be px or %)
        height: null,                 // Auto height to maintain aspect ratio
        linkHref: null,               // Optional link wrapping the image
        linkTarget: '_self',          // Target for optional image link
        videoHref: null               // Optional video link for video thumbnails
      }, 
      border: {
        radius: null,                 // Optional border styling properties
        width: null,
        style: null,
        color: null
      }
    },
  } as Omit<EmailElementTypeV2, 'id' | 'content' | 'type'> & { type: 'image' },
  
  /**
   * Divider element: For visual separation between sections.
   * Default: Light gray 1px horizontal rule.
   */
  divider: {
    type: 'divider',
    layout: { padding: { top: '10px', bottom: '10px' } },
    properties: {
      divider: { color: '#cccccc', height: '1px', width: '100%' }
    },
  } as Omit<EmailElementTypeV2, 'id' | 'content' | 'type'> & { type: 'divider' },
  
  /**
   * Spacer element: For adding vertical space between elements.
   * Default: 20px empty vertical space.
   */
  spacer: {
    type: 'spacer',
    layout: {},
    properties: {
      spacer: { height: '20px' }
    },
  } as Omit<EmailElementTypeV2, 'id' | 'content' | 'type'> & { type: 'spacer' },
  
  /**
   * Icon element: For small graphics, logos, or symbols.
   * Default: 24x24 placeholder icon.
   */
  icon: {
    type: 'icon',
    layout: { align: 'center', padding: { top: '5px', bottom: '5px' } },
    properties: {
      icon: { src: '@@PLACEHOLDER_ICON@@', alt: 'Icon', width: '24px', height: '24px' }
    },
  } as Omit<EmailElementTypeV2, 'id' | 'content' | 'type'> & { type: 'icon' },
  
  /**
   * Subtext element: For secondary, smaller text like captions or footnotes.
   * Default: Small, gray text for supporting information.
   */
  subtext: {
    type: 'subtext',
    layout: { padding: { top: '2px', bottom: '2px' } },
    properties: { text: 'This is a subtext, often smaller or lighter.', typography: { fontSize: '12px', color: '#555555' } },
  } as Omit<EmailElementTypeV2, 'id' | 'content' | 'type'> & { type: 'subtext' },
  
  /**
   * Quote element: For testimonials or highlighted content.
   * Default: Styled blockquote with left border and background.
   */
  quote: {
    type: 'quote',
    layout: { padding: { top: '10px', bottom: '10px', left: '15px', right: '15px' } },
    properties: {
      text: 'This is a quote. It stands out.',
      citation: 'Source',                         // Optional source attribution 
      typography: { fontStyle: 'italic' },
      border: { width: '3px', style: 'solid', color: '#dddddd' }, // Left border by default in HTML generator
      backgroundColor: '#f9f9f9'
    },
  } as Omit<EmailElementTypeV2, 'id' | 'content' | 'type'> & { type: 'quote' },
  
  /**
   * Code element: For displaying code snippets or technical content.
   * Default: Monospace text with light gray background.
   */
  code: {
    type: 'code',
    layout: { padding: { top: '10px', bottom: '10px' } },
    properties: {
      code: 'console.log("Hello, Email!");',
      language: 'javascript',                 // Optional language for syntax highlighting
      typography: { fontFamily: 'monospace' },
      backgroundColor: '#f0f0f0',
      borderRadius: '4px',
      padding: '10px'                         // Inner padding for the code block
    },
  } as Omit<EmailElementTypeV2, 'id' | 'content' | 'type'> & { type: 'code' },
  
  /**
   * List element: For ordered or unordered lists.
   * Default: Unordered list with two sample items.
   */
  list: {
    type: 'list',
    layout: { padding: { top: '5px', bottom: '5px', left: '20px' } },
    properties: {
      items: ['List item 1', 'List item 2'],  // Array of list items
      listType: 'unordered',                  // 'ordered' or 'unordered'
      typography: {}
    },
  } as Omit<EmailElementTypeV2, 'id' | 'content' | 'type'> & { type: 'list' },
  
  /**
   * Nav element: For navigation links within the email.
   * Default: Simple centered navigation with 3 sample links.
   */
  nav: {
    type: 'nav',
    layout: { align: 'center', padding: { top: '10px', bottom: '10px' }, spacing: '15px' },
    properties: {
      links: [
        { text: 'Home', href: '#home' },
        { text: 'About', href: '#about' },
        { text: 'Contact', href: '#contact' },
      ],
      typography: { color: '#007bff' }
    },
  } as Omit<EmailElementTypeV2, 'id' | 'content' | 'type'> & { type: 'nav' },
  
  /**
   * Social element: For social media link icons.
   * Default: Facebook, Twitter, Instagram icons with links.
   */
  social: {
    type: 'social',
    layout: { align: 'center', padding: { top: '10px', bottom: '10px' }, spacing: '10px' },
    properties: {
      links: [
        { platform: 'facebook' as SocialPlatform, href: '#' },
        { platform: 'twitter' as SocialPlatform, href: '#' },
        { platform: 'instagram' as SocialPlatform, href: '#' },
      ],
      iconStyle: { width: '24px', height: '24px' }
    },
  } as Omit<EmailElementTypeV2, 'id' | 'content' | 'type'> & { type: 'social' },
  
  /**
   * App Store Badge element: For app download links.
   * Default: Apple App Store badge with placeholder link.
   */
  appStoreBadge: {
    type: 'appStoreBadge',
    layout: { align: 'center', padding: { top: '10px', bottom: '10px' } },
    properties: {
      badge: { platform: 'apple-app-store', href: '#', alt: 'Download on the App Store' }
    },
  } as Omit<EmailElementTypeV2, 'id' | 'content' | 'type'> & { type: 'appStoreBadge' },
  
  /**
   * Unsubscribe element: For CAN-SPAM compliance unsubscribe link.
   * Default: Small text unsubscribe link with placeholder URL.
   */
  unsubscribe: {
    type: 'unsubscribe',
    layout: { align: 'center', padding: { top: '15px', bottom: '15px' } },
    properties: {
      link: { text: 'Unsubscribe here', href: '@@PLACEHOLDER_UNSUBSCRIBE_LINK@@' },
      typography: { fontSize: '12px', color: '#555555' }
    },
  } as Omit<EmailElementTypeV2, 'id' | 'content' | 'type'> & { type: 'unsubscribe' },
  
  /**
   * Preferences element: For email preference management link.
   * Default: Small text preferences management link with placeholder URL.
   */
  preferences: {
    type: 'preferences',
    layout: { align: 'center', padding: { top: '10px', bottom: '10px' } },
    properties: {
      link: { text: 'Manage your preferences', href: '@@PLACEHOLDER_PREFERENCES_LINK@@' },
      typography: { fontSize: '12px', color: '#555555' }
    },
  } as Omit<EmailElementTypeV2, 'id' | 'content' | 'type'> & { type: 'preferences' },
  
  /**
   * Preview Text element: For inbox preview text (not visually displayed in email).
   * Default: Sample preview text that appears in email client inboxes.
   */
  previewText: {
    type: 'previewText',
    layout: {}, // No layout needed as this isn't visually displayed in the email body
    properties: {
      text: 'This is the preview text that appears in the inbox.'
    },
  } as Omit<EmailElementTypeV2, 'id' | 'content' | 'type'> & { type: 'previewText' },
  
  /**
   * Container element: For grouping elements with a common background.
   * Default: White background container without additional styling.
   */
  container: {
    type: 'container',
    layout: { padding: { top: '0px', bottom: '0px' } }, // Outer padding around container
    properties: {
      styles: { backgroundColor: '#ffffff' } // Default white background
    },
  } as Omit<EmailElementTypeV2, 'id' | 'content' | 'type'> & { type: 'container' },
  
  /**
   * Box element: For visually highlighting content in a box/card.
   * Default: Light gray box with rounded corners.
   */
  box: {
    type: 'box',
    layout: { padding: { top: '10px', bottom: '10px' } },
    properties: {
      styles: { backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '4px' }
    },
  } as Omit<EmailElementTypeV2, 'id' | 'content' | 'type'> & { type: 'box' },
  
  /**
   * Footer element: For email footer content.
   * Default: Small gray text for standard footer information.
   */
  footer: {
    type: 'footer',
    layout: { align: 'center', padding: { top: '20px', bottom: '20px' } },
    properties: {
      text: 'Default footer text',
      typography: {
        fontSize: '12px',
        color: '#555555',
        textAlign: 'center',
        lineHeight: '1.5'
      }
    },
  } as Omit<EmailElementTypeV2, 'id' | 'content' | 'type'> & { type: 'footer' },
};

/**
 * Factory function to create new email elements with proper defaults.
 * 
 * This function:
 * 1. Retrieves the default template for the requested element type
 * 2. Creates a deep copy to avoid reference issues
 * 3. Assigns a unique ID
 * 4. Sets the content field and updates type-specific properties as needed
 * 
 * @param type The type of element to create
 * @param initialContent Optional content to populate the element with
 * @returns A fully configured element of the requested type
 * @throws Error if no default template exists for the specified element type
 */
export function createNewElement(type: ElementTypeV2, initialContent?: string): EmailElementTypeV2 {
  // Get the default template for this element type
  const defaults = elementDefaults[type];
  if (!defaults) {
    throw new Error(`No default template for element type: ${type}`);
  }

  // Create a deep copy of the defaults to avoid reference issues
  const newElementBase = JSON.parse(JSON.stringify(defaults));

  // Create the element with a unique ID
  const newElement = {
    ...newElementBase,
    id: generateId(),
    type: type,
  } as EmailElementTypeV2;

  // Handle content population based on whether initialContent was provided
  if (initialContent) {
    // Use the provided initialContent
    newElement.content = initialContent;
    
    // Update type-specific properties that should reflect the content
    switch (newElement.type) {
      // For text-based elements, update the text property
      case 'header':
      case 'text':
      case 'subtext':
      case 'quote':
      case 'previewText':
        if ('text' in newElement.properties) {
          (newElement.properties as any).text = initialContent;
        }
        break;
        
      // For image elements, update the alt text
      case 'image':
        if (newElement.properties.image) {
          newElement.properties.image.alt = initialContent;
        } else {
          newElement.properties.image = { src: '@@PLACEHOLDER_IMAGE@@', alt: initialContent };
        }
        break;
        
      // For icon elements, update the alt text
      case 'icon':
        if (newElement.properties.icon) {
          newElement.properties.icon.alt = initialContent;
        } else {
          newElement.properties.icon = { src: '@@PLACEHOLDER_ICON@@', alt: initialContent };
        }
        break;
        
      // For code elements, update the code content
      case 'code':
        if ('code' in newElement.properties) {
          (newElement.properties as any).code = initialContent;
        }
        break;
        
      // Other element types have more complex property structures
      // and don't have a straightforward mapping from initialContent
      default:
        break;
    }
  } else {
    // No initialContent provided, set reasonable defaults for the content field
    switch (newElement.type) {
      // For text-based elements, use the default text from properties
      case 'header':
      case 'text':
      case 'subtext':
      case 'quote':
      case 'previewText':
        newElement.content = (newElement.properties as any).text || 'Default Text';
        break;
        
      // Standard button text
      case 'button':
        newElement.content = 'Click Me';
        break;
        
      // For images, use the alt text
      case 'image':
        newElement.content = newElement.properties.image?.alt || 'Placeholder Image';
        break;
        
      // For icons, use the alt text
      case 'icon':
        newElement.content = newElement.properties.icon?.alt || 'Icon';
        break;
        
      // For code, use the code content
      case 'code':
        newElement.content = (newElement.properties as any).code || '';
        break;
        
      // For unsubscribe and preferences, use the link text
      case 'unsubscribe':
        newElement.content = newElement.properties.link?.text || 'Unsubscribe';
        break;
      case 'preferences':
        newElement.content = newElement.properties.link?.text || 'Manage Preferences';
        break;
        
      // For lists, create a comma-separated representation
      case 'list':
        newElement.content = newElement.properties.items?.join(', ') || 'List items';
        break;
        
      // For other types, leave content empty
      default:
        newElement.content = '';
    }
  }
  
  return newElement;
} 