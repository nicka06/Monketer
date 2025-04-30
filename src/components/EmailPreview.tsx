
import React from 'react';
import { EmailTemplate, EmailSection, EmailElement } from '@/types/editor';
import { Button } from './ui/button';
import { CheckCircle, XCircle } from 'lucide-react';

interface EmailPreviewProps {
  template: EmailTemplate;
  onAcceptChange: (elementId: string) => void;
  onRejectChange: (elementId: string) => void;
}

export const EmailPreview: React.FC<EmailPreviewProps> = ({
  template,
  onAcceptChange,
  onRejectChange,
}) => {
  const renderElement = (element: EmailElement) => {
    const isPending = element.pending === true;
    const pendingClass = isPending
      ? element.pendingType === 'delete'
        ? 'opacity-50 line-through bg-red-50 p-2'
        : element.pendingType === 'add'
        ? 'border-l-4 border-green-500 pl-2 bg-green-50 p-2'
        : 'border-l-4 border-yellow-500 pl-2 bg-yellow-50 p-2'
      : '';
    
    // Ensure styles is never null or undefined
    const elementStyle = {
      ...(element.styles || {}),
      position: 'relative' as const,
    };

    const renderPendingControls = () => {
      if (!isPending) return null;
      
      return (
        <div className="absolute right-2 top-2 flex space-x-1 bg-white bg-opacity-90 p-1 rounded shadow-sm">
          <Button
            variant="ghost"
            size="sm"
            className="p-1 h-auto w-auto text-green-500 hover:text-green-700 hover:bg-green-100"
            onClick={() => onAcceptChange(element.id)}
            title="Accept change"
          >
            <CheckCircle className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="p-1 h-auto w-auto text-red-500 hover:text-red-700 hover:bg-red-100"
            onClick={() => onRejectChange(element.id)}
            title="Reject change"
          >
            <XCircle className="h-4 w-4" />
          </Button>
        </div>
      );
    };

    switch (element.type) {
      case 'header':
        return (
          <div
            key={element.id}
            className={`group ${pendingClass} relative mb-4`}
            style={elementStyle}
          >
            <h2>{element.content}</h2>
            {renderPendingControls()}
          </div>
        );
      case 'text':
        return (
          <div
            key={element.id}
            className={`group ${pendingClass} relative mb-4`}
            style={elementStyle}
          >
            <p>{element.content}</p>
            {renderPendingControls()}
          </div>
        );
      case 'button':
        return (
          <div
            key={element.id}
            className={`group ${pendingClass} relative mb-4`}
            style={elementStyle}
          >
            <button
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              style={element.styles || {}} // Ensure styles is never null or undefined
            >
              {element.content}
            </button>
            {renderPendingControls()}
          </div>
        );
      case 'image':
        return (
          <div
            key={element.id}
            className={`group ${pendingClass} relative mb-4`}
            style={elementStyle}
          >
            <img src={element.content} alt="Email content" style={element.styles || {}} /> 
            {renderPendingControls()}
          </div>
        );
      case 'divider':
        return (
          <div
            key={element.id}
            className={`group ${pendingClass} relative mb-4`}
            style={elementStyle}
          >
            <hr style={element.styles || {}} />
            {renderPendingControls()}
          </div>
        );
      default:
        return null;
    }
  };

  const renderSection = (section: EmailSection) => {
    const isPending = section.pending === true;
    const pendingClass = isPending
      ? section.pendingType === 'delete'
        ? 'opacity-50 line-through bg-red-50'
        : section.pendingType === 'add'
        ? 'border-l-4 border-green-500 pl-2 bg-green-50'
        : 'border-l-4 border-yellow-500 pl-2 bg-yellow-50'
      : '';

    return (
      <div
        key={section.id}
        className={`p-4 mb-4 ${pendingClass}`}
        style={section.styles || {}}
      >
        {section.elements.map((element) => renderElement(element))}
      </div>
    );
  };

  return (
    <div className="bg-white shadow-md rounded-lg overflow-hidden">
      <div className="p-6" style={template.styles || {}}>
        {template.sections.map((section) => renderSection(section))}
      </div>
    </div>
  );
};
