/**
 * Sanitize URL slugs to prevent directory traversal and XSS-relevant patterns.
 * Removes characters that could be used for path traversal or injection attacks.
 *
 * @param slug - Raw slug string from a file path or content ID
 * @returns Sanitized slug containing only URL-safe characters
 */
export function sanitizeSlug(slug: string): string {
  // Underscores go first: removed last, they could leave a leading hyphen
  // (`_-foo` -> `-foo`) or a double one (`a-_-b` -> `a--b`) after the steps
  // that are meant to prevent exactly that.
  return slug
    .replace(/_/g, "") // Remove underscores
    .replace(/[^a-zA-Z0-9-]/g, "-") // Replace unsafe chars with hyphen
    .replace(/-+/g, "-") // Collapse multiple hyphens
    .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens
}
