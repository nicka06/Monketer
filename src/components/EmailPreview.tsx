import React, { useEffect, useRef } from 'react';
import { EmailPreviewProps, PendingChange } from '@/types/editor';
import { cn } from "@/lib/utils";

export const EmailPreview: React.FC<EmailPreviewProps> = ({
  currentHtml,
  pendingChanges,
  previewMode,
  previewDevice,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const overlayContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const overlayContainer = overlayContainerRef.current;
    if (!container || !overlayContainer || !currentHtml || !pendingChanges) return;

    const createdOverlays: HTMLDivElement[] = [];

    overlayContainer.innerHTML = '';

    if (Array.isArray(pendingChanges)) {
      pendingChanges.forEach((change: PendingChange) => {
        const targetElement = container.querySelector(`[id="${change.elementId}"]`) as HTMLElement;

        if (targetElement) {
          const targetRect = targetElement.getBoundingClientRect();
          const containerRect = container.getBoundingClientRect();

          const overlay = document.createElement('div');
          overlay.style.position = 'absolute';
          overlay.style.left = `${targetRect.left - containerRect.left + container.scrollLeft}px`;
          overlay.style.top = `${targetRect.top - containerRect.top + container.scrollTop}px`;
          overlay.style.width = `${targetRect.width}px`;
          overlay.style.height = `${targetRect.height}px`;
          overlay.style.pointerEvents = 'none';
          overlay.style.zIndex = '10';
          overlay.style.boxSizing = 'border-box';
          overlay.style.borderRadius = '3px';

          switch (change.changeType) {
            case 'add':
              overlay.style.border = '2px dashed #22c55e';
              overlay.style.backgroundColor = 'rgba(34, 197, 94, 0.1)';
              break;
            case 'edit':
              overlay.style.border = '2px solid #eab308';
              overlay.style.backgroundColor = 'rgba(234, 179, 8, 0.1)';
              break;
            case 'delete':
              overlay.style.border = '2px dashed #ef4444';
              overlay.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
              targetElement.style.opacity = '0.6';
              targetElement.style.textDecoration = 'line-through';
              break;
          }

          overlayContainer.appendChild(overlay);
          createdOverlays.push(overlay);
        } else {
          console.warn(`Overlay target element not found for ID: ${change.elementId}`);
        }
      });
    } else {
      console.warn("pendingChanges is not an array or is undefined.");
    }

    return () => {
      if (overlayContainer) {
        overlayContainer.innerHTML = '';
      }
      if (Array.isArray(pendingChanges)) {
        pendingChanges.forEach((change: PendingChange) => {
          if (change.changeType === 'delete') {
            const targetElement = container?.querySelector(`[id="${change.elementId}"]`) as HTMLElement;
            if (targetElement) {
              targetElement.style.opacity = '';
              targetElement.style.textDecoration = '';
            }
          }
        });
      }
    };

  }, [currentHtml, pendingChanges]);

  const frameClass = 
    previewDevice === 'mobile'
      ? 'w-[375px] h-full max-h-[calc(100vh-6rem)] border border-gray-300 dark:border-gray-700 rounded-xl shadow-lg overflow-auto overflow-x-auto relative'
      : 'max-w-[650px] w-full mx-auto border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-hidden relative';
      
  const frameBackground = 'bg-white';
  const inversionClass = previewMode === 'dark' ? 'filter invert hue-rotate-180' : '';
  const outerContainerClass = "flex justify-center py-6"; 

  return (
    <div className={outerContainerClass}>
      <div className={cn(frameClass, frameBackground, inversionClass)}>
        <div 
           ref={containerRef} 
           className="min-w-[375px] w-full h-full"
           dangerouslySetInnerHTML={{ __html: currentHtml || '<div class="p-4 text-center text-gray-500">No preview available. Use the AI to generate content.</div>' }}
        />
        <div 
          ref={overlayContainerRef}
          className="absolute top-0 left-0 w-full h-full pointer-events-none"
          style={{ zIndex: 5 }}
        ></div>
      </div>
    </div>
  );
};
