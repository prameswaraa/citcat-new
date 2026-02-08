import { AIChatMessage } from '../types.js';

export interface ILLMProvider {
  /**
   * Generates a completion for the given chat messages.
   */
  generateResponse(
    messages: AIChatMessage[],
    config: { temperature: number; model: string }
  ): Promise<string>;

  /**
   * Generates an embedding vector for the given text.
   */
  generateEmbedding(text: string): Promise<number[]>;

  /**
   * Generates embedding vectors for a list of texts (batch processing).
   */
  generateEmbeddings(texts: string[]): Promise<number[][]>;
}