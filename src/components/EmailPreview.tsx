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
  previewDevice: 'desktop' | 'mobile';
}

export const EmailPreview: React.FC<EmailPreviewProps> = ({
  template,
  onAcceptChange,
  onRejectChange,
  previewMode,
  previewDevice,
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

  // --- Refined Mobile Frame & Dark Mode Styling --- 

  // 1. Define frame classes including overflow and adaptive height for mobile
  const frameClass = 
    previewDevice === 'mobile'
      ? 'w-[375px] h-full max-h-[calc(100vh-6rem)] border border-gray-300 dark:border-gray-700 rounded-xl shadow-lg overflow-auto overflow-x-auto' 
      // Add border and rounding for desktop view
      : 'max-w-[650px] w-full mx-auto border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-hidden'; // Added border, rounding, shadow, overflow
      
  // 2. Define the frame's base background (always light, inversion filter handles dark)
  const frameBackground = 'bg-white';
  
  // 3. Define the inversion class for simulating forced dark mode
  const inversionClass = previewMode === 'dark' ? 'filter invert hue-rotate-180' : '';

  // 4. Outer container remains for centering
  const outerContainerClass = "flex justify-center py-6"; 

  // 5. Inner content container style (applies template styles)
  const contentContainerStyle = {
      ...(template.styles || {}),
      // Width/maxWidth should come from template styles if defined
      // Margin is not needed as outer container centers
      margin: undefined,
  };

  // 6. Inner content container classes (for min-width and padding)
  const contentContainerClasses = cn(
      "min-w-[375px]", // Ensure content doesn't shrink below mobile width
      "px-4 py-6" // Add fallback padding
  );

  return (
    <div className={outerContainerClass}>
      {/* Frame div applies device dimensions, overflow, background, and inversion filter */}
      <div className={cn(frameClass, frameBackground, inversionClass)}>
        {/* Content container applies template styles + min-width and padding */}
        <div style={contentContainerStyle} className={contentContainerClasses}>
            {template.sections.map((section) => renderSection(section))}
        </div>
      </div>
    </div>
  );
};
