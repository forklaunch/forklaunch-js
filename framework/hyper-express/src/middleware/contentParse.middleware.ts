import { Request } from '@forklaunch/hyper-express-fork';

/**
 * Middleware function to parse the request body based on the content type.
 * Supports multiple content types including JSON, form data, text, binary, and multipart.
 *
 * Supported content types:
 * - application/json: Parses body as JSON
 * - application/x-www-form-urlencoded: Parses body as URL-encoded form data
 * - text/plain: Parses body as plain text
 * - application/octet-stream: Parses body as binary buffer
 * - multipart/form-data: Parses body as multipart form data, handling both files and fields
 *
 * @param {Request} req - The Hyper-Express request object
 * @returns {Promise<void>} - Promise that resolves when parsing is complete
 *
 * @example
 * ```typescript
 * // Use as middleware
 * app.use(contentParse);
 *
 * // Access parsed body in route handler
 * app.post('/upload', async (req, res) => {
 *   if (req.headers['content-type'] === 'multipart/form-data') {
 *     // Access uploaded file
 *     const file = req.body.fileField;
 *     console.log(file.name, file.type, file.buffer);
 *   }
 * });
 * ```
 */
export async function contentParse(req: Request) {
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
    case 'multipart/form-data':
      req.body = {};
      await req.multipart(async (field) => {
        if (field.file) {
          const fileBuffer = Buffer.from(
            await field.file.stream.read(),
            field.encoding as BufferEncoding
          );
          req.body[field.name] = {
            buffer: fileBuffer,
            name: field.file.name ?? field.name,
            type: field.mime_type
          };
        } else {
          req.body[field.name] = field.value;
        }
      });
      break;
    default:
      req.body = await req.json();
      break;
  }
}
