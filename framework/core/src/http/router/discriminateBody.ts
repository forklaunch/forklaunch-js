import { AnySchemaValidator } from '@forklaunch/validator';
import {
  Body,
  HeadersObject,
  HttpContractDetails,
  ParamsObject,
  PathParamHttpContractDetails,
  QueryObject,
  ResponsesObject,
  TypedBody
} from '../types/contractDetails.types';

/**
 * Discriminates the body type from the given contract details and returns information
 * necessary for parsing and validation.
 *
 * @template SV - Schema validator type.
 * @template Path - Route path type.
 * @template P - Params schema type.
 * @template ResBodyMap - Response body map type.
 * @template ReqBody - Request body type.
 * @template ReqQuery - Request query object type.
 * @template ReqHeaders - Request headers object type.
 * @template ResHeaders - Response headers object type.
 * @param contractDetails - The HTTP contract details.
 * @returns An object containing the content type, parser type, and schema.
 * @throws If no body-related information is found in the contract details.
 */
export function discriminateBody<
  SV extends AnySchemaValidator,
  Path extends `/${string}` = `/${string}`,
  P extends ParamsObject<SV> = ParamsObject<SV>,
  ResBodyMap extends ResponsesObject<SV> = ResponsesObject<SV>,
  ReqBody extends Body<SV> = Body<SV>,
  ReqQuery extends QueryObject<SV> = QueryObject<SV>,
  ReqHeaders extends HeadersObject<SV> = HeadersObject<SV>,
  ResHeaders extends HeadersObject<SV> = HeadersObject<SV>
>(
  contractDetails: HttpContractDetails<
    SV,
    Path,
    P,
    ResBodyMap,
    ReqBody,
    ReqQuery,
    ReqHeaders,
    ResHeaders
  >
):
  | {
      contentType: string;
      parserType: 'json' | 'text' | 'multipart' | 'urlEncoded' | 'file';
      schema: SV['_ValidSchemaObject'];
    }
  | undefined {
  if (contractDetails.body != null) {
    const body = contractDetails.body as TypedBody<SV>;

    if ('text' in body && body.text != null) {
      return {
        contentType: body.contentType ?? 'text/plain',
        parserType: 'text',
        schema: body.text
      };
    } else if ('json' in body && body.json != null) {
      return {
        contentType: body.contentType ?? 'application/json',
        parserType: 'json',
        schema: body.json
      };
    } else if ('file' in body && body.file != null) {
      return {
        contentType: body.contentType ?? 'application/octet-stream',
        parserType: 'file',
        schema: body.file
      };
    } else if ('multipartForm' in body && body.multipartForm != null) {
      return {
        contentType: body.contentType ?? 'multipart/form-data',
        parserType: 'multipart',
        schema: body.multipartForm
      };
    } else if ('urlEncodedForm' in body && body.urlEncodedForm != null) {
      return {
        contentType: body.contentType ?? 'application/x-www-form-urlencoded',
        parserType: 'urlEncoded',
        schema: body.urlEncodedForm
      };
    } else if ('schema' in body && body.schema != null) {
      return {
        contentType: body.contentType ?? 'application/json',
        parserType: 'text',
        schema: body.schema
      };
    } else {
      return {
        contentType: 'application/json',
        parserType: 'json',
        schema: body
      };
    }
  }
}

/**
 * Discriminates all response body types from the given contract details and returns
 * information necessary for parsing and validation for each status code.
 *
 * @template SV - Schema validator type.
 * @template Path - Route path type.
 * @template P - Params schema type.
 * @template ResBodyMap - Response body map type.
 * @template ReqQuery - Request query object type.
 * @template ReqHeaders - Request headers object type.
 * @template ResHeaders - Response headers object type.
 * @param contractDetails - The contract details containing response schemas.
 * @returns A record mapping status codes to content type, parser type, and schema info.
 */
export function discriminateResponseBodies<
  SV extends AnySchemaValidator,
  Path extends `/${string}` = `/${string}`,
  P extends ParamsObject<SV> = ParamsObject<SV>,
  ResBodyMap extends ResponsesObject<SV> = ResponsesObject<SV>,
  ReqQuery extends QueryObject<SV> = QueryObject<SV>,
  ReqHeaders extends HeadersObject<SV> = HeadersObject<SV>,
  ResHeaders extends HeadersObject<SV> = HeadersObject<SV>
>(
  contractDetails: PathParamHttpContractDetails<
    SV,
    Path,
    P,
    ResBodyMap,
    ReqQuery,
    ReqHeaders,
    ResHeaders
  >
) {
  const responses: Record<
    number,
    {
      contentType: string;
      parserType: 'json' | 'text' | 'serverSentEvent' | 'file';
      schema: SV['_ValidSchemaObject'];
    }
  > = {};
  for (const [statusCode, response] of Object.entries(
    contractDetails.responses
  )) {
    if (response != null && typeof response === 'object') {
      if ('schema' in response && response.schema != null) {
        responses[Number(statusCode)] = {
          contentType: (response.contentType as string) ?? 'application/json',
          parserType: 'text',
          schema: response.schema
        };
      } else if ('buffer' in response && response.buffer != null) {
        responses[Number(statusCode)] = {
          contentType:
            (response.contentType as string) ?? 'application/octet-stream',
          parserType: 'file',
          schema: response.buffer
        };
      } else if ('event' in response && response.event != null) {
        responses[Number(statusCode)] = {
          contentType: (response.contentType as string) ?? 'text/event-stream',
          parserType: 'serverSentEvent',
          schema: response.event
        };
      }
    } else {
      responses[Number(statusCode)] = {
        contentType: 'application/json',
        parserType: 'text',
        schema: response
      };
    }
  }
  return responses;
}
