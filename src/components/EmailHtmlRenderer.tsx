import React, { useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';

interface EmailHtmlRendererProps {
  html: string | null;
  onContentReady: () => void;
  className?: string;
}

export interface EmailHtmlRendererRef {
  getContainer: () => HTMLDivElement | null;
}

export const EmailHtmlRenderer = forwardRef<EmailHtmlRendererRef, EmailHtmlRendererProps>((
  { html, onContentReady, className },
  ref
) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useImperativeHandle(ref, () => ({ 
    getContainer: () => containerRef.current,
  }), []);
  
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Create or access iframe
    if (!iframeRef.current) {
      const iframe = document.createElement('iframe');
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.style.border = 'none';
      iframe.style.overflow = 'auto';
      container.appendChild(iframe);
      iframeRef.current = iframe;
    }

    // Set HTML content to iframe
    if (iframeRef.current) {
      const iframe = iframeRef.current;
      
      try {
        // Clear previous content by removing the iframe's document children
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (iframeDoc) {
          iframeDoc.open();
          
          if (html) {
            iframeDoc.write(html);
          } else {
            iframeDoc.write('<div style="padding: 16px; text-align: center; color: #888;">No preview available.</div>');
          }
          
          iframeDoc.close();
          
          // Wait for iframe content to load before calling onContentReady
          iframe.onload = () => {
            console.log("Iframe content loaded, calling onContentReady");
            onContentReady();
          };
        }
      } catch (error) {
        console.error("Error setting iframe content:", error);
      }
    }

    return () => {
      // Cleanup if needed
    };
  }, [html, onContentReady]);

  return <div ref={containerRef} className={className} />;
}); 