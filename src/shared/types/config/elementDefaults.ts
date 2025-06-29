/**
 * Provides a factory function to create a default email template.
 * This file's sole purpose is to export `createNewEmailTemplate`, which is used
 * to initialize new projects with a basic, well-structured starting point.
 */
import { generateId } from '../../../lib/uuid.ts';
import {
  EmailTemplate,
  EmailSection,
  Row,
  Column,
  EmailElement,
} from '@/shared/types';

const createDefaultHeader = (): EmailElement => ({
  id: generateId(),
  type: 'header',
  properties: {
    level: 'h1',
    text: 'Your Amazing Headline Here',
    typography: {
      fontSize: '36px',
      fontWeight: 'bold',
    },
  },
});

const createDefaultText = (): EmailElement => ({
  id: generateId(),
  type: 'text',
  properties: {
    text: 'This is a paragraph of text. You can edit this to say whatever you want. Click here to get started!',
    typography: {
      fontSize: '16px',
      lineHeight: '1.5',
    },
  },
});

export const createNewEmailTemplate = (): EmailTemplate => {
  const defaultColumn: Column = {
    id: generateId(),
    styles: {
      gridSpan: 12,
      textAlign: 'left',
      padding: {
        top: '10px',
        right: '25px',
        bottom: '10px',
        left: '25px',
      },
    },
    elements: [createDefaultHeader(), createDefaultText()],
  };

  const defaultRow: Row = {
    id: generateId(),
    styles: {},
    columns: [defaultColumn],
  };

  const defaultSection: EmailSection = {
    id: generateId(),
    styles: {
      padding: {
        top: '20px',
        right: '0px',
        bottom: '20px',
        left: '0px',
      },
    },
    rows: [defaultRow],
  };

  const template: EmailTemplate = {
    id: generateId(),
    name: 'Untitled Email',
    version: 2,
    globalStyles: {
      bodyBackgroundColor: '#FFFFFF',
    },
    sections: [defaultSection],
  };

  return template;
}; 