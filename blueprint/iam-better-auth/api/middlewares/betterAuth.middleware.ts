import { NextFunction, Request, Response } from '@forklaunch/blueprint-core';
import { getEnvVar } from '@forklaunch/common';
import {
  ATTR_API_NAME,
  ATTR_CORRELATION_ID,
  ATTR_HTTP_REQUEST_METHOD,
  ATTR_HTTP_RESPONSE_STATUS_CODE,
  ATTR_HTTP_ROUTE,
  ATTR_SERVICE_NAME,
  httpRequestsTotalCounter
} from '@forklaunch/core/http';
import { trace } from '@opentelemetry/api';
import { BetterAuthOptions } from 'better-auth';
import { toNodeHandler } from 'better-auth/node';
import {
  Request as ExpressRequest,
  Response as ExpressResponse
} from 'express';
import { v4 } from 'uuid';
import { BetterAuth } from '../../domain/betterAuth.class';
import { isBetterAuthRequest } from '../../domain/guards/isBetterAuthRequest.guard';

export function betterAuthTelemetryHookMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  if (!isBetterAuthRequest(req)) {
    throw new Error('Invalid request');
  }

  const span = trace.getActiveSpan();
  const correlationId = v4();
  span?.setAttribute(
    'api.id',
    `Better Auth: ${req.path.replace('/api/auth/', '').replace('/', '-')}`
  );
  span?.setAttribute('correlation.id', correlationId);

  req.context.correlationId = correlationId;
  req.context.span = span;

  next();
}

export function enrichBetterAuthApi<T extends BetterAuthOptions>(
  auth: BetterAuth<T>
) {
  return async (req: Request, res: Response) => {
    if (!isBetterAuthRequest(req)) {
      throw new Error('Invalid request');
    }
    await toNodeHandler(auth.betterAuthConfig)(
      req as unknown as ExpressRequest,
      res as unknown as ExpressResponse
    );

    httpRequestsTotalCounter.add(1, {
      [ATTR_SERVICE_NAME]: getEnvVar('OTEL_SERVICE_NAME'),
      [ATTR_API_NAME]: `Better Auth: ${req.path.replace('/api/auth/', '').replace('/', '-')}`,
      [ATTR_CORRELATION_ID]: req.context.correlationId,
      [ATTR_HTTP_REQUEST_METHOD]: req.method,
      [ATTR_HTTP_ROUTE]: req.originalPath ?? req.path,
      [ATTR_HTTP_RESPONSE_STATUS_CODE]: Number(res.statusCode) || 0
    });
  };
}
