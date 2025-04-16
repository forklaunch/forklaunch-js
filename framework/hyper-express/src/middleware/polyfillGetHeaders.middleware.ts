import {
  MiddlewareNext,
  Request,
  Response
} from '@forklaunch/hyper-express-fork';

/**
 * Polyfills the getHeaders method on the Response object.
 * This middleware adds Express-like getHeaders functionality to Hyper-Express responses.
 *
 * @param {Request} _req - The request object (unused)
 * @param {Response} res - The response object to polyfill
 * @param {MiddlewareNext} [next] - The next middleware function
 * @returns {void}
 *
 * @example
 * ```typescript
 * // Use as middleware
 * app.use(polyfillGetHeaders);
 *
 * // Now you can use getHeaders in your routes
 * app.get('/headers', (req, res) => {
 *   const headers = res.getHeaders();
 *   res.json({ headers });
 * });
 * ```
 *
 * @todo Move into fork, and create gh issue
 */
export function polyfillGetHeaders(
  _req: Request,
  res: Response,
  next?: MiddlewareNext
) {
  res.getHeaders = () => {
    return (res as unknown as { _headers: Record<string, string[]> })._headers;
  };
  next?.();
}
