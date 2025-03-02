import {
  MiddlewareHandler,
  MiddlewareNext,
  Request,
  Response
} from '@forklaunch/hyper-express-fork';
import LiveDirectory from 'live-directory';
import { OpenAPIObject } from 'openapi3-ts/oas31';
import getAbsoluteSwaggerFsPath from 'swagger-ui-dist/absolute-path';
import swaggerUi from 'swagger-ui-express';

/**
 * Middleware to redirect requests to the Swagger UI base path.
 *
 * @param {string} path - The base path for the Swagger UI.
 * @returns {MiddlewareHandler} - The middleware handler for redirecting requests.
 */
export function swaggerRedirect(path: string): MiddlewareHandler {
  return function swaggerHosting(
    req: Request,
    res: Response,
    next?: MiddlewareNext
  ) {
    if (req.path === path) {
      res.redirect(`${path}/`);
    }
    return next?.();
  };
}

/**
 * Sets up the Swagger UI middleware for serving API documentation.
 *
 * @param {string} path - The base path for the Swagger UI.
 * @param {OpenAPIObject} document - The OpenAPI document to display.
 * @param {swaggerUi.SwaggerUiOptions} [opts] - Optional Swagger UI options.
 * @param {swaggerUi.SwaggerOptions} [options] - Optional Swagger options.
 * @param {string} [customCss] - Custom CSS to apply to the Swagger UI.
 * @param {string} [customfavIcon] - Custom favicon to use in the Swagger UI.
 * @param {string} [swaggerUrl] - Custom Swagger URL.
 * @param {string} [customSiteTitle] - Custom site title for the Swagger UI.
 * @returns {MiddlewareHandler[]} - An array of middleware handlers for serving the Swagger UI.
 */
export function swagger(
  path: string,
  document: OpenAPIObject,
  opts?: swaggerUi.SwaggerUiOptions,
  options?: swaggerUi.SwaggerOptions,
  customCss?: string,
  customfavIcon?: string,
  swaggerUrl?: string,
  customSiteTitle?: string
): MiddlewareHandler[] {
  const LiveAssets = new LiveDirectory(getAbsoluteSwaggerFsPath(), {
    filter: {
      keep: {
        names: [
          'swagger-ui-bundle.js',
          'swagger-ui-standalone-preset.js',
          'swagger-ui-init.js',
          'swagger-ui.css',
          'favicon-32x32.png',
          'favicon-16x16.png'
        ]
      }
    },
    cache: {
      max_file_count: 10,
      max_file_size: 1024 * 1024 * 1.5
    }
  });

  const serve = swaggerUi.serve[0] as unknown as MiddlewareHandler;

  /**
   * Middleware to serve static assets for the Swagger UI.
   *
   * @param {Request} req - The request object.
   * @param {Response} res - The response object.
   * @param {MiddlewareNext} [next] - The next middleware function.
   * @returns {void}
   */
  const staticAssets = (req: Request, res: Response, next?: MiddlewareNext) => {
    const filePath = req.path.replace(path, '');
    const file = LiveAssets.get(filePath);

    if (file === undefined) {
      if (next) {
        return next();
      }
      return res.status(404).send();
    }

    const fileParts = file.path.split('.');
    const extension = fileParts[fileParts.length - 1];

    const content = file.content;
    return res.type(extension).send(content);
  };

  const ui = swaggerUi.setup(
    document,
    opts,
    options,
    customCss,
    customfavIcon,
    swaggerUrl,
    customSiteTitle
  ) as unknown as MiddlewareHandler;

  return [serve, staticAssets, ui];
}
