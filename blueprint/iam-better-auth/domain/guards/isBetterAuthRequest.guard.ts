import { BetterAuthRequest } from '../types/betterAuth.types';

export function isBetterAuthRequest(req: unknown): req is BetterAuthRequest {
  return (
    typeof req === 'object' &&
    req !== null &&
    'context' in req &&
    req.context !== null &&
    typeof req.context === 'object' &&
    'correlationId' in req.context &&
    'span' in req.context
  );
}
