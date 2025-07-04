/**
 * ChatInterface Component
 * 
 * A comprehensive chat interface that handles:
 * - User-AI message interactions
 * - Clarification workflows
 * - Different interaction modes (major edit, minor edit, ask)
 * - Message rendering with markdown support
 * - Suggestion buttons for AI clarifications
 */

import React, { useState, useRef, useEffect, FormEvent } from 'react';
import { ExtendedChatMessage, SimpleClarificationMessage } from '@/features/types/editor';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Send, Paperclip, Mic, CornerDownLeft, AlertTriangle, Wand2 } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';

// Defines the available interaction modes for the chat interface
type InteractionMode = 'ask' | 'edit' | 'major';

/**
 * Props for the ChatInterface component
 */
interface ChatInterfaceProps {
  // Array of chat messages to display
  messages: ExtendedChatMessage[];
  // Optional array of clarification messages when AI needs more info
  clarificationMessages?: SimpleClarificationMessage[];
  // Whether the AI is currently asking for clarification
  isClarifying?: boolean;
  // Callback when user sends a message
  onSendMessage: (message: string, mode: InteractionMode) => void;
  // Callback when user clicks a suggestion button
  onSuggestionClick?: (suggestionValue: string) => void;
  // Whether the AI is currently processing
  isLoading: boolean;
  // Optional initial value for the input field
  initialInputValue?: string | null;
  // Currently selected interaction mode
  selectedMode: InteractionMode;
  // Callback when interaction mode changes
  onModeChange: (mode: InteractionMode) => void;
  // Which interaction modes are currently available
  modesAvailable: {
    minorEdit: boolean;
    justAsk: boolean;
  };
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  messages,
  clarificationMessages,
  isClarifying,
  onSendMessage,
  onSuggestionClick,
  isLoading,
  initialInputValue,
  selectedMode,
  onModeChange,
  modesAvailable
}) => {
  // State for the input field value
  const [inputValue, setInputValue] = useState('');
  // Refs for scroll management and input focus
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Debug logging for component state
  console.log("%%%% CHAT INTERFACE RENDERING %%%%");
  console.log("[ChatInterface] Props received - isClarifying:", isClarifying); 
  console.log("[ChatInterface] Props received - clarificationMessages:", JSON.stringify(clarificationMessages));
  console.log("[ChatInterface] Props received - messages:", JSON.stringify(messages));

  // Effect: Handle initial input value and focus
  useEffect(() => {
    if (initialInputValue) {
      setInputValue(initialInputValue);
      textareaRef.current?.focus();
      // Move cursor to end of input
      setTimeout(() => {
        textareaRef.current?.setSelectionRange(initialInputValue.length, initialInputValue.length);
      }, 0);
    }
  }, [initialInputValue]);

  // Effect: Auto-scroll to latest messages
  useEffect(() => {
    const scrollAreaRoot = scrollAreaRef.current;
    if (scrollAreaRoot) {
      const viewport = scrollAreaRoot.querySelector<HTMLElement>('[data-radix-scroll-area-viewport]');

      if (viewport) {
        console.log('[ChatInterface] Viewport found:', viewport);
        console.log('[ChatInterface] Before scroll: offsetH:', viewport.offsetHeight, 'scrollH:', viewport.scrollHeight, 'scrollT:', viewport.scrollTop);
        
        requestAnimationFrame(() => {
          setTimeout(() => {
            viewport.scrollTo({
              top: viewport.scrollHeight,
              behavior: 'smooth'
            });
            console.log('[ChatInterface] After scroll attempt: scrollH:', viewport.scrollHeight, 'scrollT:', viewport.scrollTop);
          }, 0);
        });
      } else {
        console.warn("[ChatInterface] Scrollable viewport with [data-radix-scroll-area-viewport] not found. Falling back to first child.");
        const firstChildViewport = scrollAreaRoot.children[0] as HTMLElement | undefined;
        if (firstChildViewport) {
          console.log('[ChatInterface] Fallback Viewport found:', firstChildViewport);
          console.log('[ChatInterface] Fallback Before scroll: offsetH:', firstChildViewport.offsetHeight, 'scrollH:', firstChildViewport.scrollHeight, 'scrollT:', firstChildViewport.scrollTop);
          
          requestAnimationFrame(() => {
            setTimeout(() => {
              firstChildViewport.scrollTo({
                top: firstChildViewport.scrollHeight,
                behavior: 'smooth'
              });
              console.log('[ChatInterface] Fallback After scroll attempt: scrollH:', firstChildViewport.scrollHeight, 'scrollT:', firstChildViewport.scrollTop);
            }, 0);
          });
        } else { 
          console.warn("[ChatInterface] Fallback to first child viewport also failed.");
        }
      }
    }
  }, [messages, clarificationMessages, isLoading]);

  // Determine if clarification banner should be shown
  const showClarificationBanner = 
    isClarifying && 
    clarificationMessages && 
    clarificationMessages.length > 0 && 
    clarificationMessages[clarificationMessages.length - 1].role === 'assistant';

  // Handle message submission
  const handleSubmit = (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (inputValue.trim() && !isLoading) {
      onSendMessage(inputValue.trim(), selectedMode);
      setInputValue('');
    }
  };

  // Handle interaction mode changes
  const handleModeChange = (mode: InteractionMode) => {
    onModeChange(mode);
  };
  
  /**
   * Renders a single message (either chat or clarification)
   * Handles different message types, styling, and suggestion buttons
   */
  const renderMessage = (msg: ExtendedChatMessage | SimpleClarificationMessage, isClarificationMsg: boolean) => {
    const isUser = msg.role === 'user';
    const content = msg.content;
    const id = 'id' in msg ? msg.id : `simple-${Date.now()}-${Math.random()}`;
    const isError = 'isError' in msg && msg.isError;

    let suggestions: ExtendedChatMessage['suggestions'] = undefined;
    if ('suggestions' in msg && msg.role === 'assistant' && !isClarificationMsg) {
      suggestions = (msg as ExtendedChatMessage).suggestions;
    }

    const isClarificationPromptInMainChat = 'type' in msg && msg.type === 'clarification';

    const messageStyle = 
      isClarificationMsg || isClarificationPromptInMainChat ? 'bg-blue-50 dark:bg-blue-900/30' : 
      isUser ? 'bg-primary/5 dark:bg-primary/10' : 'bg-background';

    return (
      <div 
        key={id}
        className={cn(
          "p-3 rounded-lg shadow-sm mb-3 break-words", 
          messageStyle,
          isUser ? "ml-auto max-w-[75%]" : "mr-auto max-w-[90%]",
          isError ? "border-red-500 border" : "border border-transparent"
        )}
      >
        <div className="prose dark:prose-invert prose-sm max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {content || ''}
          </ReactMarkdown>
        </div>
        {isError && <p className="text-xs text-red-500 mt-1">An error occurred.</p>}
        {suggestions && suggestions.length > 0 && onSuggestionClick && (
          <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700 flex flex-wrap gap-2">
            {suggestions.map((suggestionText, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => onSuggestionClick(suggestionText)}
                disabled={isLoading}
                className="text-xs bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600"
              >
                {suggestionText}
              </Button>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700">
      <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Interaction Mode:</h3>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Button 
            variant={selectedMode === 'major' ? 'default' : 'outline'} 
            size="sm" 
            onClick={() => handleModeChange('major')} 
            disabled={isLoading}
            className="text-xs px-2 py-1 h-auto"
          >
            <Wand2 className="mr-1.5 h-3.5 w-3.5" />Major Edit
          </Button>
          <Button 
            variant={selectedMode === 'edit' ? 'default' : 'outline'} 
            size="sm" 
            onClick={() => handleModeChange('edit')} 
            disabled={!modesAvailable.minorEdit || isLoading}
            className="text-xs px-2 py-1 h-auto"
          >
            <Paperclip className="mr-1.5 h-3.5 w-3.5 transform -rotate-45" />Minor Edit
          </Button>
          <Button 
            variant={selectedMode === 'ask' ? 'default' : 'outline'} 
            size="sm" 
            onClick={() => handleModeChange('ask')}
            disabled={!modesAvailable.justAsk || isLoading}
            className="text-xs px-2 py-1 h-auto"
          >
            <Mic className="mr-1.5 h-3.5 w-3.5" />Just Ask
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-grow p-4" ref={scrollAreaRef}>
        {messages.map((msg, index) => renderMessage(msg, false))}
        {isLoading && (
          <div className="flex items-center justify-start p-3 mb-3 text-gray-500 dark:text-gray-400 animate-pulse">
            <div className="h-2.5 bg-gray-300 dark:bg-gray-600 rounded-full w-8 mr-2"></div>
            <div className="h-2.5 bg-gray-300 dark:bg-gray-600 rounded-full w-24"></div>
          </div>
        )}
      </ScrollArea>

      <div className="p-3 border-t border-gray-200 dark:border-gray-700 flex-shrink-0 bg-white dark:bg-gray-800">
        {showClarificationBanner && (
          <div className="mb-2 p-2 text-xs text-blue-700 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 rounded-md flex items-center">
            <AlertTriangle className="h-4 w-4 mr-2 flex-shrink-0" />
            <span>Please answer the AI's question above to continue.</span>
          </div>
        )}
        <form onSubmit={handleSubmit} className="flex items-start space-x-2">
          <Textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder={isClarifying ? "Your answer to the AI..." : "Type your request..."}
            className="flex-grow resize-none focus:ring-0 focus:outline-none border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 p-2 rounded-md min-h-[40px] max-h-[120px] text-sm"
            rows={1}
            disabled={isLoading}
          />
          <Button type="submit" size="icon" disabled={isLoading || !inputValue.trim()} className="h-10 w-10 flex-shrink-0 rounded-md">
            {isLoading ? 
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div> : 
              <Send className="h-4 w-4" />
            }
            <span className="sr-only">Send</span>
          </Button>
        </form>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5 flex items-center">
          <CornerDownLeft className="h-3 w-3 mr-1" /> Shift+Enter for new line.
        </p>
      </div>
    </div>
  );
};
