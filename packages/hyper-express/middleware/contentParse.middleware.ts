import { MiddlewareHandler, Request } from '@forklaunch/hyper-express-fork';

/**
 * Middleware function to parse the request body based on the content type.
 *
 * @returns {Function} - The middleware function.
 */
export function contentParse(): MiddlewareHandler {
  return async (req: Request) => {
    switch (req.headers['content-type']) {
      case 'application/json':
        req.body = await req.json();
        break;
      case 'application/x-www-form-urlencoded':
        req.body = await req.urlencoded();
        break;
      case 'text/plain':
        req.body = await req.text();
        break;
      case 'application/octet-stream':
        req.body = await req.buffer();
        break;
      default:
        req.body = await req.json();
        break;
    }
  };
}
