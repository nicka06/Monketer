import React from 'react';
import { EmailElement } from '@/shared/types';

// Import all the element components we just created
import TextElementComponent from './TextElementComponent';
import ImageElementComponent from './ImageElementComponent';
import HeaderElementComponent from './HeaderElementComponent';
import ButtonElementComponent from './ButtonElementComponent';
import DividerElementComponent from './DividerElementComponent';
import SpacerElementComponent from './SpacerElementComponent';
import SubtextElementComponent from './SubtextElementComponent';
import QuoteElementComponent from './QuoteElementComponent';
import CodeElementComponent from './CodeElementComponent';
import ListElementComponent from './ListElementComponent';
import IconElementComponent from './IconElementComponent';
import NavElementComponent from './NavElementComponent';
import SocialElementComponent from './SocialElementComponent';
import AppStoreBadgeElementComponent from './AppStoreBadgeElementComponent';
import UnsubscribeElementComponent from './UnsubscribeElementComponent';
import FooterElementComponent from './FooterElementComponent';

interface ElementRendererProps {
  element: EmailElement;
}

const ElementRenderer: React.FC<ElementRendererProps> = ({ element }) => {
  switch (element.type) {
    case 'text':
      return <TextElementComponent element={element} />;
    case 'image':
      return <ImageElementComponent element={element} />;
    case 'header':
      return <HeaderElementComponent element={element} />;
    case 'button':
      return <ButtonElementComponent element={element} />;
    case 'divider':
      return <DividerElementComponent element={element} />;
    case 'spacer':
      return <SpacerElementComponent element={element} />;
    case 'subtext':
        return <SubtextElementComponent element={element} />;
    case 'quote':
        return <QuoteElementComponent element={element} />;
    case 'code':
        return <CodeElementComponent element={element} />;
    case 'list':
        return <ListElementComponent element={element} />;
    case 'icon':
        return <IconElementComponent element={element} />;
    case 'nav':
        return <NavElementComponent element={element} />;
    case 'social':
        return <SocialElementComponent element={element} />;
    case 'appStoreBadge':
        return <AppStoreBadgeElementComponent element={element} />;
    case 'unsubscribe':
        return <UnsubscribeElementComponent element={element} />;
    case 'footer':
        return <FooterElementComponent element={element} />;
    // 'previewText', 'container', 'box' are not visual components in the editor
    case 'previewText':
    case 'container':
    case 'box':
        return null; 
    // Add other cases as you create more components
    default:
      // Log an error for unhandled types, but don't crash the app
      console.warn('Unhandled element type in ElementRenderer:', (element as any).type);
      return (
        <div style={{ padding: '10px', backgroundColor: '#fdd', border: '1px solid red' }}>
          Unhandled Element: {(element as any).type}
        </div>
      );
  }
};

export default ElementRenderer;