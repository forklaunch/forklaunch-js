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
import { context, trace } from '@opentelemetry/api';
import { betterAuth, BetterAuthOptions } from 'better-auth';
import { toNodeHandler } from 'better-auth/node';
import {
  Request as ExpressRequest,
  Response as ExpressResponse
} from 'express';
import { v4 } from 'uuid';
import { isBetterAuthRequest } from '../../domain/guards/isBetterAuthRequest.guard';

/**
 * Reconstructs this service's own Better Auth base-URL origin, mirroring the
 * baseURL logic in auth.ts. Better Auth always adds `new URL(baseURL).origin`
 * to its trusted origins, so a value produced here is guaranteed to be trusted.
 */
function resolveTrustedOrigin(): string | undefined {
  const explicit = getEnvVar('BETTER_AUTH_URL');
  if (explicit) {
    try {
      return new URL(explicit).origin;
    } catch {
      /* fall through to host/port reconstruction */
    }
  }
  const protocol = getEnvVar('PROTOCOL') ?? 'http';
  const host = getEnvVar('HOST') ?? 'localhost';
  const port = getEnvVar('PORT') ?? '8000';
  const publicHost = host === '0.0.0.0' ? 'localhost' : host;
  return `${protocol}://${publicHost}:${port}`;
}

/**
 * Better Auth's CSRF guard rejects any cookie-bearing request that carries no
 * `Origin`/`Referer` header with `MISSING_OR_NULL_ORIGIN`. Browsers ALWAYS send
 * an `Origin` on state-changing requests, so only non-browser callers — the
 * generated SDK used server-to-server, native apps, and test harnesses — ever
 * hit this path. For those we supply this service's own (always-trusted) base
 * URL as the Origin. Requests that already carry an Origin/Referer are left
 * untouched, so browser CSRF protection is fully preserved and a mismatched
 * cross-site Origin is still rejected.
 */
function ensureTrustedOrigin(req: Request): void {
  const headers = req.headers as Record<string, string | string[] | undefined>;
  const origin = headers.origin;
  const referer = headers.referer ?? headers.referrer;
  const hasUsableOrigin =
    (typeof origin === 'string' && origin.length > 0 && origin !== 'null') ||
    (typeof referer === 'string' && referer.length > 0 && referer !== 'null');
  if (hasUsableOrigin) {
    return;
  }
  const trustedOrigin = resolveTrustedOrigin();
  if (trustedOrigin) {
    headers.origin = trustedOrigin;
  }
}

export function betterAuthTelemetryHookMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  if (!isBetterAuthRequest(req)) {
    throw new Error('Invalid request');
  }

  const span = trace.getSpan(context.active());
  const correlationId = v4();
  span?.setAttribute(
    ATTR_API_NAME,
    `Better Auth: ${req.path.replace('/api/auth/', '').replace('/', '-')}`
  );
  span?.setAttribute(ATTR_CORRELATION_ID, correlationId);
  span?.setAttribute(ATTR_SERVICE_NAME, getEnvVar('OTEL_SERVICE_NAME'));

  req.context.correlationId = correlationId;
  req.context.span = span;

  next();
}

export function enrichBetterAuthApi<T extends BetterAuthOptions>(
  auth: ReturnType<typeof betterAuth<T>>
) {
  return async (req: Request, res: Response) => {
    if (!isBetterAuthRequest(req)) {
      throw new Error('Invalid request');
    }
    ensureTrustedOrigin(req);
    await toNodeHandler(auth)(
      req as unknown as ExpressRequest,
      res as unknown as ExpressResponse
    );

    httpRequestsTotalCounter.add(1, {
      [ATTR_SERVICE_NAME]: getEnvVar('OTEL_SERVICE_NAME'),
      [ATTR_API_NAME]: `Better Auth: ${req.path.replace('/api/auth/', '').replace('/', '-')}`,
      [ATTR_HTTP_REQUEST_METHOD]: req.method,
      [ATTR_HTTP_ROUTE]: req.originalPath ?? req.path,
      [ATTR_HTTP_RESPONSE_STATUS_CODE]: Number(res.statusCode) || 0
    });
  };
}
