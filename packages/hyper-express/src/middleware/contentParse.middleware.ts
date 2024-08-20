import { Request } from '@forklaunch/hyper-express-fork';

/**
 * Middleware function to parse the request body based on the content type.
 *
 * @returns {Function} - The middleware function.
 */
export async function contentParse(req: Request) {
  console.debug('[MIDDLEWARE] contentParse started');
  switch (
    req.headers['content-type'] &&
    req.headers['content-type'].split(';')[0]
  ) {
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
}
