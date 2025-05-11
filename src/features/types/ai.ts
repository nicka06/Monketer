export interface ClarificationMessage {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  suggestions?: Array<{ text: string; value: string }>;
  isQuestion?: boolean;
  timestamp?: string | Date;
}

export interface QuestionResponse {
  status: 'requires_clarification';
  question: {
    id: string;
    text: string;
    suggestions: Array<{ text: string; value: string }>;
  };
  aiSummaryForNextTurn: string; 
}

export interface CompleteResponse {
  status: 'complete';
  perfectPrompt: string;
  elementsToProcess: Array<{
    elementType: string; // Matches ElementTypeV2 from backend
    [key: string]: any; 
  }>;
  context?: any;
}

// Combined type for easier handling
export type ClarificationApiResponse = QuestionResponse | CompleteResponse; 