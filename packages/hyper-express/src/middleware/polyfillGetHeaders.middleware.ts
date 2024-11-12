import { MiddlewareNext, Request, Response } from 'hyper-express';

// TODO: Move into fork, and create gh issue
export function polyfillGetHeaders(
  _req: Request,
  res: Response,
  next?: MiddlewareNext
) {
  console.debug('[MIDDLEWARE] polyfillGetHeaders started');
  res.getHeaders = () => {
    return (res as unknown as { _headers: Record<string, string[]> })._headers;
  };
  next?.();
}
