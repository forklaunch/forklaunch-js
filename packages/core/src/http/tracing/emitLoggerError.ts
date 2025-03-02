import { logs } from '@opentelemetry/api-logs';
import {
  SEMATTRS_HTTP_METHOD,
  SEMATTRS_HTTP_ROUTE,
  SEMATTRS_HTTP_STATUS_CODE,
  SEMATTRS_HTTP_TARGET
} from '@opentelemetry/semantic-conventions';

import { Request, Response } from '../types/internalApiDefinition.types';
import { pinoLogger } from './pinoLogger';

const logger = pinoLogger('error');

export const emitLoggerError = (
  req: Request,
  res: Response,
  errorString: string
) => {
  logs.getLogger(process.env.SERVICE_NAME ?? 'unknown').emit({
    severityText: 'ERROR',
    severityNumber: 17,
    body: errorString,
    attributes: {
      'service.name': process.env.SERVICE_NAME,
      'api.name': req.contractDetails?.name,
      [SEMATTRS_HTTP_TARGET]: req.path,
      [SEMATTRS_HTTP_ROUTE]: req.originalPath,
      [SEMATTRS_HTTP_METHOD]: req.method,
      [SEMATTRS_HTTP_STATUS_CODE]: res.statusCode
    }
  });
  logger.error(errorString);
};
