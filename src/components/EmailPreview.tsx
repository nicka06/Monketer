import React from 'react';
import { useEditor } from '@/features/contexts/EditorContext';
import { cn } from "@/lib/utils";
import SectionComponent from './editor/SectionComponent'; // Note the updated path
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';


/**
 * EmailPreview Component (Refactored)
 *
 * This component renders a live, interactive preview of the email using a
 * tree of React components instead of a static HTML iframe. This approach
is
 * essential for enabling advanced features like drag-and-drop.
 *
 * It iterates through the semantic email template and renders each section
 * using the SectionComponent, which in turn renders its rows, columns, and
 * elements.
 */
const EmailPreview: React.FC = () => {
  const { projectData, isMobileView, onDragEnd } = useEditor();

  // --- THIS WAS THE BUG: The component was hardcoded to use test data. ---
  // const semanticTemplate = testTemplate as any; 
  const semanticTemplate = projectData?.semantic_email_v2;

  const handleDragEnd = (event: DragEndEvent) => {
    onDragEnd(event);
    console.log('Drag ended:', event);
  };

  if (!semanticTemplate) {
    return <div>Loading semantic preview...</div>;
  }

  /**
   * Style Computations for the preview frame.
   * Handles responsive design and theme switching.
   */
  const frameClass = isMobileView === true
    ? 'w-[375px] mx-auto'
    : 'max-w-[650px] w-full mx-auto';
      
  const frameBackground = 'bg-white';
  // Note: The dark mode inversion is now handled by individual component styles
  // or a global style context if needed, not a blanket filter.
  const outerContainerClass = "flex justify-center pt-4 pb-20";

  return (
    <div className={outerContainerClass}>
      <div 
        className={cn("relative", frameClass, frameBackground)}
        // Theming for dark mode would be applied here or on the body
        style={{ 
            backgroundColor: semanticTemplate?.globalStyles.bodyBackgroundColor || '#ffffff'
        }}
      >
        {!semanticTemplate ? (
          // Empty State Display
          <div className="flex items-center justify-center p-8 text-gray-500 bg-gray-50 rounded-xl min-h-[300px]">
            <div className="text-center">
              <p className="text-lg font-medium">No Email Content</p>
              <p className="text-sm mt-2">Start editing to preview your email here</p>
            </div>
          </div>
        ) : (
          <DndContext 
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <div>
              {semanticTemplate.sections.map(section => (
                <SectionComponent key={section.id} section={section} />
              ))}
            </div>
          </DndContext>
        )}
      </div>
    </div>
  );
};

export default EmailPreview;