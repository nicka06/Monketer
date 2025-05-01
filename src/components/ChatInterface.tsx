import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '@/types/editor';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Send, Loader2, ChevronUp } from 'lucide-react';
import { Avatar } from './ui/avatar';
import { ScrollArea } from './ui/scroll-area';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"

// Define InteractionMode type locally or import if shared
type InteractionMode = 'ask' | 'edit' | 'major';

interface ChatInterfaceProps {
  messages: ChatMessage[];
  // Update onSendMessage to accept mode
  onSendMessage: (message: string, mode: InteractionMode) => Promise<void>; 
  isLoading: boolean;
  initialInputValue?: string;
  // Add props for mode control
  selectedMode: InteractionMode;
  onModeChange: (mode: InteractionMode) => void;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  messages,
  onSendMessage,
  isLoading,
  initialInputValue,
  selectedMode, // Receive mode state
  onModeChange, // Receive mode change handler
}) => {
  const [input, setInput] = useState(initialInputValue || '');
  const [displayCount, setDisplayCount] = useState(5);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (initialInputValue) {
      setInput(initialInputValue);
    }
  }, [initialInputValue]);
  
  const visibleMessages = messages.slice(-displayCount);
  const hasMoreMessages = messages.length > displayCount;
  
  // Scroll to bottom when new messages arrive or when load more is clicked
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [visibleMessages]);

  const handleLoadMore = () => {
    setDisplayCount(prevCount => Math.min(prevCount + 5, messages.length));
  };

  const handleSendMessage = async () => {
    if (input.trim() && !isLoading) {
      const message = input.trim();
      setInput('');
      // Pass the selectedMode when calling the prop
      await onSendMessage(message, selectedMode); 
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Determine if a message is from the user
  const isUserMessage = (message: ChatMessage) => {
    // Always use the explicit role property if present
    return message.role === 'user';
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b bg-gray-50">
        <h3 className="font-semibold text-sm">Email AI Assistant</h3>
      </div>
      
      <ScrollArea className="flex-grow overflow-y-auto px-4 py-4">
        <div className="space-y-4">
          {hasMoreMessages && (
            <div className="flex justify-center mb-4">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleLoadMore}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800"
              >
                <ChevronUp className="h-4 w-4" />
                Load more messages
              </Button>
            </div>
          )}
          
          {visibleMessages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                isUserMessage(message) ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-[80%] p-3 rounded-lg ${
                  isUserMessage(message)
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Avatar className="h-6 w-6">
                    {isUserMessage(message) ? 'U' : 'A'}
                  </Avatar>
                  <span className="text-xs opacity-70">
                    {isUserMessage(message) ? 'You' : 'Assistant'}
                  </span>
                </div>
                <div className="text-sm whitespace-pre-wrap">
                  {message.content}
                </div>
                <div className="text-xs opacity-50 text-right mt-1">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="max-w-[80%] p-3 rounded-lg bg-gray-100">
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">A</Avatar>
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span className="text-xs text-gray-500">Thinking...</span>
                </div>
              </div>
            </div>
          )}
          
          {/* Invisible element to scroll to */}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>
      
      <div className="p-3 border-t mt-auto space-y-3">
        {/* Mode Selection Radio Group */}
         <div className="flex justify-center">
            <RadioGroup 
              defaultValue={selectedMode} 
              onValueChange={(value) => onModeChange(value as InteractionMode)} 
              className="flex items-center space-x-4"
              aria-label="Interaction Mode"
              disabled={isLoading} // Disable during loading
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="ask" id="mode-ask" disabled={isLoading}/>
                <Label htmlFor="mode-ask" className="text-xs">Ask</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="edit" id="mode-edit" disabled={isLoading}/>
                <Label htmlFor="mode-edit" className="text-xs">Edit</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="major" id="mode-major" disabled={isLoading}/>
                <Label htmlFor="mode-major" className="text-xs">Major Edit</Label>
              </div>
            </RadioGroup>
        </div>
        
        {/* Text Input Area */}
        <div className="flex items-end gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Ask the AI to help create or modify your email..."
            className="min-h-[60px] max-h-[150px] resize-none" // Adjusted height
            disabled={isLoading}
          />
          <Button
            onClick={handleSendMessage}
            disabled={isLoading || !input.trim()}
            className="h-10"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
