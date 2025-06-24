/**
 * Converts a path with Express-style parameters to OpenAPI-compliant format.
 *
 * Express-style parameters use the format `:paramName` (e.g., `/users/:id`),
 * while OpenAPI uses curly braces `{paramName}` (e.g., `/users/{id}`).
 *
 * @param path - The path string containing Express-style parameters
 * @returns The path string with OpenAPI-compliant parameter format
 *
 * @example
 * ```typescript
 * openApiCompliantPath('/users/:id/posts/:postId')
 * // Returns: '/users/{id}/posts/{postId}'
 *
 * openApiCompliantPath('/api/v1/products/:productId/reviews/:reviewId')
 * // Returns: '/api/v1/products/{productId}/reviews/{reviewId}'
 * ```
 */
export function openApiCompliantPath(path: string) {
  return path.replaceAll(/:(\w+)/g, '{$1}');
}
