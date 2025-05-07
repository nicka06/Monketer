export interface ChatMessage {
  id: string;
  project_id: string; // Ensure this aligns with your DB schema if messages are stored
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string | Date; // Using string for Deno KV or when passing via JSON, Date for client-side
  isError?: boolean;
  // Add any other relevant fields like 'mode' if applicable to your ChatMessage structure
}

// You can also share other editor-related types here if needed by functions
// For example, if Project or PendingChange types were needed by Edge Functions. 