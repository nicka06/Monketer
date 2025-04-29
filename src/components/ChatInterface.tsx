
import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '@/types/editor';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Send, Loader2 } from 'lucide-react';
import { Avatar } from './ui/avatar';
import { ScrollArea } from './ui/scroll-area';

interface ChatInterfaceProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => Promise<void>;
  isLoading: boolean;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  messages,
  onSendMessage,
  isLoading,
}) => {
  const [input, setInput] = useState('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  
  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (input.trim() && !isLoading) {
      const message = input.trim();
      setInput('');
      await onSendMessage(message);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full border rounded-lg overflow-hidden bg-white">
      <div className="p-3 border-b bg-gray-50">
        <h3 className="font-semibold text-sm">Email AI Assistant</h3>
      </div>
      
      <ScrollArea className="flex-grow p-4" ref={scrollAreaRef}>
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-[80%] p-3 rounded-lg ${
                  message.role === 'user'
                    ? 'bg-emailore-purple text-white'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Avatar className="h-6 w-6">
                    {message.role === 'assistant' ? 'AI' : 'You'}
                  </Avatar>
                  <span className="text-xs opacity-70">
                    {message.role === 'assistant' ? 'Assistant' : 'You'}
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
                  <Avatar className="h-6 w-6">AI</Avatar>
                  <Loader2 className="h-4 w-4 animate-spin text-emailore-purple" />
                  <span className="text-xs text-gray-500">Thinking...</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
      
      <div className="p-3 border-t">
        <div className="flex items-end gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Ask the AI to help create or modify your email..."
            className="min-h-[80px] resize-none"
            disabled={isLoading}
          />
          <Button
            onClick={handleSendMessage}
            disabled={isLoading || !input.trim()}
            className="bg-emailore-purple hover:bg-emailore-purple-dark h-10"
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
