/**
 * Middleware function to parse the request body based on the discriminated parserType.
 * Uses Express built-ins where possible and Busboy for multipart form data.
 *
 * Supported parser types:
 * - json: Parses body as JSON (uses express.json())
 * - urlEncoded: Parses body as URL-encoded form data (uses express.urlencoded())
 * - text: Parses body as plain text (uses raw parser with text encoding)
 * - file: Parses body as binary buffer (uses raw parser)
 * - multipart: Parses body as multipart form data using Busboy, handling both files and fields
 *
 * @param {object} options - Configuration options
 * @param {number} options.limit - Size limit for the request body (default: '10mb')
 * @returns {Function} Express middleware function
 */
import {
  discriminateBody,
  HttpContractDetails,
  ParamsDictionary
} from '@forklaunch/core/http';
import { AnySchemaValidator } from '@forklaunch/validator';
import { OptionsJson, OptionsText, OptionsUrlencoded } from 'body-parser';
import Busboy from 'busboy';
import express, { NextFunction, Request, Response } from 'express';

function contentParse(
  options: OptionsText & OptionsJson & OptionsUrlencoded = {}
) {
  const jsonParser = express.json(options);
  const urlencodedParser = express.urlencoded({
    extended: true,
    ...options
  });
  const textParser = express.text(options);
  const rawParser = express.raw(options);

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const discriminatedBody = discriminateBody<
        AnySchemaValidator,
        `/${string}`,
        ParamsDictionary,
        Record<number, unknown>,
        Record<string, unknown>,
        Record<string, string>,
        Record<string, string>,
        Record<string, unknown>
      >(
        (
          req as unknown as {
            contractDetails: HttpContractDetails<
              AnySchemaValidator,
              `/${string}`,
              ParamsDictionary,
              Record<number, unknown>,
              Record<string, unknown>,
              Record<string, string>,
              Record<string, string>,
              Record<string, unknown>,
              unknown
            >;
          }
        ).contractDetails
      );

      if (!discriminatedBody) {
        return next();
      }

      switch (discriminatedBody.parserType) {
        case 'json':
          return jsonParser(req, res, next);
        case 'urlEncoded':
          return urlencodedParser(req, res, next);
        case 'text':
          return textParser(req, res, next);
        case 'file':
          return rawParser(req, res, next);
        case 'multipart': {
          const bb = Busboy({
            headers: req.headers as Record<string, string>,
            limits: {
              fileSize:
                typeof options.limit === 'string'
                  ? parseInt(options.limit)
                  : options.limit
            }
          });
          const body: Record<string, unknown> = {};

          bb.on(
            'file',
            (
              fieldname: string,
              file: NodeJS.ReadableStream,
              info: { filename: string; encoding: string; mimeType: string }
            ) => {
              const { filename, mimeType } = info;
              const chunks: Buffer[] = [];

              file.on('data', (chunk: Buffer) => {
                chunks.push(chunk);
              });

              file.on('end', () => {
                const fileBuffer = Buffer.concat(chunks);
                body[fieldname] = {
                  buffer: fileBuffer,
                  name: filename || fieldname,
                  type: mimeType
                };
              });
            }
          );

          bb.on('field', (fieldname: string, value: string) => {
            body[fieldname] = value;
          });

          bb.on('finish', () => {
            req.body = body;
            next();
          });

          bb.on('error', (err: Error) => {
            next(err);
          });
          break;
        }
      }
    } catch (error) {
      next(error);
    }
  };
}

export { contentParse };
