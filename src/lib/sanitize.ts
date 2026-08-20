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

/**
 * Sanitize markdown/HTML content to prevent XSS injection.
 * Escapes HTML special characters and strips potentially dangerous tags.
 *
 * @param content - Raw content string (Markdown or HTML)
 * @returns Sanitized content safe for rendering in the DOM
 */
export function sanitizeContentForDisplay(content: string): string {
  if (typeof content !== "string") return content;

  // Escape HTML special characters
  let escaped = content
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

  // Strip script tags and event handler attributes
  escaped = escaped.replace(/<script[^>]*>[^<]*<\/script>/gi, "");
  escaped = escaped.replace(/on\w+\s*=/gi, "");

  return escaped;
}