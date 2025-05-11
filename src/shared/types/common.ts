/**
 * COMMON SHARED TYPES
 * 
 * This module contains common type definitions used throughout the application.
 * These types are fundamental building blocks used by both frontend and backend.
 */

/**
 * Defines the interaction modes for user-AI communication.
 * These modes control how the system processes and responds to user input.
 * 
 * - ask: User is asking a question without requesting content changes
 * - edit: User is requesting minor modifications to existing content
 * - major: User is requesting significant structural changes to content
 */
export type InteractionMode = 'ask' | 'edit' | 'major';
