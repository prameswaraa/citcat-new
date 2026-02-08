import { SearchResult } from '../types.js';

export interface IVectorStore {
  /**
   * Adds a document chunk with its vector embedding.
   */
  addDocument(
    documentId: string,
    content: string,
    vector: number[],
    metadata?: Record<string, any>
  ): Promise<void>;

  /**
   * Finds similar documents based on the query vector.
   */
  similaritySearch(
    queryVector: number[],
    limit: number,
    threshold?: number,
    documentIds?: string[]
  ): Promise<SearchResult[]>;

  /**
   * Deletes all vectors associated with a document.
   */
  deleteDocumentVectors(documentId: string): Promise<void>;
}