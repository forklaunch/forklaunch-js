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
import { isNever } from '@forklaunch/common';
import { discriminateBody, HttpContractDetails } from '@forklaunch/core/http';
import { AnySchemaValidator } from '@forklaunch/validator';
import {
  Options,
  OptionsJson,
  OptionsText,
  OptionsUrlencoded
} from 'body-parser';
import Busboy, { BusboyConfig } from 'busboy';
import express, { NextFunction, Request, Response } from 'express';
import expressStatic from 'express-serve-static-core';
import { ParsedQs } from 'qs';
import { Range } from 'range-parser';
import { SetExportTypes } from '../types/export.types';

function contentParse<SV extends AnySchemaValidator>(options?: {
  busboy?: BusboyConfig;
  text?: OptionsText;
  json?: OptionsJson;
  urlencoded?: OptionsUrlencoded;
  raw?: Options;
}) {
  const jsonParser = express.json(options?.json);
  const urlencodedParser = express.urlencoded({
    extended: true,
    ...options?.urlencoded
  });
  const textParser = express.text(options?.text);
  const rawParser = express.raw(options?.raw);

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const coercedRequest = req as unknown as {
        schemaValidator: SV;
        contractDetails: HttpContractDetails<SV>;
      };

      const discriminatedBody = discriminateBody(
        coercedRequest.schemaValidator,
        coercedRequest.contractDetails.body
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
          return rawParser(req, res, async (err) => {
            if (err) {
              return next(err);
            }
            if (req.body instanceof Buffer) {
              req.body = req.body.toString('utf-8');
            }
            next();
          });
        case 'multipart': {
          const bb = Busboy({
            headers: req.headers,
            ...options?.busboy
          });
          const body: Record<string, unknown> = {};

          bb.on('file', (fieldname: string, file: NodeJS.ReadableStream) => {
            const chunks: Buffer[] = [];

            file.on('data', (chunk: Buffer) => {
              chunks.push(chunk);
            });

            file.on('end', () => {
              const fileString = chunks
                .map((chunk) => chunk.toString())
                .join('');
              body[fieldname] = fileString;
            });
          });

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

          req.pipe(bb);
          break;
        }
        default:
          isNever(discriminatedBody.parserType);
      }
    } catch (error) {
      next(error);
    }
  };
}

export { contentParse };

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type Dummy = SetExportTypes<ParsedQs, expressStatic.Express, Range>;
