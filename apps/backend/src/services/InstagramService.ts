/**
 * Instagram Service - Legacy Re-export Module
 * 
 * This file maintains backward compatibility by re-exporting all exports
 * from the new modular instagram/ folder structure.
 * 
 * Requirements: 8.4, 8.5 - Maintain backward compatibility for existing imports
 */

// Re-export everything from the new modular structure
export * from './instagram/index.js';

// Re-export the singleton instance as default for convenience
export { instagramService as default } from './instagram/index.js';
