import {
  SEMATTRS_HTTP_METHOD,
  SEMATTRS_HTTP_ROUTE,
  SEMATTRS_HTTP_STATUS_CODE
} from '@opentelemetry/semantic-conventions';
import { httpRequestsTotalCounter } from '../tracing/openTelemetryCollector';
import { Request, Response } from '../types/internalApiDefinition.types';

export function recordMetric(req: Request, res: Response) {
  httpRequestsTotalCounter.add(1, {
    'service.name': process.env.SERVICE_NAME ?? 'unknown',
    'api.name': req.contractDetails?.name,
    [SEMATTRS_HTTP_METHOD]: req.method,
    [SEMATTRS_HTTP_ROUTE]: req.originalPath,
    [SEMATTRS_HTTP_STATUS_CODE]: res.statusCode || 0
  });
}
