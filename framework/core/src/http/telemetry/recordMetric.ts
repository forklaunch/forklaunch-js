import { getEnvVar } from '@forklaunch/common';
import { AnySchemaValidator } from '@forklaunch/validator';
import {
  ATTR_HTTP_REQUEST_METHOD,
  ATTR_HTTP_RESPONSE_STATUS_CODE,
  ATTR_HTTP_ROUTE,
  ATTR_SERVICE_NAME
} from '@opentelemetry/semantic-conventions';
import { ParsedQs } from 'qs';
import {
  ForklaunchRequest,
  ForklaunchResponse,
  ParamsDictionary,
  VersionedRequests
} from '..';
import { ATTR_API_NAME, ATTR_CORRELATION_ID } from './constants';
import { httpRequestsTotalCounter } from './openTelemetryCollector';

export function recordMetric<
  SV extends AnySchemaValidator,
  P extends ParamsDictionary,
  ReqBody extends Record<string, unknown>,
  ReqQuery extends ParsedQs,
  ResBodyMap extends Record<string, unknown>,
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
    ResHeaders,
    LocalsObj,
    Extract<keyof VersionedReqs, string>
  >
) {
  if (res.metricRecorded) {
    return;
  }

  httpRequestsTotalCounter.add(1, {
    [ATTR_SERVICE_NAME]: getEnvVar('OTEL_SERVICE_NAME'),
    [ATTR_API_NAME]: req.contractDetails?.name,
    [ATTR_CORRELATION_ID]: req.context.correlationId,
    [ATTR_HTTP_REQUEST_METHOD]: req.method,
    [ATTR_HTTP_ROUTE]: req.originalPath,
    [ATTR_HTTP_RESPONSE_STATUS_CODE]: Number(res.statusCode) || 0
  });
  res.metricRecorded = true;
}
