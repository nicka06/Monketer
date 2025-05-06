/**
 * Checks if a given image source URL is considered a placeholder.
 * 
 * @param src The image src attribute value.
 * @returns True if the src is a placeholder, false otherwise.
 */
export const isPlaceholder = (src: string | null | undefined): boolean => {
  if (!src) {
    return true; // Treat null, undefined, or empty string as placeholder
  }

  const trimmedSrc = src.trim();

  if (trimmedSrc === '#' || trimmedSrc === '') {
    return true;
  }

  // Check for common placeholder service URLs or patterns
  if (trimmedSrc.startsWith('https://via.placeholder.com') || 
      trimmedSrc.startsWith('http://via.placeholder.com') ||
      trimmedSrc.startsWith('data:image/gif;base64') || // Often used for 1x1 pixel spacers
      trimmedSrc === '@@PLACEHOLDER_IMAGE@@') { 
    return true;
  }

  // You could add more specific checks here if needed
  // e.g., regex for other placeholder services

  return false;
}; 