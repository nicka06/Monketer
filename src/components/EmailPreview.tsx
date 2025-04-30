import React from 'react';
import { EmailTemplate, EmailSection, EmailElement } from '@/types/editor';
import { Button } from './ui/button';
import { CheckCircle, XCircle } from 'lucide-react';
import { cn } from "@/lib/utils";

interface EmailPreviewProps {
  template: EmailTemplate;
  onAcceptChange: (elementId: string) => void;
  onRejectChange: (elementId: string) => void;
  previewMode: 'light' | 'dark';
}

export const EmailPreview: React.FC<EmailPreviewProps> = ({
  template,
  onAcceptChange,
  onRejectChange,
  previewMode,
}) => {
  const renderElement = (element: EmailElement) => {
    const isPending = element.pending === true;
    let pendingBaseClass = '';
    if (isPending) {
      pendingBaseClass = 'p-2 relative';
      if (element.pendingType === 'delete') {
        pendingBaseClass += ' opacity-50 line-through bg-red-100 dark:bg-red-900/50';
      } else if (element.pendingType === 'add') {
        pendingBaseClass += ' border-l-4 border-green-500 bg-green-100 dark:bg-green-900/50 dark:border-green-400';
      } else {
        pendingBaseClass += ' border-l-4 border-yellow-500 bg-yellow-100 dark:bg-yellow-900/50 dark:border-yellow-400';
      }
    }
    const elementStyle = { ...(element.styles || {}) };
    const renderPendingControls = () => {
      if (!isPending) return null;
      return (
        <div className="absolute right-2 top-2 flex space-x-1 bg-white/80 dark:bg-gray-900/80 p-1 rounded shadow-md">
          <Button
            variant="ghost" size="sm"
            className="p-1 h-auto w-auto text-green-600 hover:text-green-700 hover:bg-green-100 dark:text-green-400 dark:hover:text-green-300 dark:hover:bg-green-800/50"
            onClick={() => onAcceptChange(element.id)} title="Accept change"
          ><CheckCircle className="h-4 w-4" /></Button>
          <Button
            variant="ghost" size="sm"
            className="p-1 h-auto w-auto text-red-600 hover:text-red-700 hover:bg-red-100 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-800/50"
            onClick={() => onRejectChange(element.id)} title="Reject change"
          ><XCircle className="h-4 w-4" /></Button>
        </div>
      );
    };
    const elementClasses = cn('group relative mb-4', pendingBaseClass);
    switch (element.type) {
      case 'header': return (<div key={element.id} className={elementClasses} style={elementStyle}><h2>{element.content}</h2>{renderPendingControls()}</div>);
      case 'text': return (<div key={element.id} className={elementClasses} style={elementStyle}><p>{element.content}</p>{renderPendingControls()}</div>);
      case 'button': return (<div key={element.id} className={elementClasses}><button className="px-4 py-2 text-white rounded hover:bg-opacity-90 transition-colors" style={{ ...elementStyle, backgroundColor: elementStyle.backgroundColor || '#007BFF' }}>{element.content}</button>{renderPendingControls()}</div>);
      case 'image': return (<div key={element.id} className={elementClasses} style={elementStyle}><img src={element.content} alt="Email content" style={{ maxWidth: '100%', height: 'auto' }} />{renderPendingControls()}</div>);
      case 'divider': return (<div key={element.id} className={elementClasses} style={elementStyle}><hr style={{ ...elementStyle, borderTopWidth: elementStyle.borderTopWidth || '1px' }} />{renderPendingControls()}</div>);
      default: return null;
    }
  };

  const renderSection = (section: EmailSection) => {
     const isPending = section.pending === true;
     const pendingClass = isPending ? section.pendingType === 'delete' ? 'opacity-50 line-through bg-red-50 dark:bg-red-900/50' : section.pendingType === 'add' ? 'border-l-4 border-green-500 bg-green-50 dark:bg-green-900/50 dark:border-green-400' : 'border-l-4 border-yellow-500 bg-yellow-50 dark:bg-yellow-900/50 dark:border-yellow-400' : '';
     return (
       <div key={section.id} className={cn("mb-4", pendingClass)} style={section.styles || {}}>
         {section.elements.map((element) => renderElement(element))}
       </div>
     );
   };

  // --- Styling --- 

  // 1. Base wrapper classes + light/dark mode background and text
  const wrapperClasses = cn(
    "shadow-md rounded-lg overflow-hidden border-2 border-gray-300 dark:border-gray-700",
    "transition-colors duration-300 mx-auto",
    // Background is now handled by the outer inversion wrapper or kept standard 
    // Apply text color based on mode IF background is applied here (optional)
    // previewMode === 'light' ? 'bg-white text-gray-900' : 'bg-gray-900 text-gray-100' 
    // Keeping bg-white as default, filter handles inversion
    "bg-white text-gray-900" 
  );

  // 2. Apply template styles directly
  const containerStyle = {
    ...(template.styles || {}),
    width: template.styles?.width || '100%',
  };

  // 3. Calculate inversion class for the outer wrapper
  const inversionWrapperClass = 
    previewMode === 'dark' ? 'filter invert hue-rotate-180' : '';

  return (
    // Outer wrapper applies the inversion filter in dark mode
    <div className={inversionWrapperClass}>
      {/* Inner wrapper applies structural styles and base light-mode appearance */}
      <div className={wrapperClasses} style={containerStyle}>
        {template.sections.map((section) => renderSection(section))}
      </div>
    </div>
  );
};
