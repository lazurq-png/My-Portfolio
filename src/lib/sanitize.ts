/**
 * Sanitize URL slugs to prevent directory traversal and XSS-relevant patterns.
 * Removes characters that could be used for path traversal or injection attacks.
 *
 * @param slug - Raw slug string from a file path or content ID
 * @returns Sanitized slug containing only URL-safe characters
 */
export function sanitizeSlug(slug: string): string {
  return slug
    .replace(/[^a-zA-Z0-9\-_]/g, "-")  // Replace unsafe chars with hyphen
    .replace(/-+/g, "-")               // Collapse multiple hyphens
    .replace(/^-+|-+$/g, "")          // Remove leading/trailing hyphens
    .replace(/_/g, "");               // Remove underscores
}
