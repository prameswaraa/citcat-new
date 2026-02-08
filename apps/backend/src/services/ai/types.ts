export interface AIChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface SearchResult {
  documentId: string;
  content: string;
  score: number;
  metadata?: Record<string, any>;
}

export interface AIConfig {
  enabled: boolean;
  model: string;
  systemPrompt: string;
  temperature: number;
}