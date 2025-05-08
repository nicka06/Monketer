/**
 * UI Utilities Module
 * 
 * Collection of utility functions that help with common UI operations,
 * particularly CSS class handling and Tailwind CSS integration.
 */
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Class Names Utility (cn)
 * 
 * A utility function for conditionally joining CSS class names together
 * with intelligent handling of Tailwind CSS class conflicts.
 * 
 * Features:
 * - Combines multiple class strings, objects, or arrays
 * - Filters out falsy values (null, undefined, false)
 * - Resolves Tailwind CSS conflicts (last definition wins)
 * - Maintains proper specificity when merging classes
 * 
 * @example
 * // Basic usage
 * cn('text-red-500', 'bg-blue-500')
 * // → "text-red-500 bg-blue-500"
 * 
 * @example
 * // Conditional classes
 * cn('btn', isActive && 'btn-active', isPrimary ? 'btn-primary' : 'btn-secondary')
 * // → "btn btn-active btn-primary" if both conditions are true
 * 
 * @example
 * // Tailwind conflict resolution
 * cn('px-4 text-sm', 'px-2 text-lg')
 * // → "text-sm px-2 text-lg" (px-2 overrides px-4)
 * 
 * @param {...ClassValue[]} inputs - Any number of class values (strings, objects, arrays)
 * @returns {string} - A string of merged class names with conflicts resolved
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
