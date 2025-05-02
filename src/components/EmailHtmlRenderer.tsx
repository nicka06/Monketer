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
      iframe.style.minHeight = '300px'; // Minimum height
      iframe.style.border = '2px solid #d1d5db';
      iframe.style.borderRadius = '0.75rem'; // matches rounded-xl
      iframe.style.overflow = 'hidden'; // Hide scrollbars initially
      iframe.setAttribute('scrolling', 'no'); // Disable scrolling
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
            // Add CSS to ensure content fills iframe properly
            const styleTag = `
              <style>
                html, body {
                  margin: 0;
                  padding: 20px;
                  height: auto;
                  overflow: visible;
                  background-color: white;
                }
                * {
                  box-sizing: border-box;
                }
              </style>
            `;
            iframeDoc.write(styleTag + html);
          } else {
            iframeDoc.write('<div style="padding: 16px; text-align: center; color: #888;">No preview available.</div>');
          }
          
          iframeDoc.close();
          
          // Wait for iframe content to load before calling onContentReady
          iframe.onload = () => {
            console.log("Iframe content loaded, calling onContentReady");
            
            // Resize iframe to content height
            const resizeIframe = () => {
              try {
                const body = iframeDoc.body;
                const html = iframeDoc.documentElement;
                
                if (body && html) {
                  const height = Math.max(
                    body.scrollHeight,
                    body.offsetHeight,
                    html.clientHeight,
                    html.scrollHeight,
                    html.offsetHeight
                  );
                  
                  iframe.style.height = height + 'px';
                  console.log(`Resized iframe to ${height}px based on content`);
                }
              } catch (e) {
                console.error("Error resizing iframe:", e);
              }
              
              onContentReady();
            };
            
            // Initial resize
            resizeIframe();
            
            // Add resize observer to handle dynamic content changes
            if (window.ResizeObserver) {
              const resizeObserver = new ResizeObserver(() => {
                resizeIframe();
              });
              
              try {
                resizeObserver.observe(iframeDoc.body);
              } catch (e) {
                console.error("Error setting up ResizeObserver:", e);
              }
            }
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