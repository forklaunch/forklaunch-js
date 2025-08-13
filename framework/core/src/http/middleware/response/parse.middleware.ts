import {
  AnySchemaValidator,
  prettyPrintParseErrors,
  SchemaValidator
} from '@forklaunch/validator';
import { ParsedQs } from 'qs';
import { hasSend } from '../../guards/hasSend';
import { isResponseCompiledSchema } from '../../guards/isResponseCompiledSchema';
import {
  ForklaunchNextFunction,
  ForklaunchRequest,
  ForklaunchResHeaders,
  ForklaunchResponse,
  VersionedRequests
} from '../../types/apiDefinition.types';
import { ParamsDictionary } from '../../types/contractDetails.types';

/**
 * Middleware to parse and validate the response according to the provided schema.
 *
 * This function validates the response against a schema provided by the request's schema validator.
 * If the response does not conform to the schema, the behavior is determined by the `responseValidation`
 * option in `req.contractDetails.options`:
 * - `'error'` (default): Calls `next` with an error.
 * - `'warning'`: Logs a warning to the console.
 * - `'none'`: Silently continues without action.
 *
 * @template SV - The type of the schema validator used in the request.
 * @template P - The type of the parameters dictionary used in the request.
 * @template ResBodyMap - A record type mapping status codes to response body types.
 * @template ReqBody - The type of the request body.
 * @template ReqQuery - The type of the parsed query string.
 * @template ReqHeaders - The type of the request headers.
 * @template ResHeaders - The type of the response headers, extended from `ForklaunchResHeaders`.
 * @template LocalsObj - The type of the locals object in the response.
 *
 * @param {ForklaunchRequest<SV, P, ReqBody, ReqQuery, ReqHeaders>} req - The request object, containing the schema validator and other request data.
 * @param {ForklaunchResponse<ResBodyMap, ForklaunchResHeaders & ResHeaders, LocalsObj>} res - The response object, including headers and body data.
 * @param {ForklaunchNextFunction} [next] - The next middleware function to be called. If not provided, the function will return after processing.
 *
 * @returns {void} This function does not return a value.
 */
export function parse<
  SV extends AnySchemaValidator,
  P extends ParamsDictionary,
  ResBodyMap extends Record<number, unknown>,
  ReqBody extends Record<string, unknown>,
  ReqQuery extends ParsedQs,
  ReqHeaders extends Record<string, string>,
  ResHeaders extends Record<string, unknown>,
  LocalsObj extends Record<string, unknown>,
  VersionedReqs extends VersionedRequests,
  SessionSchema extends Record<string, unknown>
>(
  req: ForklaunchRequest<
    SV,
    P,
    ReqBody,
    ReqQuery,
    ReqHeaders,
    Extract<keyof VersionedReqs, string>,
    SessionSchema
  >,
  res: ForklaunchResponse<
    unknown,
    ResBodyMap,
    ForklaunchResHeaders & ResHeaders,
    LocalsObj,
    Extract<keyof VersionedReqs, string>
  >,
  next?: ForklaunchNextFunction
) {
  let headers;
  let responses;

  const responseSchemas = res.responseSchemas;
  const schemaValidator = req.schemaValidator as SchemaValidator;

  if (!isResponseCompiledSchema(responseSchemas)) {
    const parsedVersions = req._parsedVersions;
    if (typeof parsedVersions === 'number') {
      throw new Error('Request failed to parse given version map');
    }
    const mappedHeaderSchemas = parsedVersions.map(
      (version) => responseSchemas[version].headers
    );
    const mappedResponseSchemas = parsedVersions.map(
      (version) => responseSchemas[version].responses
    );

    const collapsedResponseSchemas = mappedResponseSchemas.reduce<
      Record<number, unknown[]>
    >((acc, responseSchema) => {
      Object.entries(responseSchema).forEach(([status, schema]) => {
        if (!acc[Number(status)]) {
          acc[Number(status)] = [];
        }
        acc[Number(status)].push(schema);
      });
      return acc;
    }, {});

    headers = schemaValidator.union(mappedHeaderSchemas);
    responses = Object.fromEntries(
      Object.entries(collapsedResponseSchemas).map(([status, schemas]) => [
        status,
        schemaValidator.union(schemas)
      ])
    );
  } else {
    headers = responseSchemas.headers;
    responses = responseSchemas.responses;
  }

  const statusCode = Number(res.statusCode);

  const parsedResponse = schemaValidator.parse(
    [400, 401, 404, 403, 500].includes(statusCode)
      ? schemaValidator.union([schemaValidator.string, responses?.[statusCode]])
      : responses?.[statusCode],
    res.bodyData
  );

  const parsedHeaders = schemaValidator.parse(
    headers ?? schemaValidator.unknown,
    res.getHeaders()
  );
  const parseErrors: string[] = [];
  if (!parsedHeaders.ok) {
    const headerErrors = prettyPrintParseErrors(parsedHeaders.errors, 'Header');
    if (headerErrors) {
      parseErrors.push(headerErrors);
    }
  }

  if (!parsedResponse.ok) {
    const responseErrors = prettyPrintParseErrors(
      parsedResponse.errors,
      'Response'
    );
    if (responseErrors) {
      parseErrors.push(responseErrors);
    }
  }

  if (parseErrors.length > 0) {
    switch (req.contractDetails.options?.responseValidation) {
      default:
      case 'error':
        res.type('text/plain');
        res.status(500);
        if (hasSend(res)) {
          res.send(
            `Invalid response:\n${parseErrors.join(
              '\n\n'
            )}\n\nCorrelation id: ${
              req.context.correlationId ?? 'No correlation ID'
            }`
          );
        } else {
          next?.(new Error('Response is not sendable.'));
        }
        return;
      case 'warning':
        req.openTelemetryCollector.warn(
          `Invalid response:\n${parseErrors.join('\n\n')}`
        );
        break;
      case 'none':
        break;
    }
  }
  next?.();
}
