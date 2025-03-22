import { Request } from '@forklaunch/hyper-express-fork';

/**
 * Middleware function to parse the request body based on the content type.
 *
 * @returns {Function} - The middleware function.
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
