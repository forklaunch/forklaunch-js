import {
  Body,
  ContractDetails,
  ExpressLikeSchemaHandler,
  HeadersObject,
  head as innerHead,
  MultipartForm,
  ParamsObject,
  QueryObject,
  ResponsesObject,
  UrlEncodedForm
} from '@forklaunch/core/http';
import {
  MiddlewareNext,
  Request,
  Response
} from '@forklaunch/hyper-express-fork';
import { AnySchemaValidator } from '@forklaunch/validator';

/**
 * Creates a HEAD route handler with schema validation and type safety.
 *
 * @template SV - The schema validator type
 * @template Path - The route path type (must start with '/')
 * @template P - The path parameters type
 * @template ResBodyMap - The response body map type
 * @template ReqBody - The request body type
 * @template ReqQuery - The request query parameters type
 * @template ReqHeaders - The request headers type
 * @template ResHeaders - The response headers type
 * @template LocalsObj - The locals object type
 *
 * @param {SV} schemaValidator - The schema validator instance
 * @param {Path} path - The route path
 * @param {ContractDetails<SV, 'head', Path, P, ResBodyMap, ReqBody, ReqQuery, ReqHeaders, ResHeaders, Request<LocalsObj>>} contractDetails - The contract details for the route
 * @param {...ExpressLikeSchemaHandler<SV, P, ResBodyMap, ReqBody, ReqQuery, ReqHeaders, ResHeaders, LocalsObj, Request<LocalsObj>, Response<LocalsObj>, MiddlewareNext>[]} handlers - The route handlers
 *
 * @returns {void} - Returns nothing, registers the route with Hyper-Express
 *
 * @example
 * ```typescript
 * head(
 *   schemaValidator,
 *   '/files/:id',
 *   {
 *     summary: 'Get file metadata',
 *     description: 'Retrieves metadata for a file without downloading its contents',
 *     tags: ['files'],
 *     parameters: [
 *       {
 *         name: 'id',
 *         in: 'path',
 *         required: true,
 *         schema: { type: 'string' }
 *       }
 *     ],
 *     responses: {
 *       200: {
 *         description: 'File metadata retrieved successfully',
 *         headers: {
 *           'content-length': {
 *             schema: { type: 'string' }
 *           },
 *           'content-type': {
 *             schema: { type: 'string' }
 *           },
 *           'last-modified': {
 *             schema: { type: 'string' }
 *           }
 *         }
 *       },
 *       404: {
 *         description: 'File not found'
 *       }
 *     }
 *   },
 *   async (req, res) => {
 *     const { id } = req.params;
 *     const metadata = await getFileMetadata(id);
 *     res.setHeader('content-length', metadata.size);
 *     res.setHeader('content-type', metadata.type);
 *     res.setHeader('last-modified', metadata.lastModified);
 *     res.status(200).end();
 *   }
 * );
 * ```
 */
export const head = <
  SV extends AnySchemaValidator,
  Path extends `/${string}`,
  P extends ParamsObject<SV>,
  ResBodyMap extends ResponsesObject<SV>,
  ReqBody extends Body<SV> | MultipartForm<SV> | UrlEncodedForm<SV>,
  ReqQuery extends QueryObject<SV>,
  ReqHeaders extends HeadersObject<SV>,
  ResHeaders extends HeadersObject<SV>,
  LocalsObj extends Record<string, unknown>
>(
  schemaValidator: SV,
  path: Path,
  contractDetails: ContractDetails<
    SV,
    'head',
    Path,
    P,
    ResBodyMap,
    ReqBody,
    ReqQuery,
    ReqHeaders,
    ResHeaders,
    Request<LocalsObj>
  >,
  ...handlers: ExpressLikeSchemaHandler<
    SV,
    P,
    ResBodyMap,
    ReqBody,
    ReqQuery,
    ReqHeaders,
    ResHeaders,
    LocalsObj,
    Request<LocalsObj>,
    Response<LocalsObj>,
    MiddlewareNext
  >[]
) => {
  return innerHead<
    SV,
    Path,
    P,
    ResBodyMap,
    ReqBody,
    ReqQuery,
    ReqHeaders,
    ResHeaders,
    LocalsObj,
    Request<LocalsObj>,
    Response<LocalsObj>,
    MiddlewareNext
  >(schemaValidator, path, contractDetails, ...handlers);
};
