import { AnySchemaValidator } from '@forklaunch/validator';
import {
  ATTR_HTTP_REQUEST_METHOD,
  ATTR_HTTP_RESPONSE_STATUS_CODE,
  ATTR_HTTP_ROUTE,
  ATTR_SERVICE_NAME
} from '@opentelemetry/semantic-conventions';
import { ParsedQs } from 'qs';
import { ForklaunchRequest, ForklaunchResponse, ParamsDictionary } from '../';
import { getEnvVar } from '../../services';
import { ATTR_API_NAME, ATTR_CORRELATION_ID } from '../tracing/constants';
import { httpRequestsTotalCounter } from '../tracing/openTelemetryCollector';

export function recordMetric<
  SV extends AnySchemaValidator,
  P extends ParamsDictionary,
  ReqBody extends Record<string, unknown>,
  ReqQuery extends ParsedQs,
  ResBodyMap extends Record<string, unknown>,
  ReqHeaders extends Record<string, string>,
  ResHeaders extends Record<string, string>,
  LocalsObj extends Record<string, unknown>
>(
  req: ForklaunchRequest<SV, P, ReqBody, ReqQuery, ReqHeaders>,
  res: ForklaunchResponse<ResBodyMap, ResHeaders, LocalsObj>
) {
  httpRequestsTotalCounter.add(1, {
    [ATTR_SERVICE_NAME]: getEnvVar('OTEL_SERVICE_NAME'),
    [ATTR_API_NAME]: req.contractDetails?.name,
    [ATTR_CORRELATION_ID]: req.context.correlationId,
    [ATTR_HTTP_REQUEST_METHOD]: req.method,
    [ATTR_HTTP_ROUTE]: req.originalPath,
    [ATTR_HTTP_RESPONSE_STATUS_CODE]: res.statusCode || 0
  });
}
