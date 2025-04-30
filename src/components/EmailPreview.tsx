import React, { useEffect } from 'react';
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
  useEffect(() => {
    // Log the template when it changes
    console.log("=== EMAIL PREVIEW RECEIVED TEMPLATE ===");
    console.log("Template:", JSON.stringify(template));
    
    // Count pending elements
    let pendingCount = 0;
    template.sections.forEach(section => {
      section.elements.forEach(element => {
        if (element.pending === true) {
          pendingCount++;
          console.log(`Pending element found: ${element.id}, type: ${element.type}, pendingType: ${element.pendingType}`);
          console.log("Element details:", JSON.stringify(element));
        }
      });
    });
    
    console.log(`Total pending elements: ${pendingCount}`);
  }, [template]);

  const renderElement = (element: EmailElement) => {
    const isPending = element.pending === true;
    const pendingClass = isPending
      ? element.pendingType === 'delete'
        ? 'opacity-50 line-through bg-red-50 p-2'
        : element.pendingType === 'add'
        ? 'border-l-4 border-green-500 pl-2 bg-green-50 p-2'
        : 'border-l-4 border-yellow-500 pl-2 bg-yellow-50 p-2'
      : '';
    
    // Log the element for debugging
    if (isPending) {
      console.log(`Rendering pending element: ${element.id}, type: ${element.pendingType}`);
    }
    
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
            onClick={() => {
              console.log(`Accepting change for element: ${element.id}`);
              onAcceptChange(element.id);
            }}
            title="Accept change"
          >
            <CheckCircle className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="p-1 h-auto w-auto text-red-500 hover:text-red-700 hover:bg-red-100"
            onClick={() => {
              console.log(`Rejecting change for element: ${element.id}`);
              onRejectChange(element.id);
            }}
            title="Reject change"
          >
            <XCircle className="h-4 w-4" />
          </Button>
        </div>
      );
    };

    // Add a debug display for pending elements
    const renderDebugInfo = () => {
      if (!isPending) return null;
      
      return (
        <div className="absolute left-2 bottom-2 text-xs bg-black bg-opacity-70 text-white p-1 rounded">
          {element.pendingType} | ID: {element.id.substring(0, 8)}...
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
            {renderDebugInfo()}
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
            {renderDebugInfo()}
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
              className="px-4 py-2 text-white rounded hover:bg-opacity-90 transition-colors"
              style={{ 
                ...element.styles,
                backgroundColor: element.styles?.backgroundColor || '#007BFF'
              }}
            >
              {element.content}
            </button>
            {renderPendingControls()}
            {renderDebugInfo()}
            {isPending && element.styles?.backgroundColor && (
              <div className="mt-1 text-xs text-gray-600">
                Button color: {element.styles.backgroundColor}
              </div>
            )}
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
            {renderDebugInfo()}
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
            {renderDebugInfo()}
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
      
      {/* Debug information panel */}
      <div className="bg-gray-100 p-3 border-t border-gray-200">
        <details>
          <summary className="text-sm font-medium cursor-pointer">Debug Information</summary>
          <div className="mt-2 text-xs">
            <p>Template ID: {template.id}</p>
            <p>Sections: {template.sections.length}</p>
            {template.sections.map((section, idx) => (
              <div key={section.id} className="ml-2 mt-1">
                <p>Section {idx + 1}: {section.id} - {section.elements.length} elements</p>
                <ul className="ml-4 list-disc">
                  {section.elements.map(element => (
                    <li key={element.id} className={element.pending ? "font-semibold" : ""}>
                      {element.type}: {element.id.substring(0, 8)}... 
                      {element.pending && ` (${element.pendingType})`}
                      {element.type === 'button' && element.styles?.backgroundColor && 
                        ` - Color: ${element.styles.backgroundColor}`
                      }
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </details>
      </div>
    </div>
  );
};
