import { EmailElement as EmailElementTypeV2, ElementType as ElementTypeV2, SocialPlatform } from '../v2/elements.ts';

export const elementDefaults: Record<ElementTypeV2, Omit<EmailElementTypeV2, 'id' | 'content' | 'type'> & { type: ElementTypeV2 }> = {
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
  image: {
    type: 'image',
    layout: { align: 'center', padding: { top: '10px', bottom: '10px' }, width: '100%' }, // width in layout is for the container
    properties: {
      image: { 
        src: '@@PLACEHOLDER_IMAGE@@', 
        alt: 'Placeholder Image', 
        width: '100%', // width in properties.image is for the image element itself
        height: null,    // Default to null, let AI or user define, or aspect ratio dictate
        linkHref: null,
        linkTarget: '_self',
        videoHref: null
      }, 
      border: {
        radius: null,
        width: null,
        style: null,
        color: null
      }
    },
  } as Omit<EmailElementTypeV2, 'id' | 'content' | 'type'> & { type: 'image' },
  divider: {
    type: 'divider',
    layout: { padding: { top: '10px', bottom: '10px' } },
    properties: {
      divider: { color: '#cccccc', height: '1px', width: '100%' }
    },
  } as Omit<EmailElementTypeV2, 'id' | 'content' | 'type'> & { type: 'divider' },
  spacer: {
    type: 'spacer',
    layout: {},
    properties: {
      spacer: { height: '20px' }
    },
  } as Omit<EmailElementTypeV2, 'id' | 'content' | 'type'> & { type: 'spacer' },
  icon: {
    type: 'icon',
    layout: { align: 'center', padding: { top: '5px', bottom: '5px' } },
    properties: {
      icon: { src: '@@PLACEHOLDER_ICON@@', alt: 'Icon', width: '24px', height: '24px' }
    },
  } as Omit<EmailElementTypeV2, 'id' | 'content' | 'type'> & { type: 'icon' },
  subtext: {
    type: 'subtext',
    layout: { padding: { top: '2px', bottom: '2px' } },
    properties: { text: 'This is a subtext, often smaller or lighter.', typography: { fontSize: '12px', color: '#555555' } },
  } as Omit<EmailElementTypeV2, 'id' | 'content' | 'type'> & { type: 'subtext' },
  quote: {
    type: 'quote',
    layout: { padding: { top: '10px', bottom: '10px', left: '15px', right: '15px' } },
    properties: {
      text: 'This is a quote. It stands out.',
      citation: 'Source',
      typography: { fontStyle: 'italic' },
      border: { width: '3px', style: 'solid', color: '#dddddd' }, // Assuming border applies to left by default in HTML generator
      backgroundColor: '#f9f9f9'
    },
  } as Omit<EmailElementTypeV2, 'id' | 'content' | 'type'> & { type: 'quote' },
  code: {
    type: 'code',
    layout: { padding: { top: '10px', bottom: '10px' } },
    properties: {
      code: 'console.log("Hello, Email!");',
      language: 'javascript',
      typography: { fontFamily: 'monospace' },
      backgroundColor: '#f0f0f0',
      borderRadius: '4px',
      padding: '10px' // Inner padding for the code block itself
    },
  } as Omit<EmailElementTypeV2, 'id' | 'content' | 'type'> & { type: 'code' },
  list: {
    type: 'list',
    layout: { padding: { top: '5px', bottom: '5px', left: '20px' } },
    properties: {
      items: ['List item 1', 'List item 2'],
      listType: 'unordered',
      typography: {}
    },
  } as Omit<EmailElementTypeV2, 'id' | 'content' | 'type'> & { type: 'list' },
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
  appStoreBadge: {
    type: 'appStoreBadge',
    layout: { align: 'center', padding: { top: '10px', bottom: '10px' } },
    properties: {
      badge: { platform: 'apple-app-store', href: '#', alt: 'Download on the App Store' }
    },
  } as Omit<EmailElementTypeV2, 'id' | 'content' | 'type'> & { type: 'appStoreBadge' },
  unsubscribe: {
    type: 'unsubscribe',
    layout: { align: 'center', padding: { top: '15px', bottom: '15px' } },
    properties: {
      link: { text: 'Unsubscribe here', href: '@@PLACEHOLDER_UNSUBSCRIBE_LINK@@' },
      typography: { fontSize: '12px', color: '#555555' }
    },
  } as Omit<EmailElementTypeV2, 'id' | 'content' | 'type'> & { type: 'unsubscribe' },
  preferences: {
    type: 'preferences',
    layout: { align: 'center', padding: { top: '10px', bottom: '10px' } },
    properties: {
      link: { text: 'Manage your preferences', href: '@@PLACEHOLDER_PREFERENCES_LINK@@' },
      typography: { fontSize: '12px', color: '#555555' }
    },
  } as Omit<EmailElementTypeV2, 'id' | 'content' | 'type'> & { type: 'preferences' },
  previewText: {
    type: 'previewText',
    layout: {}, // Preview text is not visual in the email body itself
    properties: {
      text: 'This is the preview text that appears in the inbox.'
    },
  } as Omit<EmailElementTypeV2, 'id' | 'content' | 'type'> & { type: 'previewText' },
  container: {
    type: 'container',
    layout: { padding: { top: '0px', bottom: '0px' } }, // Outer padding, inner content is separate
    properties: {
      styles: { backgroundColor: '#ffffff' } // Default to white, can be transparent or other
    },
  } as Omit<EmailElementTypeV2, 'id' | 'content' | 'type'> & { type: 'container' },
  box: {
    type: 'box',
    layout: { padding: { top: '10px', bottom: '10px' } },
    properties: {
      styles: { backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '4px' }
    },
  } as Omit<EmailElementTypeV2, 'id' | 'content' | 'type'> & { type: 'box' },
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

export function createNewElement(type: ElementTypeV2, initialContent?: string): EmailElementTypeV2 {
  const defaults = elementDefaults[type];
  if (!defaults) {
    throw new Error(`No default template for element type: ${type}`);
  }

  const newElementBase = JSON.parse(JSON.stringify(defaults));

  const newElement = {
    ...newElementBase,
    id: crypto.randomUUID(),
    type: type,
  } as EmailElementTypeV2;

  if (initialContent) {
    newElement.content = initialContent;
    switch (newElement.type) {
      case 'header':
      case 'text':
      case 'subtext':
      case 'quote':
      case 'previewText': // Preview text also has a direct text property
        if ('text' in newElement.properties) {
          (newElement.properties as any).text = initialContent;
        }
        break;
      case 'image':
        if (newElement.properties.image) {
          newElement.properties.image.alt = initialContent;
        } else {
          newElement.properties.image = { src: '@@PLACEHOLDER_IMAGE@@', alt: initialContent };
        }
        break;
      case 'icon':
        if (newElement.properties.icon) {
          newElement.properties.icon.alt = initialContent;
        } else {
          newElement.properties.icon = { src: '@@PLACEHOLDER_ICON@@', alt: initialContent };
        }
        break;
      case 'code':
        if ('code' in newElement.properties) {
          (newElement.properties as any).code = initialContent;
        }
        break;
      // For button, unsubscribe, preferences, their main clickable text is often the 'content' field itself.
      // For list, nav, social, appStoreBadge, container, box, initialContent might not directly map to a single primary text field
      // in properties beyond the main 'content'. Their structures are more complex.
      default:
        break;
    }
  } else {
    switch (newElement.type) {
      case 'header':
      case 'text':
      case 'subtext':
      case 'quote':
      case 'previewText':
        newElement.content = (newElement.properties as any).text || 'Default Text';
        break;
      case 'button':
        newElement.content = 'Click Me';
        break;
      case 'image':
        newElement.content = newElement.properties.image?.alt || 'Placeholder Image';
        break;
      case 'icon':
        newElement.content = newElement.properties.icon?.alt || 'Icon';
        break;
      case 'code':
        newElement.content = (newElement.properties as any).code || '';
        break;
      case 'unsubscribe':
        newElement.content = newElement.properties.link?.text || 'Unsubscribe';
        break;
      case 'preferences':
        newElement.content = newElement.properties.link?.text || 'Manage Preferences';
        break;
      case 'list':
        newElement.content = newElement.properties.items?.join(', ') || 'List items'; // Simple content representation
        break;
      // For nav, social, appStoreBadge, container, box, a simple default string for 'content' might be less meaningful
      // or could be derived differently if needed for a generic textual representation.
      default:
        newElement.content = '';
    }
  }
  return newElement;
} 