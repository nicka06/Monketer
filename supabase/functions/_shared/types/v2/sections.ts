import { EmailElement } from './elements.ts';

export interface EmailSectionStyles {
  backgroundColor?: string;
  padding?: {
    top?: string;
    right?: string;
    bottom?: string;
    left?: string;
  };
  border?: {
    width?: string;
    style?: 'solid' | 'dashed' | 'dotted';
    color?: string;
  };
  // Add other section-specific styles as needed
}

export interface EmailSection {
  id: string;
  elements: EmailElement[];
  styles: EmailSectionStyles;
} 